import type { ReactNode } from "react";
import type { Rarity } from "../game/types";
import { useT } from "../i18n";

/** Labeled progress meter (32px). value is 0..1. */
export function Meter({
  label,
  value,
  text,
  tone = "accent",
}: {
  label?: string;
  value: number;
  text?: string;
  tone?: "accent" | "success" | "caution" | "critical";
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="meter">
      {(label || text) && (
        <div className="meter-head t-caption">
          <span className="c-secondary">{label}</span>
          <span>{text ?? `${Math.round(pct)}%`}</span>
        </div>
      )}
      <div className="meter-track">
        <div className="meter-fill" style={{ width: `${pct}%`, background: `var(--${tone})` }} />
      </div>
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "success" | "caution" | "critical";
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function RarityLabel({ rarity }: { rarity: Rarity }) {
  const t = useT();
  return (
    <span className="rarity t-caption" style={{ color: `var(--rarity-${rarity.toLowerCase()})` }}>
      <span className="rarity-dot" />
      {t(`ui.rarity.${rarity}`)}
    </span>
  );
}

export function KeyValue({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="kv">
      <span className="c-secondary">{k}</span>
      <span>{v}</span>
    </div>
  );
}
