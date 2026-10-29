import { msg, type Msg } from "../i18n";
import type { DirNode, FileKind, FileNode, VNode } from "./types";
import { GETTING_STARTED_PDF, HOW_TO_PLAY_PDF } from "./manuals";

// Virtual File System (GDD 3.2): pure functions over an immutable DirNode tree.
// Paths look like "C:/Scripts/bot.js"; backslashes and a missing "C:" are accepted.

export type VfsResult = { ok: true; root: DirNode } | { ok: false; error: Msg };

const KINDS: FileKind[] = ["exe", "dll", "js", "db", "sql", "dat", "key", "txt", "log", "css", "pdf"];

export function fileKind(name: string): FileKind | null {
  const ext = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
  return (KINDS as string[]).includes(ext) ? (ext as FileKind) : null;
}

export function splitPath(path: string): string[] {
  return path
    .replace(/\\/g, "/")
    .replace(/^[a-z]:/i, "")
    .split("/")
    .filter((p) => p && p !== ".");
}

/** Where pulled files and downloads land. */
export const DOWNLOADS_DIR = "C:/Users/ghost_user/Downloads";

export function joinPath(parts: string[]): string {
  return "C:/" + parts.join("/");
}

export function dir(name: string, children: VNode[] = []): DirNode {
  return { type: "dir", name, children: Object.fromEntries(children.map((c) => [c.name, c])) };
}

/** A hidden folder (Windows hides AppData, ProgramData, $Recycle.Bin...). */
export function hiddenDir(name: string, children: VNode[] = []): DirNode {
  return { ...dir(name, children), hidden: true };
}

export function file(name: string, size: number, content?: string, modified = Date.now()): FileNode {
  return { type: "file", name, size, content, modified };
}

export function getNode(root: DirNode, path: string): VNode | null {
  let node: VNode = root;
  for (const p of splitPath(path)) {
    if (node.type !== "dir" || !node.children[p]) return null;
    node = node.children[p];
  }
  return node;
}

export function list(root: DirNode, path: string): VNode[] {
  const node = getNode(root, path);
  if (!node || node.type !== "dir") return [];
  return Object.values(node.children).sort((a, b) =>
    a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1
  );
}

/** Every file under root that carries loot, with its full path. */
export function lootFiles(root: DirNode, base = "C:"): { path: string; file: FileNode }[] {
  const out: { path: string; file: FileNode }[] = [];
  const walk = (node: DirNode, prefix: string) => {
    for (const child of Object.values(node.children)) {
      const path = `${prefix}/${child.name}`;
      if (child.type === "dir") walk(child, path);
      else if (child.loot) out.push({ path, file: child });
    }
  };
  walk(root, base);
  return out;
}

/** Total size in MB of every file under node. */
export function sizeOf(node: VNode): number {
  if (node.type === "file") return node.size;
  let total = 0;
  for (const c of Object.values(node.children)) total += sizeOf(c);
  return total;
}

/** Copy-on-write update of the directory at parts. fn returns the new dir or an error string. */
function updateDir(root: DirNode, parts: string[], fn: (d: DirNode) => DirNode | Msg): DirNode | Msg {
  if (parts.length === 0) return fn(root);
  const [head, ...rest] = parts;
  const child = root.children[head];
  if (!child || child.type !== "dir") return msg("err.folderNotFound", { name: head });
  const next = updateDir(child, rest, fn);
  if ("key" in next) return next;
  return { ...root, children: { ...root.children, [head]: next } };
}

const result = (r: DirNode | Msg): VfsResult => ("key" in r ? { ok: false, error: r } : { ok: true, root: r });

function validName(name: string): Msg | null {
  if (!name || /[<>:"|?*\\/]/.test(name)) return msg("err.invalidName", { name });
  return null;
}

/** Create a folder and any missing parents. */
export function mkdir(root: DirNode, path: string): VfsResult {
  const parts = splitPath(path);
  let r: DirNode | Msg = root;
  for (let i = 0; i < parts.length; i++) {
    const bad = validName(parts[i]);
    if (bad) return { ok: false, error: bad };
    r = updateDir(r as DirNode, parts.slice(0, i), (d) => {
      const existing = d.children[parts[i]];
      if (existing?.type === "file") return msg("err.fileExists", { name: parts[i] });
      if (existing) return d;
      return { ...d, children: { ...d.children, [parts[i]]: dir(parts[i]) } };
    });
    if ("key" in r) return result(r);
  }
  return result(r);
}

/** Write (create or overwrite) a file. The parent folder must exist. */
export function writeFile(root: DirNode, path: string, f: Omit<FileNode, "type" | "name">): VfsResult {
  const parts = splitPath(path);
  const name = parts.pop();
  if (!name) return { ok: false, error: msg("err.missingName") };
  const bad = validName(name);
  if (bad) return { ok: false, error: bad };
  return result(
    updateDir(root, parts, (d) => {
      if (d.children[name]?.type === "dir") return msg("err.folderExists", { name });
      return { ...d, children: { ...d.children, [name]: { ...f, type: "file", name } } };
    })
  );
}

export function remove(root: DirNode, path: string): VfsResult {
  const parts = splitPath(path);
  const name = parts.pop();
  if (!name) return { ok: false, error: msg("err.deleteRoot") };
  return result(
    updateDir(root, parts, (d) => {
      if (!d.children[name]) return msg("err.notFound", { name });
      const children = { ...d.children };
      delete children[name];
      return { ...d, children };
    })
  );
}

function renamed(node: VNode, name: string): VNode {
  return { ...node, name };
}

/** Copy a file or folder to a destination path (the new item's full path). Loot keeps its hash (GDD 3.4.1). */
export function copy(root: DirNode, from: string, to: string): VfsResult {
  const src = getNode(root, from);
  if (!src) return { ok: false, error: msg("err.notFound", { name: from }) };
  const parts = splitPath(to);
  const name = parts.pop();
  if (!name) return { ok: false, error: msg("err.missingName") };
  const bad = validName(name);
  if (bad) return { ok: false, error: bad };
  const destParent = joinPath(parts);
  const fromPath = joinPath(splitPath(from));
  if (src.type === "dir" && (destParent === fromPath || destParent.startsWith(fromPath + "/")))
    return { ok: false, error: msg("err.copyIntoItself") };
  return result(
    updateDir(root, parts, (d) => {
      if (d.children[name]) return msg("err.exists", { name });
      const item = src.type === "file" ? { ...src, name, modified: Date.now() } : renamed(src, name);
      return { ...d, children: { ...d.children, [name]: item } };
    })
  );
}

/** Move or rename. */
export function move(root: DirNode, from: string, to: string): VfsResult {
  const c = copy(root, from, to);
  if (!c.ok) return c;
  return remove(c.root, from);
}

/** Pick a free name: "leads.sql" -> "leads - Copy.sql" -> "leads - Copy (2).sql". */
export function copyName(parent: DirNode, name: string): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let candidate = `${base} - Copy${ext}`;
  for (let i = 2; parent.children[candidate]; i++) candidate = `${base} - Copy (${i})${ext}`;
  return candidate;
}

const README = `Welcome to Xea OS.

You are ghost_user, a freelance operator working out of a rented rig.
The money is in data: find a target, break in, take what sells.

Quick start:
  1. Contracts  - pick a job with a clear goal and reward.
  2. Terminal   - 'scan' for targets, then 'probe', 'crack', 'connect'.
  3. 'pull' the files you find to Downloads before the trace catches up.
  4. Core Exchange (in Browser) - sell the data for credits and XP.
  5. Browser market - order better parts; a faster rig means faster jobs.

Watch your Heat. Push too hard and the Federal Cyber Division comes knocking.`;

const INTRO_MSG = `>> encrypted message <<
From: CHIMERA
To:   ghost_user

You bought the Chimera Kit, so you already know the rules.
Start small. Local forums, soft targets, nothing with teeth.
When you can afford a real processor, we'll talk about the Syndicate.

Burn this after reading. (You won't. Nobody does.)`;

export const GUIDE_PATH = "C:/Users/ghost_user/Documents/how-to-play.pdf";
const DOCS = "C:/Users/ghost_user/Documents";
/** Manuals shipped as PDFs, and the .txt they replace (recognised by its first line). */
const MANUALS: { pdf: string; content: string; oldTxt: string; oldHead: string }[] = [
  { pdf: GUIDE_PATH, content: HOW_TO_PLAY_PDF, oldTxt: `${DOCS}/how-to-play.txt`, oldHead: "HOW TO PLAY" },
  { pdf: `${DOCS}/getting-started.pdf`, content: GETTING_STARTED_PDF, oldTxt: `${DOCS}/getting-started.txt`, oldHead: "GETTING STARTED" },
];

/** Give older saves the PDF manuals, replacing the game's old .txt copies (left alone if the player rewrote them). */
export function withGuide(root: DirNode): DirNode {
  let out = root;
  for (const m of MANUALS) {
    const old = getNode(out, m.oldTxt);
    if (old?.type === "file" && old.content?.startsWith(m.oldHead)) {
      const r = remove(out, m.oldTxt);
      if (r.ok) out = r.root;
    }
    if (getNode(out, m.pdf)) continue;
    const r = writeFile(out, m.pdf, { size: pdfSize(m.content), content: m.content, modified: Date.now() });
    if (r.ok) out = r.root;
  }
  return out;
}

/** Size shown for a shipped PDF: real PDFs are heavier than their text. */
export const pdfSize = (content: string) => Math.max(0.05, Math.round((content.length / 1e6) * 40 * 100) / 100);

const USER_FOLDERS = ["Contacts", "Desktop", "Documents", "Downloads", "Favorites", "Links", "Music", "Pictures", "Saved Games", "Searches", "Videos"];

/**
 * The system part of C: laid out like a Windows drive: Program Files (64-bit apps), Program Files (x86)
 * (32-bit apps), hidden ProgramData (shared app data), Users (one profile per account, with hidden AppData
 * Local / LocalLow / Roaming), Windows (the OS), plus PerfLogs and the hidden $Recycle.Bin.
 * C:/loot, C:/Scripts and C:/tools are the game's own working folders.
 */
function driveSkeleton(): DirNode {
  return dir("C:", [
    hiddenDir("$Recycle.Bin"),
    dir("PerfLogs"),
    dir("Program Files", [
      dir("Common Files", [dir("System"), dir("Services")]),
      dir("Chimera Kit", [file("chimera.exe", 48), file("license.txt", 0.01, "Chimera Kit - remote session toolkit.\nUnlicensed copy. Use at your own risk.")]),
      dir("Xea Browser", [file("browser.exe", 96)]),
      dir("Xea Defender", [file("defender.exe", 22)]),
      hiddenDir("WindowsApps"),
    ]),
    dir("Program Files (x86)", [dir("Common Files"), dir("Legacy Tools", [file("netdiag.exe", 3)])]),
    hiddenDir("ProgramData", [dir("Package Cache"), dir("Xea", [dir("Updates")]), dir("Chimera Kit", [dir("cache")])]),
    dir("Users", [
      hiddenDir("Default", [dir("Desktop"), dir("Documents"), dir("Downloads")]),
      dir("Public", ["Public Desktop", "Public Documents", "Public Downloads", "Public Music", "Public Pictures", "Public Videos"].map((n) => dir(n))),
      dir("ghost_user", [hiddenDir("AppData", [dir("Local", [dir("Temp")]), dir("LocalLow"), dir("Roaming")]), ...USER_FOLDERS.map((n) => dir(n))]),
    ]),
    dir("Windows", [
      dir("Boot"),
      dir("Fonts", [file("segoeui.ttf", 0.9), file("consola.ttf", 0.5)]),
      dir("Logs"),
      dir("Resources", [dir("Themes", [file("theme.css", 0.02, ":root {}")])]),
      dir("System32", [dir("config"), dir("drivers"), file("kernel.dat", 1200), file("shell.exe", 340)]),
      dir("SysWOW64"),
      dir("Temp"),
      dir("Web", [dir("Wallpaper")]),
    ]),
    dir("Scripts"),
    dir("tools"),
    dir("loot"),
  ]);
}

/** Add anything from the template that the drive lacks (folders, hidden flags, files). Never removes. */
function fillMissing(target: DirNode, template: DirNode): DirNode {
  const children = { ...target.children };
  for (const [name, t] of Object.entries(template.children)) {
    const have = children[name];
    if (!have) children[name] = t;
    else if (have.type === "dir" && t.type === "dir") children[name] = fillMissing(have, t);
  }
  return { ...target, children, ...(template.hidden ? { hidden: true } : {}) };
}

/** Give older saves the Windows-style folders (Program Files, Windows, AppData...). */
export function withSkeleton(root: DirNode): DirNode {
  let r = root;
  // Before 1.1 the OS files lived in C:/Xea/System; they now sit in C:/Windows. Drop the old copies.
  if (getNode(r, "C:/Xea/System")) {
    for (const f of ["kernel.dat", "shell.exe", "theme.css"]) {
      const cleared = remove(r, `C:/Xea/System/${f}`);
      if (cleared.ok) r = cleared.root;
    }
    const sys = getNode(r, "C:/Xea/System");
    if (sys?.type === "dir" && !Object.keys(sys.children).length) {
      const gone = remove(r, "C:/Xea/System");
      if (gone.ok) r = gone.root;
    }
    const xea = getNode(r, "C:/Xea");
    if (xea?.type === "dir" && !Object.keys(xea.children).length) {
      const gone = remove(r, "C:/Xea");
      if (gone.ok) r = gone.root;
    }
  }
  return fillMissing(r, driveSkeleton());
}

/** Starter documents that greet the player by name (rewritten by first-run setup). */
export const NAMED_DOCS = ["C:/Users/ghost_user/Documents/readme.txt", "C:/Users/ghost_user/Documents/message-from-chimera.txt"];

/** Starting drive for a new game: the system folders, tutorial and lore files and the working folders. */
export function starterDrive(): DirNode {
  return fillMissing(
    dir("C:", [
      dir("Users", [
        dir("ghost_user", [
          dir("Documents", [
            file("how-to-play.pdf", pdfSize(HOW_TO_PLAY_PDF), HOW_TO_PLAY_PDF),
            file("readme.txt", 0.01, README),
            file("getting-started.pdf", pdfSize(GETTING_STARTED_PDF), GETTING_STARTED_PDF),
            file("message-from-chimera.txt", 0.01, INTRO_MSG),
          ]),
        ]),
      ]),
      dir("Scripts", [file("example.js", 0.01, "// Open this in Script Editor and press Run.\nconst me = await ByteCore.player();\nByteCore.logger.info('Logged in as ' + me.level + ' / balance ' + me.balance);\n")]),
    ]),
    driveSkeleton()
  );
}
