import { CONTRACT_REWARD, GAME_DAY_MS } from "./balance";

// Ghost Board (docs/gameplay-ideas.md §3): a weekly ranking against NPC operators, leagues, and races
// where a rival goes after a marked file on a host. Rival scores follow their pace through the week.

export const WEEK_MS = 7 * GAME_DAY_MS;
export const LEAGUES = ["bronze", "silver", "gold", "black"] as const;
export type League = (typeof LEAGUES)[number];
/** Rivals in higher leagues score faster. */
const LEAGUE_PACE = [1, 1.7, 2.8, 4.5];

export type RivalStyle = "speedrunner" | "ghost" | "collector" | "scripter" | "brawler";
export interface Rival {
  id: string;
  handle: string;
  style: RivalStyle;
  /** Score per real hour in Bronze */
  pace: number;
  /** Seconds a race takes this rival */
  raceSec: number;
  favTier: number;
}

export const RIVALS: Rival[] = [
  { id: "n0va", handle: "n0va", style: "speedrunner", pace: 2300, raceSec: 150, favTier: 3 },
  { id: "kestrel", handle: "Kestrel", style: "ghost", pace: 2100, raceSec: 210, favTier: 3 },
  { id: "baud_rat", handle: "baud_rat", style: "collector", pace: 1800, raceSec: 190, favTier: 2 },
  { id: "mira9", handle: "Mira-9", style: "scripter", pace: 1650, raceSec: 170, favTier: 2 },
  { id: "halt", handle: "Halt&Catch", style: "brawler", pace: 1250, raceSec: 160, favTier: 2 },
  { id: "lowpass", handle: "lowpass", style: "collector", pace: 900, raceSec: 230, favTier: 1 },
  { id: "sable", handle: "sable", style: "ghost", pace: 650, raceSec: 240, favTier: 1 },
  { id: "gl1tch", handle: "gl1tch", style: "brawler", pace: 420, raceSec: 200, favTier: 1 },
];
export const rivalById = (id: string) => RIVALS.find((r) => r.id === id);

export interface Race {
  rival: string;
  ip: string;
  /** Marked file path on the host */
  path: string;
  size: number;
  bounty: number;
  startedAt: number;
  endsAt: number;
}

export interface FeedItem {
  at: number;
  /** i18n key */
  key: string;
  vars?: Record<string, string | number>;
  rival?: string;
}

export interface RivalState {
  /** Week index (floor(now / WEEK_MS)) the scores belong to */
  week: number;
  league: number;
  /** Player score this week */
  score: number;
  race: Race | null;
  nextRaceAt: number;
  nextSnipeAt: number;
  feed: FeedItem[];
  badges: string[];
  /** Head-to-head race record per rival: [player wins, rival wins] */
  h2h: Record<string, [number, number]>;
  /** Last week's final rank, for the delta column */
  lastRank: Record<string, number>;
}

export const SCORE = { contract: 150, cleanCrack: 60, race: 300 };
export const RACE_EVERY_MS: [number, number] = [12 * 60_000, 20 * 60_000];
export const SNIPE_EVERY_MS = 9 * 60_000;
export const SNIPE_CHANCE = 0.35;
export const RANK_REWARD = [3000, 2000, 1200];
export const RANK_REWARD_REST = 300;

export const weekOf = (now: number) => Math.floor(now / WEEK_MS);

export function newRivals(now = Date.now()): RivalState {
  return { week: weekOf(now), league: 0, score: 0, race: null, nextRaceAt: now + RACE_EVERY_MS[0], nextSnipeAt: now + SNIPE_EVERY_MS, feed: [], badges: [], h2h: {}, lastRank: {} };
}

/** Deterministic noise 0.75..1.25 per rival and week. */
function noise(id: string, week: number): number {
  let h = week * 2654435761;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return 0.75 + ((h >>> 0) % 1000) / 2000;
}

/** A rival's score at `now` in the current week. */
export function rivalScore(r: Rival, s: RivalState, now: number): number {
  const into = Math.max(0, now - s.week * WEEK_MS);
  return Math.round((r.pace * LEAGUE_PACE[s.league] * noise(r.id, s.week) * into) / 3_600_000);
}

export interface Standing {
  id: string;
  handle: string;
  style: RivalStyle | "you";
  score: number;
  rank: number;
  /** Rank change vs last week (positive = up), null when new */
  delta: number | null;
}

export function standings(s: RivalState, playerName: string, now: number): Standing[] {
  const rows = [
    ...RIVALS.map((r) => ({ id: r.id, handle: r.handle, style: r.style as Standing["style"], score: rivalScore(r, s, now) })),
    { id: "you", handle: playerName, style: "you" as const, score: s.score },
  ].sort((a, b) => b.score - a.score);
  return rows.map((r, i) => ({ ...r, rank: i + 1, delta: s.lastRank[r.id] ? s.lastRank[r.id] - (i + 1) : null }));
}

export const raceBounty = (tier: number) => Math.round(CONTRACT_REWARD[tier] * 1.5);
export const weekEndsAt = (s: RivalState) => (s.week + 1) * WEEK_MS;

/** Rival's visible progress through a race (0..1) and phase. */
export function raceProgress(race: Race, now: number): { p: number; phase: "scan" | "crack" | "pull" } {
  const p = Math.max(0, Math.min(1, (now - race.startedAt) / (race.endsAt - race.startedAt)));
  return { p, phase: p < 0.2 ? "scan" : p < 0.6 ? "crack" : "pull" };
}
