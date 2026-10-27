import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { Icon } from "./Icon";
import { useT } from "../i18n";

type TextBoxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  value: string;
  onChange: (v: string) => void;
  icon?: string;
  header?: string;
};

/** Fluent TextBox with the accent underline on focus. */
export function TextBox({ value, onChange, icon, header, className = "", ...rest }: TextBoxProps) {
  const box = (
    <div className={`textbox ${className}`}>
      <input value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false} {...rest} />
      {icon && <Icon name={icon} />}
    </div>
  );
  if (!header) return box;
  return (
    <label className="field">
      <span className="t-body c-primary">{header}</span>
      {box}
    </label>
  );
}

export interface ComboOption<T extends string> {
  value: T;
  label: string;
}

/** Fluent ComboBox: button + flyout list. */
export function ComboBox<T extends string>({
  value,
  options,
  onChange,
  width = 160,
}: {
  value: T;
  options: ComboOption<T>[];
  onChange: (v: T) => void;
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);
  const current = options.find((o) => o.value === value);
  return (
    <div className="combo" ref={ref} style={{ width }}>
      <button type="button" className="btn btn-standard combo-btn" onClick={() => setOpen(!open)}>
        <span>{current?.label ?? ""}</span>
        <Icon name="icon/chevron_down" size={12} />
      </button>
      {open && (
        <div className="combo-list">
          {options.map((o) => (
            <button
              type="button"
              key={o.value}
              className={`combo-item ${o.value === value ? "selected" : ""}`}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const CHECK = (
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
    <path d="M2.5 6.2 5 8.6l4.6-5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function CheckBox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className={`checkbox ${checked ? "on" : ""}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="checkbox-box">{checked && CHECK}</span>
      {label && <span>{label}</span>}
    </label>
  );
}

export function ToggleSwitch({
  checked,
  onChange,
  onText,
  offText,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  onText?: string;
  offText?: string;
}) {
  const t = useT();
  return (
    <label className={`toggle ${checked ? "on" : ""}`}>
      <span>{checked ? (onText ?? t("ui.on")) : (offText ?? t("ui.off"))}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track">
        <span className="toggle-thumb" />
      </span>
    </label>
  );
}
