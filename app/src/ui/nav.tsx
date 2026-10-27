import type { ReactNode } from "react";
import { Icon } from "./Icon";
import { IconButton } from "./Button";
import { useT } from "../i18n";

/** NavigationViewItem: 36px row, 16px image icon, 3x16 accent pill when selected. */
export function NavigationViewItem({
  icon,
  label,
  selected,
  onClick,
}: {
  icon?: string;
  label: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button type="button" className={`nav-item ${selected ? "selected" : ""}`} onClick={onClick}>
      {selected && <span className="nav-pill" />}
      {icon && <Icon name={icon} />}
      <span>{label}</span>
    </button>
  );
}

/** TabViewItem for tab-row windows. The selected tab takes the window fill and joins the content. */
export function TabViewItem({
  icon,
  label,
  selected,
  onClick,
  onClose,
}: {
  icon?: string;
  label: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  onClose?: () => void;
}) {
  const t = useT();
  return (
    <div
      className={`tab-item ${selected ? "selected" : ""}`}
      onPointerDown={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      {icon && <Icon name={icon} />}
      <span className="tab-label">{label}</span>
      {onClose && (
        <IconButton
          icon="icon/dismiss"
          label={t("ui.closeTab")}
          size={24}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        />
      )}
    </div>
  );
}
