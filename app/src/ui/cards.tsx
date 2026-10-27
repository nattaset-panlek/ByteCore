import type { CSSProperties, ReactNode } from "react";
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
