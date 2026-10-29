import { CONTRACT_REWARD, GAME_DAY_MS, TIER_UNLOCK_LEVEL } from "./balance";
import type { ContractGoal } from "./types";

// Factions (docs/gameplay-ideas.md §4): Chimera, Halcyon Corp and The Static message the player in Relay.
// Offers spawn faction contracts; replies and story choices move reputation (−100..100).

export type FactionId = "chimera" | "halcyon" | "static";
export const FACTIONS: FactionId[] = ["chimera", "halcyon", "static"];
/** Who each faction leaks to (the "leak" reply sends the job to this rival). */
export const RIVAL_OF: Record<FactionId, FactionId> = { chimera: "static", halcyon: "static", static: "halcyon" };

export type RepTier = "hostile" | "neutral" | "trusted" | "inner";
export const REP_TIERS: { id: RepTier; min: number }[] = [
  { id: "hostile", min: -100 },
  { id: "neutral", min: -29 },
  { id: "trusted", min: 30 },
  { id: "inner", min: 80 },
];
export const repTier = (rep: number): RepTier => (rep >= 80 ? "inner" : rep >= 30 ? "trusted" : rep > -30 ? "neutral" : "hostile");

export interface Offer {
  goal: ContractGoal;
  tier: number;
  need: number;
  credits: number;
  /** Rep with the sender when the contract is claimed */
  rep: number;
  /** Rep shifts when leaked */
  leak: { from: number; to: number };
}

export type ChoiceId = "accept" | "counter" | "leak" | "a" | "b";

export interface RelayMsg {
  id: string;
  from: "them" | "me";
  /** i18n key, filled with vars */
  key: string;
  vars?: Record<string, string | number>;
  at: number;
  offer?: Offer;
  /** Story chapter this message opens (1..5) */
  chapter?: number;
  /** Replies still open on this message */
  choices?: ChoiceId[];
}

export interface FactionState {
  rep: Record<FactionId, number>;
  threads: Record<FactionId, RelayMsg[]>;
  /** Story chapters finished per faction (0..5) */
  chapter: Record<FactionId, number>;
  /** Ending flag from a chapter-5 choice */
  ending?: string;
  nextOfferAt: number;
  /** Messages the player hasn't opened */
  unread: Record<FactionId, number>;
}

/** Story gates per chapter: [rep, level]. */
export const CHAPTER_GATE: [number, number][] = [
  [-29, 1],
  [10, 2],
  [30, 4],
  [50, 6],
  [80, 9],
];
/** Chapters that grant a bonus skill point when finished. */
export const CHAPTER_POINT = [3, 5];
/** Rep change per story choice: [a, b] for the faction, and b also nudges the rival. */
export const STORY_REP: [number, number] = [8, -6];

export const OFFER_EVERY_MS = 0.3 * GAME_DAY_MS;

let seq = 0;
export const msgId = () => `rm-${Date.now().toString(36)}${(seq++).toString(36)}`;

export function newFactions(now = Date.now()): FactionState {
  return {
    rep: { chimera: 10, halcyon: 0, static: 0 },
    threads: { chimera: [], halcyon: [], static: [] },
    chapter: { chimera: 0, halcyon: 0, static: 0 },
    nextOfferAt: now + 90_000,
    unread: { chimera: 0, halcyon: 0, static: 0 },
  };
}

const GOAL_FOR: Record<FactionId, ContractGoal[]> = { chimera: ["crack", "pull"], halcyon: ["pull", "sell"], static: ["crack", "sell"] };

/** A job offer from a faction, a bit richer than the open contract pool. */
export function rollOffer(f: FactionId, level: number, roll: () => number): Offer {
  const tiers = [1, 2, 3, 4].filter((t) => level >= (TIER_UNLOCK_LEVEL[t] ?? 1));
  const tier = tiers[Math.floor(roll() * tiers.length)];
  const goal = GOAL_FOR[f][Math.floor(roll() * 2)];
  const need = 1 + Math.floor(roll() * 3);
  return {
    goal,
    tier,
    need,
    credits: Math.round(CONTRACT_REWARD[tier] * need * 1.25),
    rep: 6 + tier * 2,
    leak: { from: -20, to: 15 },
  };
}

/** Next chapter a faction can send, or 0 when none is open yet. */
export function openChapter(s: FactionState, f: FactionId, level: number): number {
  const done = s.chapter[f];
  if (done >= 5) return 0;
  const [rep, lv] = CHAPTER_GATE[done];
  if (s.rep[f] < rep || level < lv) return 0;
  const pending = s.threads[f].some((m) => m.chapter && m.choices?.length);
  return pending ? 0 : done + 1;
}

export const clampRep = (n: number) => Math.max(-100, Math.min(100, Math.round(n)));

/** Perks unlocked by rep tier (read by the store). */
export function factionPerks(rep: Record<FactionId, number>) {
  const t = (f: FactionId) => repTier(rep[f]);
  return {
    /** Multiplier on the Heat scrub price (Chimera) */
    scrub: t("chimera") === "inner" ? 0.5 : t("chimera") === "trusted" ? 0.7 : 1,
    /** Multiplier on Core Market prices (Halcyon) */
    market: t("halcyon") === "inner" ? 0.85 : t("halcyon") === "trusted" ? 0.9 : 1,
    /** Multiplier on bail (Halcyon legal help) */
    bail: t("halcyon") === "inner" ? 0.75 : 1,
    /** Chance a Tier 2+ crack drops a module (Static) */
    moduleDrop: t("static") === "inner" ? 0.6 : t("static") === "trusted" ? 0.45 : 0.3,
  };
}

/** A pending offer or story message waiting on a reply, newest first. */
export const pendingMsg = (s: FactionState, f: FactionId) => [...s.threads[f]].reverse().find((m) => m.choices?.length);
