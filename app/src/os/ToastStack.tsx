import { useEffect, useState } from "react";
import { ToastNotification } from "../ui";
import { useToasts, type Toast } from "./toasts";

/** One toast with its auto-dismiss timer; hovering pauses the timer. */
function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useToasts((s) => s.dismiss);
  const [hover, setHover] = useState(false);
  useEffect(() => {
    if (!toast.duration || hover) return;
    const t = window.setTimeout(() => dismiss(toast.id), toast.duration);
    return () => window.clearTimeout(t);
  }, [toast, hover, dismiss]);
  return (
    <div className="toast-slot" onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}>
      <ToastNotification
        icon={toast.icon}
        app={toast.app}
        title={toast.title}
        message={toast.message}
        actions={toast.actions}
        onDismiss={() => dismiss(toast.id)}
      />
    </div>
  );
}

export function ToastStack() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
