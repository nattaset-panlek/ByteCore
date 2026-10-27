import type { PartKind, PartModel, Rarity } from "./types";

// Parts catalog, Tier 1-4 (GDD 4). Brands are fictional placeholders.
// value: cpu = GHz x cores, ram = GB, net = Mbps, disk = GB. eta in seconds.

function part(
  id: string,
  kind: PartKind,
  name: string,
  brand: string,
  tier: number,
  rarity: Rarity,
  price: number,
  eta: number,
  value: number,
  spec: string
): PartModel {
  return { id, kind, name, brand, tier, rarity, price, eta, value, spec };
}

export const PARTS: PartModel[] = [
  // Processors
  part("cpu-t1-a", "cpu", "Corvid C1", "Corvid", 1, "Common", 80, 60, 1.6, "1.6 GHz, 1 core"),
  part("cpu-t1-b", "cpu", "Corvid C2 Duo", "Corvid", 1, "Common", 240, 90, 4.8, "2.4 GHz, 2 cores"),
  part("cpu-t2-a", "cpu", "Halden Q4", "Halden", 2, "Common", 900, 180, 12.8, "3.2 GHz, 4 cores"),
  part("cpu-t2-b", "cpu", "Halden Q8 Pro", "Halden", 2, "Rare", 1600, 240, 28.8, "3.6 GHz, 8 cores"),
  part("cpu-t3-a", "cpu", "Nimbus Duo Socket", "Nimbus", 3, "Rare", 5200, 600, 57.6, "3.6 GHz, 16 cores"),
  part("cpu-t3-b", "cpu", "Nimbus Duo Socket X", "Nimbus", 3, "Epic", 8800, 840, 115.2, "3.6 GHz, 32 cores"),
  part("cpu-t4-a", "cpu", "Kestrel Q-Cluster", "Kestrel", 4, "Epic", 32000, 1800, 400, "Quantum cluster, 64 qubits"),
  part("cpu-t4-b", "cpu", "Kestrel Neural Bridge", "Kestrel", 4, "Legendary", 58000, 3000, 900, "Neural bridge, 128 qubits"),

  // Memory
  part("ram-t1-a", "ram", "Voltra 4GB", "Voltra", 1, "Common", 50, 60, 4, "4 GB DDR3"),
  part("ram-t1-b", "ram", "Voltra 8GB", "Voltra", 1, "Common", 150, 90, 8, "8 GB DDR3"),
  part("ram-t2-a", "ram", "Voltra 16GB", "Voltra", 2, "Common", 600, 180, 16, "16 GB DDR4"),
  part("ram-t2-b", "ram", "Voltra 32GB Kit", "Voltra", 2, "Rare", 1100, 240, 32, "32 GB DDR4"),
  part("ram-t3-a", "ram", "Halden 64GB ECC", "Halden", 3, "Rare", 4200, 600, 64, "64 GB DDR5 ECC"),
  part("ram-t3-b", "ram", "Halden 128GB ECC", "Halden", 3, "Epic", 7600, 840, 128, "128 GB DDR5 ECC"),
  part("ram-t4-a", "ram", "Kestrel Lattice 256", "Kestrel", 4, "Epic", 26000, 1800, 256, "256 GB lattice memory"),
  part("ram-t4-b", "ram", "Kestrel Lattice 512", "Kestrel", 4, "Legendary", 47000, 3000, 512, "512 GB lattice memory"),

  // Network cards
  part("net-t1-a", "net", "Dial 56k Modem", "Corvid", 1, "Common", 40, 60, 0.056, "56 kbps dial-up"),
  part("net-t1-b", "net", "Corvid Link 10", "Corvid", 1, "Common", 180, 90, 10, "10 Mbps"),
  part("net-t2-a", "net", "Halden Broadband 100", "Halden", 2, "Common", 700, 180, 100, "100 Mbps"),
  part("net-t2-b", "net", "Halden Broadband 300", "Halden", 2, "Rare", 1300, 240, 300, "300 Mbps"),
  part("net-t3-a", "net", "Nimbus Fiber 1G", "Nimbus", 3, "Rare", 4800, 600, 1000, "1 Gbps fiber"),
  part("net-t3-b", "net", "Nimbus Fiber 2.5G", "Nimbus", 3, "Epic", 8200, 840, 2500, "2.5 Gbps fiber"),
  part("net-t4-a", "net", "Kestrel Backbone 10G", "Kestrel", 4, "Epic", 29000, 1800, 10000, "10 Gbps backbone"),
  part("net-t4-b", "net", "Kestrel Backbone 40G", "Kestrel", 4, "Legendary", 52000, 3000, 40000, "40 Gbps backbone"),

  // Storage
  part("disk-t1-a", "disk", "Voltra HDD 64", "Voltra", 1, "Common", 40, 60, 64, "64 GB HDD"),
  part("disk-t1-b", "disk", "Voltra HDD 128", "Voltra", 1, "Common", 120, 90, 128, "128 GB HDD"),
  part("disk-t2-a", "disk", "Voltra SSD 256", "Voltra", 2, "Common", 500, 180, 256, "256 GB SSD"),
  part("disk-t2-b", "disk", "Voltra SSD 512", "Voltra", 2, "Rare", 950, 240, 512, "512 GB SSD"),
  part("disk-t3-a", "disk", "Halden NVMe 1T", "Halden", 3, "Rare", 3800, 600, 1000, "1 TB NVMe"),
  part("disk-t3-b", "disk", "Halden NVMe 2T", "Halden", 3, "Epic", 6900, 840, 2000, "2 TB NVMe"),
  part("disk-t4-a", "disk", "Kestrel Array 4T", "Kestrel", 4, "Epic", 24000, 1800, 4000, "4 TB storage array"),
  part("disk-t4-b", "disk", "Kestrel Array 8T", "Kestrel", 4, "Legendary", 44000, 3000, 8000, "8 TB storage array"),
];

const BY_ID = new Map(PARTS.map((p) => [p.id, p]));

export function getModel(id: string): PartModel {
  const m = BY_ID.get(id);
  if (!m) throw new Error(`Unknown part model: ${id}`);
  return m;
}

export const STARTER_RIG: Record<PartKind, string> = {
  cpu: "cpu-t1-a",
  ram: "ram-t1-a",
  net: "net-t1-a",
  disk: "disk-t1-a",
};

/** Parts that the shop sells. Starter parts are not sold; their price only sets the resale value. */
export const SHOP_PARTS = PARTS.filter((p) => !Object.values(STARTER_RIG).includes(p.id));
