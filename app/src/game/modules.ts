import type { DirNode, FileNode, GameModuleBonus } from "./types";

// Passive modules (GDD 3.2): .dll files the player installs for a flat bonus. Max MODULE_SLOTS at once.

export const MODULE_SLOTS = 3;

export type ModuleKind = "crack" | "heat" | "net";

export interface ModuleDef {
  id: string;
  /** File name it appears as on disk */
  file: string;
  kind: ModuleKind;
  /** Fractional bonus, e.g. 0.2 = +20% crack speed / -20% heat / +20% network */
  pct: number;
  tier: number;
}

export const MODULES: Record<string, ModuleDef> = {
  turbo_crack: { id: "turbo_crack", file: "turbo_crack.dll", kind: "crack", pct: 0.2, tier: 2 },
  deep_crack: { id: "deep_crack", file: "deep_crack.dll", kind: "crack", pct: 0.4, tier: 3 },
  ghost_proxy: { id: "ghost_proxy", file: "ghost_proxy.dll", kind: "heat", pct: 0.3, tier: 2 },
  phantom_proxy: { id: "phantom_proxy", file: "phantom_proxy.dll", kind: "heat", pct: 0.5, tier: 3 },
  fast_link: { id: "fast_link", file: "fast_link.dll", kind: "net", pct: 0.25, tier: 2 },
};

/** A module that can drop from a tier (or lower), or undefined. */
export function moduleForTier(tier: number, roll: number): ModuleDef | undefined {
  const pool = Object.values(MODULES).filter((m) => m.tier <= tier);
  return pool.length ? pool[Math.floor(roll * pool.length)] : undefined;
}

/** A module .dll as a VFS file. */
export function moduleFile(def: ModuleDef): Omit<FileNode, "type" | "name" | "modified"> {
  return { size: 1, module: def.id };
}

/** Every installable module file on the drive, with its path. */
export function moduleFilesOnDrive(root: DirNode): { path: string; file: FileNode }[] {
  const out: { path: string; file: FileNode }[] = [];
  const walk = (node: DirNode, prefix: string) => {
    for (const child of Object.values(node.children)) {
      const path = `${prefix}/${child.name}`;
      if (child.type === "dir") walk(child, path);
      else if (child.module) out.push({ path, file: child });
    }
  };
  walk(root, "C:");
  return out;
}

/** Combined bonuses from the installed module ids. */
export function moduleBonus(installed: string[]): GameModuleBonus {
  const bonus: GameModuleBonus = { crack: 0, heat: 0, net: 0 };
  for (const id of installed) {
    const m = MODULES[id];
    if (m) bonus[m.kind] += m.pct;
  }
  return bonus;
}
