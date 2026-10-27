import { useEffect, useState } from "react";
import { useGame } from "../../game/store";
import { useT } from "../../i18n";
import { APPS, APP_ORDER, appName } from "../../os/apps";
import { CaptionButtons, useWindow } from "../../os/Window";
import { useWindows } from "../../os/windowStore";
import { Button, ContentDialog, Icon, IconButton, TextBox } from "../../ui";
import { useNow } from "../common";
import { snapshot, type Metric, type ProcRow } from "./data";
import { Glyph } from "./glyphs";
import { Performance } from "./Performance";
import { Processes } from "./Processes";
import "./taskmgr.css";

type Page = "processes" | "performance" | "history" | "startup" | "users" | "details" | "services";

const NAV: { id: Page; glyph: string; label: string }[] = [
  { id: "processes", glyph: "grid", label: "taskmgr.processes" },
  { id: "performance", glyph: "chart", label: "taskmgr.performance" },
  { id: "history", glyph: "clock", label: "taskmgr.nav.history" },
  { id: "startup", glyph: "bolt", label: "taskmgr.nav.startup" },
  { id: "users", glyph: "user", label: "taskmgr.nav.users" },
  { id: "details", glyph: "details", label: "taskmgr.nav.details" },
  { id: "services", glyph: "services", label: "taskmgr.nav.services" },
];

const empty = (): Record<Metric, number[]> => ({ cpu: [], memory: [], disk: [], network: [] });

/** Task Manager (Figma 08 Apps): Processes and Performance pages. */
export function TaskManager() {
  const t = useT();
  const { win, dragStart } = useWindow();
  const toggleMaximize = useWindows((s) => s.toggleMaximize);
  const [page, setPage] = useState<Page>("processes");
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [metric, setMetric] = useState<Metric>("cpu");
  const [runOpen, setRunOpen] = useState(false);
  const [runText, setRunText] = useState("");
  const [runError, setRunError] = useState("");
  const [history, setHistory] = useState(empty);
  const now = useNow(1000);
  const snap = snapshot(now);

  // Sample once a second for the graphs (kept while the window is open).
  useEffect(() => {
    const id = window.setInterval(() => {
      const s = snapshot(Date.now());
      setHistory((h) => ({
        cpu: [...h.cpu.slice(-59), s.totals.cpu],
        memory: [...h.memory.slice(-59), s.totals.memory],
        disk: [...h.disk.slice(-59), s.totals.disk],
        network: [...h.network.slice(-59), s.totals.network],
      }));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const all = [...snap.apps, ...snap.background];
  const sel = all.find((r) => r.id === selected) ?? null;

  const endTask = (r: ProcRow) => {
    if (r.kind === "app" && typeof r.ref === "string") useWindows.getState().close(r.ref);
    if (r.kind === "job" && typeof r.ref === "number") useGame.getState().killJob(r.ref);
    setSelected(null);
  };
  const switchTo = (r: ProcRow) => {
    if (r.kind === "app" && typeof r.ref === "string") useWindows.getState().focus(r.ref);
  };

  const runTask = () => {
    const q = runText.trim().toLowerCase();
    const id = APP_ORDER.find((a) => a.toLowerCase() === q || appName(a).toLowerCase() === q) ?? APP_ORDER.find((a) => appName(a).toLowerCase().startsWith(q));
    if (!q || !id) {
      setRunError(t("taskmgr.runNotFound", { name: runText }));
      return;
    }
    useWindows.getState().open(id);
    setRunOpen(false);
    setRunText("");
    setRunError("");
  };

  const navItem = (n: (typeof NAV)[number]) => (
    <button type="button" key={n.id} className={`tm-nav-item ${page === n.id ? "on" : ""}`} onClick={() => setPage(n.id)} title={t(n.label)}>
      {page === n.id && <span className="nav-pill" />}
      <Glyph name={n.glyph} />
      {!collapsed && <span>{t(n.label)}</span>}
    </button>
  );

  return (
    <div className="tm">
      <div className="tm-titlebar" onPointerDown={dragStart} onDoubleClick={(e) => e.target === e.currentTarget && toggleMaximize(win.id)}>
        <span className="tm-titlebar-app">
          <Icon name={APPS.taskManager.icon} size={16} />
          <span className="t-caption">{appName("taskManager")}</span>
        </span>
        <TextBox value={query} onChange={setQuery} placeholder={t("taskmgr.search")} icon="icon/search" className="tm-search" />
        <span className="spacer" />
        <CaptionButtons />
      </div>

      <div className="tm-body">
        <nav className={`tm-nav ${collapsed ? "collapsed" : ""}`}>
          <button type="button" className="tm-nav-item" onClick={() => setCollapsed(!collapsed)} aria-label={t("taskmgr.toggleNav")}>
            <Glyph name="menu" />
          </button>
          {NAV.map(navItem)}
          <span className="spacer" />
          <button type="button" className="tm-nav-item" onClick={() => useWindows.getState().open("settings")} title={t("app.settings")}>
            <Icon name="icon/settings" size={16} />
            {!collapsed && <span>{t("app.settings")}</span>}
          </button>
        </nav>

        <div className="tm-layer">
          <div className="tm-cmdbar">
            <span className="t-body-strong">{t(NAV.find((n) => n.id === page)!.label)}</span>
            <span className="spacer" />
            <Button variant="subtle" onClick={() => setRunOpen(true)}>
              {t("taskmgr.runNewTask")}
            </Button>
            {page === "processes" && (
              <>
                <Button variant="subtle" disabled={!sel || sel.kind === "sys"} onClick={() => sel && endTask(sel)}>
                  {t("taskmgr.endTask")}
                </Button>
                <Button variant="subtle" disabled>
                  {t("taskmgr.efficiency")}
                </Button>
              </>
            )}
            <IconButton icon="icon/more_horizontal" label={t("ui.more")} />
          </div>

          {page === "processes" && (
            <Processes snap={snap} query={query} selected={selected} onSelect={setSelected} onEnd={endTask} onSwitch={switchTo} />
          )}
          {page === "performance" && <Performance snap={snap} history={history} metric={metric} onMetric={setMetric} />}
          {page !== "processes" && page !== "performance" && <div className="tm-empty c-secondary">{t("taskmgr.notAvailable")}</div>}
        </div>
      </div>

      <ContentDialog
        open={runOpen}
        title={t("taskmgr.runNewTask")}
        primary={t("taskmgr.run")}
        onPrimary={runTask}
        onClose={() => {
          setRunOpen(false);
          setRunError("");
        }}
      >
        <div className="tm-run">
          <span className="c-secondary">{t("taskmgr.runHint")}</span>
          <TextBox value={runText} onChange={setRunText} placeholder="Terminal" onKeyDown={(e) => e.key === "Enter" && runTask()} autoFocus />
          {runError && <span className="c-critical t-caption">{runError}</span>}
        </div>
      </ContentDialog>
    </div>
  );
}
