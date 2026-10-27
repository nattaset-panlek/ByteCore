import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon } from "./Icon";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "standard" | "accent" | "subtle";
  icon?: string;
  children?: ReactNode;
};

/** Fluent Button: Standard / Accent / Subtle, 32px tall. */
export function Button({ variant = "standard", icon, className = "", children, ...rest }: ButtonProps) {
  return (
    <button type="button" className={`btn btn-${variant} ${className}`} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
    </button>
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { icon: string; size?: number; label: string };

/** Square subtle button with a single image icon. */
export function IconButton({ icon, size = 32, label, className = "", style, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      className={`icon-btn ${className}`}
      title={label}
      aria-label={label}
      style={{ width: size, height: size, ...style }}
      {...rest}
    >
      <Icon name={icon} />
    </button>
  );
}
