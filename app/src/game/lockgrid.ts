// Lockgrid (docs/gameplay-ideas.md §1): the hands-on crack. Rotate link tiles so the signal runs
// from IN (left edge) to CORE (right edge) before the sweep reaches the end of the grid.
// Tile exits are bits: N=1, E=2, S=4, W=8. A tile shows `rotate(base, rot)`.

export const N = 1, E = 2, S = 4, W = 8;
const DIRS = [N, E, S, W];
const STEP: Record<number, [number, number]> = { [N]: [-1, 0], [E]: [0, 1], [S]: [1, 0], [W]: [0, -1] };
const OPP: Record<number, number> = { [N]: S, [E]: W, [S]: N, [W]: E };

export interface Tile {
  base: number;
  rot: number;
  locked?: boolean;
  /** Rotates itself every few seconds */
  noise?: boolean;
  /** On the generated solution path; `rot` 0 is the solved turn there */
  path?: boolean;
}

export interface Lockgrid {
  size: number;
  tiles: Tile[];
  inRow: number;
  coreRow: number;
  /** Sweep length in ms */
  limitMs: number;
  /** Noise tiles turn every this many ms */
  noiseMs: number;
}

export const rotate = (m: number, r: number) => {
  let x = m;
  for (let i = 0; i < ((r % 4) + 4) % 4; i++) x = ((x << 1) | (x >> 3)) & 15;
  return x;
};
export const exits = (t: Tile) => rotate(t.base, t.rot);

function rng(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Grid edge from the target's tier, sweep and tile mix from its security (1..10). */
export function makeLockgrid(tier: number, security: number, seed: number): Lockgrid {
  const r = rng(seed);
  const size = Math.min(7, 3 + Math.max(1, tier));
  const inRow = Math.floor(r() * size);
  const coreRow = Math.floor(r() * size);

  // Self-avoiding walk from the IN cell to the CORE cell, biased to the right, with backtracking.
  const key = (y: number, x: number) => y * size + x;
  const seen = new Set<number>();
  const path: [number, number][] = [];
  const walk = (y: number, x: number): boolean => {
    seen.add(key(y, x));
    path.push([y, x]);
    if (x === size - 1 && y === coreRow) return true;
    const opts = DIRS.map((d) => [d, y + STEP[d][0], x + STEP[d][1]] as const)
      .filter(([, ny, nx]) => ny >= 0 && nx >= 0 && ny < size && nx < size && !seen.has(key(ny, nx)))
      .map((o) => ({ o, w: (o[0] === E ? 2.2 : 1) * r() }))
      .sort((a, b) => b.w - a.w);
    for (const { o } of opts) if (walk(o[1], o[2])) return true;
    path.pop();
    return false;
  };
  walk(inRow, 0);

  const tiles: Tile[] = Array.from({ length: size * size }, () => ({ base: 0, rot: 0 }));
  path.forEach(([y, x], i) => {
    const from = i === 0 ? W : dirBetween(path[i - 1], [y, x], true);
    const to = i === path.length - 1 ? E : dirBetween([y, x], path[i + 1], false);
    tiles[key(y, x)] = { base: from | to, rot: 0, path: true };
  });

  const SHAPES = [N | S, N | E, N | E | S, N, N | E, N | S];
  for (const t of tiles) if (!t.path) t.base = SHAPES[Math.floor(r() * SHAPES.length)];
  // Relays: a few path tiles get a third exit that leads nowhere useful.
  const pathTiles = tiles.filter((t) => t.path);
  for (let i = 0; i < Math.floor(size / 3); i++) {
    const t = pathTiles[Math.floor(r() * pathTiles.length)];
    const free = DIRS.filter((d) => !(t.base & d));
    if (free.length === 2 || free.length === 3) t.base |= free[Math.floor(r() * free.length)];
  }

  // Locked tiles sit in their solved turn; noise tiles sit off the path (one joins it at high security).
  const lockCount = Math.floor(security / 3);
  for (let i = 0; i < lockCount; i++) tiles[Math.floor(r() * tiles.length)].locked = true;
  const offPath = tiles.filter((t) => !t.path && !t.locked);
  const noiseCount = security >= 5 ? Math.floor((security - 3) / 2) : 0;
  for (let i = 0; i < noiseCount && offPath.length; i++) offPath.splice(Math.floor(r() * offPath.length), 1)[0].noise = true;
  if (security >= 8) {
    const p = pathTiles.filter((t) => !t.locked);
    if (p.length) p[Math.floor(r() * p.length)].noise = true;
  }

  // Scramble every tile that can turn.
  for (const t of tiles) if (!t.locked) t.rot = Math.floor(r() * 4);
  if (solved({ size, tiles, inRow, coreRow, limitMs: 0, noiseMs: 0 })) {
    const t = tiles.find((x) => x.path && !x.locked && rotate(x.base, 1) !== x.base);
    if (t) t.rot = 1;
  }

  const limitMs = Math.round((8 + size * size * 1.1 - security) * 1000);
  return { size, tiles, inRow, coreRow, limitMs, noiseMs: Math.max(2500, 6000 - security * 300) };
}

function dirBetween(a: [number, number], b: [number, number], incoming: boolean): number {
  const d = DIRS.find((x) => a[0] + STEP[x][0] === b[0] && a[1] + STEP[x][1] === b[1])!;
  return incoming ? OPP[d] : d;
}

/** Cells the signal reaches from IN, following exits that meet on both sides. */
export function lit(g: Lockgrid): Set<number> {
  const out = new Set<number>();
  const start = g.inRow * g.size;
  if (!(exits(g.tiles[start]) & W)) return out;
  const queue = [start];
  out.add(start);
  while (queue.length) {
    const i = queue.shift()!;
    const y = Math.floor(i / g.size);
    const x = i % g.size;
    const m = exits(g.tiles[i]);
    for (const d of DIRS) {
      if (!(m & d)) continue;
      const ny = y + STEP[d][0];
      const nx = x + STEP[d][1];
      if (ny < 0 || nx < 0 || ny >= g.size || nx >= g.size) continue;
      const j = ny * g.size + nx;
      if (out.has(j) || !(exits(g.tiles[j]) & OPP[d])) continue;
      out.add(j);
      queue.push(j);
    }
  }
  return out;
}

export function solved(g: Lockgrid): boolean {
  const core = g.coreRow * g.size + g.size - 1;
  return lit(g).has(core) && !!(exits(g.tiles[core]) & E);
}

/** Turn a tile 90° clockwise (locked tiles don't move). */
export function turn(g: Lockgrid, i: number): Lockgrid {
  const t = g.tiles[i];
  if (!t || t.locked) return g;
  const tiles = g.tiles.slice();
  tiles[i] = { ...t, rot: (t.rot + 1) % 4 };
  return { ...g, tiles };
}

/** Noise tiles take one turn each. */
export function noiseTick(g: Lockgrid): Lockgrid {
  if (!g.tiles.some((t) => t.noise)) return g;
  return { ...g, tiles: g.tiles.map((t) => (t.noise ? { ...t, rot: (t.rot + 1) % 4 } : t)) };
}

/** Path tiles not yet in a working turn (Hint tile skill highlights the first `n`). */
export function hintCells(g: Lockgrid, n: number): number[] {
  if (n <= 0) return [];
  return g.tiles
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => t.path && !t.locked && exits(t) !== t.base)
    .slice(0, n)
    .map(({ i }) => i);
}

export const pathLength = (g: Lockgrid) => g.tiles.filter((t) => t.path).length;
export const onPathLit = (g: Lockgrid) => {
  const l = lit(g);
  return g.tiles.filter((t, i) => t.path && l.has(i)).length;
};

/** A solve with at least this share of the sweep left is Clean (+25% XP). */
export const CLEAN_SHARE = 0.3;
export const CLEAN_XP_BONUS = 0.25;
/** Odds penalty when the sweep runs out and the crack falls back to the dice roll. */
export const TIMEOUT_PENALTY = 0.1;
