import { create } from "zustand";
import { APPS, type AppId } from "./apps";

export const TASKBAR_H = 48;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WinState extends Rect {
  id: string;
  appId: AppId;
  z: number;
  minimized: boolean;
  maximized: boolean;
  /** Launch arguments (e.g. Browser url). Re-opening a single-instance app replaces them. */
  args?: AppArgs;
}

export type AppArgs = Record<string, string> & { nonce?: string };

interface WindowStore {
  windows: WinState[];
  topZ: number;
  open: (appId: AppId, args?: Record<string, string>) => string;
  focus: (id: string) => void;
  setRect: (id: string, rect: Partial<Rect>) => void;
  setArgs: (id: string, args: AppArgs) => void;
  minimize: (id: string) => void;
  toggleMaximize: (id: string) => void;
  close: (id: string) => void;
  /** Taskbar button: open, focus, or minimize the app's window. */
  activateApp: (appId: AppId) => void;
}

let seq = 0;

/** The focused window: highest z among windows that are not minimized. */
export function activeWindow(windows: WinState[]): WinState | undefined {
  let top: WinState | undefined;
  for (const w of windows) if (!w.minimized && (!top || w.z > top.z)) top = w;
  return top;
}

export const useWindows = create<WindowStore>((set, get) => ({
  windows: [],
  topZ: 0,

  open(appId, args) {
    const app = APPS[appId];
    const withNonce = args ? { ...args, nonce: String(++seq) } : undefined;
    const existing = get().windows.find((w) => w.appId === appId);
    if (existing && !app.multiInstance) {
      if (withNonce) get().setArgs(existing.id, withNonce);
      get().focus(existing.id);
      return existing.id;
    }
    const n = get().windows.length;
    const vw = window.innerWidth;
    const vh = window.innerHeight - TASKBAR_H;
    const w = Math.min(app.size[0], vw - 40);
    const h = Math.min(app.size[1], vh - 40);
    const offset = (n % 6) * 28;
    const id = `${appId}-${++seq}`;
    const z = get().topZ + 1;
    set((s) => ({
      topZ: z,
      windows: [
        ...s.windows,
        {
          id,
          appId,
          x: Math.max(0, Math.round((vw - w) / 2) - 60 + offset),
          y: Math.max(0, Math.round((vh - h) / 2) - 30 + offset),
          w,
          h,
          z,
          minimized: false,
          maximized: false,
          args: withNonce,
        },
      ],
    }));
    return id;
  },

  focus(id) {
    const w = get().windows.find((x) => x.id === id);
    if (!w || (w.z === get().topZ && !w.minimized)) return;
    const z = get().topZ + 1;
    set((s) => ({ topZ: z, windows: s.windows.map((w) => (w.id === id ? { ...w, z, minimized: false } : w)) }));
  },

  setRect(id, rect) {
    set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, ...rect } : w)) }));
  },

  setArgs(id, args) {
    set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, args } : w)) }));
  },

  minimize(id) {
    set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, minimized: true } : w)) }));
  },

  toggleMaximize(id) {
    set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, maximized: !w.maximized } : w)) }));
  },

  close(id) {
    set((s) => ({ windows: s.windows.filter((w) => w.id !== id) }));
  },

  activateApp(appId) {
    const { windows } = get();
    const own = windows.filter((w) => w.appId === appId).sort((a, b) => b.z - a.z);
    if (own.length === 0) {
      get().open(appId);
      return;
    }
    const top = own[0];
    if (activeWindow(windows)?.id === top.id) get().minimize(top.id);
    else get().focus(top.id);
  },
}));
