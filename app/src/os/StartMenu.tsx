import { useEffect, useRef, useState } from "react";
import { APPS, APP_ORDER, appName } from "./apps";
import { useWindows } from "./windowStore";
import { useShell } from "./shellStore";
import { openContextMenu } from "./contextMenu";
import { Icon, TextBox } from "../ui";
import { useT } from "../i18n";

/** Start flyout: search, pinned app grid, user and power button. */
export function StartMenu() {
  const t = useT();
  const { startOpen, startQuery, setStart, shutDown } = useShell();
  const open = useWindows((s) => s.open);
  const [query, setQuery] = useState("");
  const [powerOpen, setPowerOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!startOpen) return;
    setQuery(startQuery);
    setPowerOpen(false);
    ref.current?.querySelector("input")?.focus();
    const close = (e: PointerEvent) => {
      const el = e.target as HTMLElement;
      if (!ref.current?.contains(el) && !el.closest("[data-start-toggle]")) setStart(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setStart(false);
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", esc);
    };
  }, [startOpen, startQuery, setStart]);

  if (!startOpen) return null;

  const q = query.trim().toLowerCase();
  const apps = APP_ORDER.filter((id) => appName(id).toLowerCase().includes(q));
  const launch = (id: (typeof APP_ORDER)[number]) => {
    open(id);
    setStart(false);
  };

  return (
    <div className="start" ref={ref}>
      <div className="start-main">
        <TextBox
          value={query}
          onChange={setQuery}
          placeholder={t("start.searchPlaceholder")}
          icon="icon/search"
          onKeyDown={(e) => e.key === "Enter" && apps[0] && launch(apps[0])}
        />
        <div className="start-section">
          <span className="t-body-strong">{q ? t("start.bestMatch") : t("start.pinned")}</span>
        </div>
        <div className="start-grid">
          {apps.map((id) => (
            <button type="button" key={id} className="start-app" onClick={() => launch(id)} onContextMenu={(e) => openContextMenu(e, [{ label: t("ctx.open"), icon: APPS[id].icon, onClick: () => launch(id) }])}>
              <Icon name={APPS[id].icon} size={32} />
              <span className="t-caption">{appName(id)}</span>
            </button>
          ))}
          {apps.length === 0 && <span className="c-tertiary">{t("start.noResults")}</span>}
        </div>
      </div>
      <div className="start-footer">
        <button type="button" className="start-user" onClick={() => launch("profile")}>
          <span className="person">GU</span>
          <span className="t-caption">ghost_user</span>
        </button>
        <div className="start-power">
          <button type="button" className="icon-btn" style={{ width: 40, height: 40 }} aria-label={t("start.power")} onClick={() => setPowerOpen(!powerOpen)}>
            <Icon name="icon/power" size={16} />
          </button>
          {powerOpen && (
            <div className="menu-flyout">
              <button type="button" className="menu-item" onClick={() => location.reload()}>
                <Icon name="icon/arrow_clockwise" /> {t("start.restart")}
              </button>
              <button type="button" className="menu-item" onClick={shutDown}>
                <Icon name="icon/power" /> {t("start.shutDown")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
