import { useEffect, useRef, useState } from "react";
import { APPS, PINNED_APPS, appName, type AppId } from "./apps";
import { activeWindow, useWindows } from "./windowStore";
import { useShell } from "./shellStore";
import { Icon } from "../ui";
import { useGame } from "../game/store";
import { incomePerHour } from "../game/state";
import { fmt, useT } from "../i18n";
import { SCRUB_CHUNK, SCRUB_COST_PER_POINT } from "../game/balance";

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

  const active = activeWindow(windows);
  const running = new Set(windows.map((w) => w.appId));
  const apps: AppId[] = [...PINNED_APPS, ...[...running].filter((id) => !PINNED_APPS.includes(id))];

  const heatTone = heat > 0.75 ? "critical" : heat > 0.5 ? "caution" : "success";

  return (
    <div className="taskbar">
      <div className="taskbar-left">
        <button type="button" className="tb-widget" onClick={() => activateApp("wallet")}>
          <Icon name="app/Wallet" size={20} />
          <span className="tb-widget-text">
            <span className="t-caption">{fmt.credits(balance)}</span>
            <span className="t-caption c-secondary">{t("taskbar.perHour", { amount: fmt.signedCredits(perHour) })}</span>
          </span>
        </button>
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
        <button type="button" className="tb-search" data-start-toggle onClick={() => setStart(true, "")}>
          <Icon name="icon/search" size={16} />
          <span>{t("taskbar.search")}</span>
        </button>
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
            >
              <Icon name={APPS[id].icon} size={24} />
              {isRunning && <span className="tb-indicator" />}
            </button>
          );
        })}
      </div>

      <div className="taskbar-right">
        <HeatWidget heat={heat} tone={heatTone} />
        <span />
        <button type="button" className="tb-tray-btn" aria-label={t("taskbar.hiddenIcons")}>
          <Icon name="icon/chevron_up" size={12} />
        </button>
        <button type="button" className="tb-tray-btn tb-tray-group" aria-label={t("taskbar.networkSound")}>
          <Icon name="icon/wifi_1" size={16} />
          <Icon name="icon/speaker_2" size={16} />
        </button>
        <button type="button" className="tb-tray-btn tb-clock">
          <span>{fmt.time(now.getTime())}</span>
          <span>{fmt.shortDate(now.getTime())}</span>
        </button>
      </div>
    </div>
  );
}
