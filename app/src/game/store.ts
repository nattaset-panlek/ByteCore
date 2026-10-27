import { create } from "zustand";
import {
  CONTRACT_POOL,
  CRACK_XP,
  DATA_XP_DIVISOR,
  DEBT_LIMIT,
  HEAT,
  HEAT_MAX,
  PAPERWORK_PENALTY_MS,
  PAPERWORK_REDUCTION_MS,
  PRISON_BASE_MS,
  REPLACE_WEAR,
  SCAN_COUNT,
  SCRUB_CHUNK,
  SCRUB_COST_PER_POINT,
  TIER_UNLOCK_LEVEL,
  xpToNext,
} from "./balance";
import { getModel } from "./catalog";
import { advanceContracts, refillContracts } from "./contracts";
import { moduleBonus, moduleFile, moduleForTier, MODULE_SLOTS, MODULES } from "./modules";
import { emit, type GameEvent } from "./events";
import { crackChance, jobDone, jobDuration, jobLoad, type JobRequest } from "./jobs";
import { addTxn, tick } from "./loop";
import { makeHost, scanTiers } from "./network";
import { diskCapacityMB, resellPrice, rigStats } from "./rig";
import { bailAmount, newGame, uid, type GameState } from "./state";
import { msg, type Msg, type TKey, type Vars } from "../i18n";
import type { FileNode, Host, Job, JobKind, Part, Txn } from "./types";
import * as vfs from "./vfs";

/** Failed actions carry a translatable message (show it with tm(r.error)). */
export type Result = { ok: true } | { ok: false; error: Msg };
const OK: Result = { ok: true };
const fail = (key: TKey, vars?: Vars): Result => ({ ok: false, error: msg(key, vars) });

interface GameStore {
  game: GameState;
  /** False until the save has been loaded (or a new game created). */
  loaded: boolean;

  load: (g: GameState) => void;
  reset: () => void;
  tick: (now?: number) => void;

  // Wallet
  /** label is an i18n key (e.g. "txn.sold"), vars fill it in */
  earn: (amount: number, label: string, kind: Txn["kind"], vars?: Vars) => void;
  spend: (amount: number, label: string, kind: Txn["kind"], vars?: Vars) => Result;

  // Player
  addXp: (xp: number) => void;
  addHeat: (amount: number) => void;

  // Orders and rig (GDD 3.7)
  placeOrder: (modelIds: string[]) => Result;
  cancelOrder: (orderId: string) => Result;
  /** Take a delivered order: install it into the rig (replacing the old part) or put it in Rig Stock. */
  claimOrder: (orderId: string, to: "rig" | "stock") => Result;
  installFromStock: (partUid: string) => Result;
  sellFromStock: (partUid: string) => Result;

  // Hacking (GDD 3.1, 4). scan/probe/crack/pull start jobs that finish in the game loop.
  scan: () => Result;
  probe: (ip: string) => Result;
  crack: (ip: string) => Result;
  connect: (ip: string) => Result;
  disconnect: () => void;
  pull: (remotePath: string, destDir?: string) => Result;
  killJob: (id: number) => void;

  /** Sell loot files on the drive (GDD 3.4.1). Each hash sells once; copies then show ₵ 0. */
  sellData: (paths: string[]) => Result;

  // Contracts (GDD 4)
  acceptContract: (id: string) => Result;
  claimContract: (id: string) => Result;

  // Passive modules (GDD 3.2)
  loadModule: (path: string) => Result;
  unloadModule: (id: string) => void;

  // Risk and consequences (GDD 3.6)
  /** Careful play: spend credits to remove a chunk of Heat. */
  scrubHeat: () => Result;
  /** At a warrant: pay the bail in cash, or take it as debt. */
  payBail: (useDebt: boolean) => Result;
  /** Give up at a warrant and go to prison. */
  surrender: () => void;
  /** Prison paperwork sheet result: correct cuts the sentence, wrong adds a little. */
  paperwork: (correct: boolean) => void;
  /** One-shot jailbreak: success frees you, failure doubles the remaining sentence. */
  attemptJailbreak: (success: boolean) => void;
  /** Prison: wipe the record and start over. */
  newIdentity: () => void;

  // Files (capacity checked against the installed storage)
  writeFile: (path: string, f: Omit<FileNode, "type" | "name" | "modified">) => Result;
  mkdir: (path: string) => Result;
  remove: (path: string) => Result;
  copy: (from: string, to: string) => Result;
  move: (from: string, to: string) => Result;
}

function emitAll(events: GameEvent[]) {
  for (const e of events) emit(e);
}

export const useGame = create<GameStore>((set, get) => {
  const patch = (p: Partial<GameState>) => set((s) => ({ game: { ...s.game, ...p } }));
  const now = () => Date.now();

  /** Apply a VFS change, rejecting it if the drive would overflow. */
  const applyFs = (r: vfs.VfsResult): Result => {
    if (!r.ok) return { ok: false, error: r.error };
    const g = get().game;
    const used = vfs.sizeOf(r.root);
    if (used > vfs.sizeOf(g.fs) && used > diskCapacityMB(g.rig)) return fail("err.notEnoughDisk");
    patch({ fs: r.root });
    return OK;
  };

  const hostAt = (ip: string): Host | undefined => get().game.net.hosts.find((h) => h.ip === ip);

  /** Enter the warrant state when Heat hits the limit (mirrors the loop, for the addHeat path). */
  const checkWarrant = () => {
    const g = get().game;
    if (g.heat >= HEAT_MAX && g.legal.state === "free") {
      const bail = bailAmount(g);
      patch({ legal: { state: "warrant", bail }, jobs: [], net: { ...g.net, session: null } });
      emit({ type: "warrant", bail });
    }
  };

  /** Advance active contracts after an action; emit for any that just completed. */
  const bumpContracts = (goal: "crack" | "pull" | "sell", tier: number) => {
    const before = get().game.contracts;
    const after = advanceContracts(before, goal, tier);
    if (after.every((c, i) => c === before[i])) return;
    patch({ contracts: after });
    after.forEach((c, i) => {
      if (c.status === "completed" && before[i]?.status === "active") emit({ type: "contractComplete", contractId: c.id });
    });
  };

  /** Rig stats with the installed modules' network and crack bonuses folded in. */
  const boostedStats = () => {
    const g = get().game;
    const b = moduleBonus(g.modules);
    const s = rigStats(g.rig);
    return { ...s, netMbps: s.netMbps * (1 + b.net), cpu: s.cpu * (1 + b.crack) };
  };

  /** Create a job and expected finish time from the current rig. */
  const startJob = (kind: JobKind, extra: Partial<Job>, req: JobRequest): Job => {
    const g = get().game;
    const t = now();
    const job: Job = {
      id: g.nextJob,
      kind,
      label: kind,
      startedAt: t,
      endsAt: t + jobDuration(req, boostedStats()),
      load: jobLoad(kind),
      ...extra,
    };
    patch({ jobs: [...g.jobs, job], nextJob: g.nextJob + 1 });
    return job;
  };

  /** Apply a finished job's effect and emit its outcome for the Terminal. */
  const completeJob = (job: Job) => {
    if (job.kind === "scan") {
      const g = get().game;
      const tiers = scanTiers(g.player.level);
      const count = SCAN_COUNT[0] + Math.floor(Math.random() * (SCAN_COUNT[1] - SCAN_COUNT[0] + 1));
      const hosts = [...g.net.hosts];
      const found: ReturnType<typeof makeHost>[] = [];
      let seed = g.net.seed;
      for (let i = 0; i < count; i++) {
        seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff;
        const h = makeHost(seed, tiers[Math.floor(Math.random() * tiers.length)]);
        if (hosts.some((x) => x.ip === h.ip)) continue;
        h.discovered = true;
        hosts.push(h);
        found.push(h);
      }
      patch({ net: { ...g.net, hosts, seed } });
      emit({ type: "jobComplete", job, outcome: { kind: "scan", found: found.map((h) => ({ ip: h.ip, name: h.name, org: h.org, tier: h.tier })) } });
      return;
    }
    if (job.kind === "probe") {
      const g = get().game;
      const hosts = g.net.hosts.map((h) => (h.ip === job.target ? { ...h, portsKnown: true, discovered: true } : h));
      patch({ net: { ...g.net, hosts } });
      const host = hosts.find((h) => h.ip === job.target);
      if (host) emit({ type: "jobComplete", job, outcome: { kind: "probe", host } });
      return;
    }
    if (job.kind === "crack") {
      const g = get().game;
      const host = g.net.hosts.find((h) => h.ip === job.target);
      if (!host) return;
      const ok = Math.random() < crackChance(boostedStats().cpu, host.security, host.tier);
      if (ok) {
        patch({ net: { ...g.net, hosts: g.net.hosts.map((h) => (h.ip === job.target ? { ...h, cracked: true } : h)) } });
        get().addXp(CRACK_XP * host.tier);
        bumpContracts("crack", host.tier);
        // A recovered module may drop from Tier 2+ targets.
        if (host.tier >= 2 && Math.random() < 0.3) {
          const def = moduleForTier(host.tier, Math.random());
          if (def) get().writeFile(`C:/tools/${def.file}`, moduleFile(def));
        }
      } else get().addHeat(HEAT.crackFail);
      emit({ type: "jobComplete", job, outcome: { kind: "crack", ip: job.target!, ok } });
      return;
    }
    if (job.kind === "pull") {
      const g = get().game;
      const outcomeBase = { kind: "pull" as const, ip: job.target!, remotePath: job.remotePath! };
      if (!g.net.session || g.net.session.ip !== job.target) {
        emit({ type: "jobComplete", job, outcome: { ...outcomeBase, ok: false, error: msg("err.transferInterrupted") } });
        return;
      }
      const host = hostAt(job.target!);
      const node = host && vfs.getNode(host.fs, job.remotePath!);
      if (!host || !node || node.type !== "file") {
        emit({ type: "jobComplete", job, outcome: { ...outcomeBase, ok: false, error: msg("err.remoteFileNotFound", { name: job.remotePath! }) } });
        return;
      }
      const destDir = job.destDir ?? "C:/loot";
      get().mkdir(destDir);
      const dirNode = vfs.getNode(get().game.fs, destDir);
      let name = node.name;
      if (dirNode?.type === "dir" && dirNode.children[name]) name = vfs.copyName(dirNode, name);
      const r = get().writeFile(`${destDir}/${name}`, { size: node.size, content: node.content, loot: node.loot });
      if (!r.ok) {
        emit({ type: "jobComplete", job, outcome: { ...outcomeBase, ok: false, error: r.error } });
        return;
      }
      get().addHeat(HEAT.perPull);
      bumpContracts("pull", host.tier);
      emit({ type: "jobComplete", job, outcome: { ...outcomeBase, ok: true, dest: `${destDir}/${name}`, size: node.size } });
    }
  };

  const processJobs = (t: number) => {
    const done = get().game.jobs.filter((j) => jobDone(j, t));
    if (done.length === 0) return;
    patch({ jobs: get().game.jobs.filter((j) => !jobDone(j, t)) });
    for (const job of done) completeJob(job);
  };

  /** Put a part into its slot; the previous part (worn) goes to Rig Stock. */
  const install = (part: Part, stock: Part[]): Result => {
    const g = get().game;
    const kind = getModel(part.modelId).kind;
    if (kind === "disk" && vfs.sizeOf(g.fs) > getModel(part.modelId).value * 1024)
      return fail("err.filesDoNotFit");
    const old = g.rig[kind];
    const nextStock = old ? [...stock, { ...old, condition: Math.max(0, old.condition - REPLACE_WEAR), removedAt: now() }] : stock;
    patch({ rig: { ...g.rig, [kind]: { ...part, removedAt: undefined } }, stock: nextStock });
    return OK;
  };

  return {
    game: newGame(),
    loaded: false,

    load: (g) => set({ game: g, loaded: true }),
    reset: () => set({ game: newGame(), loaded: true }),

    tick: (t = now()) => {
      const r = tick(get().game, t);
      if (r.game !== get().game) set({ game: r.game });
      emitAll(r.events);
      if (get().game.legal.state === "free") processJobs(t);
    },

    earn: (amount, label, kind, vars) => {
      const g = get().game;
      patch({ wallet: { ...g.wallet, balance: g.wallet.balance + amount }, txns: addTxn(g.txns, label, amount, kind, now(), vars) });
    },

    spend: (amount, label, kind, vars) => {
      const g = get().game;
      if (g.wallet.balance < amount) return fail("err.notEnoughCredits");
      patch({ wallet: { ...g.wallet, balance: g.wallet.balance - amount }, txns: addTxn(g.txns, label, -amount, kind, now(), vars) });
      return OK;
    },

    addXp: (xp) => {
      let { level, xp: cur } = get().game.player;
      cur += xp;
      const ups: number[] = [];
      while (cur >= xpToNext(level)) {
        cur -= xpToNext(level);
        level++;
        ups.push(level);
      }
      patch({ player: { ...get().game.player, level, xp: cur } });
      emitAll(ups.map((l) => ({ type: "levelUp", level: l })));
    },

    addHeat: (amount) => {
      const before = get().game.heat;
      const net = amount > 0 ? amount * (1 - moduleBonus(get().game.modules).heat) : amount;
      const heat = Math.max(0, Math.min(HEAT_MAX, before + net));
      patch({ heat });
      checkWarrant();
    },

    placeOrder: (modelIds) => {
      if (modelIds.length === 0) return fail("err.nothingToOrder");
      const models = modelIds.map(getModel);
      const total = models.reduce((s, m) => s + m.price, 0);
      const paid =
        models.length === 1
          ? get().spend(total, "txn.order", "purchase", { name: models[0].name })
          : get().spend(total, "txn.orderMany", "purchase", { count: models.length });
      if (!paid.ok) return paid;
      const t = now();
      const orders = models.map((m) => ({
        id: uid("order"),
        modelId: m.id,
        price: m.price,
        placedAt: t,
        arrivesAt: t + m.eta * 1000,
        notified: false,
        claimed: false,
      }));
      patch({ orders: [...orders, ...get().game.orders] });
      return OK;
    },

    cancelOrder: (orderId) => {
      const g = get().game;
      const o = g.orders.find((x) => x.id === orderId);
      if (!o || o.cancelled) return fail("err.orderNotFound");
      if (now() >= o.arrivesAt) return fail("err.orderDelivered");
      patch({ orders: g.orders.map((x) => (x.id === orderId ? { ...x, cancelled: true } : x)) });
      get().earn(o.price, "txn.refund", "refund", { name: getModel(o.modelId).name });
      return OK;
    },

    claimOrder: (orderId, to) => {
      const g = get().game;
      const o = g.orders.find((x) => x.id === orderId);
      if (!o || o.cancelled || o.claimed) return fail("err.orderNotAvailable");
      if (now() < o.arrivesAt) return fail("err.orderNotArrived");
      const part: Part = { uid: uid("part"), modelId: o.modelId, condition: 100 };
      if (to === "rig") {
        const r = install(part, g.stock);
        if (!r.ok) return r;
      } else {
        patch({ stock: [...g.stock, { ...part, removedAt: now() }] });
      }
      patch({ orders: get().game.orders.map((x) => (x.id === orderId ? { ...x, claimed: true } : x)) });
      return OK;
    },

    installFromStock: (partUid) => {
      const g = get().game;
      const part = g.stock.find((p) => p.uid === partUid);
      if (!part) return fail("err.partNotFound");
      return install(part, g.stock.filter((p) => p.uid !== partUid));
    },

    sellFromStock: (partUid) => {
      const g = get().game;
      const part = g.stock.find((p) => p.uid === partUid);
      if (!part) return fail("err.partNotFound");
      patch({ stock: g.stock.filter((p) => p.uid !== partUid) });
      get().earn(resellPrice(part), "txn.sold", "sale", { name: getModel(part.modelId).name });
      return OK;
    },

    scan: () => {
      if (get().game.jobs.some((j) => j.kind === "scan")) return fail("err.scanRunning");
      startJob("scan", {}, { kind: "scan" });
      return OK;
    },

    probe: (ip) => {
      const host = hostAt(ip);
      if (!host) return fail("err.hostUnknown", { name: ip });
      if (get().game.jobs.some((j) => j.kind === "probe" && j.target === ip)) return fail("err.jobRunning");
      startJob("probe", { target: ip }, { kind: "probe", host });
      return OK;
    },

    crack: (ip) => {
      const host = hostAt(ip);
      if (!host) return fail("err.hostUnknown", { name: ip });
      if (!host.portsKnown) return fail("err.probeFirst");
      if (host.cracked) return fail("err.alreadyCracked");
      if (get().game.jobs.some((j) => j.kind === "crack" && j.target === ip)) return fail("err.jobRunning");
      startJob("crack", { target: ip }, { kind: "crack", host });
      return OK;
    },

    connect: (ip) => {
      const g = get().game;
      const host = hostAt(ip);
      if (!host) return fail("err.hostUnknown", { name: ip });
      if (!host.cracked) return fail("err.notCracked");
      if (g.net.session) return fail("err.alreadyConnected");
      patch({ net: { ...g.net, session: { ip, connectedAt: now(), trace: 0, cwd: "/" } } });
      return OK;
    },

    disconnect: () => {
      const g = get().game;
      if (!g.net.session) return;
      const ip = g.net.session.ip;
      patch({ net: { ...g.net, session: null }, jobs: g.jobs.filter((j) => !(j.kind === "pull" && j.target === ip)) });
      emit({ type: "sessionEnded", ip, reason: "disconnect" });
    },

    pull: (remotePath, destDir = "C:/loot") => {
      const g = get().game;
      const s = g.net.session;
      if (!s) return fail("err.notConnected");
      const host = hostAt(s.ip);
      const node = host && vfs.getNode(host.fs, remotePath);
      if (!node || node.type !== "file") return fail("err.remoteFileNotFound", { name: remotePath });
      startJob("pull", { target: s.ip, remotePath, destDir }, { kind: "pull", size: node.size });
      return OK;
    },

    killJob: (id) => patch({ jobs: get().game.jobs.filter((j) => j.id !== id) }),

    sellData: (paths) => {
      const g = get().game;
      const sold = new Set(g.soldHashes);
      const soldTiers: number[] = [];
      let earned = 0;
      let xp = 0;
      for (const path of paths) {
        const node = vfs.getNode(g.fs, path);
        if (!node || node.type !== "file" || !node.loot) continue;
        const { hash, value, tier } = node.loot;
        if (sold.has(hash) || g.player.level < (TIER_UNLOCK_LEVEL[tier] ?? 1)) continue;
        sold.add(hash);
        earned += value;
        xp += Math.floor(value / DATA_XP_DIVISOR);
        soldTiers.push(tier);
      }
      if (soldTiers.length === 0) return fail("err.nothingToSell");
      patch({ soldHashes: [...sold] });
      get().earn(earned, "txn.dataSale", "sale", { count: soldTiers.length });
      get().addXp(xp);
      for (const tier of soldTiers) bumpContracts("sell", tier);
      return OK;
    },

    acceptContract: (id) => {
      const g = get().game;
      const c = g.contracts.find((x) => x.id === id);
      if (!c || c.status !== "available") return fail("err.contractUnavailable");
      patch({ contracts: g.contracts.map((x) => (x.id === id ? { ...x, status: "active" } : x)) });
      return OK;
    },

    claimContract: (id) => {
      const g = get().game;
      const c = g.contracts.find((x) => x.id === id);
      if (!c || c.status !== "completed") return fail("err.contractNotDone");
      const remaining = g.contracts.filter((x) => x.id !== id);
      patch({ contracts: refillContracts(remaining, g.player.level, CONTRACT_POOL) });
      get().earn(c.reward.credits, "txn.contract", "sale", { tier: c.tier });
      get().addXp(c.reward.xp);
      return OK;
    },

    loadModule: (path) => {
      const g = get().game;
      const node = vfs.getNode(g.fs, path);
      if (!node || node.type !== "file" || !node.module || !MODULES[node.module]) return fail("err.notAModule");
      if (g.modules.includes(node.module)) return fail("err.moduleLoaded");
      if (g.modules.length >= MODULE_SLOTS) return fail("err.moduleSlotsFull");
      patch({ modules: [...g.modules, node.module] });
      return OK;
    },

    unloadModule: (id) => patch({ modules: get().game.modules.filter((m) => m !== id) }),

    scrubHeat: () => {
      const g = get().game;
      if (g.heat <= 0) return fail("err.noHeat");
      const amount = Math.min(SCRUB_CHUNK, Math.ceil(g.heat));
      const paid = get().spend(amount * SCRUB_COST_PER_POINT, "txn.scrub", "proxy");
      if (!paid.ok) return paid;
      patch({ heat: Math.max(0, get().game.heat - amount) });
      return OK;
    },

    payBail: (useDebt) => {
      const g = get().game;
      if (g.legal.state !== "warrant") return fail("err.noWarrant");
      const bail = g.legal.bail;
      if (useDebt) {
        if (g.wallet.debt + bail > DEBT_LIMIT) return fail("err.debtLimit");
        patch({ wallet: { ...g.wallet, debt: g.wallet.debt + bail }, txns: addTxn(g.txns, "txn.bailLoan", -bail, "bail", now()) });
      } else {
        const paid = get().spend(bail, "txn.bail", "bail");
        if (!paid.ok) return paid;
      }
      patch({ legal: { state: "free" }, heat: 0 });
      return OK;
    },

    surrender: () => {
      if (get().game.legal.state !== "warrant") return;
      patch({ legal: { state: "prison", until: now() + PRISON_BASE_MS, jailbreakUsed: false, jailbreakLocked: false }, heat: 0 });
    },

    paperwork: (correct) => {
      const g = get().game;
      if (g.legal.state !== "prison") return;
      const delta = correct ? -PAPERWORK_REDUCTION_MS : PAPERWORK_PENALTY_MS;
      patch({ legal: { ...g.legal, until: Math.max(now() + 1000, g.legal.until + delta) } });
    },

    attemptJailbreak: (success) => {
      const g = get().game;
      if (g.legal.state !== "prison" || g.legal.jailbreakUsed) return;
      if (success) {
        patch({ legal: { state: "free" }, heat: 0 });
        get().addXp(50); // underground reputation (GDD 3.6.3)
      } else {
        const remaining = Math.max(0, g.legal.until - now());
        patch({ legal: { ...g.legal, until: now() + remaining * 2, jailbreakUsed: true, jailbreakLocked: true } });
      }
    },

    newIdentity: () => get().reset(),

    writeFile: (path, f) => applyFs(vfs.writeFile(get().game.fs, path, { ...f, modified: now() })),
    mkdir: (path) => applyFs(vfs.mkdir(get().game.fs, path)),
    remove: (path) => applyFs(vfs.remove(get().game.fs, path)),
    copy: (from, to) => applyFs(vfs.copy(get().game.fs, from, to)),
    move: (from, to) => applyFs(vfs.move(get().game.fs, from, to)),
  };
});

/** Disk usage of the player's drive, in MB. */
export function diskUsage(g: GameState): { used: number; total: number } {
  return { used: vfs.sizeOf(g.fs), total: diskCapacityMB(g.rig) };
}
