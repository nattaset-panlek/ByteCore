import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { openContextMenu, openMenuBelow, separator, useContextMenu, type MenuItem } from "../os/contextMenu";
import { create } from "zustand";
import { diskUsage, pullEstimate, useGame } from "../game/store";
import { lootRarity } from "../game/network";
import type { DirNode, FileKind, VNode } from "../game/types";
import * as vfs from "../game/vfs";
import { TabRow, useWindow } from "../os/Window";
import { openSdkFile } from "./userApp/openFile";
import { pickLocalFiles } from "./userApp/importLocal";
import { shortcutIcon } from "./userApp/openFile";
import { useWindows } from "../os/windowStore";
import { Button, ContentDialog, Icon, IconButton, InfoBar, KeyValue, RarityLabel, TabViewItem, TextBox } from "../ui";
import { credits, dateTime, fileSize } from "./common";
import { DRAG_MIME, transferItems } from "./fileOps";
import { toStage, useStage } from "../os/stage";
import { t as translate, tm, useT, type Msg } from "../i18n";

// File Explorer (GDD 3.2): the VFS is the player's inventory. Launch arg `path` opens a folder.

/** Cut/copy clipboard shared by every Explorer window. */
const useClipboard = create<{ paths: string[]; cut: boolean; set: (paths: string[], cut: boolean) => void }>((set) => ({
  paths: [],
  cut: false,
  set: (paths, cut) => set({ paths, cut }),
}));

type Glyph = "lines" | "picture" | "key" | "db" | "gear" | "code";
/** File icon per extension (Figma 04): a page with a glyph and, for most kinds, a colored band. */
const FILE_STYLE: Record<string, { glyph: Glyph; band?: string }> = {
  txt: { glyph: "lines" },
  log: { glyph: "lines", band: "#6b7280" },
  md: { glyph: "lines" },
  pdf: { glyph: "lines", band: "#d13438" },
  doc: { glyph: "lines", band: "#2b7cd3" },
  docx: { glyph: "lines", band: "#2b7cd3" },
  png: { glyph: "picture" },
  jpg: { glyph: "picture" },
  gif: { glyph: "picture" },
  key: { glyph: "key", band: "#e5a000" },
  dat: { glyph: "key", band: "#e5a000" },
  db: { glyph: "db", band: "#8b5cf6" },
  sql: { glyph: "db", band: "#8b5cf6" },
  dll: { glyph: "gear", band: "#5c6670" },
  mod: { glyph: "gear", band: "#5c6670" },
  exe: { glyph: "gear", band: "#e74856" },
  js: { glyph: "code", band: "#c9a900" },
  xjs: { glyph: "code", band: "#c9a900" },
  css: { glyph: "code", band: "#c94fd6" },
};
/** Text files and the editor that opens them: plain text in Text Editor, code in the IDE. */
export const EDITOR_FOR: Partial<Record<FileKind, "textEditor" | "scriptEditor" | "pdfReader">> = { txt: "textEditor", log: "textEditor", js: "scriptEditor", css: "scriptEditor", pdf: "pdfReader" };

const HOME = "C:/Users/ghost_user";
const GALLERY = "C:/Users/ghost_user/Pictures";
const QUICK = [
  { label: "explorer.quick.desktop", path: "C:/Users/ghost_user/Desktop", icon: "icon/desktop" },
  { label: "explorer.quick.downloads", path: "C:/Users/ghost_user/Downloads", icon: "icon/arrow_download" },
  { label: "explorer.quick.documents", path: "C:/Users/ghost_user/Documents", icon: "icon/document" },
  { label: "explorer.quick.pictures", path: "C:/Users/ghost_user/Pictures", icon: "icon/color" },
  { label: "explorer.quick.music", path: "C:/Users/ghost_user/Music", icon: "icon/speaker_2" },
  { label: "explorer.quick.videos", path: "C:/Users/ghost_user/Videos", icon: "icon/desktop" },
  { label: "explorer.quick.loot", path: "C:/loot", icon: "icon/database" },
  { label: "explorer.quick.scripts", path: "C:/Scripts", icon: "icon/document" },
];

/** The connected target's drive (Figma 04: "Remote 192.168.4.21 (Z:)"), shown while a session is open. */
const REMOTE_ROOT = "Z:/";
const isRemote = (p: string) => /^z:/i.test(p);
const norm = (p: string) => (isRemote(p) ? REMOTE_ROOT + vfs.splitPath(p).join("/") : vfs.joinPath(vfs.splitPath(p)));
const parentOf = (p: string) => norm((isRemote(p) ? REMOTE_ROOT : "C:/") + vfs.splitPath(p).slice(0, -1).join("/"));
const child = (dir: string, name: string) => norm(`${dir}/${name}`);
const folderName = (p: string, ip?: string) =>
  vfs.splitPath(p).pop() ?? (isRemote(p) ? translate("explorer.remote", { ip: ip ?? "?" }) : translate("explorer.localDisk"));
const typeLabel = (n: VNode) => {
  if (n.type === "dir") return translate("explorer.type.folder");
  const kind = vfs.fileKind(n.name);
  return kind ? translate(`explorer.type.${kind}`) : translate("explorer.type.file");
};

interface Tab {
  id: number;
  history: string[];
  index: number;
}
let tabSeq = 0;
const newTab = (path: string): Tab => ({ id: ++tabSeq, history: [norm(path)], index: 0 });

type Sort = "name" | "modified" | "type" | "size";
type Group = "none" | Sort;
/** View menu layouts (Figma 04 File Explorer). */
type View = "xl" | "large" | "medium" | "small" | "list" | "details" | "tiles" | "content";

const VIEWS: { id: View; label: string; icon: string }[] = [
  { id: "xl", label: "explorer.view.xl", icon: "icon/desktop" },
  { id: "large", label: "explorer.view.large", icon: "icon/desktop" },
  { id: "medium", label: "explorer.view.medium", icon: "icon/desktop" },
  { id: "small", label: "explorer.view.small", icon: "icon/grid" },
  { id: "list", label: "explorer.view.list", icon: "icon/table" },
  { id: "details", label: "explorer.view.details", icon: "icon/table" },
  { id: "tiles", label: "explorer.view.tiles", icon: "icon/grid" },
  { id: "content", label: "explorer.view.content", icon: "icon/document" },
];
const ICON_SIZE: Record<View, number> = { xl: 96, large: 56, medium: 40, small: 16, list: 16, details: 16, tiles: 40, content: 40 };
const SORTS: Sort[] = ["name", "modified", "type", "size"];

const modifiedOf = (n: VNode) => (n.type === "file" ? n.modified : 0);
const DAY = 86_400_000;

/** Group header for an item (Group by). */
function groupOf(n: VNode, by: Group): string {
  if (by === "name") {
    const c = n.name[0]?.toUpperCase() ?? "";
    return c >= "A" && c <= "H" ? "A - H" : c >= "I" && c <= "P" ? "I - P" : c >= "Q" && c <= "Z" ? "Q - Z" : translate("explorer.group.other");
  }
  if (by === "type") return typeLabel(n);
  if (by === "size") {
    if (n.type === "dir") return translate("explorer.type.folder");
    const mb = n.size;
    return translate(mb < 0.016 ? "explorer.group.tiny" : mb < 1 ? "explorer.group.small" : mb < 128 ? "explorer.group.medium" : mb < 1024 ? "explorer.group.large" : "explorer.group.huge");
  }
  if (by === "modified") {
    if (n.type === "dir") return translate("explorer.type.folder");
    const age = Date.now() - n.modified;
    return translate(age < DAY ? "explorer.group.today" : age < 2 * DAY ? "explorer.group.yesterday" : age < 7 * DAY ? "explorer.group.week" : "explorer.group.earlier");
  }
  return "";
}

/** One step File Explorer can undo: the drive before and after. Undo only applies while nothing else changed it. */
interface UndoStep {
  label: string;
  before: DirNode;
  after: DirNode;
}

export function FileExplorer() {
  const tr = useT();
  const { win } = useWindow();
  const [tabs, setTabs] = useState<Tab[]>(() => [newTab(win.args?.path ?? "C:/Users/ghost_user/Documents")]);
  const [activeId, setActiveId] = useState(tabs[0].id);
  const tab = tabs.find((t) => t.id === activeId) ?? tabs[0];
  const path = tab.history[tab.index];

  // Only the parts Explorer shows: the game ticks every second (wallet, heat) and must not re-render it.
  const fs = useGame((s) => s.game.fs);
  const net = useGame((s) => s.game.net);
  const soldHashes = useGame((s) => s.game.soldHashes);
  const rig = useGame((s) => s.game.rig);
  const modules = useGame((s) => s.game.modules);
  const g = { fs, net, soldHashes, rig, modules };
  const store = useGame.getState;
  const clip = useClipboard();
  const [selected, setSelected] = useState<string[]>([]);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("name");
  const [desc, setDesc] = useState(false);
  const [group, setGroup] = useState<Group>("none");
  const [view, setView] = useState<View>("large");
  const [showExt, setShowExt] = useState(true);
  const [checkboxes, setCheckboxes] = useState(false);
  const [compact, setCompact] = useState(false);
  const [navPane, setNavPane] = useState(true);
  const [details, setDetails] = useState(true);
  const [undoStack, setUndoStack] = useState<UndoStep[]>([]);
  const [props, setProps] = useState<string[] | null>(null);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  /** Rubber-band box in content coordinates (stage px, including scroll). */
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const anchor = useRef<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const session = g.net.session;
  const host = session ? g.net.hosts.find((h) => h.ip === session.ip) : undefined;
  const remote = isRemote(path);
  /** The drive the open folder is on: the rig, or the target while connected. */
  const root = remote ? host?.fs : g.fs;
  const dirNode = root ? vfs.getNode(root, path) : null;
  const [notice, setNotice] = useState("");
  // The folder may disappear (deleted from another window): fall back to C:/
  useEffect(() => {
    if (!dirNode || dirNode.type !== "dir") go("C:/");
  });
  useEffect(() => {
    setSelected([]);
    setSearch("");
  }, [path, activeId]);

  const updateTab = (fn: (t: Tab) => Tab) => setTabs((ts) => ts.map((t) => (t.id === tab.id ? fn(t) : t)));
  const go = (to: string) => {
    const p = norm(to);
    if (p === path) return;
    updateTab((t) => ({ ...t, history: [...t.history.slice(0, t.index + 1), p], index: t.index + 1 }));
  };

  const q = search.toLowerCase();
  const items = (root ? vfs.list(root, path) : [])
    .filter((n) => showHidden || !(n.type === "dir" && n.hidden))
    .filter((n) => !q || n.name.toLowerCase().includes(q))
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      const d =
        sort === "size"
          ? vfs.sizeOf(a) - vfs.sizeOf(b)
          : sort === "modified"
            ? modifiedOf(a) - modifiedOf(b)
            : sort === "type"
              ? typeLabel(a).localeCompare(typeLabel(b))
              : 0;
      return (d || a.name.localeCompare(b.name)) * (desc ? -1 : 1);
    });
  const groups: { label: string; items: VNode[] }[] = [];
  if (group === "none") groups.push({ label: "", items });
  else
    for (const n of items) {
      const label = groupOf(n, group);
      const gr = groups.find((x) => x.label === label);
      if (gr) gr.items.push(n);
      else groups.push({ label, items: [n] });
    }
  const shownName = (n: VNode) => (showExt || n.type === "dir" || n.name.lastIndexOf(".") <= 0 ? n.name : n.name.slice(0, n.name.lastIndexOf(".")));

  const run = (r: { ok: true } | { ok: false; error: Msg }) => {
    if (!r.ok) setError(tm(r.error));
    else setError("");
    return r.ok;
  };

  /** Run a drive change and remember it for Undo (Ctrl+Z). */
  const track = (label: string, fn: () => boolean) => {
    const before = store().game.fs;
    const ok = fn();
    const after = store().game.fs;
    if (after !== before) setUndoStack((u) => [...u.slice(-19), { label, before, after }]);
    return ok;
  };
  const lastUndo = undoStack[undoStack.length - 1];
  const undo = () => {
    if (!lastUndo) return;
    setUndoStack((u) => u.slice(0, -1));
    if (store().game.fs === lastUndo.after) store().restoreFs(lastUndo.before);
    else setError(tr("explorer.undoStale"));
  };

  const open = (n: VNode) => {
    const p = child(path, n.name);
    if (n.type === "dir") return go(p);
    if (remote) return setError(tr("explorer.remoteOpen"));
    if (openSdkFile(p, n)) return;
    const kind = vfs.fileKind(n.name);
    const app = kind && EDITOR_FOR[kind];
    if (app) useWindows.getState().open(app, { path: p });
    else setError(kind ? tr("explorer.noAppFor", { ext: "." + kind }) : tr("explorer.noApp"));
  };

  const newFolder = () => {
    const dir = vfs.getNode(g.fs, path);
    if (!dir || dir.type !== "dir") return;
    let name = tr("explorer.newFolder");
    for (let i = 2; dir.children[name]; i++) name = tr("explorer.newFolderN", { n: String(i) });
    if (track(tr("explorer.undo.new"), () => run(store().mkdir(child(path, name))))) {
      setSelected([name]);
      setRenaming(name);
    }
  };

  /** New > Text document / Script: an empty file, then rename. */
  const newFile = (base: string, ext: string) => {
    const dir = vfs.getNode(g.fs, path);
    if (!dir || dir.type !== "dir") return;
    let name = `${base}${ext}`;
    for (let i = 2; dir.children[name]; i++) name = `${base} (${i})${ext}`;
    if (track(tr("explorer.undo.new"), () => run(store().writeFile(child(path, name), { size: 0.001, content: "" })))) {
      setSelected([name]);
      setRenaming(name);
    }
  };

  /** Pull remote files (folders: every file inside) to a folder on the rig. Each one is a transfer job. */
  const download = (paths: string[], dest = vfs.DOWNLOADS_DIR) => {
    if (!host) return false;
    const files: string[] = [];
    const walk = (p: string) => {
      const n = vfs.getNode(host.fs, p);
      if (n?.type === "file") files.push(p);
      else if (n) Object.keys(n.children).forEach((c) => walk(child(p, c)));
    };
    paths.forEach(walk);
    for (const f of files) {
      const r = store().pull(f, dest);
      if (!r.ok) return run(r);
    }
    setError("");
    if (files.length) setNotice(tr("explorer.downloading", { count: files.length, dest: folderName(dest) }));
    return true;
  };

  const sell = (names: string[]) => {
    if (run(store().sellData(names.map((n) => child(path, n))))) setNotice(tr("explorer.soldNotice"));
  };

  const transfer = (paths: string[], dest: string, cut: boolean) => {
    if (isRemote(dest)) {
      setError(tr("explorer.remoteReadOnly"));
      return false;
    }
    if (paths.some(isRemote)) return download(paths, dest);
    return track(tr(cut ? "explorer.undo.move" : "explorer.undo.copy"), () => {
      const err = transferItems(paths, dest, cut);
      if (err) setError(tm(err));
      else setError("");
      return !err;
    });
  };

  const paste = () => {
    const { paths, cut, set } = useClipboard.getState();
    if (transfer(paths, path, cut) && cut) set([], false);
  };

  // Drag & drop: drag items onto a folder, the open folder, a nav location or another Explorer window.
  // Plain drag moves, Ctrl+drag copies (like Windows within one drive).
  const [dropOn, setDropOn] = useState<string | null>(null);
  const dragItems = (e: DragEvent, names: string[]) => {
    e.dataTransfer.setData(DRAG_MIME, JSON.stringify(names.map((x) => child(path, x))));
    e.dataTransfer.effectAllowed = "copyMove";
  };
  const dropTarget = (dest: string) => ({
    onDragOver: (e: DragEvent) => {
      if (!e.dataTransfer.types.includes(DRAG_MIME) || isRemote(dest)) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = e.ctrlKey ? "copy" : "move";
      if (dropOn !== dest) setDropOn(dest);
    },
    onDragLeave: (e: DragEvent) => {
      if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setDropOn((d) => (d === dest ? null : d));
    },
    onDrop: (e: DragEvent) => {
      const raw = e.dataTransfer.getData(DRAG_MIME);
      setDropOn(null);
      if (!raw) return;
      e.preventDefault();
      e.stopPropagation();
      transfer(JSON.parse(raw) as string[], dest, !e.ctrlKey);
    },
  });

  const commitRename = (oldName: string, newName: string) => {
    setRenaming(null);
    bodyRef.current?.focus(); // keep keyboard shortcuts (Ctrl+Z, Delete) working after the rename box closes
    const name = newName.trim();
    if (!name || name === oldName) return;
    if (track(tr("explorer.undo.rename"), () => run(store().move(child(path, oldName), child(path, name))))) setSelected([name]);
  };

  const deleteSelected = () => {
    track(tr("explorer.undo.delete"), () => {
      for (const name of selected) if (!run(store().remove(child(path, name)))) return false;
      return true;
    });
    setSelected([]);
    setConfirmDelete(false);
  };

  const onKey = (e: KeyboardEvent) => {
    if (renaming || (e.target as HTMLElement).tagName === "INPUT") return;
    const ctrl = e.ctrlKey || e.metaKey;
    // The remote drive is read-only: browse, select and copy (pasting on the rig downloads).
    if (remote && (e.key === "Delete" || e.key === "F2" || (ctrl && "xvz".includes(e.key)))) return;
    if (e.key === "Delete" && selected.length) setConfirmDelete(true);
    else if (e.key === "F2" && selected.length === 1) setRenaming(selected[0]);
    else if (e.key === "Enter" && selected.length === 1) {
      const n = items.find((i) => i.name === selected[0]);
      if (n) open(n);
    } else if (e.key === "Backspace") go(parentOf(path));
    else if (ctrl && e.key === "c" && selected.length) clip.set(selected.map((n) => child(path, n)), false);
    else if (ctrl && e.key === "x" && selected.length) clip.set(selected.map((n) => child(path, n)), true);
    else if (ctrl && e.key === "v") paste();
    else if (ctrl && e.key === "a") setSelected(items.map((i) => i.name));
    else if (ctrl && e.key === "z") undo();
    else if (e.altKey && e.key === "Enter") setProps(selected.length ? selected : []);
    else if (ctrl && e.shiftKey && e.key === "C" && selected.length) navigator.clipboard?.writeText(selected.map((n) => child(path, n)).join("\n")).catch(() => {});
    else return;
    e.preventDefault();
  };

  const select = (name: string, additive: boolean) =>
    setSelected((s) => (additive ? (s.includes(name) ? s.filter((x) => x !== name) : [...s, name]) : [name]));

  /** Click selects one, Ctrl+click toggles, Shift+click selects the range from the last clicked item. */
  const pickItem = (name: string, e: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }) => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (e.shiftKey && anchor.current) {
      const names = items.map((i) => i.name);
      const a = names.indexOf(anchor.current);
      const b = names.indexOf(name);
      if (a >= 0 && b >= 0) {
        const range = names.slice(Math.min(a, b), Math.max(a, b) + 1);
        setSelected((s) => (ctrl ? [...new Set([...s, ...range])] : range));
        return;
      }
    }
    anchor.current = name;
    if (ctrl) select(name, true);
    else if (!selected.includes(name)) setSelected([name]);
  };

  const startMarquee = (e: React.PointerEvent<HTMLElement>) => {
    if (e.target !== e.currentTarget || e.button !== 0) return;
    const content = bodyRef.current;
    if (!content) return;
    content.focus();
    const base = e.ctrlKey ? selected : [];
    setSelected(base);
    const scale = useStage.getState().scale;
    const sx = e.clientX;
    const sy = e.clientY;
    const local = (x: number, y: number) => {
      const r = content.getBoundingClientRect();
      return { x: (x - r.left) / scale + content.scrollLeft, y: (y - r.top) / scale + content.scrollTop };
    };
    const move = (ev: PointerEvent) => {
      const a = local(sx, sy);
      const b = local(ev.clientX, ev.clientY);
      setMarquee({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) });
      const left = Math.min(sx, ev.clientX), right = Math.max(sx, ev.clientX);
      const top = Math.min(sy, ev.clientY), bottom = Math.max(sy, ev.clientY);
      const hit = [...content.querySelectorAll<HTMLElement>("[data-name]")]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.left < right && r.right > left && r.top < bottom && r.bottom > top;
        })
        .map((el) => el.dataset.name!);
      setSelected([...new Set([...base, ...hit])]);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setMarquee(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const cutSel = (names: string[]) => clip.set(names.map((n) => child(path, n)), true);
  const copySel = (names: string[]) => clip.set(names.map((n) => child(path, n)), false);
  const openTerminal = (dir: string) => useWindows.getState().open("terminal", { cwd: dir });
  /** Loot on the rig that has not been sold yet. */
  const sellable = (n: VNode | undefined) => !remote && n?.type === "file" && !!n.loot && !g.soldHashes.includes(n.loot.hash);

  const sortMenu: MenuItem[] = [
    ...SORTS.map((k) => ({ label: tr(`explorer.sort.${k}`), radio: true, checked: sort === k, onClick: () => setSort(k) })),
    separator,
    { label: tr("explorer.ascending"), radio: true, checked: !desc, onClick: () => setDesc(false) },
    { label: tr("explorer.descending"), radio: true, checked: desc, onClick: () => setDesc(true) },
  ];
  const groupMenu: MenuItem[] = [
    ...SORTS.map((k) => ({ label: tr(`explorer.sort.${k}`), radio: true, checked: group === k, onClick: () => setGroup(k) })),
    separator,
    { label: tr("explorer.group.none"), radio: true, checked: group === "none", onClick: () => setGroup("none") },
  ];
  const showMenu: MenuItem[] = [
    { label: tr("explorer.show.nav"), icon: "icon/square_multiple", checked: navPane, onClick: () => setNavPane(!navPane) },
    { label: tr("explorer.show.compact"), icon: "icon/arrow_sort", checked: compact, onClick: () => setCompact(!compact) },
    { label: tr("explorer.show.checkboxes"), icon: "icon/checkmark", checked: checkboxes, onClick: () => setCheckboxes(!checkboxes) },
    { label: tr("explorer.show.extensions"), icon: "icon/document", checked: showExt, onClick: () => setShowExt(!showExt) },
    { label: tr("explorer.show.hidden"), icon: "icon/info", checked: showHidden, onClick: () => setShowHidden(!showHidden) },
  ];
  const viewMenu: MenuItem[] = [
    ...VIEWS.map((v) => ({ label: tr(v.label), icon: v.icon, radio: true, checked: view === v.id, onClick: () => setView(v.id) })),
    separator,
    { label: tr("explorer.detailsPane"), icon: "icon/info", radio: true, checked: details, onClick: () => setDetails(!details) },
    separator,
    { label: tr("explorer.show"), icon: "icon/square_multiple", submenu: showMenu },
  ];
  const newMenu: MenuItem[] = [
    { label: tr("explorer.new.folder"), icon: "app/FileExplorer", onClick: newFolder },
    separator,
    { label: tr("explorer.new.text"), icon: "icon/document", onClick: () => newFile(tr("explorer.new.textName"), ".txt") },
    { label: tr("explorer.new.script"), icon: "icon/document", onClick: () => newFile(tr("explorer.new.scriptName"), ".js") },
  ];
  const undoItem: MenuItem = {
    label: lastUndo ? tr("explorer.undoWhat", { what: lastUndo.label }) : tr("explorer.undo"),
    icon: "icon/arrow_clockwise",
    shortcut: "Ctrl+Z",
    disabled: !lastUndo,
    onClick: undo,
  };
  const moreMenu: MenuItem[] = [
    undoItem,
    separator,
    { label: tr("explorer.selectAll"), icon: "icon/checkmark_circle", shortcut: "Ctrl+A", onClick: () => setSelected(items.map((i) => i.name)) },
    { label: tr("explorer.selectNone"), icon: "icon/dismiss", onClick: () => setSelected([]) },
    { label: tr("explorer.invertSelection"), icon: "icon/square_multiple", onClick: () => setSelected(items.map((i) => i.name).filter((n) => !selected.includes(n))) },
    separator,
    { label: tr("explorer.properties"), icon: "icon/info", shortcut: "Alt+Enter", onClick: () => setProps(selected) },
    { label: tr("explorer.openTerminal"), icon: "app/Terminal", onClick: () => openTerminal(path) },
  ];
  /** Windows 11 "Show more options": the classic full menu. */
  const classicMenu = (names: string[]): MenuItem[] => [
    ...(names.length ? [{ label: tr("explorer.open"), onClick: () => names.forEach((n) => { const it = items.find((i) => i.name === n); if (it) open(it); }) }, separator] : []),
    ...(names.length
      ? [
          { label: tr("explorer.cut"), icon: "icon/cut", shortcut: "Ctrl+X", onClick: () => cutSel(names) },
          { label: tr("explorer.copy"), icon: "icon/copy", shortcut: "Ctrl+C", onClick: () => copySel(names) },
        ]
      : []),
    { label: tr("explorer.paste"), icon: "icon/copy", shortcut: "Ctrl+V", disabled: !useClipboard.getState().paths.length, onClick: paste },
    separator,
    ...(names.length
      ? [
          { label: tr("explorer.delete"), icon: "icon/delete", danger: true, onClick: () => setConfirmDelete(true) },
          { label: tr("explorer.rename"), icon: "icon/rename", shortcut: "F2", disabled: names.length !== 1, onClick: () => setRenaming(names[0]) },
          separator,
        ]
      : [{ label: tr("explorer.new"), icon: "icon/add", submenu: newMenu }, { label: tr("explorer.refresh"), icon: "icon/arrow_clockwise", onClick: () => setError("") }, separator]),
    { label: tr("explorer.properties"), icon: "icon/info", onClick: () => setProps(names) },
  ];
  const showMore = (at: { x: number; y: number }, names: string[]): MenuItem => ({
    label: tr("explorer.showMore"),
    icon: "icon/share",
    shortcut: "Shift+F10",
    onClick: () => window.setTimeout(() => useContextMenu.getState().show(at.x, at.y, classicMenu(names))),
  });
  /** Right-click on empty space (Windows 11 order). */
  const backgroundMenu = (at: { x: number; y: number }): MenuItem[] =>
    remote
      ? [
          { label: tr("explorer.viewMenu"), icon: "icon/grid", submenu: viewMenu },
          { label: tr("explorer.sortByMenu"), icon: "icon/arrow_sort", submenu: sortMenu },
          { label: tr("explorer.groupBy"), icon: "icon/table", submenu: groupMenu },
          separator,
          { label: tr("explorer.refresh"), icon: "icon/arrow_clockwise", onClick: () => setError("") },
          { label: tr("explorer.properties"), icon: "icon/info", shortcut: "Alt+Enter", onClick: () => setProps([]) },
        ]
      : [
    { label: tr("explorer.viewMenu"), icon: "icon/grid", submenu: viewMenu },
    { label: tr("explorer.sortByMenu"), icon: "icon/arrow_sort", submenu: sortMenu },
    { label: tr("explorer.groupBy"), icon: "icon/table", submenu: groupMenu },
    separator,
    undoItem,
    { label: tr("explorer.new"), icon: "icon/add", submenu: newMenu },
    { label: tr("sdk.ctx.importPc"), icon: "icon/arrow_download", onClick: () => pickLocalFiles(path) },
    { label: tr("explorer.properties"), icon: "icon/info", shortcut: "Alt+Enter", onClick: () => setProps([]) },
    separator,
    { label: tr("explorer.openTerminal"), icon: "app/Terminal", onClick: () => openTerminal(path) },
    separator,
    showMore(at, []),
  ];
  /** Right-click on items (Figma 04: quick-action row, then commands). */
  const itemMenu = (n: VNode, names: string[], at: { x: number; y: number }): MenuItem[] => [
    {
      toolbar: [
        { label: tr("explorer.cut"), icon: "icon/cut", disabled: remote, onClick: () => cutSel(names) },
        { label: tr("explorer.copy"), icon: "icon/copy", onClick: () => copySel(names) },
        { label: tr("explorer.rename"), icon: "icon/rename", disabled: remote || names.length !== 1, onClick: () => setRenaming(n.name) },
        { label: tr("explorer.delete"), icon: "icon/delete", disabled: remote, onClick: () => setConfirmDelete(true) },
      ],
    },
    { label: tr("explorer.open"), icon: "icon/info", shortcut: "Enter", onClick: () => open(n) },
    ...(remote ? [{ label: tr("explorer.downloadToPC"), icon: "icon/arrow_download", onClick: () => download(names.map((x) => child(path, x))) }] : []),
    ...(n.type === "dir" && !remote ? [{ label: tr("explorer.openTerminal"), icon: "app/Terminal", onClick: () => openTerminal(child(path, n.name)) }] : []),
    { label: tr("explorer.copyPath"), icon: "icon/copy", shortcut: "Ctrl+Shift+C", onClick: () => navigator.clipboard?.writeText(names.map((x) => child(path, x)).join("\n")).catch(() => {}) },
    ...(names.some((x) => sellable(items.find((i) => i.name === x))) || (remote && n.type === "file" && n.loot)
      ? [{ label: tr("explorer.sellOnMarket"), icon: "icon/wallet", disabled: remote, onClick: () => sell(names) }]
      : []),
    separator,
    { label: tr("explorer.properties"), icon: "icon/info", shortcut: "Alt+Enter", onClick: () => setProps(names) },
    separator,
    showMore(at, names),
  ];

  const sel = selected.length === 1 ? items.find((i) => i.name === selected[0]) : undefined;
  const selSize = selected.reduce((s, n) => {
    const node = items.find((i) => i.name === n);
    return s + (node ? vfs.sizeOf(node) : 0);
  }, 0);
  const disk = diskUsage(g);
  const crumbs = vfs.splitPath(path);
  const driveRoot = remote ? REMOTE_ROOT : "C:/";
  const driveLabel = remote ? tr("explorer.remote", { ip: session?.ip ?? "?" }) : tr("explorer.localDisk");

  return (
    <>
      <TabRow
        onNewTab={() => {
          const t = newTab(path);
          setTabs((ts) => [...ts, t]);
          setActiveId(t.id);
        }}
      >
        {tabs.map((t) => (
          <TabViewItem
            key={t.id}
            icon={isRemote(t.history[t.index]) ? "icon/globe" : "app/FileExplorer"}
            label={folderName(t.history[t.index], session?.ip)}
            selected={t.id === tab.id}
            onClick={() => setActiveId(t.id)}
            onClose={
              tabs.length > 1
                ? () => {
                    const rest = tabs.filter((x) => x.id !== t.id);
                    setTabs(rest);
                    if (t.id === activeId) setActiveId(rest[rest.length - 1].id);
                  }
                : undefined
            }
          />
        ))}
      </TabRow>

      <div className="fe-address">
        <IconButton icon="icon/arrow_left" label={tr("explorer.back")} disabled={tab.index === 0} onClick={() => updateTab((t) => ({ ...t, index: t.index - 1 }))} />
        <IconButton
          icon="icon/arrow_left"
          label={tr("explorer.forward")}
          className="flip"
          disabled={tab.index >= tab.history.length - 1}
          onClick={() => updateTab((t) => ({ ...t, index: t.index + 1 }))}
        />
        <IconButton icon="icon/chevron_up" label={tr("explorer.up")} disabled={crumbs.length === 0} onClick={() => go(parentOf(path))} />
        <IconButton icon="icon/arrow_clockwise" label={tr("explorer.refresh")} onClick={() => setError("")} />
        <div className="fe-crumbs">
          <button type="button" onClick={() => go("C:/")}>
            {tr("explorer.thisPC")}
          </button>
          <Icon name="icon/chevron_right" size={10} />
          <button type="button" onClick={() => go(driveRoot)}>
            {driveLabel}
          </button>
          {crumbs.map((c, i) => (
            <span key={i} className="fe-crumb">
              <Icon name="icon/chevron_right" size={10} />
              <button type="button" onClick={() => go(norm(driveRoot + crumbs.slice(0, i + 1).join("/")))}>
                {c}
              </button>
            </span>
          ))}
        </div>
        <TextBox value={search} onChange={setSearch} placeholder={tr("explorer.searchIn", { name: remote && !crumbs.length ? tr("explorer.remoteShort") : folderName(path) })} icon="icon/search" className="fe-search" />
      </div>

      <div className="fe-commands">
        <Button variant="subtle" icon="icon/add" disabled={remote} onClick={(e) => openMenuBelow(e.currentTarget, newMenu)}>
          {tr("explorer.new")} <Icon name="icon/chevron_down" size={10} />
        </Button>
        <span className="fe-sep" />
        <IconButton icon="icon/cut" label={tr("explorer.cut")} disabled={remote || !selected.length} onClick={() => cutSel(selected)} />
        <IconButton icon="icon/copy" label={tr("explorer.copy")} disabled={!selected.length} onClick={() => copySel(selected)} />
        <IconButton icon="icon/save" label={tr("explorer.paste")} disabled={remote || !clip.paths.length} onClick={paste} />
        <IconButton icon="icon/rename" label={tr("explorer.rename")} disabled={remote || selected.length !== 1} onClick={() => setRenaming(selected[0])} />
        <IconButton icon="icon/delete" label={tr("explorer.delete")} disabled={remote || !selected.length} onClick={() => setConfirmDelete(true)} />
        <span className="fe-sep" />
        <Button variant="subtle" icon="icon/arrow_sort" onClick={(e) => openMenuBelow(e.currentTarget, [...sortMenu, separator, { label: tr("explorer.groupBy"), icon: "icon/table", submenu: groupMenu }])}>
          {tr("explorer.sortMenu")} <Icon name="icon/chevron_down" size={10} />
        </Button>
        <Button variant="subtle" icon={VIEWS.find((v) => v.id === view)!.icon} onClick={(e) => openMenuBelow(e.currentTarget, viewMenu)}>
          {tr("explorer.viewMenu")} <Icon name="icon/chevron_down" size={10} />
        </Button>
        <IconButton icon="icon/more_horizontal" label={tr("ui.more")} onClick={(e) => openMenuBelow(e.currentTarget, moreMenu)} />
        <span className="spacer" />
        <Button variant="subtle" icon="icon/info" className={details ? "on" : ""} onClick={() => setDetails(!details)}>
          {tr("explorer.details")}
        </Button>
      </div>

      <div className="fe-main">
        {navPane && (
        <nav className="fe-nav">
          <button type="button" className={`fe-nav-item ${path === HOME ? "on" : ""}`} onClick={() => go(HOME)}>
            <Icon name="icon/chevron_right" size={10} className="fe-nav-chev" />
            <Icon name="icon/home" />
            {tr("explorer.quick.home")}
          </button>
          <button type="button" className={`fe-nav-item ${path === GALLERY ? "on" : ""}`} onClick={() => go(GALLERY)}>
            <span className="fe-nav-chev" />
            <Icon name="icon/color" />
            {tr("explorer.quick.gallery")}
          </button>
          <span className="fe-nav-sep" />
          {QUICK.map((it) => (
            <button
              type="button"
              key={it.path}
              className={`fe-nav-item ${path === it.path ? "on" : ""} ${dropOn === norm(it.path) ? "drop" : ""}`}
              data-drop-path={norm(it.path)}
              onClick={() => go(it.path)}
              {...dropTarget(norm(it.path))}
            >
              <span className="fe-nav-chev" />
              <Icon name={it.icon} />
              {tr(it.label)}
            </button>
          ))}
          <span className="fe-nav-sep" />
          <button type="button" className="fe-nav-item" onClick={() => go("C:/")}>
            <Icon name="icon/chevron_down" size={10} className="fe-nav-chev" />
            <Icon name="icon/desktop" />
            {tr("explorer.thisPC")}
          </button>
          <button type="button" className={`fe-nav-item indent ${path === "C:/" ? "on" : ""} ${dropOn === "C:/" ? "drop" : ""}`} onClick={() => go("C:/")} {...dropTarget("C:/")}>
            <Icon name="icon/database" />
            {tr("explorer.localDisk")}
          </button>
          {session && (
            <button type="button" className={`fe-nav-item indent ${remote ? "on" : ""}`} onClick={() => go(REMOTE_ROOT)} title={host ? `${host.org} · ${host.name}` : undefined}>
              <Icon name="icon/globe" />
              {tr("explorer.remoteShort")}
            </button>
          )}
          <button
            type="button"
            className="fe-nav-item"
            onClick={() => (session ? go(REMOTE_ROOT) : setNotice(tr("explorer.networkEmpty")))}
          >
            <Icon name="icon/chevron_right" size={10} className="fe-nav-chev" />
            <Icon name="icon/wifi_1" />
            {tr("explorer.quick.network")}
          </button>
        </nav>
        )}

        <div
          className="fe-content"
          ref={bodyRef}
          tabIndex={0}
          onKeyDown={onKey}
          onPointerDown={startMarquee}
          data-drop-path={path}
          {...dropTarget(path)}
          onContextMenu={(e) => {
            setSelected([]);
            openContextMenu(e, backgroundMenu(toStage(e.clientX, e.clientY)));
          }}
        >
          {marquee && <div className="fe-marquee" style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }} />}
          {error && <InfoBar severity="error" title={tr("explorer.error")} message={error} onClose={() => setError("")} />}
          {notice && !error && <InfoBar severity="success" title={notice} onClose={() => setNotice("")} />}
          {view === "details" && (
            <div className="fe-head">
              {SORTS.map((k) => (
                <button
                  type="button"
                  key={k}
                  className={`fe-col fe-col-${k}`}
                  onClick={() => (sort === k ? setDesc(!desc) : (setSort(k), setDesc(false)))}
                >
                  {tr(`explorer.sort.${k}`)}
                  {sort === k && <Icon name={desc ? "icon/chevron_down" : "icon/chevron_up"} size={10} />}
                </button>
              ))}
              <span className="fe-col fe-col-rarity">{tr("explorer.rarity")}</span>
            </div>
          )}
          {groups.map((gr) => (
            <div key={gr.label || "all"} className="fe-group">
              {gr.label && (
                <div className="fe-group-head t-body-strong">
                  {gr.label} <span className="c-secondary t-caption">({gr.items.length})</span>
                </div>
              )}
              <div className={`fe-grid view-${view} ${compact ? "compact" : ""}`} onPointerDown={startMarquee}>
                {gr.items.map((n) => {
                  const isSel = selected.includes(n.name);
                  const isCut = clip.cut && clip.paths.includes(child(path, n.name));
                  const size = vfs.sizeOf(n);
                  return (
                    <div
                      key={n.name}
                      className={`fe-item ${isSel ? "selected" : ""} ${isCut ? "cut" : ""} ${n.type === "dir" && n.hidden ? "hidden-item" : ""} ${dropOn === child(path, n.name) ? "drop" : ""}`}
                      draggable={renaming !== n.name}
                      onDragStart={(e) => {
                        const names = isSel ? selected : [n.name];
                        if (!isSel) setSelected([n.name]);
                        dragItems(e, names);
                      }}
                      onDragEnd={() => setDropOn(null)}
                      {...(n.type === "dir" ? dropTarget(child(path, n.name)) : {})}
                      data-name={n.name}
                      data-drop-path={n.type === "dir" ? child(path, n.name) : undefined}
                      onPointerDown={(e) => {
                        bodyRef.current?.focus();
                        pickItem(n.name, e);
                      }}
                      onClick={(e) => {
                        // Plain click on one of several selected items narrows the selection (a drag keeps the group).
                        if (!e.ctrlKey && !e.metaKey && !e.shiftKey && selected.length > 1) setSelected([n.name]);
                      }}
                      onDoubleClick={() => open(n)}
                      onContextMenu={(e) => {
                        const names = isSel ? selected : [n.name];
                        if (!isSel) setSelected([n.name]);
                        openContextMenu(e, itemMenu(n, names, toStage(e.clientX, e.clientY)));
                      }}
                      title={`${n.name}\n${typeLabel(n)} · ${fileSize(size)}`}
                    >
                      {checkboxes && (
                        <span
                          className={`fe-check ${isSel ? "on" : ""}`}
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            select(n.name, true);
                          }}
                        />
                      )}
                      <FileIcon node={n} size={ICON_SIZE[view]} />
                      {renaming === n.name ? (
                        <RenameBox name={n.name} onDone={(v) => commitRename(n.name, v)} />
                      ) : (
                        <span className="fe-name">{shownName(n)}</span>
                      )}
                      {view === "details" && (
                        <>
                          <span className="fe-cell c-secondary">{n.type === "file" ? dateTime(n.modified) : ""}</span>
                          <span className="fe-cell c-secondary">{typeLabel(n)}</span>
                          <span className="fe-cell c-secondary fe-num">{n.type === "file" ? fileSize(size) : ""}</span>
                          <span className="fe-cell">{n.type === "file" && n.loot ? <RarityLabel rarity={lootRarity(n.loot)} /> : ""}</span>
                        </>
                      )}
                      {(view === "tiles" || view === "content") && (
                        <span className="fe-sub c-secondary t-caption">
                          {typeLabel(n)}
                          <br />
                          {n.type === "dir" ? tr("explorer.itemCount", { count: Object.keys(n.children).length }) : fileSize(size)}
                        </span>
                      )}
                      {view === "content" && n.type === "file" && (
                        <span className="fe-meta c-secondary t-caption">
                          {tr("explorer.modified")}: {dateTime(n.modified)}
                          <br />
                          {tr("explorer.size")}: {fileSize(size)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="fe-empty c-secondary">{search ? tr("explorer.noMatch") : tr("explorer.empty")}</div>}
        </div>

        {details && (
          <aside className="fe-details">
            {sel ? (
              <>
                <div className="fe-details-icon">
                  <FileIcon node={sel} size={96} />
                </div>
                <div>
                  <div className="t-body-strong fe-break">{sel.name}</div>
                  <div className="t-caption c-secondary">
                    {typeLabel(sel)} · {fileSize(vfs.sizeOf(sel))}
                  </div>
                </div>
                <div className="fe-details-card">
                  {sel.type === "file" && sel.loot ? (
                    <>
                      <KeyValue k={tr("explorer.rarity")} v={<RarityLabel rarity={lootRarity(sel.loot)} />} />
                      <KeyValue k={tr("explorer.marketValue")} v={g.soldHashes.includes(sel.loot.hash) ? tr("explorer.soldValue", { amount: credits(0) }) : credits(sel.loot.value)} />
                      <KeyValue k={tr("explorer.tier")} v={sel.loot.tier} />
                    </>
                  ) : (
                    <KeyValue k={tr("explorer.type")} v={typeLabel(sel)} />
                  )}
                  {remote && <KeyValue k={tr("explorer.downloadTime")} v={tr("explorer.seconds", { s: (pullEstimate(g, vfs.sizeOf(sel)) / 1000).toFixed(1) })} />}
                  {sel.type === "file" && <KeyValue k={tr("explorer.modified")} v={dateTime(sel.modified)} />}
                  <KeyValue k={tr("explorer.location")} v={path} />
                </div>
                <div className="fe-details-actions">
                  {remote ? (
                    <Button variant="accent" icon="icon/arrow_download" onClick={() => download([child(path, sel.name)])}>
                      {tr("explorer.download")}
                    </Button>
                  ) : (
                    <Button variant="accent" onClick={() => open(sel)}>
                      {tr("explorer.open")}
                    </Button>
                  )}
                  {sel.type === "file" && sel.loot ? (
                    <Button icon="icon/wallet" disabled={!sellable(sel)} onClick={() => sell([sel.name])}>
                      {tr("explorer.sell")}
                    </Button>
                  ) : (
                    !remote && <Button onClick={() => setConfirmDelete(true)}>{tr("explorer.delete")}</Button>
                  )}
                </div>
              </>
            ) : (
              <div className="fe-details-empty c-secondary t-caption">
                {selected.length > 1 ? tr("explorer.selectedSize", { count: selected.length, size: fileSize(selSize) }) : tr("explorer.selectHint")}
              </div>
            )}
          </aside>
        )}
      </div>

      <div className="fe-status t-caption">
        <span>{tr("explorer.items", { count: items.length })}</span>
        {selected.length > 0 && (
          <span>{tr("explorer.selectedStatus", { count: selected.length, size: fileSize(selSize) })}</span>
        )}
        <span className="spacer" />
        {remote ? (
          <span>{host ? `${host.org} · ${host.name}` : ""}</span>
        ) : (
          <>
            <span>{tr("explorer.freeOf", { free: fileSize(disk.total - disk.used), total: fileSize(disk.total) })}</span>
            <span className="fe-disk">
              <span style={{ width: `${Math.min(100, (disk.used / disk.total) * 100)}%` }} />
            </span>
          </>
        )}
      </div>

      <PropertiesDialog fs={root ?? g.fs} path={path} names={props} onClose={() => setProps(null)} />

      <ContentDialog
        open={confirmDelete}
        title={selected.length > 1 ? tr("explorer.deleteMany", { count: selected.length }) : tr("explorer.deleteOne")}
        primary={tr("explorer.delete")}
        onPrimary={deleteSelected}
        onClose={() => setConfirmDelete(false)}
      >
        {selected.length === 1 ? tr("explorer.deleteOneText", { name: selected[0] }) : tr("explorer.deleteManyText")}
      </ContentDialog>
    </>
  );
}

function RenameBox({ name, onDone }: { name: string; onDone: (v: string) => void }) {
  const [v, setV] = useState(name);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const dot = name.lastIndexOf(".");
    el.setSelectionRange(0, dot > 0 ? dot : name.length);
  }, [name]);
  return (
    <input
      ref={ref}
      className="fe-rename"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onPointerDown={(e) => e.stopPropagation()}
      onBlur={() => onDone(v)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") onDone(v);
        if (e.key === "Escape") onDone(name);
      }}
      spellCheck={false}
    />
  );
}

function GlyphArt({ glyph, y }: { glyph: Glyph; y: number }) {
  switch (glyph) {
    case "lines":
      return (
        <g fill="#8a96a3">
          <rect x="18" y={y - 14} width="40" height="5" rx="2.5" />
          <rect x="18" y={y - 3} width="48" height="5" rx="2.5" />
          <rect x="18" y={y + 8} width="34" height="5" rx="2.5" />
          <rect x="18" y={y + 19} width="44" height="5" rx="2.5" />
        </g>
      );
    case "picture":
      return (
        <g>
          <rect x="12" y={y - 18} width="60" height="52" rx="3" fill="#5db8f0" />
          <circle cx="58" cy={y - 6} r="6" fill="#ffd85a" />
          <path d={`M12 ${y + 34} V${y + 22} l16 -16 14 14 10 -9 20 18 V${y + 34}z`} fill="#2f8a4e" />
        </g>
      );
    case "key":
      return (
        <g fill="none" stroke="#b07a00" strokeWidth="7" strokeLinecap="round">
          <circle cx="28" cy={y + 6} r="10" />
          <path d={`M38 ${y + 6} H68 M60 ${y + 6} v9 M50 ${y + 6} v7`} />
        </g>
      );
    case "db":
      return (
        <g fill="#b8b8c8">
          <path d={`M20 ${y - 8} v30 a22 7 0 0 0 44 0 v-30z`} />
          <ellipse cx="42" cy={y - 8} rx="22" ry="7" fill="#9e9eb2" />
        </g>
      );
    case "gear":
      return (
        <g>
          <circle cx="42" cy={y + 4} r="18" fill="none" stroke="#6b7480" strokeWidth="8" />
          <circle cx="42" cy={y + 4} r="6" fill="#6b7480" />
        </g>
      );
    case "code":
      return (
        <g fill="none" stroke="#6b7480" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
          <path d={`M30 ${y - 8} l-12 12 12 12 M54 ${y - 8} l12 12 -12 12 M46 ${y - 12} l-8 32`} />
        </g>
      );
  }
}

/** Folder: the yellow folder icon. File: a page with its kind's glyph and band (Figma 04). */
export function FileIcon({ node, size }: { node: VNode; size: number }) {
  if (node.type === "dir") return <Icon name="app/FileExplorer" size={size} />;
  const shortcut = shortcutIcon(node);
  if (shortcut) return <Icon name={shortcut} size={size} />;
  const ext = node.name.includes(".") ? node.name.slice(node.name.lastIndexOf(".") + 1).toLowerCase() : "";
  const style = FILE_STYLE[ext] ?? { glyph: "lines" as Glyph };
  const tiny = size < 24;
  // Page 84x112 with a folded corner; the band takes the bottom quarter.
  return (
    <svg className="file-ico" width={size * 0.75} height={size} viewBox="0 0 84 112" aria-hidden>
      <path d="M6 0 H58 L84 26 V106 a6 6 0 0 1 -6 6 H6 a6 6 0 0 1 -6 -6 V6 a6 6 0 0 1 6 -6z" fill="#f3f3f3" />
      {style.band && <path d="M0 84 H84 V106 a6 6 0 0 1 -6 6 H6 a6 6 0 0 1 -6 -6z" fill={style.band} />}
      <path d="M58 0 L84 26 H64 a6 6 0 0 1 -6 -6z" fill="#cfcfcf" />
      {!tiny && <GlyphArt glyph={style.glyph} y={style.band ? 46 : 54} />}
    </svg>
  );
}

/** Properties (Alt+Enter): the selected items, or the open folder when nothing is selected. */
function PropertiesDialog({ fs, path, names, onClose }: { fs: DirNode; path: string; names: string[] | null; onClose: () => void }) {
  const tr = useT();
  if (!names) return null;
  const targets = (names.length ? names.map((n) => child(path, n)) : [path]).map((p) => ({ p, node: vfs.getNode(fs, p) })).filter((x) => x.node) as { p: string; node: VNode }[];
  if (!targets.length) return null;
  const one = targets.length === 1 ? targets[0] : null;
  const size = targets.reduce((s, x) => s + vfs.sizeOf(x.node), 0);
  let files = 0;
  let folders = 0;
  const count = (n: VNode) => {
    if (n.type === "file") return files++;
    folders++;
    Object.values(n.children).forEach(count);
  };
  targets.forEach((x) => (x.node.type === "dir" ? Object.values(x.node.children).forEach(count) : files++));
  return (
    <ContentDialog open title={one ? tr("explorer.propsOf", { name: folderName(one.p) }) : tr("explorer.propsMany", { count: targets.length })} primary={tr("ui.ok")} onPrimary={onClose} onClose={onClose}>
      <div className="fe-props">
        <div className="fe-props-head">
          {one ? <FileIcon node={one.node} size={40} /> : <Icon name="icon/square_multiple" size={32} />}
          <span className="t-body-strong fe-break">{one ? folderName(one.p) : tr("explorer.propsMany", { count: targets.length })}</span>
        </div>
        <KeyValue k={tr("explorer.type")} v={one ? typeLabel(one.node) : tr("explorer.propsMixed")} />
        <KeyValue k={tr("explorer.location")} v={one ? parentOf(one.p) || "C:/" : path} />
        <KeyValue k={tr("explorer.size")} v={fileSize(size)} />
        {(folders > 0 || targets.some((x) => x.node.type === "dir")) && <KeyValue k={tr("explorer.contains")} v={tr("explorer.containsValue", { files, folders })} />}
        {one?.node.type === "file" && <KeyValue k={tr("explorer.modified")} v={dateTime(one.node.modified)} />}
        {one?.node.type === "dir" && one.node.hidden && <KeyValue k={tr("explorer.attributes")} v={tr("explorer.hiddenAttr")} />}
      </div>
    </ContentDialog>
  );
}
