import { useState, type DragEvent, type PointerEvent as RPointerEvent } from "react";
import { APPS, DESKTOP_APPS, APP_ORDER, appName, type AppId } from "./apps";
import { TASKBAR_H, useWindows } from "./windowStore";
import { openContextMenu, separator, type MenuItem } from "./contextMenu";
import { useSettings } from "./settingsStore";
import { stageDelta, toStage, useStage } from "./stage";
import { Icon } from "../ui";
import { useT } from "../i18n";
import { useGame } from "../game/store";
import * as vfs from "../game/vfs";
import type { VNode } from "../game/types";
import { EDITOR_FOR, FileIcon } from "../apps/FileExplorer";
import { openSdkFile } from "../apps/userApp/openFile";
import { pickLocalFiles } from "../apps/userApp/importLocal";
import { childPath, DESKTOP_DIR, DRAG_MIME, transferItems } from "../apps/fileOps";

// The desktop shows the app shortcuts plus whatever is in C:/Users/ghost_user/Desktop, like Windows.
// Everything sits on a snap grid; positions persist per device in settings (apps by id, files as "file:<name>").
const CELL_W = 84;
const CELL_H = 74;
const ICON_W = 80;
const ICON_H = 70;
const PAD = 16;
const DRAG_START = 4;

type Cell = [number, number];
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
type Entry = { key: string; app: AppId; node?: undefined } | { key: string; app?: undefined; node: VNode };

/** Grid cell for every entry: saved cells first, then free cells down the first columns. */
function layoutCells(keys: string[], saved: Record<string, Cell>, cols: number, rows: number): Record<string, Cell> {
  const out: Record<string, Cell> = {};
  const taken = new Set<string>();
  for (const k of keys) {
    const c = saved[k];
    if (c && c[0] < cols && c[1] < rows && !taken.has(`${c[0]},${c[1]}`)) {
      out[k] = c;
      taken.add(`${c[0]},${c[1]}`);
    }
  }
  let next = 0;
  for (const k of keys) {
    if (out[k]) continue;
    while (taken.has(`${Math.floor(next / rows)},${next % rows}`)) next++;
    out[k] = [Math.floor(next / rows), next % rows];
    taken.add(`${out[k][0]},${out[k][1]}`);
  }
  return out;
}

const pos = ([c, r]: Cell) => ({ left: PAD + c * CELL_W, top: PAD + r * CELL_H });
const overlaps = (b: Box, cell: Cell) => {
  const { left, top } = pos(cell);
  return left < b.x + b.w && left + ICON_W > b.x && top < b.y + b.h && top + ICON_H > b.y;
};
const fileKey = (name: string) => `file:${name}`;

/** Desktop: click or drag a box to select, Ctrl+click to add, drag to move or into a folder/Explorer, right-click for a menu. */
export function Desktop() {
  const t = useT();
  const open = useWindows((s) => s.open);
  const fs = useGame((s) => s.game.fs);
  const saved = useSettings((s) => s.iconLayout);
  const autoHide = useSettings((s) => s.taskbar.autoHide);
  const setSetting = useSettings((s) => s.set);
  const stage = useStage();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [blink, setBlink] = useState(false);
  const [drag, setDrag] = useState<{ keys: string[]; dc: number; dr: number; dx: number; dy: number } | null>(null);
  const [marquee, setMarquee] = useState<Box | null>(null);
  const [dropOn, setDropOn] = useState<string | null>(null);

  const deskDir = vfs.getNode(fs, DESKTOP_DIR);
  const files = deskDir?.type === "dir" ? Object.values(deskDir.children).filter((n) => !(n.type === "dir" && n.hidden)) : [];
  const entries: Entry[] = [...DESKTOP_APPS.map((app) => ({ key: app, app })), ...files.map((node) => ({ key: fileKey(node.name), node }))];
  const byKey = new Map(entries.map((e) => [e.key, e]));
  const keys = entries.map((e) => e.key);

  const reserve = autoHide ? 0 : TASKBAR_H;
  const cols = Math.max(1, Math.floor((stage.w - PAD * 2) / CELL_W));
  const rows = Math.max(1, Math.floor((stage.h - reserve - PAD * 2) / CELL_H));
  const cells = layoutCells(keys, saved, cols, rows);
  const pathOf = (e: Entry) => (e.node ? childPath(DESKTOP_DIR, e.node.name) : null);

  const openEntry = (e: Entry) => {
    if (e.app) return open(e.app);
    const p = pathOf(e)!;
    if (e.node.type === "dir") return open("explorer", { path: p });
    if (openSdkFile(p, e.node)) return;
    const kind = vfs.fileKind(e.node.name);
    const editor = kind && EDITOR_FOR[kind];
    if (editor) open(editor, { path: p });
    else open("explorer", { path: DESKTOP_DIR });
  };
  const openKeys = (ks: string[]) => ks.forEach((k) => byKey.get(k) && openEntry(byKey.get(k)!));

  // Cosmetic only, like Windows: the icons blink. The game page is never reloaded.
  const refresh = () => {
    setSelected(new Set());
    setBlink(true);
    window.setTimeout(() => setBlink(false), 120);
  };

  /** Grid offset for a drag, limited so every dragged entry stays on the grid. */
  const gridOffset = (ks: string[], dx: number, dy: number): [number, number] => {
    let dc = Math.round(dx / CELL_W);
    let dr = Math.round(dy / CELL_H);
    for (const k of ks) {
      const [c, r] = cells[k];
      dc = Math.max(-c, Math.min(cols - 1 - c, dc));
      dr = Math.max(-r, Math.min(rows - 1 - r, dr));
    }
    return [dc, dr];
  };

  const moveOnGrid = (ks: string[], dc: number, dr: number) => {
    if (!dc && !dr) return;
    const next: Record<string, Cell> = { ...cells };
    const moving = new Set(ks);
    const targets = ks.map((k) => [cells[k][0] + dc, cells[k][1] + dr] as Cell);
    const blockers = keys.filter((o) => !moving.has(o) && targets.some((c) => c[0] === cells[o][0] && c[1] === cells[o][1]));
    if (blockers.length) {
      // One icon onto another swaps them; a group onto occupied cells stays put.
      if (ks.length !== 1) return;
      next[blockers[0]] = cells[ks[0]];
    }
    ks.forEach((k, i) => (next[k] = targets[i]));
    setSetting("iconLayout", next);
  };

  /** Where a drag ends: a folder (desktop folder icon, Explorer window or nav item), or null for the desktop itself. */
  const dropPathAt = (x: number, y: number, dragged: string[]) => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-drop-path]");
    const p = el?.dataset.dropPath;
    if (!p) return null;
    // Onto one of the dragged folders, or back onto the Desktop folder itself: a plain grid move.
    if (p === DESKTOP_DIR || dragged.some((k) => byKey.get(k)?.node && pathOf(byKey.get(k)!) === p)) return null;
    return p;
  };

  const iconDown = (key: string) => (e: RPointerEvent) => {
    if (e.ctrlKey) {
      const s = new Set(selected);
      if (s.has(key)) s.delete(key);
      else s.add(key);
      setSelected(s);
      return;
    }
    const group = selected.has(key) ? [...selected] : [key];
    if (!selected.has(key)) setSelected(new Set([key]));
    if (e.button !== 0) return;
    const sx = e.clientX;
    const sy = e.clientY;
    let moved = false;
    const at = (ev: PointerEvent) => {
      const dx = stageDelta(ev.clientX - sx);
      const dy = stageDelta(ev.clientY - sy);
      const [dc, dr] = gridOffset(group, dx, dy);
      return { keys: group, dc, dr, dx, dy };
    };
    const move = (ev: PointerEvent) => {
      const d = at(ev);
      if (!moved && Math.hypot(d.dx, d.dy) < DRAG_START) return;
      moved = true;
      setDrag(d);
      setDropOn(dropPathAt(ev.clientX, ev.clientY, group));
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDrag(null);
      setDropOn(null);
      if (!moved) return;
      const dest = dropPathAt(ev.clientX, ev.clientY, group);
      const paths = group.map((k) => byKey.get(k)).filter((x): x is Entry => !!x?.node).map((x) => pathOf(x)!);
      if (dest && paths.length) transferItems(paths, dest, !ev.ctrlKey);
      else if (!dest) {
        const d = at(ev);
        moveOnGrid(d.keys, d.dc, d.dr);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // Rubber-band selection on empty desktop.
  const backgroundDown = (e: RPointerEvent) => {
    if (e.target !== e.currentTarget || e.button !== 0) return;
    const start = toStage(e.clientX, e.clientY);
    const base = e.ctrlKey ? new Set(selected) : new Set<string>();
    setSelected(base);
    const move = (ev: PointerEvent) => {
      const p = toStage(ev.clientX, ev.clientY);
      const box = { x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y) };
      setMarquee(box);
      setSelected(new Set([...base, ...keys.filter((k) => overlaps(box, cells[k]))]));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setMarquee(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // Files dragged in from File Explorer land in the Desktop folder, or in a desktop folder icon (Ctrl copies).
  const onDragOver = (e: DragEvent) => {
    if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = e.ctrlKey ? "copy" : "move";
  };
  const onDrop = (e: DragEvent) => {
    const raw = e.dataTransfer.getData(DRAG_MIME);
    if (!raw) return;
    e.preventDefault();
    const folder = (e.target as HTMLElement).closest<HTMLElement>("[data-drop-path]")?.dataset.dropPath;
    transferItems(JSON.parse(raw) as string[], folder ?? DESKTOP_DIR, !e.ctrlKey);
  };

  const removeKeys = (ks: string[]) => {
    const store = useGame.getState();
    ks.forEach((k) => {
      const e = byKey.get(k);
      if (e?.node) store.remove(pathOf(e)!);
    });
    setSelected(new Set());
  };

  const newFolder = () => {
    const d = vfs.getNode(useGame.getState().game.fs, DESKTOP_DIR);
    if (!d || d.type !== "dir") return;
    let name = t("explorer.newFolder");
    for (let i = 2; d.children[name]; i++) name = t("explorer.newFolderN", { n: String(i) });
    useGame.getState().mkdir(childPath(DESKTOP_DIR, name));
  };

  const desktopMenu: MenuItem[] = [
    { label: t("ctx.refresh"), icon: "icon/arrow_clockwise", onClick: refresh },
    { label: t("ctx.arrange"), icon: "icon/grid", onClick: () => setSetting("iconLayout", {}) },
    separator,
    { label: t("explorer.newFolder"), icon: "icon/add", onClick: newFolder },
    { label: t("sdk.ctx.importPc"), icon: "icon/arrow_download", onClick: () => pickLocalFiles(DESKTOP_DIR) },
    { label: t("ctx.showInExplorer"), icon: "app/FileExplorer", onClick: () => open("explorer", { path: DESKTOP_DIR }) },
    separator,
    ...APP_ORDER.slice(0, 4).map((id) => ({ label: t("ctx.openApp", { app: appName(id) }), icon: APPS[id].icon, onClick: () => open(id) })),
    separator,
    { label: t("ctx.personalize"), icon: "icon/paint_brush", onClick: () => open("settings") },
  ];

  return (
    <div
      className="desktop"
      style={{ bottom: reserve }}
      onPointerDown={backgroundDown}
      onContextMenu={(e) => openContextMenu(e, desktopMenu)}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="desktop-icons" style={blink ? { visibility: "hidden" } : undefined}>
        {drag && !dropOn && drag.keys.map((k) => <div key={k} className="desktop-drop" style={pos([cells[k][0] + drag.dc, cells[k][1] + drag.dr])} />)}
        {entries.map((e) => {
          const p = pos(cells[e.key]);
          const dragging = !!drag?.keys.includes(e.key);
          const folderPath = e.node?.type === "dir" ? pathOf(e)! : undefined;
          const label = e.app ? appName(e.app) : e.node.name.replace(/\.lnk$/i, "");
          return (
            <button
              type="button"
              key={e.key}
              title={label}
              data-drop-path={folderPath}
              className={`desktop-icon ${selected.has(e.key) ? "selected" : ""} ${dragging ? "dragging" : ""} ${folderPath && dropOn === folderPath ? "drop" : ""}`}
              style={dragging && drag ? { left: p.left + drag.dx, top: p.top + drag.dy } : p}
              onPointerDown={iconDown(e.key)}
              onDoubleClick={() => openEntry(e)}
              onKeyDown={(ev) => {
                const ks = selected.has(e.key) ? [...selected] : [e.key];
                if (ev.key === "Enter") openKeys(ks);
                else if (ev.key === "Delete") removeKeys(ks);
              }}
              onContextMenu={(ev) => {
                const ks = selected.has(e.key) ? [...selected] : [e.key];
                if (!selected.has(e.key)) setSelected(new Set([e.key]));
                const hasFiles = ks.some((k) => byKey.get(k)?.node);
                openContextMenu(ev, [
                  { label: t("ctx.open"), icon: e.app ? APPS[e.app].icon : "icon/document", onClick: () => openKeys(ks) },
                  ...(hasFiles
                    ? [
                        { label: t("ctx.showInExplorer"), icon: "app/FileExplorer", onClick: () => open("explorer", { path: DESKTOP_DIR }) },
                        separator,
                        { label: t("explorer.delete"), icon: "icon/delete", danger: true, onClick: () => removeKeys(ks) },
                      ]
                    : []),
                ]);
              }}
            >
              {e.app ? <Icon name={APPS[e.app].icon} size={32} /> : <FileIcon node={e.node} size={32} />}
              <span>{label}</span>
            </button>
          );
        })}
      </div>
      {marquee && <div className="desktop-marquee" style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }} />}
    </div>
  );
}
