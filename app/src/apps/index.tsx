import type { ComponentType } from "react";
import type { AppId } from "../os/apps";
import { SettingsApp } from "./SettingsApp";
import { Browser } from "./browser/Browser";
import { Terminal } from "./terminal/Terminal";
import { ChimeraKit } from "./ChimeraKit";
import { Contracts } from "./Contracts";
import { TaskManager } from "./taskmgr/TaskManager";
import { ScriptEditor } from "./scriptEditor/ScriptEditor";
import { TextEditor } from "./textEditor/TextEditor";
import { PdfReader } from "./pdfReader/PdfReader";
import { Profile } from "./Profile";
import { FileExplorer } from "./FileExplorer";
import { RigManager } from "./RigManager";
import { RigStock } from "./RigStock";
import { Wallet } from "./Wallet";
import { Installer } from "./userApp/Installer";
import { UserAppHost } from "./userApp/UserAppHost";
import { LockgridApp } from "./gameplay/LockgridApp";
import { OpHud, OpsBoard } from "./gameplay/OpsBoard";
import { Relay } from "./gameplay/Relay";
import { GhostBoard } from "./gameplay/GhostBoard";
import { Trials } from "./gameplay/Trials";
import "./gameplay/gameplay.css";
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
  textEditor: TextEditor,
  pdfReader: PdfReader,
  contracts: Contracts,
  chimeraKit: ChimeraKit,
  installer: Installer,
  lockgrid: LockgridApp,
  opsBoard: OpsBoard,
  opHud: OpHud,
  relay: Relay,
  ghostBoard: GhostBoard,
  trials: Trials,
};

/** Window content for an app id; installed player apps (`user.<id>`) share the sandbox host. */
export const appComponent = (id: AppId): ComponentType => APP_COMPONENTS[id] ?? UserAppHost;
