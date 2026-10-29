import { decodePackage, decodeShortcut } from "../../game/appsdk/xjs";
import type { VNode } from "../../game/types";
import { APPS, type AppId } from "../../os/apps";
import { notify } from "../../os/toasts";
import { useWindows } from "../../os/windowStore";
import { t } from "../../i18n";

/**
 * App SDK file types, checked before the usual editor lookup in File Explorer and on the desktop:
 * .xjs opens in the IDE, an installer .exe opens Setup, a .lnk shortcut launches its app.
 * Returns false for anything else.
 */
export function openSdkFile(path: string, node: VNode): boolean {
  if (node.type !== "file") return false;
  const name = node.name.toLowerCase();
  const open = useWindows.getState().open;
  if (name.endsWith(".xjs")) {
    open("scriptEditor", { path });
    return true;
  }
  if (name.endsWith(".exe") && decodePackage(node.content)) {
    open("installer", { path });
    return true;
  }
  if (name.endsWith(".lnk")) {
    const target = decodeShortcut(node.content);
    if (target && (APPS as Record<string, unknown>)[target]) open(target as AppId);
    else notify({ title: t("sdk.lnk.brokenTitle"), message: t("sdk.lnk.brokenMsg", { name: node.name }) });
    return true;
  }
  return false;
}

/** A desktop shortcut (.lnk) shows its app's icon, like Windows. */
export function shortcutIcon(node: VNode): string | null {
  if (node.type !== "file" || !node.name.toLowerCase().endsWith(".lnk")) return null;
  const target = decodeShortcut(node.content);
  return (target && (APPS as Record<string, { icon: string } | undefined>)[target]?.icon) || null;
}
