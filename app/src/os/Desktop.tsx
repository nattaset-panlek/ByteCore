import { useState } from "react";
import { APPS, DESKTOP_APPS, appName, type AppId } from "./apps";
import { useWindows } from "./windowStore";
import { Icon } from "../ui";
import { useT } from "../i18n";

/** Desktop shortcuts in a column at the top left. Click selects, double-click opens. */
export function Desktop() {
  useT();
  const open = useWindows((s) => s.open);
  const [selected, setSelected] = useState<AppId | null>(null);
  return (
    <div className="desktop" onPointerDown={(e) => e.target === e.currentTarget && setSelected(null)}>
      <div className="desktop-icons">
        {DESKTOP_APPS.map((id) => (
          <button
            type="button"
            key={id}
            className={`desktop-icon ${selected === id ? "selected" : ""}`}
            onPointerDown={() => setSelected(id)}
            onDoubleClick={() => open(id)}
            onKeyDown={(e) => e.key === "Enter" && open(id)}
          >
            <Icon name={APPS[id].icon} size={32} />
            <span>{appName(id)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
