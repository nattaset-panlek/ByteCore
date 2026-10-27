// Tuning constants. Phase 7 balances these; keep every number the economy uses here.

export const SAVE_VERSION = 2;

export const TICK_MS = 1000;
/** Offline progress is capped so a long absence cannot flood the wallet or clear all Heat. */
export const MAX_OFFLINE_MS = 8 * 60 * 60 * 1000;

/** One in-game day in real time (debt interest is charged per day). */
export const GAME_DAY_MS = 20 * 60 * 1000;

export const STARTING_BALANCE = 1500;
/** Passive income is paid out once per minute (GDD 3.5). */
export const INCOME_PAYOUT_MS = 60 * 1000;
export const STARTER_INCOME_PER_HOUR = 15;

export const HEAT_MAX = 100;
export const HEAT_DECAY_PER_MIN = 2;

export const DEBT_DAILY_INTEREST = 0.05;
export const DEBT_LIMIT = 20000;

// Risk and consequences (GDD 3.6). Bail scales with level and how much data was sold.
export const BAIL = { base: 800, perLevel: 400, perHash: 60 };
/** Base prison sentence; served in real time. */
export const PRISON_BASE_MS = 5 * 60 * 1000;
/** Each correct paperwork sheet cuts this off the sentence; a wrong one adds a little. */
export const PAPERWORK_REDUCTION_MS = 30 * 1000;
export const PAPERWORK_PENALTY_MS = 8 * 1000;
/** Time limit for the one-shot jailbreak puzzle. */
export const JAILBREAK_TIME_MS = 25 * 1000;
/** Scrub logs: careful play. Removes SCRUB_CHUNK heat for SCRUB_CHUNK × cost credits. */
export const SCRUB_CHUNK = 20;
export const SCRUB_COST_PER_POINT = 10;

/** Second-hand price = model price x factor x condition. */
export const RESELL_FACTOR = 0.5;
/** Condition lost when a part is replaced and goes to Rig Stock. */
export const REPLACE_WEAR = 15;
/** Fraction of the delivery time spent in each stage before "Delivered". */
export const ORDER_STAGES = { packed: 0.1, onTheWay: 0.35 };

export const MAX_TXNS = 300;

/** Player level needed to order parts of each tier. Locked parts show as pre-order in the shop. */
export const TIER_UNLOCK_LEVEL: Record<number, number> = { 1: 1, 2: 3, 3: 6, 4: 10 };

// Job timing (GDD 3.1). Durations in ms; see game/jobs.ts for the formulas.
export const JOB = {
  /** scan time, eased by network speed */
  scanBaseMs: 7000,
  /** probe time, eased by network speed */
  probeBaseMs: 4000,
  /** crack time = security × tier × crackK ÷ cpu power */
  crackK: 48000,
  crackMinMs: 4000,
  /** pull throughput floor in MB/s, so even the starter modem can take small files */
  pullFloorMBs: 0.8,
  /** usable fraction of the rated network speed */
  pullEfficiency: 0.8,
  pullMinMs: 1500,
};

/** How many targets a scan reveals. */
export const SCAN_COUNT: [number, number] = [2, 4];

/** XP from selling loot = value ÷ this. */
export const DATA_XP_DIVISOR = 6;
/** XP from a successful crack, scaled by tier. */
export const CRACK_XP = 20;

/** Contract reward base per tier (before the per-goal factor and count). */
export const CONTRACT_REWARD: Record<number, number> = { 1: 220, 2: 1100, 3: 5600, 4: 32000 };
/** Target size of the available-contracts pool. */
export const CONTRACT_POOL = 4;

/** Heat added by risky play (GDD 3.6). Full warrant logic is Phase 5. */
export const HEAT = {
  crackFail: 6,
  traced: 25,
  perPull: 2,
};

export function xpToNext(level: number): number {
  return Math.round(100 * Math.pow(level, 1.5));
}
