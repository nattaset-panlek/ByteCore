import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "../ui";
import { useContextMenu, type MenuItem } from "./contextMenu";
import { stageSize } from "./stage";

const SUB_DELAY = 120;

function Check() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
      <path d="M2.5 6.2 5 8.6l4.6-5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** One menu panel. Hovering an item with a submenu opens it beside the panel (flipped at the screen edge). */
function Panel({ items, x, y, onDone }: { items: MenuItem[]; x: number; y: number; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });
  const [sub, setSub] = useState<{ index: number; x: number; y: number } | null>(null);
  const timer = useRef(0);
  const marks = items.some((i) => i.radio || i.checked !== undefined);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { w, h } = stageSize();
    setPos({ x: Math.max(4, Math.min(x, w - el.offsetWidth - 8)), y: Math.max(4, Math.min(y, h - el.offsetHeight - 8)) });
  }, [x, y, items]);

  const openSub = (index: number, row: HTMLElement) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const panel = ref.current;
      if (!panel) return;
      const w = panel.offsetWidth;
      const right = pos.x + w - 4;
      const { w: sw } = stageSize();
      const sx = right + 220 > sw ? pos.x - 216 : right;
      setSub({ index, x: sx, y: pos.y + row.offsetTop - 4 });
    }, SUB_DELAY);
  };

  return (
    <>
      <div className="ctx-menu" ref={ref} style={{ left: pos.x, top: pos.y }} onPointerDown={(e) => e.stopPropagation()}>
        {items.map((item, i) => {
          if (item.toolbar)
            return (
              <div key={i} className="ctx-toolbar">
                {item.toolbar.map((b, j) => (
                  <button
                    key={j}
                    type="button"
                    className="ctx-tool"
                    title={b.label}
                    aria-label={b.label}
                    disabled={b.disabled}
                    onClick={() => {
                      onDone();
                      b.onClick?.();
                    }}
                  >
                    <Icon name={b.icon ?? "icon/more_horizontal"} size={16} />
                  </button>
                ))}
              </div>
            );
          if (!item.label) return <div key={i} className="ctx-sep" />;
          return (
            <button
              key={i}
              type="button"
              className={`ctx-item ${item.danger ? "danger" : ""} ${sub?.index === i ? "open" : ""}`}
              disabled={item.disabled}
              onPointerEnter={(e) => {
                if (item.submenu) openSub(i, e.currentTarget);
                else {
                  window.clearTimeout(timer.current);
                  setSub(null);
                }
              }}
              onClick={(e) => {
                if (item.submenu) {
                  openSub(i, e.currentTarget);
                  return;
                }
                onDone();
                item.onClick?.();
              }}
            >
              {marks && <span className="ctx-mark">{item.checked ? item.radio ? <span className="ctx-dot" /> : <Check /> : null}</span>}
              {item.icon ? <Icon name={item.icon} size={16} /> : <span className="ctx-icon-gap" />}
              <span className="ctx-label">{item.label}</span>
              {item.shortcut && <span className="ctx-shortcut">{item.shortcut}</span>}
              {item.submenu && <Icon name="icon/chevron_right" size={12} className="ctx-chevron" />}
            </button>
          );
        })}
      </div>
      {sub && items[sub.index]?.submenu && <Panel items={items[sub.index].submenu!} x={sub.x} y={sub.y} onDone={onDone} />}
    </>
  );
}

/** Renders the active menu (context menu or dropdown), clamped to the screen. */
export function ContextMenu() {
  const menu = useContextMenu((s) => s.menu);
  const close = useContextMenu((s) => s.close);

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
      <Panel items={menu.items} x={menu.x} y={menu.y} onDone={close} />
    </div>
  );
}
