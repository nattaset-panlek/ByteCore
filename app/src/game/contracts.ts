import { CONTRACT_REWARD, TIER_UNLOCK_LEVEL } from "./balance";
import type { Contract, ContractGoal } from "./types";

// Contract generation (GDD 4). Goals map to hacking events the store already produces.

const GOALS: ContractGoal[] = ["crack", "pull", "sell"];
/** Per-goal factor on the reward. */
const GOAL_FACTOR: Record<ContractGoal, number> = { crack: 1, pull: 0.8, sell: 0.6 };

let seq = 0;
const cid = () => `ctr-${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

/** Tiers the player can take contracts for. */
export function contractTiers(level: number): number[] {
  const tiers = [1, 2, 3, 4].filter((t) => level >= (TIER_UNLOCK_LEVEL[t] ?? 1));
  return tiers.length ? tiers : [1];
}

/** One fresh available contract for the player's level. */
export function rollContract(level: number): Contract {
  const tiers = contractTiers(level);
  const tier = tiers[Math.floor(Math.random() * tiers.length)];
  const goal = GOALS[Math.floor(Math.random() * GOALS.length)];
  const need = goal === "pull" ? 1 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 2);
  const credits = Math.round(need * CONTRACT_REWARD[tier] * GOAL_FACTOR[goal]);
  return { id: cid(), goal, tier, need, progress: 0, reward: { credits, xp: Math.round(credits / 10) }, status: "available" };
}

/** Fill the available pool up to `size`, keeping active/completed contracts. */
export function refillContracts(contracts: Contract[], level: number, size: number): Contract[] {
  const kept = contracts.filter((c) => c.status !== "available");
  const available = contracts.filter((c) => c.status === "available");
  while (available.length < size) available.push(rollContract(level));
  return [...kept, ...available];
}

/** Advance active contracts after an action, marking any that reach their goal completed. */
export function advanceContracts(contracts: Contract[], goal: ContractGoal, tier: number): Contract[] {
  return contracts.map((c) => {
    if (c.status !== "active" || c.goal !== goal || tier < c.tier) return c;
    const progress = Math.min(c.need, c.progress + 1);
    return { ...c, progress, status: progress >= c.need ? "completed" : "active" };
  });
}
