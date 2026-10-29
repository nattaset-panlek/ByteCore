// Minimal JS tokenizer for the editor's syntax colors. Not a parser — good enough for highlighting.

const KEYWORDS =
  "const|let|var|function|async|await|return|if|else|for|of|in|while|do|break|continue|switch|case|default|try|catch|finally|throw|new|delete|typeof|instanceof|void|yield|class|extends|super|this|import|export|from";
const LITERALS = "true|false|null|undefined|NaN|Infinity";

const TOKEN = new RegExp(
  [
    "(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)", // 1 comment
    "('(?:\\\\.|[^'\\\\])*'|\"(?:\\\\.|[^\"\\\\])*\"|`(?:\\\\.|[^`\\\\])*`)", // 2 string
    `\\b(${LITERALS})\\b`, // 3 literal
    `\\b(${KEYWORDS})\\b`, // 4 keyword
    "\\b(\\d+\\.?\\d*)\\b", // 5 number
    "\\b(ByteCore|console)\\b", // 6 api
  ].join("|"),
  "g"
);

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Return HTML with <span class="tok-*"> around tokens; plain text is escaped. `plain` skips tokenizing (non-JS files). */
export function highlight(code: string, plain = false): string {
  if (plain) return esc(code) + "\n";
  let out = "";
  let last = 0;
  for (const m of code.matchAll(TOKEN)) {
    const i = m.index!;
    if (i > last) out += esc(code.slice(last, i));
    const cls = m[1] ? "comment" : m[2] ? "string" : m[3] ? "literal" : m[4] ? "keyword" : m[5] ? "number" : "api";
    out += `<span class="tok-${cls}">${esc(m[0])}</span>`;
    last = i + m[0].length;
  }
  out += esc(code.slice(last));
  // keep a trailing newline visible so the highlight layer matches the textarea height
  return out + "\n";
}
