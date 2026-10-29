import { useGame } from "../game/store";
import * as vfs from "../game/vfs";
import type { Msg } from "../i18n";

// File moves shared by File Explorer (paste, drag & drop) and the desktop.

export const DESKTOP_DIR = "C:/Users/ghost_user/Desktop";
/** dataTransfer type for items dragged out of an Explorer window. */
export const DRAG_MIME = "application/x-xea-paths";

export const norm = (p: string) => vfs.joinPath(vfs.splitPath(p));
export const parentOf = (p: string) => vfs.joinPath(vfs.splitPath(p).slice(0, -1));
export const childPath = (dir: string, name: string) => norm(`${dir}/${name}`);

/** Move (cut) or copy items into a folder. Name clashes get " - Copy". Returns the first error, if any. */
export function transferItems(paths: string[], dest: string, cut: boolean): Msg | null {
  const store = useGame.getState;
  const to = norm(dest);
  const dir = vfs.getNode(store().game.fs, to);
  if (!dir || dir.type !== "dir") return null;
  for (const raw of paths) {
    const src = norm(raw);
    if (cut && parentOf(src) === to) continue;
    if (src === to || to.startsWith(src + "/")) continue; // a folder onto itself
    const name = vfs.splitPath(src).pop();
    if (!name) continue;
    const fresh = vfs.getNode(store().game.fs, to) as typeof dir;
    const target = fresh.children[name] ? vfs.copyName(fresh, name) : name;
    const r = cut ? store().move(src, childPath(to, target)) : store().copy(src, childPath(to, target));
    if (!r.ok) return r.error;
  }
  return null;
}
