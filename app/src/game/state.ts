import { SAVE_VERSION, STARTER_INCOME_PER_HOUR, STARTING_BALANCE } from "./balance";
import { STARTER_RIG } from "./catalog";
import type { Rig } from "./rig";
import { refillContracts } from "./contracts";
import { BAIL, CONTRACT_POOL } from "./balance";
import type { Contract, DirNode, Host, Job, Legal, Order, Part, Session, Txn } from "./types";
import { starterDrive } from "./vfs";

export interface IncomeSource {
  id: string;
  label: string;
  perHour: number;
}

/** Everything that is saved. Plain JSON-safe data only. */
export interface GameState {
  version: number;
  createdAt: number;
  /** Time of the last processed tick (drives offline progress) */
  lastTick: number;
  player: { name: string; level: number; xp: number };
  wallet: {
    balance: number;
    debt: number;
    incomeSources: IncomeSource[];
    /** Income earned since the last payout (fractional) */
    pending: number;
    lastPayoutAt: number;
    lastInterestAt: number;
  };
  rig: Rig;
  /** Rig Stock: parts removed from the rig or received without installing */
  stock: Part[];
  orders: Order[];
  /** Newest first */
  txns: Txn[];
  /** 0..100 */
  heat: number;
  legal: Legal;
  fs: DirNode;
  /** Loot hashes already sold on a market (GDD 3.4.1) */
  soldHashes: string[];
  /** Simulated network (GDD 4) */
  net: {
    /** Seed for generating new targets; bumped each scan */
    seed: number;
    /** Discovered targets */
    hosts: Host[];
    /** The active remote session, if connected */
    session: Session | null;
  };
  /** Running jobs (scan / probe / crack / pull), continue while apps are closed */
  jobs: Job[];
  /** Next job id */
  nextJob: number;
  /** Contracts (GDD 4): available pool plus the ones in progress */
  contracts: Contract[];
  /** Installed passive module ids (GDD 3.2) */
  modules: string[];
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function newGame(now = Date.now()): GameState {
  const starter = (modelId: string): Part => ({ uid: uid("part"), modelId, condition: 100 });
  return {
    version: SAVE_VERSION,
    createdAt: now,
    lastTick: now,
    player: { name: "ghost_user", level: 1, xp: 0 },
    wallet: {
      balance: STARTING_BALANCE,
      debt: 0,
      incomeSources: [{ id: "local-miner", label: "Local rig miner", perHour: STARTER_INCOME_PER_HOUR }],
      pending: 0,
      lastPayoutAt: now,
      lastInterestAt: now,
    },
    rig: {
      cpu: starter(STARTER_RIG.cpu),
      ram: starter(STARTER_RIG.ram),
      net: starter(STARTER_RIG.net),
      disk: starter(STARTER_RIG.disk),
    },
    stock: [],
    orders: [],
    txns: [],
    heat: 0,
    legal: { state: "free" },
    fs: starterDrive(),
    soldHashes: [],
    net: { seed: Math.floor(Math.random() * 0x7fffffff) || 1, hosts: [], session: null },
    jobs: [],
    nextJob: 1,
    contracts: refillContracts([], 1, CONTRACT_POOL),
    modules: [],
  };
}

export function incomePerHour(g: GameState): number {
  return g.wallet.incomeSources.reduce((sum, s) => sum + s.perHour, 0);
}

/** Bail owed at a warrant (GDD 3.6.2): scales with level and data sold. */
export function bailAmount(g: GameState): number {
  return BAIL.base + g.player.level * BAIL.perLevel + g.soldHashes.length * BAIL.perHash;
}
