import { GAME_DAY_MS, TIER_UNLOCK_LEVEL } from "./balance";
import { makeHost } from "./network";
import type { Host } from "./types";

// Operations (docs/gameplay-ideas.md §2): multi-stage jobs on the Ops Board. Stages run on hosts made
// for the op and share one trace budget. Each stage done banks its payout; exfil at any point.

export type StageKind = "crack" | "grid" | "pull" | "vault";

export interface OpStage {
  kind: StageKind;
  /** Host the stage runs on (made at launch) */
  ip?: string;
  /** pull: files to take */
  need?: number;
  payout: number;
  optional?: boolean;
}

export interface Operation {
  id: string;
  name: string;
  tier: number;
  level: number;
  stages: OpStage[];
  /** Seconds of trace for the whole op */
  budget: number;
  /** S grade needs exfil under this many seconds */
  par: number;
  seed: number;
}

export type Grade = "S" | "A" | "B" | "C";

export interface OpRun {
  opId: string;
  op: Operation;
  startedAt: number;
  /** 0..100 */
  trace: number;
  /** Index of the stage in progress */
  stage: number;
  banked: number;
  loadout: LoadoutId[];
  /** Ghost proxies left */
  proxies: number;
  pausedUntil?: number;
  /** Files pulled for the current pull stage */
  pulled: number;
  /** 70% trace toast sent */
  warned?: boolean;
}

export interface OpResult {
  opId: string;
  name: string;
  tier: number;
  grade: Grade | "blown";
  payout: number;
  xp: number;
  timeMs: number;
  traceLeft: number;
  stagesDone: number;
  stages: number;
  drop?: string;
  at: number;
}

export interface OpsState {
  board: Operation[];
  refreshAt: number;
  active: OpRun | null;
  history: OpResult[];
  /** Op names that already earned their first S (bonus skill point once each) */
  sGrades: string[];
}

export type LoadoutId = "ghost_proxy" | "quiet_step" | "fast_hands";
export const LOADOUT: { id: LoadoutId; cost: number; glyph: string }[] = [
  { id: "ghost_proxy", cost: 250, glyph: "shield" },
  { id: "quiet_step", cost: 400, glyph: "eye" },
  { id: "fast_hands", cost: 300, glyph: "bolt" },
];
export const LOADOUT_SLOTS = 3;
export const PROXY_MS = 15_000;
export const QUIET_STEP = 0.15;
export const FAST_HANDS = 0.25;
/** Trace runs this much faster once the vault stage starts. */
export const VAULT_TRACE = 1.5;
export const BLOWN_HEAT = 40;
export const OPS_ON_BOARD = 3;
export const loadoutCost = (id: LoadoutId, tier: number) => (LOADOUT.find((l) => l.id === id)?.cost ?? 0) * tier;

const NAMES = ["Glasshouse Archive", "Copper Vein", "Night Ledger", "Velvet Switch", "Paper Moon", "Cold Harbor", "Silent Quarry", "Blue Orchard", "Iron Lantern", "Salt Mirror"];
/** Op payouts per stage are 2–3× a normal contract of the tier. */
const STAGE_PAY: Record<number, number> = { 1: 300, 2: 1400, 3: 2800, 4: 14000 };

let seq = 0;
export function rollOp(level: number, seed: number): Operation {
  // The top two unlocked tiers: ops are the big jobs.
  const tiers = [1, 2, 3, 4].filter((t) => level >= (TIER_UNLOCK_LEVEL[t] ?? 1)).slice(-2);
  const tier = tiers[(seed >>> 3) % tiers.length];
  const base = STAGE_PAY[tier];
  const pull = 2 + (seed % 2);
  const stages: OpStage[] = [
    { kind: "crack", payout: Math.round(base * 0.5) },
    { kind: "grid", payout: base },
    { kind: "pull", need: pull, payout: Math.round(base * 2) },
    { kind: "vault", payout: Math.round(base * 2.5), optional: true },
  ];
  const budget = 150 + tier * 30 + (seed % 4) * 10;
  return {
    id: `op-${Date.now().toString(36)}${(seq++).toString(36)}`,
    name: NAMES[seed % NAMES.length],
    tier,
    level: TIER_UNLOCK_LEVEL[tier] ?? 1,
    stages,
    budget,
    par: Math.round(budget * 0.85),
    seed,
  };
}

export function refillBoard(level: number, now: number, seed: number): Pick<OpsState, "board" | "refreshAt"> {
  const board: Operation[] = [];
  let s = seed;
  for (let i = 0; i < OPS_ON_BOARD; i++) {
    s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;
    board.push(rollOp(level, s));
  }
  return { board, refreshAt: Math.floor(now / GAME_DAY_MS + 1) * GAME_DAY_MS };
}

export const newOps = (level = 1, now = Date.now()): OpsState => ({ ...refillBoard(level, now, (now & 0xffff) + 7), active: null, history: [], sGrades: [] });

/** The op's hosts: entry relay, inner node (Lockgrid + archive pull), vault. Intel comes with the op, so ports are known. */
export function opHosts(op: Operation): { hosts: Host[]; stages: OpStage[] } {
  const entry = makeHost(op.seed + 11, Math.max(1, op.tier - 1));
  const inner = makeHost(op.seed + 23, op.tier);
  const vault = makeHost(op.seed + 37, Math.min(4, op.tier + 1));
  const mark = (h: Host, extraSec = 0): Host => ({ ...h, op: op.id, portsKnown: true, discovered: true, security: Math.min(10, h.security + extraSec) });
  const hosts = [mark(entry), mark(inner), mark(vault, 2)];
  const ips = [hosts[0].ip, hosts[1].ip, hosts[1].ip, hosts[2].ip];
  return { hosts, stages: op.stages.map((s, i) => ({ ...s, ip: ips[i] })) };
}

/** Trace points per second for a run. */
export function opTraceRate(run: OpRun, traceMul: number): number {
  let r = 100 / run.op.budget;
  if (run.op.stages[run.stage]?.kind === "vault") r *= VAULT_TRACE;
  if (run.loadout.includes("quiet_step")) r *= 1 - QUIET_STEP;
  return r * traceMul;
}

export function grade(timeMs: number, traceLeft: number, par: number): Grade {
  if (timeMs <= par * 1000 && traceLeft >= 50) return "S";
  if (traceLeft >= 30) return "A";
  if (traceLeft >= 15) return "B";
  return "C";
}
export const GRADE_BONUS: Record<Grade, number> = { S: 1.3, A: 1.15, B: 1, C: 0.9 };

/** Stages finished (the current index, or all of them once the last is done). */
export const stagesDone = (run: OpRun) => run.stage;
