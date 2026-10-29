import { create } from "zustand";
import type { Aspect } from "./stage";

// Personalization settings (GDD 5.1). Kept in localStorage so they persist across new identities,
// like the language. Game progress stats live in the save; these are per-device preferences.

export type AccentId = "blue" | "green" | "purple" | "amber";

export const ACCENTS: Record<AccentId, { label: string; color: string; hover: string; pressed: string; onAccent: string }> = {
  blue: { label: "Ice Blue", color: "#60cdff", hover: "#5ab9e6", pressed: "#53a5cc", onAccent: "#000000" },
  green: { label: "Neon Green", color: "#6ccb5f", hover: "#5fb853", pressed: "#53a349", onAccent: "#001400" },
  purple: { label: "Cyber Purple", color: "#d3a6ff", hover: "#c492f2", pressed: "#b17fe0", onAccent: "#13001f" },
  amber: { label: "Amber", color: "#ffb900", hover: "#e6a700", pressed: "#cc9400", onAccent: "#1a1200" },
};

/** Settings → Personalization → Taskbar. */
export interface TaskbarPrefs {
  search: "hide" | "icon" | "box";
  widgets: boolean;
  heat: boolean;
  networkSound: boolean;
  hiddenIcons: boolean;
  align: "center" | "left";
  autoHide: boolean;
  badges: boolean;
  seconds: boolean;
}

export const TASKBAR_DEFAULTS: TaskbarPrefs = {
  search: "box",
  widgets: true,
  heat: true,
  networkSound: true,
  hiddenIcons: true,
  align: "center",
  autoHide: false,
  badges: true,
  seconds: false,
};

interface Settings {
  accent: AccentId;
  reduceMotion: boolean;
  sound: boolean;
  tutorialSeen: boolean;
  /** Fixed render resolution ("WxH"); the stage scales it to fit the real window. */
  aspect: Aspect;
  resolution: string;
  /** Desktop shortcut grid cells by app id: [column, row]. Missing ids use the default column. */
  iconLayout: Record<string, [number, number]>;
  taskbar: TaskbarPrefs;
}

const KEY = "bytecore.settings";
const DEFAULTS: Settings = { accent: "blue", reduceMotion: false, sound: true, tutorialSeen: false, aspect: "16:9", resolution: "1920x1080", iconLayout: {}, taskbar: TASKBAR_DEFAULTS };

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      return { ...DEFAULTS, ...saved, taskbar: { ...TASKBAR_DEFAULTS, ...saved.taskbar } };
    }
  } catch {
    /* storage unavailable */
  }
  return { ...DEFAULTS };
}

function persist(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable */
  }
}

interface SettingsStore extends Settings {
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

export const useSettings = create<SettingsStore>((set, get) => ({
  ...load(),
  set: (key, value) => {
    set({ [key]: value } as Partial<SettingsStore>);
    const { set: _, ...rest } = get();
    persist(rest);
  },
}));

/** Apply accent + reduce-motion to the document root. Call once from the app root. */
export function applySettings(s: Pick<Settings, "accent" | "reduceMotion">) {
  const root = document.documentElement;
  const a = ACCENTS[s.accent] ?? ACCENTS.blue;
  root.style.setProperty("--accent", a.color);
  root.style.setProperty("--accent-hover", a.hover);
  root.style.setProperty("--accent-pressed", a.pressed);
  root.style.setProperty("--text-on-accent", a.onAccent);
  root.dataset.reduceMotion = s.reduceMotion ? "true" : "false";
}
