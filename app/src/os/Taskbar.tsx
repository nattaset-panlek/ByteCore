import { useEffect, useRef, useState } from "react";
import { APPS, PINNED_APPS, appName, type AppId } from "./apps";
import { activeWindow, useWindows } from "./windowStore";
import { useShell } from "./shellStore";
import { Icon } from "../ui";
import { openContextMenu, separator } from "./contextMenu";
import { useGame } from "../game/store";
import { incomePerHour } from "../game/state";
import { fmt, useT } from "../i18n";
import { SCRUB_CHUNK, SCRUB_COST_PER_POINT } from "../game/balance";
import { useSettings } from "./settingsStore";
import { pinnedUserApps, useUserApps } from "./userApps";
import { userAppMenu } from "../apps/userApp/AppsPage";

/** Heat meter with a flyout to scrub logs (careful play, GDD 3.6). */
function HeatWidget({ heat, tone }: { heat: number; tone: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const scrubHeat = useGame((s) => s.scrubHeat);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);
  const cost = Math.min(SCRUB_CHUNK, Math.ceil(heat * 100)) * SCRUB_COST_PER_POINT;
  return (
    <div className="tb-heat-wrap" ref={ref}>
      <button type="button" className="tb-heat" title={t("taskbar.heat")} onClick={() => setOpen(!open)}>
        <span className="t-caption c-secondary">{t("taskbar.heat")}</span>
        <span className="tb-heat-track">
          <span className="tb-heat-fill" style={{ width: `${heat * 100}%`, background: `var(--${tone})` }} />
        </span>
        <span className="t-caption">{Math.round(heat * 100)}%</span>
      </button>
      {open && (
        <div className="menu-flyout tb-heat-menu">
          <div className="t-caption c-secondary tb-heat-note">{t("taskbar.heatHint")}</div>
          <button type="button" className="menu-item" disabled={heat <= 0} onClick={() => scrubHeat()}>
            <Icon name="icon/arrow_clockwise" /> {t("taskbar.scrub", { amount: fmt.credits(cost) })}
          </button>
        </div>
      )}
    </div>
  );
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export function Taskbar() {
  const t = useT();
  const windows = useWindows((s) => s.windows);
  const activateApp = useWindows((s) => s.activateApp);
  const { startOpen, setStart } = useShell();
  const now = useClock();
  const balance = useGame((s) => s.game.wallet.balance);
  const perHour = useGame((s) => incomePerHour(s.game));
  const heat = useGame((s) => s.game.heat) / 100;
  const prefs = useSettings((s) => s.taskbar);
  const userApps = useUserApps();

  const active = activeWindow(windows);
  const running = new Set(windows.map((w) => w.appId));
  const pinned: AppId[] = [...PINNED_APPS, ...pinnedUserApps(userApps)];
  const apps: AppId[] = [...pinned, ...[...running].filter((id) => !pinned.includes(id))];

  const heatTone = heat > 0.75 ? "critical" : heat > 0.5 ? "caution" : "success";

  return (
    <div
      className={`taskbar ${prefs.align === "left" ? "align-left" : ""} ${prefs.autoHide ? "auto-hide" : ""} ${startOpen ? "shown" : ""}`}
      onContextMenu={(e) =>
        openContextMenu(e, [
          { label: appName("taskManager"), icon: APPS.taskManager.icon, onClick: () => activateApp("taskManager") },
          { label: t("ctx.taskbarSettings"), icon: "icon/settings", onClick: () => useWindows.getState().open("settings", { page: "taskbar" }) },
        ])
      }
    >
      <div className="taskbar-left">
        {prefs.widgets && (
          <button type="button" className="tb-widget" onClick={() => activateApp("wallet")}>
            <Icon name="app/Wallet" size={20} />
            <span className="tb-widget-text">
              <span className="t-caption">{fmt.credits(balance)}</span>
              <span className="t-caption c-secondary">{t("taskbar.perHour", { amount: fmt.signedCredits(perHour) })}</span>
            </span>
          </button>
        )}
      </div>

      <div className="taskbar-center">
        <button
          type="button"
          className={`tb-btn ${startOpen ? "pressed" : ""}`}
          aria-label={t("taskbar.start")}
          data-start-toggle
          onClick={() => setStart(!startOpen)}
        >
          <Icon name="app/XeaLogo" size={24} />
        </button>
        {prefs.search !== "hide" && (
          <button
            type="button"
            className={`tb-search ${prefs.search === "icon" ? "tb-search-icon" : ""}`}
            aria-label={t("taskbar.search")}
            data-start-toggle
            onClick={() => setStart(true, "")}
          >
            <Icon name="icon/search" size={16} />
            {prefs.search === "box" && <span>{t("taskbar.search")}</span>}
          </button>
        )}
        {apps.map((id) => {
          const isRunning = running.has(id);
          const isActive = active?.appId === id;
          return (
            <button
              type="button"
              key={id}
              className={`tb-btn ${isActive ? "active" : ""}`}
              title={appName(id)}
              onClick={() => activateApp(id)}
              onContextMenu={(e) => {
                const ws = useWindows.getState();
                const own = ws.windows.filter((w) => w.appId === id);
                openContextMenu(e, [
                  { label: appName(id), icon: APPS[id].icon, onClick: () => activateApp(id) },
                  ...(APPS[id].multiInstance || own.length === 0 ? [{ label: t("ctx.newWindow"), icon: "icon/add", onClick: () => ws.open(id) }] : []),
                  ...userAppMenu(id),
                  ...(own.length ? [separator, { label: t(own.length > 1 ? "ctx.closeAll" : "ctx.closeWindow"), icon: "icon/dismiss", danger: true, onClick: () => own.forEach((w) => ws.close(w.id)) }] : []),
                ]);
              }}
            >
              <Icon name={APPS[id].icon} size={24} />
              {isRunning && prefs.badges && <span className="tb-indicator" />}
            </button>
          );
        })}
      </div>

      <div className="taskbar-right">
        {prefs.heat && <HeatWidget heat={heat} tone={heatTone} />}
        <span />
        {prefs.hiddenIcons && (
          <button type="button" className="tb-tray-btn" aria-label={t("taskbar.hiddenIcons")}>
            <Icon name="icon/chevron_up" size={12} />
          </button>
        )}
        {prefs.networkSound && (
          <button type="button" className="tb-tray-btn tb-tray-group" aria-label={t("taskbar.networkSound")}>
            <Icon name="icon/wifi_1" size={16} />
            <Icon name="icon/speaker_2" size={16} />
          </button>
        )}
        <button type="button" className="tb-tray-btn tb-clock">
          <span>{prefs.seconds ? fmt.timeSeconds(now.getTime()) : fmt.time(now.getTime())}</span>
          <span>{fmt.shortDate(now.getTime())}</span>
        </button>
      </div>
    </div>
  );
}
