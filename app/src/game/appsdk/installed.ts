import { msg, type TKey } from "../../i18n";
import { useGame, type Result } from "../store";
import type { InstalledApp } from "../types";
import * as vfs from "../vfs";
import { decodeShortcut, encodePackage, encodeShortcut, type XeaPackage } from "./xjs";

// Installed player apps (docs/app-sdk.md): install / uninstall, pins, and the per-app storage and files
// the sandboxed app reaches through its postMessage API. State lives in GameState.apps, so it saves.

export const DESKTOP_DIR = "C:/Users/ghost_user/Desktop";
export const DOWNLOADS_DIR = "C:/Users/ghost_user/Downloads";
export const PROGRAM_FILES = "C:/Program Files";
/** xea.storage limit per app (characters of keys + values) */
export const STORAGE_LIMIT = 256 * 1024;

export const userAppId = (id: string) => `user.${id}` as const;
export const isUserAppId = (appId: string) => appId.startsWith("user.");

const fail = (key: string, vars?: Record<string, string | number>): Result => ({ ok: false, error: msg(key as TKey, vars) });

/** A folder name that passes vfs name rules. */
const safeName = (s: string) => s.replace(/[<>:"|?*\\/]/g, "").trim() || "App";

export const getApp = (id: string) => useGame.getState().game.apps.find((a) => a.id === id);

function setApps(fn: (apps: InstalledApp[]) => InstalledApp[]) {
  useGame.setState((s) => ({ game: { ...s.game, apps: fn(s.game.apps) } }));
}

export interface InstallOptions {
  desktop: boolean;
  startMenu: boolean;
  pinned: boolean;
}

/** Install (or upgrade in place) from a package. Keeps the app's storage and data folder on upgrade. */
export function installPackage(pkg: XeaPackage, opts: InstallOptions): Result {
  const store = useGame.getState();
  const m = pkg.manifest;
  const prev = getApp(m.id);
  const dir = prev?.dir ?? `${PROGRAM_FILES}/${safeName(m.name)}`;
  let r = store.mkdir(`${dir}/data`);
  if (!r.ok) return r;
  const content = encodePackage(pkg);
  r = store.writeFile(`${dir}/${m.id}.exe`, { size: Math.max(0.05, content.length / 1e6), content });
  if (!r.ok) return r;
  if (opts.desktop) {
    r = store.writeFile(`${DESKTOP_DIR}/${safeName(m.name)}.lnk`, { size: 0.001, content: encodeShortcut(userAppId(m.id)) });
    if (!r.ok) return r;
  }
  const app: InstalledApp = {
    id: m.id,
    name: m.name,
    version: m.version,
    author: m.author,
    description: m.description,
    icon: m.icon,
    color: m.color,
    width: m.width,
    height: m.height,
    source: pkg.source,
    dir,
    installedAt: Date.now(),
    startMenu: opts.startMenu,
    pinned: opts.pinned,
    storage: prev?.storage ?? {},
  };
  setApps((apps) => [...apps.filter((a) => a.id !== m.id), app]);
  return { ok: true };
}

/** Desktop shortcut files that open this app. */
export function shortcutsFor(id: string): string[] {
  const desk = vfs.getNode(useGame.getState().game.fs, DESKTOP_DIR);
  if (desk?.type !== "dir") return [];
  return Object.values(desk.children)
    .filter((n) => n.type === "file" && n.name.toLowerCase().endsWith(".lnk") && decodeShortcut(n.content) === userAppId(id))
    .map((n) => `${DESKTOP_DIR}/${n.name}`);
}

/** Remove the app, its Program Files folder (data included) and its desktop shortcuts. */
export function uninstallApp(id: string): Result {
  const app = getApp(id);
  if (!app) return fail("sdk.err.notInstalled", { name: id });
  const store = useGame.getState();
  for (const p of shortcutsFor(id)) store.remove(p);
  if (vfs.getNode(store.game.fs, app.dir)) store.remove(app.dir);
  setApps((apps) => apps.filter((a) => a.id !== id));
  return { ok: true };
}

export function setAppFlags(id: string, flags: Partial<Pick<InstalledApp, "startMenu" | "pinned">>) {
  setApps((apps) => apps.map((a) => (a.id === id ? { ...a, ...flags } : a)));
}

export function addDesktopShortcut(id: string): Result {
  const app = getApp(id);
  if (!app) return fail("sdk.err.notInstalled", { name: id });
  if (shortcutsFor(id).length) return { ok: true };
  return useGame.getState().writeFile(`${DESKTOP_DIR}/${safeName(app.name)}.lnk`, { size: 0.001, content: encodeShortcut(userAppId(id)) });
}

// ---- runtime API backing (called by the app host for xea.storage / xea.fs) ----

export function storageSet(id: string, key: string, value: string | null): Result {
  const app = getApp(id);
  if (!app) return fail("sdk.err.notInstalled", { name: id });
  const storage = { ...app.storage };
  if (value === null) delete storage[key];
  else storage[key] = value;
  const used = Object.entries(storage).reduce((n, [k, v]) => n + k.length + v.length, 0);
  if (used > STORAGE_LIMIT) return fail("sdk.err.storageFull");
  setApps((apps) => apps.map((a) => (a.id === id ? { ...a, storage } : a)));
  return { ok: true };
}

/** Resolve a path inside the app's data folder; null if it tries to leave it. */
export function appPath(app: InstalledApp, rel: string): string | null {
  const parts = String(rel ?? "")
    .replace(/\\/g, "/")
    .split("/")
    .filter((p) => p && p !== ".");
  if (parts.some((p) => p === "..")) return null;
  return [`${app.dir}/data`, ...parts].join("/");
}
