// App registry: metadata only. Components live in src/apps (see apps/index.tsx).
import { t } from "../i18n";

export type AppId =
  | "explorer"
  | "terminal"
  | "browser"
  | "rigManager"
  | "rigStock"
  | "wallet"
  | "taskManager"
  | "profile"
  | "settings"
  | "scriptEditor"
  | "textEditor"
  | "pdfReader"
  | "contracts"
  | "chimeraKit"
  | "installer"
  /** Player-made apps installed from an .xjs package (os/userApps.ts) */
  | `user.${string}`;

export interface AppDef {
  id: AppId;
  name: string;
  icon: string;
  /** Default window size [w, h] */
  size: [number, number];
  /** "titlebar": the shell draws a TitleBar. "custom": the app draws its own header (tab row, back TitleBar). */
  chrome: "titlebar" | "custom";
  multiInstance?: boolean;
}

const def = (id: AppId, name: string, icon: string, size: [number, number], chrome: AppDef["chrome"] = "titlebar", multiInstance = false): AppDef => ({
  id,
  name,
  icon,
  size,
  chrome,
  multiInstance,
});

export const APPS: Record<AppId, AppDef> = {
  explorer: def("explorer", "File Explorer", "app/FileExplorer", [1000, 640], "custom", true),
  terminal: def("terminal", "Terminal", "app/Terminal", [900, 560], "custom", true),
  browser: def("browser", "Browser", "app/Browser", [1280, 800], "custom"),
  rigManager: def("rigManager", "Rig Manager", "app/RigManager", [1100, 720], "custom"),
  rigStock: def("rigStock", "Rig Stock", "app/RigStock", [1040, 680], "custom"),
  wallet: def("wallet", "Wallet", "app/Wallet", [1040, 720], "custom"),
  taskManager: def("taskManager", "Task Manager", "app/TaskManager", [980, 640], "custom"),
  profile: def("profile", "Profile", "app/Profile", [960, 660]),
  settings: def("settings", "Settings", "app/Settings", [1100, 720], "custom"),
  scriptEditor: def("scriptEditor", "IDE", "app/IDE", [1180, 760], "custom"),
  textEditor: def("textEditor", "Text Editor", "app/TextEditor", [960, 640], "custom"),
  pdfReader: def("pdfReader", "PDF Reader", "app/PdfReader", [1000, 760], "custom", true),
  contracts: def("contracts", "Contracts", "app/Contracts", [1000, 660], "custom"),
  chimeraKit: def("chimeraKit", "Chimera Kit", "app/ChimeraKit", [1000, 660]),
  installer: def("installer", "Setup", "icon/arrow_download", [600, 460], "custom", true),
};

/** Localized app name (call inside a component that uses useT() so it re-renders). `name` is the English fallback. */
export function appName(id: AppId): string {
  const s = t(`app.${id}`);
  return s === `app.${id}` ? APPS[id].name : s;
}

export const APP_ORDER: AppId[] = [
  "explorer",
  "terminal",
  "browser",
  "chimeraKit",
  "contracts",
  "rigManager",
  "rigStock",
  "wallet",
  "taskManager",
  "scriptEditor",
  "textEditor",
  "profile",
  "settings",
];

/** Desktop shortcuts, top-left column (Figma Screen/Desktop). */
export const DESKTOP_APPS: AppId[] = ["explorer", "terminal", "browser", "scriptEditor", "textEditor", "chimeraKit", "contracts", "rigManager", "rigStock", "wallet", "taskManager", "settings"];

/** Pinned taskbar apps (Figma taskbar). */
export const PINNED_APPS: AppId[] = ["explorer", "terminal", "browser", "scriptEditor", "textEditor", "chimeraKit", "contracts", "rigManager", "rigStock", "wallet", "taskManager", "settings"];
