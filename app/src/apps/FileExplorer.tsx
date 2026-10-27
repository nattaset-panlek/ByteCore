import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { create } from "zustand";
import { diskUsage, useGame } from "../game/store";
import type { FileKind, VNode } from "../game/types";
import * as vfs from "../game/vfs";
import { TabRow, useWindow } from "../os/Window";
import { Button, ContentDialog, Icon, IconButton, InfoBar, KeyValue, TabViewItem, TextBox } from "../ui";
import { credits, dateTime, fileSize } from "./common";
import { t as translate, tm, useT, type Msg } from "../i18n";

// File Explorer (GDD 3.2): the VFS is the player's inventory. Launch arg `path` opens a folder.

/** Cut/copy clipboard shared by every Explorer window. */
const useClipboard = create<{ paths: string[]; cut: boolean; set: (paths: string[], cut: boolean) => void }>((set) => ({
  paths: [],
  cut: false,
  set: (paths, cut) => set({ paths, cut }),
}));

const KIND_COLOR: Partial<Record<FileKind, string>> = {
  exe: "#e74856",
  dll: "#9d9d9d",
  js: "#fce100",
  db: "#8b5cf6",
  sql: "#8b5cf6",
  dat: "#ffb900",
  key: "#d4a017",
  txt: "#3b78ff",
  log: "#6b7280",
  css: "#e879f9",
};
const TEXT_KINDS: FileKind[] = ["txt", "log", "js", "css"];

const QUICK = [
  { label: "explorer.quick.desktop", path: "C:/Users/ghost_user/Desktop", icon: "icon/desktop" },
  { label: "explorer.quick.downloads", path: "C:/Users/ghost_user/Downloads", icon: "icon/arrow_download" },
  { label: "explorer.quick.documents", path: "C:/Users/ghost_user/Documents", icon: "icon/document" },
  { label: "explorer.quick.loot", path: "C:/loot", icon: "icon/database" },
  { label: "explorer.quick.scripts", path: "C:/Scripts", icon: "icon/document" },
];

const norm = (p: string) => vfs.joinPath(vfs.splitPath(p));
const parentOf = (p: string) => vfs.joinPath(vfs.splitPath(p).slice(0, -1));
const child = (dir: string, name: string) => norm(`${dir}/${name}`);
const folderName = (p: string) => vfs.splitPath(p).pop() ?? translate("explorer.localDisk");
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

type Sort = "name" | "size" | "modified";

export function FileExplorer() {
  const tr = useT();
  const { win } = useWindow();
  const [tabs, setTabs] = useState<Tab[]>(() => [newTab(win.args?.path ?? "C:/Users/ghost_user/Documents")]);
  const [activeId, setActiveId] = useState(tabs[0].id);
  const tab = tabs.find((t) => t.id === activeId) ?? tabs[0];
  const path = tab.history[tab.index];

  const g = useGame((s) => s.game);
  const store = useGame.getState;
  const clip = useClipboard();
  const [selected, setSelected] = useState<string[]>([]);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("name");
  const [details, setDetails] = useState(true);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [preview, setPreview] = useState<{ name: string; content: string } | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const dirNode = vfs.getNode(g.fs, path);
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
  const items = vfs
    .list(g.fs, path)
    .filter((n) => !q || n.name.toLowerCase().includes(q))
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      if (sort === "size") return vfs.sizeOf(b) - vfs.sizeOf(a);
      if (sort === "modified" && a.type === "file" && b.type === "file") return b.modified - a.modified;
      return a.name.localeCompare(b.name);
    });

  const run = (r: { ok: true } | { ok: false; error: Msg }) => {
    if (!r.ok) setError(tm(r.error));
    else setError("");
    return r.ok;
  };

  const open = (n: VNode) => {
    const p = child(path, n.name);
    if (n.type === "dir") return go(p);
    const kind = vfs.fileKind(n.name);
    if (kind && TEXT_KINDS.includes(kind)) setPreview({ name: n.name, content: n.content ?? "" });
    else setError(kind ? tr("explorer.noAppFor", { ext: "." + kind }) : tr("explorer.noApp"));
  };

  const newFolder = () => {
    const dir = vfs.getNode(g.fs, path);
    if (!dir || dir.type !== "dir") return;
    let name = tr("explorer.newFolder");
    for (let i = 2; dir.children[name]; i++) name = tr("explorer.newFolderN", { n: String(i) });
    if (run(store().mkdir(child(path, name)))) {
      setSelected([name]);
      setRenaming(name);
    }
  };

  const paste = () => {
    const dir = vfs.getNode(store().game.fs, path);
    if (!dir || dir.type !== "dir") return;
    const { paths, cut, set } = useClipboard.getState();
    for (const src of paths) {
      const name = folderName(src);
      if (cut && parentOf(src) === path) continue;
      const fresh = vfs.getNode(store().game.fs, path) as typeof dir;
      const target = fresh.children[name] ? vfs.copyName(fresh, name) : name;
      const r = cut ? store().move(src, child(path, target)) : store().copy(src, child(path, target));
      if (!run(r)) return;
    }
    if (cut) set([], false);
  };

  const commitRename = (oldName: string, newName: string) => {
    setRenaming(null);
    const name = newName.trim();
    if (!name || name === oldName) return;
    if (run(store().move(child(path, oldName), child(path, name)))) setSelected([name]);
  };

  const deleteSelected = () => {
    for (const name of selected) if (!run(store().remove(child(path, name)))) break;
    setSelected([]);
    setConfirmDelete(false);
  };

  const onKey = (e: KeyboardEvent) => {
    if (renaming || (e.target as HTMLElement).tagName === "INPUT") return;
    const ctrl = e.ctrlKey || e.metaKey;
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
    else return;
    e.preventDefault();
  };

  const select = (name: string, additive: boolean) =>
    setSelected((s) => (additive ? (s.includes(name) ? s.filter((x) => x !== name) : [...s, name]) : [name]));

  const sel = selected.length === 1 ? items.find((i) => i.name === selected[0]) : undefined;
  const selSize = selected.reduce((s, n) => {
    const node = items.find((i) => i.name === n);
    return s + (node ? vfs.sizeOf(node) : 0);
  }, 0);
  const disk = diskUsage(g);
  const crumbs = vfs.splitPath(path);

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
            icon="app/FileExplorer"
            label={folderName(t.history[t.index])}
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
          <button type="button" onClick={() => go("C:/")}>
            {tr("explorer.localDisk")}
          </button>
          {crumbs.map((c, i) => (
            <span key={i} className="fe-crumb">
              <Icon name="icon/chevron_right" size={10} />
              <button type="button" onClick={() => go(vfs.joinPath(crumbs.slice(0, i + 1)))}>
                {c}
              </button>
            </span>
          ))}
        </div>
        <TextBox value={search} onChange={setSearch} placeholder={tr("explorer.searchIn", { name: folderName(path) })} icon="icon/search" className="fe-search" />
      </div>

      <div className="fe-commands">
        <Button variant="subtle" icon="icon/add" onClick={newFolder}>
          {tr("explorer.newFolder")}
        </Button>
        <span className="fe-sep" />
        <IconButton icon="icon/cut" label={tr("explorer.cut")} disabled={!selected.length} onClick={() => clip.set(selected.map((n) => child(path, n)), true)} />
        <IconButton icon="icon/copy" label={tr("explorer.copy")} disabled={!selected.length} onClick={() => clip.set(selected.map((n) => child(path, n)), false)} />
        <Button variant="subtle" disabled={!clip.paths.length} onClick={paste}>
          {tr("explorer.paste")}
        </Button>
        <IconButton icon="icon/rename" label={tr("explorer.rename")} disabled={selected.length !== 1} onClick={() => setRenaming(selected[0])} />
        <IconButton icon="icon/delete" label={tr("explorer.delete")} disabled={!selected.length} onClick={() => setConfirmDelete(true)} />
        <span className="fe-sep" />
        <Button
          variant="subtle"
          icon="icon/arrow_sort"
          onClick={() => setSort(sort === "name" ? "size" : sort === "size" ? "modified" : "name")}
        >
          {tr("explorer.sortBy", { sort: sort === "name" ? tr("explorer.name") : sort === "size" ? tr("explorer.size") : tr("explorer.modified") })}
        </Button>
        <span className="spacer" />
        <Button variant="subtle" icon="icon/info" className={details ? "on" : ""} onClick={() => setDetails(!details)}>
          {tr("explorer.details")}
        </Button>
      </div>

      <div className="fe-main">
        <nav className="fe-nav">
          {QUICK.map((it) => (
            <button type="button" key={it.path} className={`fe-nav-item ${path === it.path ? "on" : ""}`} onClick={() => go(it.path)}>
              <Icon name={it.icon} />
              {tr(it.label)}
            </button>
          ))}
          <span className="fe-nav-sep" />
          <button type="button" className={`fe-nav-item ${path === "C:/" ? "on" : ""}`} onClick={() => go("C:/")}>
            <Icon name="icon/desktop" />
            {tr("explorer.thisPC")}
          </button>
          <button type="button" className="fe-nav-item indent" onClick={() => go("C:/")}>
            <Icon name="icon/database" />
            {tr("explorer.localDisk")}
          </button>
        </nav>

        <div className="fe-content" ref={bodyRef} tabIndex={0} onKeyDown={onKey} onPointerDown={(e) => e.target === e.currentTarget && setSelected([])}>
          {error && <InfoBar severity="error" title={tr("explorer.error")} message={error} onClose={() => setError("")} />}
          <div className="fe-grid" onPointerDown={(e) => e.target === e.currentTarget && setSelected([])}>
            {items.map((n) => {
              const isSel = selected.includes(n.name);
              const isCut = clip.cut && clip.paths.includes(child(path, n.name));
              return (
                <div
                  key={n.name}
                  className={`fe-item ${isSel ? "selected" : ""} ${isCut ? "cut" : ""}`}
                  onPointerDown={(e) => {
                    bodyRef.current?.focus();
                    if (!isSel || e.ctrlKey) select(n.name, e.ctrlKey || e.metaKey);
                  }}
                  onDoubleClick={() => open(n)}
                  title={`${n.name}\n${typeLabel(n)} · ${fileSize(vfs.sizeOf(n))}`}
                >
                  <FileIcon node={n} size={56} />
                  {renaming === n.name ? (
                    <RenameBox name={n.name} onDone={(v) => commitRename(n.name, v)} />
                  ) : (
                    <span className="fe-name">{n.name}</span>
                  )}
                </div>
              );
            })}
            {items.length === 0 && <div className="fe-empty c-secondary">{search ? tr("explorer.noMatch") : tr("explorer.empty")}</div>}
          </div>
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
                  <KeyValue k={tr("explorer.type")} v={typeLabel(sel)} />
                  <KeyValue k={tr("explorer.size")} v={fileSize(vfs.sizeOf(sel))} />
                  {sel.type === "file" && <KeyValue k={tr("explorer.modified")} v={dateTime(sel.modified)} />}
                  {sel.type === "file" && sel.loot && (
                    <>
                      <KeyValue k={tr("explorer.tier")} v={sel.loot.tier} />
                      <KeyValue k={tr("explorer.marketValue")} v={g.soldHashes.includes(sel.loot.hash) ? tr("explorer.soldValue", { amount: credits(0) }) : credits(sel.loot.value)} />
                    </>
                  )}
                  <KeyValue k={tr("explorer.location")} v={path} />
                </div>
                <div className="fe-details-actions">
                  <Button variant="accent" onClick={() => open(sel)}>
                    {tr("explorer.open")}
                  </Button>
                  <Button onClick={() => setConfirmDelete(true)}>{tr("explorer.delete")}</Button>
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
        <span>{tr("explorer.freeOf", { free: fileSize(disk.total - disk.used), total: fileSize(disk.total) })}</span>
        <span className="fe-disk">
          <span style={{ width: `${Math.min(100, (disk.used / disk.total) * 100)}%` }} />
        </span>
      </div>

      <ContentDialog
        open={confirmDelete}
        title={selected.length > 1 ? tr("explorer.deleteMany", { count: selected.length }) : tr("explorer.deleteOne")}
        primary={tr("explorer.delete")}
        onPrimary={deleteSelected}
        onClose={() => setConfirmDelete(false)}
      >
        {selected.length === 1 ? tr("explorer.deleteOneText", { name: selected[0] }) : tr("explorer.deleteManyText")}
      </ContentDialog>
      <ContentDialog open={!!preview} title={preview?.name ?? ""} close={tr("explorer.close")} onClose={() => setPreview(null)}>
        <pre className="fe-preview">{preview?.content || tr("explorer.emptyFile")}</pre>
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

/** Folder: the yellow folder icon. File: a page with a colored band and its extension. */
export function FileIcon({ node, size }: { node: VNode; size: number }) {
  if (node.type === "dir") return <Icon name="app/FileExplorer" size={size} />;
  const kind = vfs.fileKind(node.name);
  const ext = node.name.includes(".") ? node.name.slice(node.name.lastIndexOf(".") + 1) : "";
  return (
    <span className="file-ico" style={{ width: size * 0.78, height: size, ["--band" as string]: (kind && KIND_COLOR[kind]) ?? "#9d9d9d" }}>
      <span className="file-ico-ext">{ext.slice(0, 4).toUpperCase()}</span>
    </span>
  );
}
