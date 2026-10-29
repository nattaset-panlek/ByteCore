import { useEffect, useState } from "react";
import { addDesktopShortcut, getApp, isUserAppId, setAppFlags, uninstallApp, userAppId } from "../../game/appsdk/installed";
import { SOFT_URL } from "../../game/appsdk/catalog";
import { t, tm, useT } from "../../i18n";
import type { AppId } from "../../os/apps";
import { separator, type MenuItem } from "../../os/contextMenu";
import { userAppIcon, useUserApps } from "../../os/userApps";
import { useWindows } from "../../os/windowStore";
import { useShell } from "../../os/shellStore";
import { Button, ContentDialog, InfoBar, SettingsCard, ToggleSwitch } from "../../ui";
import { date } from "../common";
import { SDK_GUIDE_PATH } from "../../game/appsdk/sdkFiles";

/** Right-click items for an installed app (Start, taskbar): pins, desktop shortcut, uninstall. */
export function userAppMenu(appId: AppId): MenuItem[] {
  if (!isUserAppId(appId)) return [];
  const app = getApp(appId.slice("user.".length));
  if (!app) return [];
  return [
    separator,
    { label: t(app.pinned ? "sdk.ctx.unpinTaskbar" : "sdk.ctx.pinTaskbar"), icon: "icon/square_multiple", onClick: () => setAppFlags(app.id, { pinned: !app.pinned }) },
    { label: t(app.startMenu ? "sdk.ctx.unpinStart" : "sdk.ctx.pinStart"), icon: "icon/grid", onClick: () => setAppFlags(app.id, { startMenu: !app.startMenu }) },
    { label: t("sdk.ctx.desktop"), icon: "icon/desktop", onClick: () => addDesktopShortcut(app.id) },
    separator,
    {
      label: t("sdk.ctx.uninstall"),
      icon: "icon/delete",
      danger: true,
      onClick: () => {
        useShell.getState().setStart(false);
        useWindows.getState().open("settings", { page: "apps", uninstall: app.id });
      },
    },
  ];
}

/** Settings > Apps: installed player apps with Start / taskbar toggles, open and uninstall. */
export function AppsPage({ uninstall, nonce }: { uninstall?: string; nonce?: string }) {
  const tr = useT();
  const apps = useUserApps();
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const open = useWindows.getState().open;
  useEffect(() => {
    if (uninstall) setConfirm(uninstall);
  }, [uninstall, nonce]);
  const target = apps.find((a) => a.id === confirm);

  return (
    <>
      {error && <InfoBar severity="error" title={tr("sdk.setup.failed")} message={error} />}
      {apps.length === 0 && <InfoBar severity="info" title={tr("sdk.apps.title")} message={tr("sdk.apps.empty")} />}
      {apps.map((a) => (
        <SettingsCard key={a.id} icon={userAppIcon(a)} title={a.name} description={tr("sdk.apps.meta", { version: a.version, author: a.author, date: date(a.installedAt) })}>
          <span className="t-caption c-secondary">{tr("sdk.apps.startMenu")}</span>
          <ToggleSwitch checked={a.startMenu} onChange={(v) => setAppFlags(a.id, { startMenu: v })} />
          <span className="t-caption c-secondary">{tr("sdk.apps.taskbar")}</span>
          <ToggleSwitch checked={a.pinned} onChange={(v) => setAppFlags(a.id, { pinned: v })} />
          <Button onClick={() => open(userAppId(a.id))}>{tr("sdk.apps.open")}</Button>
          <Button onClick={() => setConfirm(a.id)}>{tr("sdk.apps.uninstall")}</Button>
        </SettingsCard>
      ))}
      <SettingsCard icon="icon/arrow_download" title={tr("sdk.apps.store")} description={SOFT_URL} onClick={() => open("browser", { url: SOFT_URL })} />
      <SettingsCard icon="icon/document" title={tr("sdk.apps.sdk")} description={SDK_GUIDE_PATH} onClick={() => open("pdfReader", { path: SDK_GUIDE_PATH })} />
      <ContentDialog
        open={!!target}
        title={tr("sdk.apps.confirmTitle", { name: target?.name ?? "" })}
        primary={tr("sdk.apps.uninstall")}
        onPrimary={() => {
          if (!target) return;
          const ws = useWindows.getState();
          ws.windows.filter((w) => w.appId === userAppId(target.id)).forEach((w) => ws.close(w.id));
          const r = uninstallApp(target.id);
          setError(r.ok ? null : tm(r.error));
          setConfirm(null);
        }}
        onClose={() => setConfirm(null)}
      >
        {tr("sdk.apps.confirmMsg", { dir: target?.dir ?? "" })}
      </ContentDialog>
    </>
  );
}
