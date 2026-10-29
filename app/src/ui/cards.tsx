import { useState, type CSSProperties, type ReactNode } from "react";
import { Icon } from "./Icon";

/** Card: #2B2B2B, black 10% stroke, radius 8, pad 16, gap 10, no shadow. */
export function Card({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={`card ${className}`} style={style}>
      {children}
    </div>
  );
}

export function StatCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon?: string;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "success" | "caution" | "critical";
}) {
  return (
    <div className="card stat-card">
      <div className="stat-head">
        {icon && <Icon name={icon} />}
        <span className="t-caption c-secondary">{label}</span>
      </div>
      <div className="t-subtitle">{value}</div>
      {sub && <div className={`t-caption ${tone ? `c-${tone}` : "c-tertiary"}`}>{sub}</div>}
    </div>
  );
}

/** Settings row: icon, title + description, control on the right. */
export function SettingsCard({
  icon,
  title,
  description,
  children,
  onClick,
}: {
  icon?: string;
  title: string;
  description?: string;
  children?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <div className={`settings-card ${onClick ? "clickable" : ""}`} onClick={onClick}>
      {icon && <Icon name={icon} />}
      <div className="settings-card-text">
        <div className="t-body">{title}</div>
        {description && <div className="t-caption c-secondary">{description}</div>}
      </div>
      <div className="settings-card-control">{children}</div>
      {onClick && <Icon name="icon/chevron_right" size={12} />}
    </div>
  );
}

/** Collapsible settings group (Windows Settings expander): header row, then indented rows. */
export function SettingsExpander({
  title,
  description,
  defaultOpen = true,
  children,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`settings-expander ${open ? "open" : ""}`}>
      <button type="button" className="settings-expander-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="settings-card-text">
          <span className="t-body">{title}</span>
          {description && <span className="t-caption c-secondary">{description}</span>}
        </span>
        <Icon name="icon/chevron_down" size={12} className="settings-expander-chevron" />
      </button>
      {open && <div className="settings-expander-body">{children}</div>}
    </div>
  );
}

/** Row inside a SettingsExpander. */
export function SettingsRow({ icon, title, description, children }: { icon?: string; title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="settings-row">
      {icon ? <Icon name={icon} /> : <span className="settings-row-gap" />}
      <div className="settings-card-text">
        <div className="t-body">{title}</div>
        {description && <div className="t-caption c-secondary">{description}</div>}
      </div>
      <div className="settings-card-control">{children}</div>
    </div>
  );
}
