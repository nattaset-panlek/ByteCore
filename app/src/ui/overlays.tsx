import type { ReactNode } from "react";
import { Button, IconButton } from "./Button";
import { Icon } from "./Icon";
import { useT } from "../i18n";

type Severity = "info" | "success" | "warning" | "error";
const SEVERITY_ICON: Record<Severity, string> = {
  info: "icon/info",
  success: "icon/checkmark_circle",
  warning: "icon/warning",
  error: "icon/error_circle",
};

export function InfoBar({
  severity = "info",
  title,
  message,
  action,
  onClose,
}: {
  severity?: Severity;
  title: string;
  message?: string;
  action?: ReactNode;
  onClose?: () => void;
}) {
  const t = useT();
  return (
    <div className={`infobar infobar-${severity}`}>
      <Icon name={SEVERITY_ICON[severity]} />
      <div className="infobar-text">
        <span className="t-body-strong">{title}</span>
        {message && <span className="t-body">{message}</span>}
      </div>
      {action}
      {onClose && <IconButton icon="icon/dismiss" label={t("ui.close")} onClick={onClose} />}
    </div>
  );
}

/** Modal dialog. Rendered over its container (a window or the whole desktop) with a smoke layer. */
export function ContentDialog({
  open,
  title,
  children,
  primary,
  secondary,
  close,
  onPrimary,
  onSecondary,
  onClose,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  primary?: string;
  secondary?: string;
  close?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  onClose: () => void;
}) {
  const t = useT();
  if (!open) return null;
  return (
    <div className="dialog-smoke" onPointerDown={(e) => e.stopPropagation()}>
      <div className="dialog" role="dialog" aria-label={title}>
        <div className="dialog-body">
          <div className="t-subtitle">{title}</div>
          <div className="t-body">{children}</div>
        </div>
        <div className="dialog-footer">
          {primary && (
            <Button variant="accent" onClick={onPrimary}>
              {primary}
            </Button>
          )}
          {secondary && <Button onClick={onSecondary}>{secondary}</Button>}
          <Button onClick={onClose}>{close ?? t("ui.cancel")}</Button>
        </div>
      </div>
    </div>
  );
}
