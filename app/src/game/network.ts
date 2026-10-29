import { TIER_UNLOCK_LEVEL } from "./balance";
import { DATA_ITEMS, getItem, itemsFor, itemValue, RARITY_ODDS, type DataItem } from "./items";
import type { DirNode, FileNode, Host, Loot, Rarity } from "./types";
import { dir, file } from "./vfs";

// Simulated network (GDD 4): fictional targets generated per tier from a seed.
// Everything here is abstract game data; nothing models real systems or techniques.

/** Small deterministic RNG so a seed always gives the same host. */
export function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(list: readonly T[]): T => list[Math.floor(next() * list.length)],
    chance: (p: number) => next() < p,
  };
}

const ORGS: Record<number, string[]> = {
  1: ["Corner Pixel Arcade", "Brightside Laundry", "Juniper Book Club", "Oakline Pet Supply", "Sunny Tile Studio", "Maple Street Diner"],
  2: ["Northgate Freight", "Calder Insurance", "Vesta Hotels", "Ridgeway Telecom", "Lumen Retail Group", "Harbor Point Clinic"],
  3: ["Helix Savings Bank", "Orion Health Network", "Atlas Ministry Archive", "Meridian Power Co.", "Sable Logistics Intl."],
  4: ["Continental Grid Authority", "Aegis Defense Systems", "Polaris Central Exchange", "Hemlock National Registry"],
};

const SLUG = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Private-range style address prefix per tier (fictional, not routable). */
const IP_PREFIX: Record<number, string> = { 1: "192.168", 2: "10.0", 3: "172.16", 4: "10.10" };

const SECURITY: Record<number, [number, number]> = { 1: [1, 3], 2: [3, 5], 3: [5, 8], 4: [8, 10] };
const ADMINS = ["Low", "Medium", "High"] as const;
const PORTS = [21, 22, 25, 80, 443, 3306, 5432, 8080, 8443];

const LORE: Record<number, { name: string; text: string }[]> = {
  1: [
    { name: "notes.txt", text: "Reminder: change the back-office password after the summer intern leaves." },
    { name: "wifi.txt", text: "Guest network code is on the whiteboard. Please stop writing it on sticky notes." },
  ],
  2: [
    { name: "handover.txt", text: "Night shift: the billing export runs at 02:00. Do not interrupt it." },
    { name: "access.log", text: "vpn session opened\nvpn session closed\nbadge reader offline 11m" },
  ],
  3: [
    { name: "incident.log", text: "Ticket 4471: anomalous transfer flagged, then cleared by supervisor. No follow-up filed." },
    { name: "policy.txt", text: "Records retention: seven years. Archive quarterly. Do not email customer data." },
  ],
  4: [
    { name: "directive.txt", text: "Rotation of control keys is suspended pending the audit. Escalate nothing in writing." },
    { name: "relay.log", text: "sector 7 handshake ok\nsector 9 handshake degraded\nfailover armed" },
  ],
};

export interface HostSummary {
  ip: string;
  name: string;
  org: string;
  tier: number;
}

function rollRarity(roll: number): Rarity {
  let acc = 0;
  for (const [rarity, chance] of RARITY_ODDS) {
    acc += chance;
    if (roll < acc) return rarity;
  }
  return "Common";
}

/** A loot file's rarity, from its item in the database. Older saves have no item id: derived from the hash. */
export function lootRarity(loot: Loot): Rarity {
  const item = getItem(loot.item);
  if (item) return item.rarity;
  let h = 0;
  for (const c of loot.hash) h = (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0;
  return rollRarity((h % 10000) / 10000);
}

/** One copy of a database item: the file keeps only the item id and what differs per copy. */
function lootFile(r: ReturnType<typeof rng>, item: DataItem, host: string, seed: number): FileNode {
  const size = r.int(item.size[0], item.size[1]);
  const loot: Loot = { hash: `${host}-${item.id}-${seed.toString(36)}`, item: item.id, value: itemValue(item, size), tier: item.tier, source: host };
  return { ...file(`${item.file}.${item.ext}`, size), loot };
}

/** Roll a rarity, then an item of that rarity for the tier (falling back to commoner ones). */
function rollItem(r: ReturnType<typeof rng>, tier: number): DataItem {
  const order = RARITY_ODDS.map(([x]) => x);
  for (let i = order.indexOf(rollRarity(r.next())); i < order.length; i++) {
    const pool = itemsFor(tier, order[i]);
    if (pool.length) return r.pick(pool);
  }
  return r.pick(DATA_ITEMS);
}

/** The target's file system: a couple of lore files and the loot a `pull` can take. */
function remoteFs(r: ReturnType<typeof rng>, tier: number, host: string, seed: number): DirNode {
  const lore = LORE[tier];
  const docs = [file(r.pick(lore).name, r.int(1, 1) * 0.02, r.pick(lore).text)];
  const loot: FileNode[] = [];
  for (let i = r.int(2, 4); i > 0; i--) {
    const item = rollItem(r, tier);
    if (!loot.some((f) => f.loot?.item === item.id)) loot.push(lootFile(r, item, host, seed));
  }
  return dir(host, [dir("home", docs), dir("var", [dir("data", loot)])]);
}

/** Generate one target from a seed. The same (seed, tier) always gives the same host. */
export function makeHost(seed: number, tier: number): Host {
  const r = rng(seed * 2654435761 + tier);
  const org = r.pick(ORGS[tier]);
  const ip = `${IP_PREFIX[tier]}.${r.int(1, 254)}.${r.int(1, 254)}`;
  const name = `${SLUG(org).slice(0, 12)}-${r.pick(["node", "srv", "core", "gw"])}`;
  const [lo, hi] = SECURITY[tier];
  const portCount = r.int(2, 4);
  const ports: number[] = [];
  while (ports.length < portCount) {
    const p = r.pick(PORTS);
    if (!ports.includes(p)) ports.push(p);
  }
  // Higher tiers trace faster. Base admin on tier, nudged up or down a step.
  const adminIdx = Math.max(0, Math.min(2, tier - 2 + r.int(0, 1) + (r.chance(0.25) ? 1 : 0)));
  return {
    ip,
    name,
    org,
    tier,
    security: r.int(lo, hi),
    ports: ports.sort((a, b) => a - b),
    portsKnown: false,
    cracked: false,
    backdoor: false,
    miner: false,
    admin: ADMINS[adminIdx],
    discovered: false,
    fs: remoteFs(r, tier, name, seed),
  };
}

/** Trace speed (percent per second while connected), from the target's admin level. */
export const TRACE_PER_SEC: Record<Host["admin"], number> = { Low: 1.2, Medium: 2.2, High: 3.6 };

/** Tiers a `scan` may reveal given the player's level. */
export function scanTiers(level: number): number[] {
  const tiers = [1, 2, 3, 4].filter((t) => level >= (TIER_UNLOCK_LEVEL[t] ?? 1));
  return tiers.length ? tiers : [1];
}
