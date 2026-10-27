import { Button, IconButton } from "./Button";
import { Icon } from "./Icon";
import { useT } from "../i18n";

export interface ToastAction {
  label: string;
  onClick?: () => void;
}

/** Toast as in Figma: app icon + name, title, message, up to 2 buttons. */
export function ToastNotification({
  icon,
  app,
  title,
  message,
  actions = [],
  onDismiss,
}: {
  icon: string;
  app: string;
  title: string;
  message?: string;
  actions?: ToastAction[];
  onDismiss: () => void;
}) {
  const t = useT();
  return (
    <div className="toast" role="status">
      <div className="toast-head">
        <Icon name={icon} />
        <span className="t-caption">{app}</span>
        <span className="spacer" />
        <IconButton icon="icon/more_horizontal" label={t("ui.more")} size={24} />
        <IconButton icon="icon/dismiss" label={t("ui.dismiss")} size={24} onClick={onDismiss} />
      </div>
      <div className="toast-body">
        <div className="t-body-strong">{title}</div>
        {message && <div className="t-body c-secondary">{message}</div>}
      </div>
      {actions.length > 0 && (
        <div className="toast-actions">
          {actions.slice(0, 2).map((a) => (
            <Button
              key={a.label}
              onClick={() => {
                a.onClick?.();
                onDismiss();
              }}
            >
              {a.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
