import { useState } from "react";
import { APPS, DESKTOP_APPS, APP_ORDER, appName, type AppId } from "./apps";
import { useWindows } from "./windowStore";
import { openContextMenu, separator, type MenuItem } from "./contextMenu";
import { Icon } from "../ui";
import { useT } from "../i18n";

/** Desktop shortcuts in a column at the top left. Click selects, double-click opens, right-click for a menu. */
export function Desktop() {
  const t = useT();
  const open = useWindows((s) => s.open);
  const [selected, setSelected] = useState<AppId | null>(null);

  const desktopMenu: MenuItem[] = [
    { label: t("ctx.refresh"), icon: "icon/arrow_clockwise", onClick: () => location.reload() },
    separator,
    ...APP_ORDER.slice(0, 4).map((id) => ({ label: t("ctx.openApp", { app: appName(id) }), icon: APPS[id].icon, onClick: () => open(id) })),
    separator,
    { label: t("ctx.personalize"), icon: "icon/paint_brush", onClick: () => open("settings") },
  ];

  return (
    <div
      className="desktop"
      onPointerDown={(e) => e.target === e.currentTarget && setSelected(null)}
      onContextMenu={(e) => openContextMenu(e, desktopMenu)}
    >
      <div className="desktop-icons">
        {DESKTOP_APPS.map((id) => (
          <button
            type="button"
            key={id}
            className={`desktop-icon ${selected === id ? "selected" : ""}`}
            onPointerDown={() => setSelected(id)}
            onDoubleClick={() => open(id)}
            onKeyDown={(e) => e.key === "Enter" && open(id)}
            onContextMenu={(e) => {
              setSelected(id);
              openContextMenu(e, [{ label: t("ctx.open"), icon: APPS[id].icon, onClick: () => open(id) }]);
            }}
          >
            <Icon name={APPS[id].icon} size={32} />
            <span>{appName(id)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
