import { msg, type Msg } from "../i18n";
import type { DirNode, FileKind, FileNode, VNode } from "./types";

// Virtual File System (GDD 3.2): pure functions over an immutable DirNode tree.
// Paths look like "C:/Scripts/bot.js"; backslashes and a missing "C:" are accepted.

export type VfsResult = { ok: true; root: DirNode } | { ok: false; error: Msg };

const KINDS: FileKind[] = ["exe", "dll", "js", "db", "sql", "dat", "key", "txt", "log", "css"];

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

export function joinPath(parts: string[]): string {
  return "C:/" + parts.join("/");
}

export function dir(name: string, children: VNode[] = []): DirNode {
  return { type: "dir", name, children: Object.fromEntries(children.map((c) => [c.name, c])) };
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

/** Starting drive for a new game. Neutral placeholder content. */
export function starterDrive(): DirNode {
  return dir("C:", [
    dir("Users", [
      dir("ghost_user", [
        dir("Desktop"),
        dir("Documents", [file("readme.txt", 0.01, "Welcome to Xea OS.\nPlaceholder text for the first-run readme.")]),
        dir("Downloads"),
      ]),
    ]),
    dir("Scripts"),
    dir("tools"),
    dir("loot"),
    dir("Xea", [dir("System", [file("kernel.dat", 1200), file("shell.exe", 340), file("theme.css", 0.02, ":root {}")])]),
  ]);
}
