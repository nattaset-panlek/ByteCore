import { GAME_DAY_MS } from "./balance";

// Skill Tree (docs/gameplay-ideas.md §7): one point per level, four branches × four tiers.
// A node opens when the player level and the points already spent in its branch meet its tier gate.

export type Branch = "code" | "stealth" | "breach" | "rig";
export type SkillId =
  | "autocomplete"
  | "snippets"
  | "error_lens"
  | "twin_threads"
  | "soft_steps"
  | "cold_trail"
  | "early_warning"
  | "ghost_veil"
  | "quick_hands"
  | "hint_tile"
  | "lucky_roll"
  | "overdrive"
  | "haggler"
  | "express"
  | "cool_head"
  | "spare_slot";

export interface SkillDef {
  id: SkillId;
  branch: Branch;
  /** 1..4 */
  tier: number;
  max: number;
  /** Used with `skill use <name>`; has a cooldown */
  active?: { cooldownMs: number; alias: string };
  /** Glyph drawn on the tile (apps/profile/SkillGlyph) */
  glyph: string;
}

export const BRANCHES: Branch[] = ["code", "stealth", "breach", "rig"];
export const BRANCH_GLYPH: Record<Branch, string> = { code: "code", stealth: "shield", breach: "unlock", rig: "wallet" };

const S = (id: SkillId, branch: Branch, tier: number, max: number, glyph: string, active?: SkillDef["active"]): SkillDef => ({ id, branch, tier, max, glyph, active });

export const SKILLS: SkillDef[] = [
  S("autocomplete", "code", 1, 3, "code"),
  S("snippets", "code", 2, 3, "document"),
  S("error_lens", "code", 3, 3, "warning"),
  S("twin_threads", "code", 4, 1, "terminal"),
  S("soft_steps", "stealth", 1, 3, "eye"),
  S("cold_trail", "stealth", 2, 3, "clock"),
  S("early_warning", "stealth", 3, 3, "info"),
  S("ghost_veil", "stealth", 4, 1, "shield", { cooldownMs: 5 * 60_000, alias: "ghost" }),
  S("quick_hands", "breach", 1, 3, "bolt"),
  S("hint_tile", "breach", 2, 3, "puzzle"),
  S("lucky_roll", "breach", 3, 3, "scale"),
  S("overdrive", "breach", 4, 1, "cpu", { cooldownMs: 10 * 60_000, alias: "overdrive" }),
  S("haggler", "rig", 1, 3, "wallet"),
  S("express", "rig", 2, 3, "cart"),
  S("cool_head", "rig", 3, 3, "chart"),
  S("spare_slot", "rig", 4, 1, "grid"),
];

export const SKILL: Record<SkillId, SkillDef> = Object.fromEntries(SKILLS.map((s) => [s.id, s])) as Record<SkillId, SkillDef>;

/** Tier gate: [player level, points spent in the branch]. */
export const TIER_GATE: Record<number, [number, number]> = { 1: [1, 0], 2: [4, 2], 3: [7, 4], 4: [10, 6] };

/** Ghost veil pauses the trace this long. */
export const GHOST_VEIL_MS = 10_000;
/** Respec price; doubles with each respec in the same game week. */
export const RESPEC_BASE = 500;
export const GAME_WEEK_MS = 7 * GAME_DAY_MS;

/** Skill data saved in the player block. */
export interface SkillState {
  ranks: Partial<Record<SkillId, number>>;
  /** Unspent points */
  points: number;
  /** Respecs done this game week, and which week that was */
  respecs: number;
  respecWeek: number;
  /** Active skill → ready again at (ms) */
  cooldowns: Partial<Record<SkillId, number>>;
  /** Overdrive armed: the next crack finishes at once */
  overdrive?: boolean;
}

export const newSkills = (level = 1): SkillState => ({ ranks: {}, points: Math.max(0, level - 1), respecs: 0, respecWeek: 0, cooldowns: {} });

export const rank = (s: SkillState | undefined, id: SkillId) => s?.ranks[id] ?? 0;
export const branchSpent = (s: SkillState, b: Branch) => SKILLS.filter((d) => d.branch === b).reduce((n, d) => n + rank(s, d.id), 0);
export const totalSpent = (s: SkillState) => SKILLS.reduce((n, d) => n + rank(s, d.id), 0);

export type SkillNodeState = "learned" | "available" | "locked" | "maxed";

/** Why a node can or can't take another rank. */
export function nodeState(s: SkillState, level: number, id: SkillId): SkillNodeState {
  const d = SKILL[id];
  const r = rank(s, id);
  if (r >= d.max) return "maxed";
  const [lv, pts] = TIER_GATE[d.tier];
  const open = level >= lv && branchSpent(s, d.branch) >= pts;
  if (!open) return r > 0 ? "learned" : "locked";
  return r > 0 ? "learned" : "available";
}

export const canLearn = (s: SkillState, level: number, id: SkillId) => s.points > 0 && rank(s, id) < SKILL[id].max && gateOpen(s, level, id);
export const gateOpen = (s: SkillState, level: number, id: SkillId) => {
  const [lv, pts] = TIER_GATE[SKILL[id].tier];
  return level >= lv && branchSpent(s, SKILL[id].branch) >= pts;
};

export const respecCost = (s: SkillState, now: number) => RESPEC_BASE * 2 ** (Math.floor(now / GAME_WEEK_MS) === s.respecWeek ? s.respecs : 0);

/** Numbers each skill changes, by rank (index = rank - 1). */
const TABLE = {
  soft_steps: [0.05, 0.1, 0.15],
  cold_trail: [0.25, 0.5, 0.75],
  early_warning: [60, 50, 40],
  quick_hands: [0.05, 0.1, 0.15],
  hint_tile: [1, 2, 3],
  lucky_roll: [0.02, 0.04, 0.06],
  haggler: [0.03, 0.06, 0.1],
  express: [0.1, 0.2, 0.3],
  cool_head: [3, 6, 10],
} as const;
type Tabled = keyof typeof TABLE;
const at = (s: SkillState | undefined, id: Tabled, fallback = 0) => {
  const r = rank(s, id);
  return r ? TABLE[id][r - 1] : fallback;
};

/** Every skill effect the game reads, folded into plain numbers. */
export function skillEffects(s: SkillState | undefined) {
  return {
    /** Multiplier on trace speed */
    trace: 1 - at(s, "soft_steps"),
    /** Multiplier on Heat decay */
    heatDecay: 1 + at(s, "cold_trail"),
    /** Trace % that fires the early warning (0 = only the 30 s warning) */
    warnAt: at(s, "early_warning"),
    /** Multiplier on crack time */
    crackTime: 1 - at(s, "quick_hands"),
    hints: at(s, "hint_tile"),
    /** Added to the crack chance */
    luck: at(s, "lucky_roll"),
    /** Multiplier on data sale value */
    sale: 1 + at(s, "haggler"),
    /** Multiplier on delivery time */
    delivery: 1 - at(s, "express"),
    /** °C added to the safe ceiling */
    coolHead: at(s, "cool_head"),
    moduleSlots: rank(s, "spare_slot"),
    scriptSlots: 1 + rank(s, "twin_threads"),
    autocomplete: rank(s, "autocomplete"),
    snippets: rank(s, "snippets"),
    errorLens: rank(s, "error_lens"),
  };
}
export type SkillEffects = ReturnType<typeof skillEffects>;

/** Effect line for a rank, for the details pane ("Trace −10%"). Rank 0 = none. */
export function effectVars(id: SkillId, r: number): Record<string, string | number> | null {
  if (r <= 0) return null;
  const pct = (n: number) => Math.round(n * 100);
  switch (id) {
    case "soft_steps":
    case "quick_hands":
    case "express":
      return { n: pct(TABLE[id][r - 1]) };
    case "cold_trail":
    case "haggler":
    case "lucky_roll":
      return { n: pct(TABLE[id][r - 1]) };
    case "early_warning":
    case "hint_tile":
    case "cool_head":
      return { n: TABLE[id][r - 1] };
    default:
      return { n: r };
  }
}

/** Find an active skill by its id or command alias. */
export function activeSkill(name: string): SkillDef | undefined {
  const n = name.toLowerCase().replace(/[\s-]/g, "_");
  return SKILLS.find((d) => d.active && (d.id === n || d.active.alias === n));
}
