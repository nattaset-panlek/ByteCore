import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "../ui";
import { useContextMenu } from "./contextMenu";

/** Renders the active context menu at the cursor, clamped to the viewport. */
export function ContextMenu() {
  const menu = useContextMenu((s) => s.menu);
  const close = useContextMenu((s) => s.close);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    if (!menu || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos({
      x: Math.min(menu.x, window.innerWidth - r.width - 8),
      y: Math.min(menu.y, window.innerHeight - r.height - 8),
    });
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const onScroll = () => close();
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onScroll);
    };
  }, [menu, close]);

  if (!menu) return null;

  return (
    <div className="ctx-smoke" onPointerDown={close} onContextMenu={(e) => e.preventDefault()}>
      <div className="ctx-menu" ref={ref} style={{ left: pos.x, top: pos.y }} onPointerDown={(e) => e.stopPropagation()}>
        {menu.items.map((item, i) =>
          !item.label ? (
            <div key={i} className="ctx-sep" />
          ) : (
            <button
              key={i}
              type="button"
              className={`ctx-item ${item.danger ? "danger" : ""}`}
              disabled={item.disabled}
              onClick={() => {
                close();
                item.onClick?.();
              }}
            >
              {item.icon ? <Icon name={item.icon} size={16} /> : <span className="ctx-icon-gap" />}
              {item.label}
            </button>
          )
        )}
      </div>
    </div>
  );
}
