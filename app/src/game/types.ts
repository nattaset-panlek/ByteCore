export type Rarity = "Common" | "Rare" | "Epic" | "Legendary";
export type PartKind = "cpu" | "ram" | "net" | "disk" | "cool";

export interface PartModel {
  id: string;
  kind: PartKind;
  name: string;
  brand: string;
  tier: number;
  rarity: Rarity;
  price: number;
  /** Delivery time in seconds */
  eta: number;
  /** cpu: GHz x cores, ram: GB, net: Mbps, disk: GB, cool: safe temperature ceiling in °C */
  value: number;
  spec: string;
}

export interface Part {
  uid: string;
  modelId: string;
  /** 0..100, drops when a part is used and replaced */
  condition: number;
  removedAt?: number;
}

export type FileKind = "exe" | "dll" | "js" | "db" | "sql" | "dat" | "key" | "txt" | "log" | "css" | "pdf";

/** A sellable data file. Name, kind and rarity come from its database item; these fields are per copy. */
export interface Loot {
  hash: string;
  value: number;
  tier: number;
  source: string;
  /** Row id in the data item database (game/items.ts). Older saves have none: see lootRarity(). */
  item?: string;
}

export interface FileNode {
  type: "file";
  name: string;
  /** size in MB */
  size: number;
  content?: string;
  loot?: Loot;
  /** A passive module (.dll/.mod): the id in MODULES (GDD 3.2) */
  module?: string;
  modified: number;
}

export interface DirNode {
  type: "dir";
  name: string;
  children: Record<string, VNode>;
  /** Hidden system folder (AppData, ProgramData...): shown only with View > Show > Hidden items. */
  hidden?: boolean;
}

export type VNode = FileNode | DirNode;

export interface Host {
  ip: string;
  name: string;
  org: string;
  tier: number;
  /** 1..10, compared against cpu power when cracking */
  security: number;
  ports: number[];
  portsKnown: boolean;
  cracked: boolean;
  backdoor: boolean;
  miner: boolean;
  admin: "Low" | "Medium" | "High";
  discovered: boolean;
  fs: DirNode;
  /** Set on hosts made for an Operation stage (game/ops.ts) */
  op?: string;
}

export type OrderStage = 0 | 1 | 2 | 3; // Ordered, Packed, On the way, Delivered
export interface Order {
  id: string;
  modelId: string;
  price: number;
  placedAt: number;
  arrivesAt: number;
  /** delivered and notified */
  notified: boolean;
  /** moved into the rig or Rig Stock */
  claimed: boolean;
  cancelled?: boolean;
}

export interface Txn {
  id: string;
  at: number;
  /** Message key (i18n), e.g. "txn.sold". Old saves may hold plain English text. */
  label: string;
  vars?: Record<string, string | number>;
  amount: number;
  kind: "sale" | "purchase" | "mining" | "bail" | "interest" | "refund" | "proxy";
}

/** Combined passive-module bonuses (fractions). */
export interface GameModuleBonus {
  crack: number;
  heat: number;
  net: number;
}

export type ContractGoal = "crack" | "pull" | "sell";
export type ContractStatus = "available" | "active" | "completed" | "claimed";

/** A mission from the Contracts app (GDD 4). Progress is driven by hacking events. */
export interface Contract {
  id: string;
  goal: ContractGoal;
  /** Minimum target/data tier that counts */
  tier: number;
  need: number;
  progress: number;
  reward: { credits: number; xp: number };
  status: ContractStatus;
  /** Contracts offered through Relay carry the faction and the rep they give when claimed (game/factions.ts) */
  faction?: string;
  rep?: number;
}

export type JobKind = "scan" | "probe" | "crack" | "pull" | "download" | "compile";

/** A running task in the game loop (GDD 3.1). Finishes on its own; shown in Task Manager. */
export interface Job {
  id: number;
  kind: JobKind;
  /** Target address, for probe/crack/pull */
  target?: string;
  /** For pull: remote path and destination folder */
  remotePath?: string;
  destDir?: string;
  label: string;
  startedAt: number;
  /** Real time the job is expected to finish */
  endsAt: number;
  /** Share of rig CPU/network this job claims, 0..1, for Task Manager graphs */
  load: number;
  /** Lockgrid timeout fallback: crack odds penalty (fraction) */
  penalty?: number;
  /** download / compile: what to write when the job finishes (see game/appsdk/jobs.ts) */
  payload?: Record<string, string>;
}

/** The active remote connection (GDD 3.1.2). One at a time. */
export interface Session {
  ip: string;
  connectedAt: number;
  /** 0..100; a forced disconnect happens at 100 */
  trace: number;
  cwd: string;
  /** The "30 seconds left" warning has fired for this session */
  warned?: boolean;
  /** Trace stands still until this time (Ghost veil skill, Ghost proxy in an Operation) */
  pausedUntil?: number;
}

export interface Proc {
  pid: number;
  name: string;
  target?: string;
  /** 0..1 or -1 for indeterminate */
  progress: number;
  cpu: number;
  startedAt: number;
}

export interface Toast {
  id: string;
  app: string;
  icon: string;
  title: string;
  message: string;
  actions?: { label: string; run: () => void }[];
  at: number;
}

export type Legal =
  | { state: "free" }
  | { state: "warrant"; bail: number }
  | { state: "prison"; until: number; jailbreakUsed: boolean; jailbreakLocked: boolean };

/** A player-made app installed from an .install_<id>.exe package (docs/app-sdk.md). */
export interface InstalledApp {
  /** Manifest id; the window AppId is `user.<id>` */
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  icon: string;
  color: string;
  width: number;
  height: number;
  /** The .xjs source the app runs */
  source: string;
  /** Folder in Program Files; the app's files live under <dir>/data */
  dir: string;
  installedAt: number;
  startMenu: boolean;
  pinned: boolean;
  /** xea.storage key/values */
  storage: Record<string, string>;
}
