import { getModel } from "./catalog";
import { RESELL_FACTOR } from "./balance";
import type { Part, PartKind } from "./types";

export type Rig = Record<PartKind, Part | null>;

export const SLOTS: { kind: PartKind; label: string }[] = [
  { kind: "cpu", label: "Processor" },
  { kind: "ram", label: "Memory" },
  { kind: "net", label: "Network card" },
  { kind: "disk", label: "Storage" },
];

export interface RigStats {
  /** GHz x cores */
  cpu: number;
  ramGB: number;
  netMbps: number;
  diskGB: number;
  /** Highest tier among installed parts' lowest: the rig is only as good as its weakest part. */
  tier: number;
  /** Per-part tier ("CPU Lv.2") */
  levels: Record<PartKind, number>;
}

/** Rig stats derived from the installed parts. Empty slots count as 0. */
export function rigStats(rig: Rig): RigStats {
  const value = (k: PartKind) => (rig[k] ? getModel(rig[k]!.modelId).value : 0);
  const level = (k: PartKind) => (rig[k] ? getModel(rig[k]!.modelId).tier : 0);
  const levels = { cpu: level("cpu"), ram: level("ram"), net: level("net"), disk: level("disk") };
  return {
    cpu: value("cpu"),
    ramGB: value("ram"),
    netMbps: value("net"),
    diskGB: value("disk"),
    tier: Math.min(levels.cpu, levels.ram, levels.net, levels.disk),
    levels,
  };
}

export function diskCapacityMB(rig: Rig): number {
  return rigStats(rig).diskGB * 1024;
}

/** Second-hand price for a part in Rig Stock. */
export function resellPrice(part: Part): number {
  return Math.floor(getModel(part.modelId).price * RESELL_FACTOR * (part.condition / 100));
}
