// Script Trials (docs/gameplay-ideas.md §6): scripting puzzles against a seeded sandbox network.
// The sandbox keeps its own clock: jobs and sleep() advance simulated time, so a trial finishes in
// seconds of real time and nothing touches the real save.

export type Medal = "gold" | "silver" | "bronze";
export type TrialId = "hello" | "sell_smart" | "quiet_hands" | "rush_hour" | "burn_nothing";

export interface TrialDef {
  id: TrialId;
  /** Hosts in the sandbox */
  hosts: number;
  /** Medal time limits in simulated seconds: [gold, silver]; any pass is bronze */
  medals: [number, number];
  /** API call limit (fail above it) */
  maxCalls: number;
  /** Simulated time limit in seconds (fail above it) */
  maxSec: number;
  seed: number;
  starter: string;
}

const head = (n: number, name: string, goal: string) => `// Trial ${String(n).padStart(2, "0")} · ${name}\n// ${goal}\n`;

export const TRIALS: TrialDef[] = [
  {
    id: "hello",
    hosts: 3,
    medals: [40, 80],
    maxCalls: 40,
    maxSec: 300,
    seed: 0x1a07,
    starter: head(1, "Hello, host", "Scan the network, then crack any one host.") + "const hosts = await ByteCore.net.scan();\nByteCore.logger.info(`found ${hosts.length}`);\n",
  },
  {
    id: "sell_smart",
    hosts: 0,
    medals: [5, 15],
    maxCalls: 30,
    maxSec: 120,
    seed: 0x2b11,
    starter: head(2, "Sell smart", "Sell every loot file worth ₵ 500 or more. Keep the rest.") + "const loot = await ByteCore.loot();\n",
  },
  {
    id: "quiet_hands",
    hosts: 8,
    medals: [120, 180],
    maxCalls: 80,
    maxSec: 600,
    seed: 0x3f21,
    starter:
      head(3, "Quiet hands", "Crack 5 hosts. Heat must stay below 20.") +
      "const hosts = await ByteCore.net.scan();\nlet done = 0;\nfor (const h of hosts) {\n  if (done === 5) break;\n  const r = await ByteCore.net.crack(h.ip);\n  if (r.ok) done++;\n}\n",
  },
  {
    id: "rush_hour",
    hosts: 3,
    medals: [90, 140],
    maxCalls: 60,
    maxSec: 400,
    seed: 0x4c55,
    starter:
      head(4, "Rush hour", "Pull one file from each of 3 hosts. Never get traced (40 s per session).") +
      "const hosts = await ByteCore.net.scan();\nfor (const h of hosts) {\n  await ByteCore.net.crack(h.ip);\n}\n",
  },
  {
    id: "burn_nothing",
    hosts: 5,
    medals: [150, 240],
    maxCalls: 100,
    maxSec: 900,
    seed: 0x5d93,
    starter: head(5, "Burn nothing", "Crack and pull from 4 hosts. End with Heat 0 and at least ₵ 400.") + "const me = await ByteCore.player();\n",
  },
];
export const TRIAL = Object.fromEntries(TRIALS.map((t) => [t.id, t])) as Record<TrialId, TrialDef>;

export interface TrialRecord {
  medal: Medal;
  /** Best time in simulated seconds */
  best: number;
  calls: number;
  lines: number;
}
export type TrialsState = Partial<Record<TrialId, TrialRecord>>;

/** A trial opens once the one before has any medal. */
export const trialOpen = (s: TrialsState, id: TrialId) => {
  const i = TRIALS.findIndex((t) => t.id === id);
  return i <= 0 || !!s[TRIALS[i - 1].id];
};

export const MEDAL_RANK: Record<Medal, number> = { gold: 3, silver: 2, bronze: 1 };
export const medalFor = (def: TrialDef, sec: number): Medal => (sec <= def.medals[0] ? "gold" : sec <= def.medals[1] ? "silver" : "bronze");
/** XP for a first clear. */
export const trialXp = (i: number) => 60 * (i + 1);

/** Lines that count toward the score: not blank, not only a comment. */
export const codeLines = (code: string) => code.split("\n").filter((l) => l.trim() && !l.trim().startsWith("//")).length;

// ---- sandbox world ----

interface SHost {
  ip: string;
  tier: number;
  security: number;
  cracked: boolean;
  files: { name: string; size: number }[];
}
interface SLoot {
  path: string;
  value: number;
  tier: number;
  sold: boolean;
}

export interface GoalCheck {
  key: string;
  vars?: Record<string, string | number>;
  ok: boolean;
}

export interface Sandbox {
  def: TrialDef;
  clock: number;
  calls: number;
  heat: number;
  peakHeat: number;
  balance: number;
  hosts: SHost[];
  scanned: boolean;
  session: { ip: string; at: number } | null;
  traced: boolean;
  /** ip -> files pulled */
  pulled: Record<string, number>;
  loot: SLoot[];
  cracked: number;
}

function rnd(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (Math.imul(a, 1103515245) + 12345) & 0x7fffffff;
    return a / 0x7fffffff;
  };
}

export function makeSandbox(def: TrialDef): Sandbox {
  const r = rnd(def.seed);
  const hosts: SHost[] = Array.from({ length: def.hosts }, (_, i) => ({
    ip: `10.0.${1 + i}.${Math.floor(r() * 250) + 2}`,
    tier: 1,
    security: def.id === "quiet_hands" ? 2 + Math.floor(r() * 5) : 1 + Math.floor(r() * 3),
    cracked: false,
    files: [
      { name: "ledger.db", size: 4 + Math.floor(r() * 20) },
      { name: "keys.key", size: 1 + Math.floor(r() * 4) },
    ],
  }));
  const loot: SLoot[] =
    def.id === "sell_smart"
      ? [180, 950, 420, 1300, 500, 260, 760, 90].map((v, i) => ({ path: `C:/Users/ghost_user/Downloads/file_${i + 1}.db`, value: v, tier: 1, sold: false }))
      : [];
  return { def, clock: 0, calls: 0, heat: def.id === "burn_nothing" ? 12 : 0, peakHeat: 0, balance: 500, hosts, scanned: false, session: null, traced: false, pulled: {}, loot, cracked: 0 };
}

const SESSION_SEC = 40;
/** Sandbox Heat cools quickly so waiting it out is a real option. */
const HEAT_DECAY_PER_SEC = 0.3;

/** Advance the sandbox clock, decaying Heat and tracing an open session. */
function advance(s: Sandbox, sec: number) {
  s.clock += sec;
  s.heat = Math.max(0, s.heat - HEAT_DECAY_PER_SEC * sec);
  if (s.session && s.clock - s.session.at >= SESSION_SEC) {
    s.traced = true;
    s.heat = Math.min(100, s.heat + 25);
    s.session = null;
  }
  s.peakHeat = Math.max(s.peakHeat, s.heat);
}

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
export const clockText = (s: Sandbox) => fmt(s.clock);

/** Handle one SDK call against the sandbox. Throws like the real API. Returns [result, log line?]. */
export function sandboxCall(s: Sandbox, method: string, args: unknown[]): { result: unknown; log?: string } {
  s.calls++;
  const a = args as string[];
  const host = (ip: string) => {
    const h = s.hosts.find((x) => x.ip === ip);
    if (!h) throw new Error(`Unknown host: ${ip}`);
    return h;
  };
  switch (method) {
    case "player":
      return { result: { level: 1, xp: 0, balance: s.balance, heat: Math.round(s.heat), stats: { cpu: 4.8, ramGB: 8, netMbps: 10, diskGB: 128 } } };
    case "targets":
      return { result: s.scanned ? s.hosts.map((h) => ({ ip: h.ip, name: `node-${h.ip.split(".")[2]}`, org: "Sandbox", tier: h.tier, security: h.security, admin: "Medium", cracked: h.cracked })) : [] };
    case "scan":
      advance(s, 5);
      s.scanned = true;
      return { result: s.hosts.map((h) => ({ ip: h.ip, name: `node-${h.ip.split(".")[2]}`, org: "Sandbox", tier: h.tier })), log: `scan · ${s.hosts.length} hosts` };
    case "probe": {
      const h = host(a[0]);
      advance(s, 3);
      return { result: { ip: h.ip, security: h.security, tier: h.tier, cracked: h.cracked } };
    }
    case "crack": {
      const h = host(a[0]);
      if (h.cracked) throw new Error("Already cracked");
      advance(s, 6 + h.security * 2);
      // Seeded roll: same script, same seed, same result. Harder hosts fail more often.
      const roll = (((Math.imul(s.def.seed ^ (s.calls * 2654435761), 1103515245) + 12345) >>> 0) % 1000) / 1000;
      const ok = roll < 0.97 - h.security * 0.06;
      if (ok) {
        h.cracked = true;
        s.cracked++;
      } else s.heat = Math.min(100, s.heat + 6);
      s.peakHeat = Math.max(s.peakHeat, s.heat);
      return { result: { ok }, log: ok ? `cracked ${h.ip} (heat ${Math.round(s.heat)})` : `crack failed ${h.ip} · heat ${Math.round(s.heat)}` };
    }
    case "connect": {
      const h = host(a[0]);
      if (!h.cracked) throw new Error("Not cracked");
      if (s.session) throw new Error("Already connected");
      s.session = { ip: h.ip, at: s.clock };
      return { result: true };
    }
    case "disconnect":
      s.session = null;
      return { result: true };
    case "ls": {
      if (s.session && (a[0] ?? "").startsWith("/")) return { result: host(s.session.ip).files.map((f) => ({ name: f.name, type: "file", size: f.size })) };
      return { result: s.loot.filter((l) => !l.sold).map((l) => ({ name: l.path.split("/").pop(), type: "file", size: 1 })) };
    }
    case "pull": {
      if (!s.session) throw new Error("Not connected");
      const h = host(s.session.ip);
      const f = h.files.find((x) => a[0].endsWith(x.name));
      if (!f) throw new Error(`No such file: ${a[0]}`);
      advance(s, Math.ceil(f.size / 2));
      if (!s.session) throw new Error("Traced: session dropped");
      s.pulled[h.ip] = (s.pulled[h.ip] ?? 0) + 1;
      s.heat = Math.min(100, s.heat + 2);
      return { result: { dest: `C:/Users/ghost_user/Downloads/${f.name}`, size: f.size }, log: `pulled ${f.name} from ${h.ip}` };
    }
    case "loot":
      return { result: s.loot.map((l) => ({ ...l })) };
    case "sellData": {
      const paths = (args[0] as string[]) ?? [];
      let n = 0;
      for (const l of s.loot) if (paths.includes(l.path) && !l.sold) {
        l.sold = true;
        s.balance += l.value;
        n++;
      }
      if (!n) throw new Error("Nothing to sell");
      return { result: true, log: `sold ${n} file(s)` };
    }
    case "scrubHeat": {
      if (s.heat <= 0) throw new Error("No Heat to scrub");
      const amount = Math.min(20, Math.ceil(s.heat));
      if (s.balance < amount * 10) throw new Error("Not enough credits");
      s.balance -= amount * 10;
      s.heat = Math.max(0, s.heat - amount);
      return { result: true, log: `scrubbed ${amount} heat` };
    }
    case "sleep":
      advance(s, Math.max(0, Math.min(60000, Number(args[0]) || 0)) / 1000);
      return { result: undefined };
    case "read":
    case "write":
      return { result: method === "read" ? "" : true };
    default:
      throw new Error(`Unknown API: ${method}`);
  }
}

/** Goal checklist for a finished (or running) sandbox. */
export function goals(s: Sandbox): GoalCheck[] {
  const id = s.def.id;
  const time: GoalCheck = { key: "trial.goal.time", vars: { time: fmt(s.def.medals[1]) }, ok: s.clock <= s.def.medals[1] };
  switch (id) {
    case "hello":
      return [
        { key: "trial.goal.scan", ok: s.scanned },
        { key: "trial.goal.crackN", vars: { n: 1 }, ok: s.cracked >= 1 },
      ];
    case "sell_smart": {
      const big = s.loot.filter((l) => l.value >= 500);
      const small = s.loot.filter((l) => l.value < 500);
      return [
        { key: "trial.goal.sellBig", ok: big.every((l) => l.sold) },
        { key: "trial.goal.keepSmall", ok: small.every((l) => !l.sold) },
      ];
    }
    case "quiet_hands":
      return [
        { key: "trial.goal.crackN", vars: { n: 5 }, ok: s.cracked >= 5 },
        { key: "trial.goal.heatBelow", vars: { n: 20 }, ok: s.peakHeat < 20 },
        time,
      ];
    case "rush_hour":
      return [
        { key: "trial.goal.pullHosts", vars: { n: 3 }, ok: Object.keys(s.pulled).length >= 3 },
        { key: "trial.goal.noTrace", ok: !s.traced },
        time,
      ];
    case "burn_nothing":
      return [
        { key: "trial.goal.pullHosts", vars: { n: 4 }, ok: Object.keys(s.pulled).length >= 4 },
        { key: "trial.goal.heatZero", ok: Math.round(s.heat) === 0 },
        { key: "trial.goal.credits", vars: { n: 400 }, ok: s.balance >= 400 },
      ];
  }
}

/** Required goals (the time goal only decides the medal). */
export const passed = (s: Sandbox) => goals(s).every((g) => g.ok || g.key === "trial.goal.time");
