// In-game PDF documents (.pdf on the VFS). A PDF file's content is a small markup, rendered as
// paged A4 sheets by PDF Reader (apps/pdfReader). Manuals ship in this format.
//
//   %XPDF title=How to play            first line: header with the document title
//   # Title / ## Heading / ### Sub     headings (## and ### show in the Contents pane)
//   plain lines                         paragraph (lines join until a blank line)
//   - item / 1. item                    bullet / numbered list
//   > text                              note box
//   | cell | cell |                     table row (the first row is the header)
//   ```  ...  ```                       code block
//   ---page                             page break
// Inline: **bold** and `code`.

export const PDF_MAGIC = "%XPDF";

export type PdfBlock =
  | { kind: "h1" | "h2" | "h3" | "p" | "note"; text: string }
  | { kind: "ul" | "ol"; items: string[] }
  | { kind: "code"; lines: string[] }
  | { kind: "table"; rows: string[][] }
  | { kind: "break" };

export interface PdfDoc {
  title: string;
  blocks: PdfBlock[];
}

/** Build a PDF file's content from a title and markup body. */
export const pdfContent = (title: string, body: string) => `${PDF_MAGIC} title=${title}\n${body.trim()}\n`;

export function parsePdf(content: string, fallbackTitle: string): PdfDoc {
  const lines = content.replace(/\r/g, "").split("\n");
  let title = fallbackTitle;
  if (lines[0]?.startsWith(PDF_MAGIC)) {
    title = /title=(.*)$/.exec(lines.shift()!)?.[1]?.trim() || fallbackTitle;
  }
  const blocks: PdfBlock[] = [];
  const last = () => blocks[blocks.length - 1];
  let code: string[] | null = null;
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ kind: "p", text: para.join(" ") });
    para = [];
  };

  for (const raw of lines) {
    if (code) {
      if (raw.trim().startsWith("```")) {
        blocks.push({ kind: "code", lines: code });
        code = null;
      } else code.push(raw);
      continue;
    }
    const line = raw.trim();
    if (line.startsWith("```")) {
      flush();
      code = [];
    } else if (!line) flush();
    else if (line === "---page") {
      flush();
      blocks.push({ kind: "break" });
    } else if (/^#{1,3} /.test(line)) {
      flush();
      const level = line.indexOf(" ");
      blocks.push({ kind: (["h1", "h2", "h3"] as const)[level - 1], text: line.slice(level + 1) });
    } else if (/^- /.test(line) || /^\d+\. /.test(line)) {
      flush();
      const kind = line.startsWith("- ") ? "ul" : "ol";
      const text = line.replace(/^(- |\d+\. )/, "");
      const prev = last();
      if (prev && prev.kind === kind) prev.items.push(text);
      else blocks.push({ kind, items: [text] });
    } else if (line.startsWith("> ")) {
      flush();
      const prev = last();
      if (prev?.kind === "note") prev.text += " " + line.slice(2);
      else blocks.push({ kind: "note", text: line.slice(2) });
    } else if (line.startsWith("|")) {
      flush();
      const cells = line.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const prev = last();
      if (prev?.kind === "table") prev.rows.push(cells);
      else blocks.push({ kind: "table", rows: [cells] });
    } else {
      // A line under a list item continues it; otherwise it joins the paragraph.
      const prev = last();
      if (!para.length && (prev?.kind === "ul" || prev?.kind === "ol") && raw.startsWith("  ")) prev.items[prev.items.length - 1] += " " + line;
      else para.push(line);
    }
  }
  if (code) blocks.push({ kind: "code", lines: code });
  flush();
  return { title, blocks };
}

// Page layout: A4 at 96 dpi (794 x 1123) with 72 px margins. Heights are estimates good enough to
// keep blocks from spilling over the bottom margin; a block taller than a page gets a page of its own.
export const PAGE_W = 794;
export const PAGE_H = 1123;
const CONTENT_H = PAGE_H - 72 * 2 - 24; // minus the footer
const CHARS_PER_LINE = 92;
const wrapLines = (text: string, chars = CHARS_PER_LINE) => Math.max(1, Math.ceil(text.length / chars));

function blockHeight(b: PdfBlock): number {
  switch (b.kind) {
    case "h1":
      return 64;
    case "h2":
      return 46;
    case "h3":
      return 34;
    case "p":
      return wrapLines(b.text) * 21 + 12;
    case "note":
      return wrapLines(b.text, 84) * 21 + 36;
    case "ul":
    case "ol":
      return b.items.reduce((h, it) => h + wrapLines(it, 86) * 21 + 4, 12);
    case "code":
      return b.lines.length * 18 + 36;
    case "table":
      return b.rows.length * 30 + 16;
    case "break":
      return 0;
  }
}

/** Split blocks into pages. A heading never ends a page on its own. */
export function paginate(blocks: PdfBlock[]): PdfBlock[][] {
  const pages: PdfBlock[][] = [[]];
  let used = 0;
  blocks.forEach((b, i) => {
    if (b.kind === "break") {
      if (pages[pages.length - 1].length) pages.push([]);
      used = 0;
      return;
    }
    let h = blockHeight(b);
    const next = blocks[i + 1];
    if ((b.kind === "h1" || b.kind === "h2" || b.kind === "h3") && next && next.kind !== "break") h += Math.min(blockHeight(next), 120);
    if (used + h > CONTENT_H && pages[pages.length - 1].length) {
      pages.push([]);
      used = 0;
    }
    pages[pages.length - 1].push(b);
    used += blockHeight(b);
  });
  return pages;
}
