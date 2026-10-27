import type { ComponentType } from "react";
import type { AppId } from "../os/apps";
import { SettingsApp } from "./SettingsApp";
import { Browser } from "./browser/Browser";
import { Terminal } from "./terminal/Terminal";
import { ChimeraKit } from "./ChimeraKit";
import { Contracts } from "./Contracts";
import { TaskManager } from "./taskmgr/TaskManager";
import { ScriptEditor } from "./scriptEditor/ScriptEditor";
import { Profile } from "./Profile";
import { FileExplorer } from "./FileExplorer";
import { RigManager } from "./RigManager";
import { RigStock } from "./RigStock";
import { Wallet } from "./Wallet";
import "./apps.css";
import "./browser/browser.css";

/** App id → window content. Apps with chrome "custom" render their own header. */
export const APP_COMPONENTS: Record<AppId, ComponentType> = {
  explorer: FileExplorer,
  terminal: Terminal,
  browser: Browser,
  rigManager: RigManager,
  rigStock: RigStock,
  wallet: Wallet,
  taskManager: TaskManager,
  profile: Profile,
  settings: SettingsApp,
  scriptEditor: ScriptEditor,
  contracts: Contracts,
  chimeraKit: ChimeraKit,
};
