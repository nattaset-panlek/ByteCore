import { Component, createContext, useContext, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import { APPS, appName } from "./apps";
import { TASKBAR_H, useWindows, type Rect, type WinState } from "./windowStore";
import { Icon } from "../ui";
import { t as translate, useT } from "../i18n";

const MIN_W = 360;
const MIN_H = 220;

interface WindowCtx {
  win: WinState;
  /** Pointer-down handler for drag regions (title bar, empty tab-row space). */
  dragStart: (e: RPointerEvent) => void;
}

const Ctx = createContext<WindowCtx | null>(null);

export function useWindow(): WindowCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useWindow outside a window");
  return c;
}

/** Track a pointer drag from pointerdown until pointerup. */
function track(e: RPointerEvent, onMove: (dx: number, dy: number) => void) {
  const sx = e.clientX;
  const sy = e.clientY;
  const move = (ev: PointerEvent) => onMove(ev.clientX - sx, ev.clientY - sy);
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    document.body.classList.remove("dragging");
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  document.body.classList.add("dragging");
}

const EDGES = ["n", "s", "e", "w", "ne", "nw", "se", "sw"] as const;
type Edge = (typeof EDGES)[number];

export function Window({ win, children }: { win: WinState; children: ReactNode }) {
  const { focus, setRect } = useWindows();
  const app = APPS[win.appId];

  const dragStart = (e: RPointerEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button, input, .tab-item")) return;
    focus(win.id);
    if (win.maximized) return;
    const start = { x: win.x, y: win.y };
    track(e, (dx, dy) => {
      const maxY = window.innerHeight - TASKBAR_H - 32;
      setRect(win.id, { x: start.x + dx, y: Math.min(maxY, Math.max(0, start.y + dy)) });
    });
  };

  const resizeStart = (edge: Edge) => (e: RPointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    focus(win.id);
    const s: Rect = { x: win.x, y: win.y, w: win.w, h: win.h };
    track(e, (dx, dy) => {
      const r = { ...s };
      if (edge.includes("e")) r.w = Math.max(MIN_W, s.w + dx);
      if (edge.includes("s")) r.h = Math.max(MIN_H, s.h + dy);
      if (edge.includes("w")) {
        r.x = Math.min(s.x + dx, s.x + s.w - MIN_W);
        r.w = s.x + s.w - r.x;
      }
      if (edge.includes("n")) {
        r.y = Math.max(0, Math.min(s.y + dy, s.y + s.h - MIN_H));
        r.h = s.y + s.h - r.y;
      }
      setRect(win.id, r);
    });
  };

  const style = win.maximized
    ? { left: 0, top: 0, width: "100%", height: `calc(100% - ${TASKBAR_H}px)`, zIndex: win.z }
    : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z };

  return (
    <Ctx.Provider value={{ win, dragStart }}>
      <div
        className={`window ${win.maximized ? "maximized" : ""}`}
        style={{ ...style, display: win.minimized ? "none" : undefined }}
        onPointerDownCapture={() => focus(win.id)}
        data-app={win.appId}
      >
        {app.chrome === "titlebar" && <TitleBar />}
        <div className="window-body">
          <AppErrorBoundary withTitleBar={app.chrome === "custom"}>{children}</AppErrorBoundary>
        </div>
        {!win.maximized &&
          EDGES.map((edge) => <div key={edge} className={`resize resize-${edge}`} onPointerDown={resizeStart(edge)} />)}
      </div>
    </Ctx.Provider>
  );
}

/** Minimize / maximize / close. Close turns red on hover. */
export function CaptionButtons() {
  const t = useT();
  const { win } = useWindow();
  const { minimize, toggleMaximize, close } = useWindows();
  return (
    <div className="caption-buttons">
      <button type="button" className="caption-btn" aria-label={t("window.minimize")} onClick={() => minimize(win.id)}>
        <Icon name="icon/subtract" size={16} />
      </button>
      <button type="button" className="caption-btn" aria-label={win.maximized ? t("window.restore") : t("window.maximize")} onClick={() => toggleMaximize(win.id)}>
        <Icon name={win.maximized ? "icon/square_multiple" : "icon/maximize"} size={16} />
      </button>
      <button type="button" className="caption-btn close" aria-label={t("window.close")} onClick={() => close(win.id)}>
        <Icon name="icon/dismiss" size={16} />
      </button>
    </div>
  );
}

/** TitleBar: app icon 16 + title + caption buttons. Optional back button (Settings style). */
export function TitleBar({ title, onBack }: { title?: string; onBack?: () => void }) {
  const t = useT();
  const { win, dragStart } = useWindow();
  const { toggleMaximize } = useWindows();
  const app = APPS[win.appId];
  return (
    <div className="titlebar" onPointerDown={dragStart} onDoubleClick={() => toggleMaximize(win.id)}>
      {onBack && (
        <button type="button" className="titlebar-back" aria-label={t("window.back")} onClick={onBack}>
          <Icon name="icon/arrow_left" size={16} />
        </button>
      )}
      <Icon name={app.icon} size={16} />
      <span className="t-caption">{title ?? appName(win.appId)}</span>
      <span className="spacer" />
      <CaptionButtons />
    </div>
  );
}

/** Tab row (44px): tabs + new-tab button, empty space drags the window. */
export function TabRow({ children, onNewTab }: { children: ReactNode; onNewTab?: () => void }) {
  const t = useT();
  const { win, dragStart } = useWindow();
  const { toggleMaximize } = useWindows();
  return (
    <div className="tabrow" onPointerDown={dragStart} onDoubleClick={(e) => e.target === e.currentTarget && toggleMaximize(win.id)}>
      <div className="tabrow-tabs">
        {children}
        {onNewTab && (
          <button type="button" className="tabrow-new" aria-label={t("window.newTab")} onClick={onNewTab}>
            <Icon name="icon/add" size={16} />
          </button>
        )}
      </div>
      <span className="spacer" onDoubleClick={() => toggleMaximize(win.id)} />
      <CaptionButtons />
    </div>
  );
}

/** Settings-style layout: 320px nav column + page (pad 12/56/24/40). */
export function SettingsLayout({ nav, title, children }: { nav: ReactNode; title?: string; children: ReactNode }) {
  return (
    <div className="settings-layout">
      <nav className="settings-nav">{nav}</nav>
      <main className="settings-page">
        {title && <h1 className="t-title settings-title">{title}</h1>}
        {children}
      </main>
    </div>
  );
}

/** Keeps one crashing app from taking down the desktop: the window shows the error and can still be closed. */
class AppErrorBoundary extends Component<{ children: ReactNode; withTitleBar: boolean }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <>
        {this.props.withTitleBar && <TitleBar />}
        <div className="app-crash">
          <div className="t-subtitle">{translate("window.crashTitle")}</div>
          <pre className="t-caption c-secondary">{this.state.error.message}</pre>
          <button type="button" className="btn btn-standard" onClick={() => this.setState({ error: null })}>
            {translate("window.restartApp")}
          </button>
        </div>
      </>
    );
  }
}
