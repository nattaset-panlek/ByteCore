// Xea app source format (.xjs) and installer packages (.install_<id>.exe). Pure functions, no store.
// An .xjs file is a manifest header in line comments followed by JavaScript (see docs/app-sdk.md):
//
//   // ==XeaApp==
//   // @name    Snake
//   // @version 1.0.0
//   // ==/XeaApp==
//   xea.window.setTitle("Snake");

export interface XjsManifest {
  /** Stable id, lowercase letters, digits and dashes. Defaults to a slug of the name. */
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  /** Emoji or 1-2 letters drawn on a coloured tile, or a built-in icon name ("icon/globe"). */
  icon: string;
  /** Tile colour for the icon, CSS hex. */
  color: string;
  width: number;
  height: number;
}

export interface XjsParsed {
  manifest: XjsManifest;
  /** The JavaScript after the header */
  code: string;
}

export type ParseResult = { ok: true; app: XjsParsed } | { ok: false; error: string; line?: number };

const HEADER_START = /^\s*\/\/\s*==XeaApp==\s*$/;
const HEADER_END = /^\s*\/\/\s*==\/XeaApp==\s*$/;
const FIELD = /^\s*\/\/\s*@(\w+)\s*(.*?)\s*$/;

export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

const clampInt = (v: string | undefined, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && v ? Math.max(min, Math.min(max, n)) : fallback;
};

/** Read the manifest header. Errors carry a 1-based line number. */
export function parseXjs(source: string): ParseResult {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const start = lines.findIndex((l) => l.trim() !== "");
  if (start < 0 || !HEADER_START.test(lines[start])) return { ok: false, error: "Missing '// ==XeaApp==' header on the first line.", line: start < 0 ? 1 : start + 1 };
  const end = lines.findIndex((l, i) => i > start && HEADER_END.test(l));
  if (end < 0) return { ok: false, error: "Header is not closed with '// ==/XeaApp=='.", line: start + 1 };
  const fields: Record<string, string> = {};
  for (let i = start + 1; i < end; i++) {
    if (!lines[i].trim()) continue;
    const m = FIELD.exec(lines[i]);
    if (!m) return { ok: false, error: `Header lines look like '// @field value'.`, line: i + 1 };
    fields[m[1].toLowerCase()] = m[2];
  }
  const name = (fields.name ?? "").trim().slice(0, 40);
  if (!name) return { ok: false, error: "The header needs '// @name <App name>'.", line: start + 1 };
  const id = slug(fields.id || name);
  if (!id) return { ok: false, error: "@id must contain letters or digits.", line: start + 1 };
  const version = (fields.version || "1.0.0").trim();
  if (!/^\d+(\.\d+){0,3}$/.test(version)) return { ok: false, error: `@version '${version}' should look like 1.0.0.`, line: start + 1 };
  const color = /^#[0-9a-f]{3,8}$/i.test(fields.color ?? "") ? fields.color : "#3b78ff";
  return {
    ok: true,
    app: {
      manifest: {
        id,
        name,
        version,
        author: (fields.author || "ghost_user").slice(0, 40),
        description: (fields.description || "").slice(0, 200),
        icon: (fields.icon || name.slice(0, 1).toUpperCase()).slice(0, 24),
        color,
        width: clampInt(fields.width, 240, 1600, 640),
        height: clampInt(fields.height, 180, 1000, 480),
      },
      code: lines.slice(end + 1).join("\n"),
    },
  };
}

const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (...args: string[]) => unknown;

/** Syntax check without running anything (the Function constructor only parses). App code runs in an
 *  async function, so top-level await is allowed. */
export function syntaxError(code: string): string | null {
  try {
    new AsyncFunction("xea", code);
    return null;
  } catch (e) {
    return e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }
}

export interface CodeStats {
  chars: number;
  lines: number;
  functions: number;
  /** Deepest { } nesting outside strings and comments */
  depth: number;
}

/** Rough code metrics for the compile-time formula. Skips strings, template literals and comments. */
export function codeStats(code: string): CodeStats {
  let depth = 0;
  let maxDepth = 0;
  let i = 0;
  const n = code.length;
  let stripped = "";
  while (i < n) {
    const c = code[i];
    const next = code[i + 1];
    if (c === "/" && next === "/") {
      while (i < n && code[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && next === "*") {
      i = code.indexOf("*/", i + 2);
      i = i < 0 ? n : i + 2;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      i++;
      while (i < n && code[i] !== c) i += code[i] === "\\" ? 2 : 1;
      i++;
      stripped += " ";
      continue;
    }
    if (c === "{") maxDepth = Math.max(maxDepth, ++depth);
    else if (c === "}") depth = Math.max(0, depth - 1);
    stripped += c;
    i++;
  }
  const functions = (stripped.match(/\bfunction\b|=>/g) ?? []).length + (stripped.match(/^\s*(?:async\s+)?\w+\s*\([^)]*\)\s*\{/gm) ?? []).filter((m) => !/^\s*(if|for|while|switch|catch|function)\b/.test(m)).length;
  return { chars: code.length, lines: code.split("\n").length, functions, depth: maxDepth };
}

/** The longest a compile can take, in seconds. */
export const COMPILE_MAX_S = 290;

/**
 * Compile time in ms (docs/app-sdk.md "Compile time"):
 *   base = 2 + chars / 800 + functions * 0.6 + depth² * 0.5   (seconds)
 *   time = min(290, base / cpuSpeed),  cpuSpeed = clamp(√(cpu / 1.6), 1, 4)
 * so a small app takes seconds, a big one a minute or two, and nothing reaches 5 minutes.
 */
export function compileMs(stats: CodeStats, cpu: number): number {
  const base = 2 + stats.chars / 800 + stats.functions * 0.6 + stats.depth * stats.depth * 0.5;
  const speed = Math.max(1, Math.min(4, Math.sqrt(Math.max(0.1, cpu) / 1.6)));
  return Math.round(Math.min(COMPILE_MAX_S, base / speed) * 1000);
}

// ---- installer package (.install_<id>.exe) ----

const PKG_MAGIC = "XEA-PKG/1";

export interface XeaPackage {
  manifest: XjsManifest;
  /** The full .xjs source (header included) */
  source: string;
  builtAt: number;
}

export const installerName = (id: string) => `.install_${id}.exe`;

export function encodePackage(pkg: XeaPackage): string {
  return `${PKG_MAGIC}\n${JSON.stringify(pkg)}`;
}

export function decodePackage(content: string | undefined): XeaPackage | null {
  if (!content?.startsWith(PKG_MAGIC + "\n")) return null;
  try {
    const p = JSON.parse(content.slice(PKG_MAGIC.length + 1)) as XeaPackage;
    return p?.manifest?.id && typeof p.source === "string" ? p : null;
  } catch {
    return null;
  }
}

/** Shortcut files (.lnk) on the desktop point at an installed app. */
const LNK_MAGIC = "xea-app:";
export const encodeShortcut = (appId: string) => `${LNK_MAGIC}${appId}`;
export const decodeShortcut = (content: string | undefined) => (content?.startsWith(LNK_MAGIC) ? content.slice(LNK_MAGIC.length).trim() : null);
