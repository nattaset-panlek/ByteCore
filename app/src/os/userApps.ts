import { onGameEvent } from "../game/events";
import { useGame } from "../game/store";
import { userAppId } from "../game/appsdk/installed";
import { ensureSdkFiles } from "../game/appsdk/sdkFiles";
import type { InstalledApp } from "../game/types";
import { APPS, type AppDef, type AppId } from "./apps";
import { iconUrl } from "./icons";
import { notify } from "./toasts";
import { useWindows } from "./windowStore";
import { t, tm } from "../i18n";

// Player-made apps join the app registry as `user.<id>` while installed, so Start, the taskbar, the
// desktop and the window manager treat them like built-in apps (docs/app-sdk.md).

/** Relative luminance (0..1) of a #rgb / #rgba / #rrggbb / #rrggbbaa colour (alpha ignored). */
function luminance(hex: string): number {
  let h = hex.slice(1);
  if (h.length <= 4) h = [...h].map((c) => c + c).join("");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Icon for an installed app: a built-in icon name, or a tile with the emoji / letters from @icon.
 * The player picks both the glyph and @color, so nothing guarantees contrast: letters switch between white and
 * dark ink by the tile's luminance, emoji get a thin halo in that ink (a green 🐍 on a green tile stays readable),
 * and the tile gets an edge so dark colours don't vanish into the dark taskbar.
 */
export function userAppIcon(app: Pick<InstalledApp, "icon" | "color">): string {
  if (/^(app|icon)\/\w+$/.test(app.icon) && iconUrl(app.icon)) return app.icon;
  const glyph = [...app.icon].slice(0, 2).join("");
  const ascii = /^[\x20-\x7e]+$/.test(glyph);
  const light = luminance(app.color) > 0.4;
  const ink = light ? "#1a1a1a" : "#ffffff";
  const halo = ascii
    ? ""
    : `<defs><filter id="h" x="-25%" y="-25%" width="150%" height="150%">` +
      `<feMorphology in="SourceAlpha" operator="dilate" radius="1.6" result="d"/>` +
      `<feFlood flood-color="${ink}" flood-opacity="0.9"/><feComposite in2="d" operator="in" result="o"/>` +
      `<feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${halo}` +
    `<rect x="4.75" y="4.75" width="54.5" height="54.5" rx="14" fill="${app.color}" stroke="${light ? "#00000033" : "#ffffff38"}" stroke-width="1.5"/>` +
    `<text x="32" y="33" font-family="Segoe UI Emoji, Segoe UI, sans-serif" font-size="${glyph.length > 1 && ascii ? 26 : 32}" font-weight="600" fill="${ink}" text-anchor="middle" dominant-baseline="central"${ascii ? "" : ` filter="url(#h)"`}>${glyph.replace(/[<>&"]/g, "")}</text>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function defFor(app: InstalledApp): AppDef {
  return { id: userAppId(app.id), name: app.name, icon: userAppIcon(app), size: [app.width, app.height + 32], chrome: "custom", multiInstance: false };
}

let registered: AppId[] = [];

function sync(apps: InstalledApp[]) {
  const reg = APPS as Record<string, AppDef>;
  for (const id of registered) delete reg[id];
  registered = apps.map((a) => {
    const d = defFor(a);
    reg[d.id] = d;
    return d.id;
  });
}

sync(useGame.getState().game.apps);
useGame.subscribe((s, prev) => {
  if (s.game.apps !== prev.game.apps) sync(s.game.apps);
  // After the save loads, and after New game: make sure the SDK guide is in Documents.
  if (s.loaded && (!prev.loaded || s.game.createdAt !== prev.game.createdAt)) ensureSdkFiles();
});

/** Installed apps (re-renders on install / uninstall / pin changes). */
export const useUserApps = () => useGame((s) => s.game.apps);

export const startMenuApps = (apps: InstalledApp[]): AppId[] => apps.filter((a) => a.startMenu).map((a) => userAppId(a.id));
export const pinnedUserApps = (apps: InstalledApp[]): AppId[] => apps.filter((a) => a.pinned).map((a) => userAppId(a.id));

// Finished builds and downloads toast from anywhere (the IDE or Terminal may be closed by then).
const folderOf = (p: string) => p.slice(0, p.lastIndexOf("/"));
onGameEvent((e) => {
  if (e.type !== "jobComplete") return;
  const o = e.outcome;
  const open = useWindows.getState().open;
  if (o.kind === "compile") {
    if (o.ok && o.dest)
      notify({
        appId: "scriptEditor",
        title: t("sdk.compile.toastTitle"),
        message: o.dest,
        sound: "success",
        actions: [{ label: t("sdk.compile.install"), onClick: () => open("installer", { path: o.dest! }) }, { label: t("sdk.compile.open"), onClick: () => open("explorer", { path: folderOf(o.dest!) }) }],
      });
    else notify({ appId: "scriptEditor", title: t("sdk.compile.toastFail"), message: o.error, sound: "error" });
  } else if (o.kind === "download") {
    if (o.ok && o.dest)
      notify({
        appId: "browser",
        title: t("sdk.download.toast"),
        message: o.dest,
        actions: [{ label: t("ctx.open"), onClick: () => open("explorer", { path: folderOf(o.dest!) }) }, { label: t("toast.dismiss") }],
      });
    else notify({ appId: "browser", title: t("sdk.download.failed"), message: o.error ? tm(o.error) : o.url, sound: "error" });
  }
});
