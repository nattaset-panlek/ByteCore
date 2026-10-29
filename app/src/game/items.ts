import type { FileKind, Rarity } from "./types";

// Data item database (GDD 3.4.1). Every loot file on a target or the rig points at one row here by `id`;
// the file only keeps what differs per copy (hash, size, value, source). To add a new kind of data,
// add a row: remote hosts of that tier start rolling it, and the Explorer / Exchange read it from here.
// All entries are fictional game data.

export interface DataItem {
  /** Stable id stored in save files: never rename one that has shipped. */
  id: string;
  /** File name on the target, without the extension. */
  file: string;
  ext: FileKind;
  /** Target tier it appears on (1..4). */
  tier: number;
  rarity: Rarity;
  /** Size range in MB. */
  size: [number, number];
  /** Credits at the top of the size range; smaller copies sell for less (see itemValue). */
  value: number;
}

export const DATA_ITEMS: DataItem[] = [
  // Tier 1: small shops and clubs
  { id: "t1.customers", file: "customers", ext: "db", tier: 1, rarity: "Common", size: [4, 12], value: 240 },
  { id: "t1.mailing_list", file: "mailing_list", ext: "sql", tier: 1, rarity: "Common", size: [2, 8], value: 200 },
  { id: "t1.gift_cards", file: "gift_cards", ext: "dat", tier: 1, rarity: "Rare", size: [1, 3], value: 380 },
  { id: "t1.loyalty_points", file: "loyalty_points", ext: "db", tier: 1, rarity: "Rare", size: [3, 9], value: 420 },
  { id: "t1.pos_backup", file: "pos_backup", ext: "sql", tier: 1, rarity: "Epic", size: [6, 14], value: 640 },
  { id: "t1.owner_vault", file: "owner_vault", ext: "key", tier: 1, rarity: "Legendary", size: [1, 2], value: 1100 },

  // Tier 2: regional companies
  { id: "t2.employees", file: "employees", ext: "db", tier: 2, rarity: "Common", size: [20, 60], value: 1300 },
  { id: "t2.invoices", file: "invoices", ext: "sql", tier: 2, rarity: "Common", size: [15, 40], value: 1150 },
  { id: "t2.accounts", file: "accounts", ext: "dat", tier: 2, rarity: "Rare", size: [8, 20], value: 2000 },
  { id: "t2.payroll", file: "payroll", ext: "db", tier: 2, rarity: "Rare", size: [10, 30], value: 2200 },
  { id: "t2.vpn_profiles", file: "vpn_profiles", ext: "key", tier: 2, rarity: "Epic", size: [2, 6], value: 3400 },
  { id: "t2.board_minutes", file: "board_minutes", ext: "log", tier: 2, rarity: "Legendary", size: [1, 4], value: 5800 },

  // Tier 3: banks, hospitals, utilities
  { id: "t3.ledger", file: "ledger", ext: "db", tier: 3, rarity: "Common", size: [120, 400], value: 6800 },
  { id: "t3.patient_records", file: "patient_records", ext: "sql", tier: 3, rarity: "Common", size: [80, 250], value: 6200 },
  { id: "t3.transfers", file: "transfers", ext: "dat", tier: 3, rarity: "Rare", size: [60, 150], value: 10500 },
  { id: "t3.audit_trail", file: "audit_trail", ext: "log", tier: 3, rarity: "Rare", size: [40, 120], value: 9800 },
  { id: "t3.clearing_batch", file: "clearing_batch", ext: "dat", tier: 3, rarity: "Epic", size: [30, 90], value: 17000 },
  { id: "t3.vault_keys", file: "vault_keys", ext: "key", tier: 3, rarity: "Legendary", size: [5, 20], value: 29000 },

  // Tier 4: national systems
  { id: "t4.grid_map", file: "grid_map", ext: "db", tier: 4, rarity: "Common", size: [600, 1500], value: 42000 },
  { id: "t4.contracts", file: "contracts", ext: "sql", tier: 4, rarity: "Common", size: [400, 900], value: 39000 },
  { id: "t4.relay_schedule", file: "relay_schedule", ext: "log", tier: 4, rarity: "Rare", size: [200, 500], value: 64000 },
  { id: "t4.master_keys", file: "master_keys", ext: "dat", tier: 4, rarity: "Epic", size: [200, 600], value: 105000 },
  { id: "t4.control_codes", file: "control_codes", ext: "key", tier: 4, rarity: "Legendary", size: [20, 80], value: 180000 },
];

const BY_ID = new Map(DATA_ITEMS.map((i) => [i.id, i]));

export const getItem = (id: string | undefined): DataItem | undefined => (id ? BY_ID.get(id) : undefined);

/** Items a tier can roll, by rarity. */
export const itemsFor = (tier: number, rarity: Rarity) => DATA_ITEMS.filter((i) => i.tier === tier && i.rarity === rarity);

/** Chance of each rarity per loot slot, rarest first. */
export const RARITY_ODDS: [Rarity, number][] = [
  ["Legendary", 0.05],
  ["Epic", 0.13],
  ["Rare", 0.27],
  ["Common", 1],
];

/** Sale value of one copy: bigger copies of the same item are worth more. */
export const itemValue = (item: DataItem, size: number) => Math.round(item.value * (0.6 + (0.4 * size) / item.size[1]));
