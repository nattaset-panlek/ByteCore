import { create } from "zustand";
import type { ToastAction } from "../ui";
import { APPS, appName, type AppId } from "./apps";
import { playSound, type SoundName } from "./sound";
import { t } from "../i18n";

export interface Toast {
  id: number;
  icon: string;
  app: string;
  title: string;
  message?: string;
  actions?: ToastAction[];
  /** ms before auto dismiss; 0 keeps it until dismissed */
  duration: number;
}

export interface NotifyOptions {
  /** Sender app: sets icon and name. */
  appId?: AppId;
  icon?: string;
  app?: string;
  title: string;
  message?: string;
  actions?: ToastAction[];
  duration?: number;
  /** Sound on appear; defaults to "notify", null for silent. */
  sound?: SoundName | null;
}

const MAX_VISIBLE = 4;

interface ToastStore {
  toasts: Toast[];
  push: (t: Toast) => void;
  dismiss: (id: number) => void;
}

export const useToasts = create<ToastStore>((set) => ({
  toasts: [],
  push: (t) => set((s) => ({ toasts: [...s.toasts, t].slice(-MAX_VISIBLE) })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

let seq = 0;

/** Show a toast at the bottom right. Returns its id (for dismissToast). */
export function notify(opts: NotifyOptions): number {
  const app = opts.appId ? APPS[opts.appId] : undefined;
  const id = ++seq;
  const duration = opts.duration ?? 6000;
  useToasts.getState().push({
    id,
    icon: opts.icon ?? app?.icon ?? "app/XeaLogo",
    app: opts.app ?? (opts.appId ? appName(opts.appId) : t("toast.system")),
    title: opts.title,
    message: opts.message,
    actions: opts.actions,
    duration,
  });
  if (opts.sound !== null) playSound(opts.sound ?? "notify");
  return id;
}

export function dismissToast(id: number) {
  useToasts.getState().dismiss(id);
}
