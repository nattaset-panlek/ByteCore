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
import { emit, type GameEvent, type JobOutcome } from "./events";
import { crackChance, jobDone, jobDuration, jobLoad, type JobRequest } from "./jobs";
import { addTxn, tick } from "./loop";
import { makeHost, scanTiers } from "./network";
import { diskCapacityMB, resellPrice, rigStats } from "./rig";
import { bailAmount, newGame, uid, type GameState } from "./state";
import { msg, type Msg, type TKey, type Vars } from "../i18n";
import type { DirNode, FileNode, Host, Job, JobKind, Part, Txn } from "./types";
import * as vfs from "./vfs";
import { activeSkill, canLearn, GHOST_VEIL_MS, respecCost, SKILL, skillEffects, GAME_WEEK_MS, type SkillId } from "./skills";
import { cpuBoost, netBoost, PROFILES, THROTTLE, type OcStep, type TuneProfile } from "./thermal";
import { FAST_HANDS, LOADOUT_SLOTS, loadoutCost, opHosts, PROXY_MS, refillBoard, type LoadoutId, type OpRun } from "./ops";
import { CHAPTER_POINT, clampRep, factionPerks, RIVAL_OF, repTier, STORY_REP, type ChoiceId, type FactionId } from "./factions";
import { endOp, send } from "./gameplayTick";
import { SCORE } from "./rivals";
import { TRIAL, TRIALS, MEDAL_RANK, trialXp, type TrialId, type TrialRecord } from "./trials";
import { CLEAN_SHARE, TIMEOUT_PENALTY } from "./lockgrid";

/** Failed actions carry a translatable message (show it with tm(r.error)). */
export type Result = { ok: true } | { ok: false; error: Msg };
const OK: Result = { ok: true };
const fail = (key: TKey, vars?: Vars): Result => ({ ok: false, error: msg(key, vars) });

/** Finishers for jobs owned outside the store (download / compile, see game/appsdk/jobs.ts). */
const jobHandlers: Partial<Record<JobKind, (job: Job) => JobOutcome>> = {};
export function registerJobHandler(kind: JobKind, fn: (job: Job) => JobOutcome) {
  jobHandlers[kind] = fn;
}

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
  /** Start a job with a known duration whose result a registered handler applies (download, compile). */
  startTimedJob: (kind: JobKind, extra: Partial<Job>, ms: number) => Job;
  /** Change a running job's finish time (a download once its size is known). */
  retimeJob: (id: number, ms: number) => void;

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
  /** First-run setup: the player's handle, written into their starter documents too. */
  completeSetup: (name: string) => void;
  /** Prison paperwork sheet result: correct cuts the sentence, wrong adds a little. */
  paperwork: (correct: boolean) => void;
  /** One-shot jailbreak: success frees you, failure doubles the remaining sentence. */
  attemptJailbreak: (success: boolean) => void;
  /** Prison: wipe the record and start over. */
  newIdentity: () => void;

  // Skill Tree (docs/gameplay-ideas.md §7)
  learnSkill: (id: SkillId) => Result;
  respecSkills: () => Result;
  /** Active skills: `skill use ghost` / `skill use overdrive` */
  useSkill: (name: string) => Result;

  // Lockgrid: the hands-on crack. checkCrack validates before the grid opens; finishManualCrack applies it.
  checkCrack: (ip: string) => Result;
  finishManualCrack: (ip: string, r: { solved: boolean; leftMs: number; limitMs: number; moves: number }) => Result;

  // Overclock
  setClock: (part: "cpu" | "net", step: OcStep) => void;
  setProfile: (p: TuneProfile) => void;

  // Operations
  launchOp: (opId: string, loadout: LoadoutId[]) => Result;
  useProxy: () => Result;
  exfil: () => Result;

  // Relay
  replyRelay: (faction: FactionId, msgId: string, choice: ChoiceId) => Result;
  readRelay: (faction: FactionId) => void;

  // Script Trials: store a finished trial; returns what it unlocked
  recordTrial: (id: TrialId, rec: TrialRecord) => { xp: number; point: boolean; best: boolean };

  // Files (capacity checked against the installed storage)
  writeFile: (path: string, f: Omit<FileNode, "type" | "name" | "modified">) => Result;
  mkdir: (path: string) => Result;
  /** Put the drive back to an earlier snapshot (File Explorer Undo). */
  restoreFs: (root: DirNode) => void;
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
      patch({ legal: { state: "warrant", bail }, jobs: [], net: { ...g.net, session: null }, player: { ...g.player, stats: { ...g.player.stats, arrests: g.player.stats.arrests + 1 } } });
      emit({ type: "warrant", bail });
    }
  };

  const bumpStat = (key: "cracks" | "pulls" | "dataSold" | "contracts" | "arrests", n = 1) => {
    const p = get().game.player;
    patch({ player: { ...p, stats: { ...p.stats, [key]: p.stats[key] + n } } });
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
    // Overclock speeds jobs up; a Hot rig is throttled.
    const heat = g.tuning.throttled ? 1 - THROTTLE : 1;
    return { ...s, netMbps: s.netMbps * (1 + b.net) * netBoost(g.tuning) * heat, cpu: s.cpu * (1 + b.crack) * cpuBoost(g.tuning) * heat };
  };
  const fx = () => skillEffects(get().game.player.skills);
  const shutDown = () => {
    const u = get().game.tuning.shutdownUntil;
    return !!u && now() < u;
  };
  const setSkills = (sk: Partial<GameState["player"]["skills"]>) => {
    const p = get().game.player;
    patch({ player: { ...p, skills: { ...p.skills, ...sk } } });
  };
  const grantPoints = (n: number) => {
    setSkills({ points: get().game.player.skills.points + n });
    emit({ type: "skillPoint", points: get().game.player.skills.points });
  };

  /** Crack chance with Lucky roll and a Lockgrid timeout penalty. */
  const chanceFor = (host: Host, penalty = 0) => Math.min(0.99, crackChance(boostedStats().cpu, host.security, host.tier) + fx().luck - penalty);

  /** A host fell: XP, stats, contracts, module drop, op stage, weekly score. Returns the XP given. */
  const crackSucceeded = (host: Host, clean: boolean) => {
    const g = get().game;
    patch({ net: { ...g.net, hosts: g.net.hosts.map((h) => (h.ip === host.ip ? { ...h, cracked: true } : h)) } });
    const xp = Math.round(CRACK_XP * host.tier * (clean ? 1.25 : 1));
    get().addXp(xp);
    bumpStat("cracks");
    if (clean) {
      const p = get().game.player;
      patch({ player: { ...p, stats: { ...p.stats, cleanCracks: (p.stats.cleanCracks ?? 0) + 1 } }, rivals: { ...get().game.rivals, score: get().game.rivals.score + SCORE.cleanCrack } });
    }
    bumpContracts("crack", host.tier);
    // A recovered module may drop from Tier 2+ targets (more often when The Static trusts you).
    if (host.tier >= 2 && Math.random() < factionPerks(g.factions.rep).moduleDrop) {
      const def = moduleForTier(host.tier, Math.random());
      if (def) get().writeFile(`C:/tools/${def.file}`, moduleFile(def));
    }
    advanceOp("crack", host.ip);
    return xp;
  };

  /** Move the active op on when a stage's action happens on its host. */
  const advanceOp = (action: "crack" | "pull", ip: string) => {
    const run = get().game.ops.active;
    if (!run) return;
    const stage = run.op.stages[run.stage];
    if (!stage || stage.ip !== ip) return;
    if ((action === "pull") !== (stage.kind === "pull")) return;
    let next: OpRun = run;
    if (stage.kind === "pull") {
      next = { ...run, pulled: run.pulled + 1 };
      if (next.pulled < (stage.need ?? 1)) {
        patch({ ops: { ...get().game.ops, active: next } });
        return;
      }
    }
    next = { ...next, stage: run.stage + 1, banked: run.banked + stage.payout, pulled: 0 };
    patch({ ops: { ...get().game.ops, active: next } });
    emit({ type: "opStage", name: run.op.name, stage: next.stage, banked: next.banked, trace: Math.round(run.trace) });
    if (next.stage >= run.op.stages.length) get().exfil();
  };

  /** Create a job and expected finish time from the current rig. */
  const startJob = (kind: JobKind, extra: Partial<Job>, req: JobRequest): Job => {
    const g = get().game;
    const t = now();
    let ms = jobDuration(req, boostedStats());
    if (kind === "crack") {
      ms *= fx().crackTime;
      if (req.host?.op && g.ops.active?.loadout.includes("fast_hands")) ms *= 1 - FAST_HANDS;
      // Overdrive: the next crack finishes at once.
      if (g.player.skills.overdrive) {
        ms = 400;
        setSkills({ overdrive: false });
      }
    }
    const job: Job = {
      id: g.nextJob,
      kind,
      label: kind,
      startedAt: t,
      endsAt: t + Math.round(ms),
      load: jobLoad(kind),
      ...extra,
    };
    patch({ jobs: [...get().game.jobs, job], nextJob: g.nextJob + 1 });
    return job;
  };

  /** Apply a finished job's effect and emit its outcome for the Terminal. */
  const completeJob = (job: Job) => {
    const handler = jobHandlers[job.kind];
    if (handler) {
      emit({ type: "jobComplete", job, outcome: handler(job) });
      return;
    }
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
      const ok = Math.random() < chanceFor(host, job.penalty);
      if (ok) crackSucceeded(host, false);
      else get().addHeat(HEAT.crackFail);
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
      const destDir = job.destDir ?? vfs.DOWNLOADS_DIR;
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
      bumpStat("pulls");
      bumpContracts("pull", host.tier);
      advanceOp("pull", host.ip);
      // Ghost Board race: taking the marked file first wins the bounty.
      const race = get().game.rivals.race;
      if (race && race.ip === host.ip && race.path === job.remotePath) {
        const rv = get().game.rivals;
        const rec = rv.h2h[race.rival] ?? [0, 0];
        patch({
          rivals: { ...rv, race: null, score: rv.score + SCORE.race, h2h: { ...rv.h2h, [race.rival]: [rec[0] + 1, rec[1]] }, feed: [{ at: now(), key: "ghost.feed.raceWon", vars: { ip: race.ip }, rival: race.rival }, ...rv.feed].slice(0, 30) },
        });
        get().earn(race.bounty, "txn.bounty", "sale", { ip: race.ip });
        const p = get().game.player;
        patch({ player: { ...p, stats: { ...p.stats, races: (p.stats.races ?? 0) + 1 } } });
        emit({ type: "raceEnded", won: true, rival: race.rival, bounty: race.bounty });
      }
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
      for (const e of r.events) if (e.type === "opEnded" && e.xp > 0) get().addXp(e.xp);
      if (get().game.legal.state === "free") processJobs(t);
    },

    earn: (amount, label, kind, vars) => {
      const g = get().game;
      // Credits earned count toward the Ghost Board week.
      const rivals = kind === "sale" ? { ...g.rivals, score: g.rivals.score + amount } : g.rivals;
      patch({ wallet: { ...g.wallet, balance: g.wallet.balance + amount }, txns: addTxn(g.txns, label, amount, kind, now(), vars), rivals });
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
      const p = get().game.player;
      patch({ player: { ...p, level, xp: cur, skills: { ...p.skills, points: p.skills.points + ups.length } } });
      emitAll(ups.map((l) => ({ type: "levelUp", level: l })));
      if (ups.length) emit({ type: "skillPoint", points: get().game.player.skills.points });
      // A new tier opened: post a fresh Ops Board for it.
      const ops = get().game.ops;
      if (!ops.active && ups.some((l) => Object.values(TIER_UNLOCK_LEVEL).includes(l))) patch({ ops: { ...ops, ...refillBoard(level, now(), (now() & 0xffff) ^ level) } });
    },

    addHeat: (amount) => {
      const before = get().game.heat;
      const net = amount > 0 ? amount * (1 - moduleBonus(get().game.modules).heat) : amount;
      const heat = Math.max(0, Math.min(HEAT_MAX, before + net));
      const p = get().game.player;
      patch({ heat, player: { ...p, stats: { ...p.stats, peakHeat: Math.max(p.stats.peakHeat, Math.round(heat)) } } });
      checkWarrant();
    },

    placeOrder: (modelIds) => {
      if (modelIds.length === 0) return fail("err.nothingToOrder");
      const models = modelIds.map(getModel);
      const market = factionPerks(get().game.factions.rep).market;
      const total = Math.round(models.reduce((s, m) => s + m.price, 0) * market);
      const paid =
        models.length === 1
          ? get().spend(total, "txn.order", "purchase", { name: models[0].name })
          : get().spend(total, "txn.orderMany", "purchase", { count: models.length });
      if (!paid.ok) return paid;
      const t = now();
      const orders = models.map((m) => ({
        id: uid("order"),
        modelId: m.id,
        price: Math.round(m.price * market),
        placedAt: t,
        arrivesAt: t + Math.round(m.eta * 1000 * fx().delivery),
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
      const c = get().checkCrack(ip);
      if (!c.ok) return c;
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

    pull: (remotePath, destDir = vfs.DOWNLOADS_DIR) => {
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

    startTimedJob: (kind, extra, ms) => {
      const g = get().game;
      const t = now();
      const job: Job = { id: g.nextJob, kind, label: kind, startedAt: t, endsAt: t + ms, load: jobLoad(kind), ...extra };
      patch({ jobs: [...g.jobs, job], nextJob: g.nextJob + 1 });
      return job;
    },

    retimeJob: (id, ms) => {
      const t = now();
      patch({ jobs: get().game.jobs.map((j) => (j.id === id ? { ...j, startedAt: t, endsAt: t + ms } : j)) });
    },

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
        earned += Math.round(value * fx().sale);
        xp += Math.floor(value / DATA_XP_DIVISOR);
        soldTiers.push(tier);
      }
      if (soldTiers.length === 0) return fail("err.nothingToSell");
      patch({ soldHashes: [...sold] });
      get().earn(earned, "txn.dataSale", "sale", { count: soldTiers.length });
      get().addXp(xp);
      bumpStat("dataSold", soldTiers.length);
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
      bumpStat("contracts");
      const rv = get().game.rivals;
      patch({ rivals: { ...rv, score: rv.score + SCORE.contract } });
      const f = get().game.factions;
      if (c.faction && c.faction in f.rep) {
        const id = c.faction as FactionId;
        patch({ factions: send({ ...f, rep: { ...f.rep, [id]: clampRep(f.rep[id] + (c.rep ?? 5)) } }, id, { from: "them", key: `relay.thanks.${id}`, vars: { rep: c.rep ?? 5 } }, now(), []) });
      }
      return OK;
    },

    loadModule: (path) => {
      const g = get().game;
      const node = vfs.getNode(g.fs, path);
      if (!node || node.type !== "file" || !node.module || !MODULES[node.module]) return fail("err.notAModule");
      if (g.modules.includes(node.module)) return fail("err.moduleLoaded");
      if (g.modules.length >= MODULE_SLOTS + fx().moduleSlots) return fail("err.moduleSlotsFull");
      patch({ modules: [...g.modules, node.module] });
      return OK;
    },

    unloadModule: (id) => patch({ modules: get().game.modules.filter((m) => m !== id) }),

    scrubHeat: () => {
      const g = get().game;
      if (g.heat <= 0) return fail("err.noHeat");
      const amount = Math.min(SCRUB_CHUNK, Math.ceil(g.heat));
      const paid = get().spend(Math.round(amount * SCRUB_COST_PER_POINT * factionPerks(g.factions.rep).scrub), "txn.scrub", "proxy");
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

    completeSetup: (name) => {
      const g = get().game;
      let fs = g.fs;
      for (const p of vfs.NAMED_DOCS) {
        const n = vfs.getNode(fs, p);
        if (n?.type !== "file" || !n.content) continue;
        const r = vfs.writeFile(fs, p, { ...n, content: n.content.replace(/\bghost_user\b/g, name) });
        if (r.ok) fs = r.root;
      }
      patch({ player: { ...g.player, name }, setupDone: true, fs });
    },

    learnSkill: (id) => {
      const p = get().game.player;
      if (!SKILL[id]) return fail("err.skillUnknown", { name: id });
      if (!canLearn(p.skills, p.level, id)) return fail(p.skills.points <= 0 ? "err.noSkillPoints" : "err.skillLocked");
      setSkills({ ranks: { ...p.skills.ranks, [id]: (p.skills.ranks[id] ?? 0) + 1 }, points: p.skills.points - 1 });
      return OK;
    },

    respecSkills: () => {
      const s = get().game.player.skills;
      const spent = Object.values(s.ranks).reduce((n, r) => n + (r ?? 0), 0);
      if (!spent) return fail("err.nothingToRespec");
      const t = now();
      const cost = respecCost(s, t);
      const paid = get().spend(cost, "txn.respec", "purchase");
      if (!paid.ok) return paid;
      const week = Math.floor(t / GAME_WEEK_MS);
      setSkills({ ranks: {}, points: s.points + spent, respecs: (week === s.respecWeek ? s.respecs : 0) + 1, respecWeek: week, overdrive: false });
      return OK;
    },

    useSkill: (name) => {
      const def = activeSkill(name);
      if (!def) return fail("err.skillUnknown", { name });
      const s = get().game.player.skills;
      if (!(s.ranks[def.id] ?? 0)) return fail("err.skillNotLearned");
      const t = now();
      const ready = s.cooldowns[def.id] ?? 0;
      if (t < ready) return fail("err.skillCooldown", { seconds: Math.ceil((ready - t) / 1000) });
      if (def.id === "ghost_veil") {
        const g = get().game;
        if (!g.net.session && !g.ops.active) return fail("err.notConnected");
        const until = t + GHOST_VEIL_MS;
        patch({
          net: g.net.session ? { ...g.net, session: { ...g.net.session, pausedUntil: until } } : g.net,
          ops: g.ops.active ? { ...g.ops, active: { ...g.ops.active, pausedUntil: until } } : g.ops,
        });
      } else if (def.id === "overdrive") setSkills({ overdrive: true });
      setSkills({ cooldowns: { ...get().game.player.skills.cooldowns, [def.id]: t + def.active!.cooldownMs } });
      emit({ type: "skillUsed", skill: def.id });
      return OK;
    },

    checkCrack: (ip) => {
      const host = hostAt(ip);
      if (!host) return fail("err.hostUnknown", { name: ip });
      if (!host.portsKnown) return fail("err.probeFirst");
      if (host.cracked) return fail("err.alreadyCracked");
      if (get().game.jobs.some((j) => j.kind === "crack" && j.target === ip)) return fail("err.jobRunning");
      if (shutDown()) return fail("err.rigShutdown");
      return OK;
    },

    finishManualCrack: (ip, r) => {
      const c = get().checkCrack(ip);
      if (!c.ok) return c;
      const host = hostAt(ip)!;
      const job: Job = { id: get().game.nextJob, kind: "crack", label: "crack", target: ip, startedAt: now(), endsAt: now(), load: jobLoad("crack") };
      if (r.solved) {
        patch({ nextJob: job.id + 1 });
        const clean = r.leftMs >= r.limitMs * CLEAN_SHARE;
        const xp = crackSucceeded(host, clean);
        emit({ type: "jobComplete", job, outcome: { kind: "crack", ip, ok: true, manual: { clean, leftMs: r.leftMs, moves: r.moves, xp } } });
        return OK;
      }
      // The sweep ran out: fall back to the dice roll at worse odds.
      startJob("crack", { target: ip, penalty: TIMEOUT_PENALTY }, { kind: "crack", host });
      return OK;
    },

    setClock: (part, step) => {
      const g = get().game;
      patch({ tuning: { ...g.tuning, [part]: step } });
    },

    setProfile: (p) => {
      const g = get().game;
      patch({ tuning: { ...g.tuning, ...PROFILES[p] } });
    },

    launchOp: (opId, loadout) => {
      const g = get().game;
      const op = g.ops.board.find((o) => o.id === opId);
      if (!op) return fail("err.opUnknown");
      if (g.ops.active) return fail("err.opRunning");
      if (g.player.level < op.level) return fail("err.levelTooLow", { level: op.level });
      if (loadout.length > LOADOUT_SLOTS) return fail("err.loadoutFull");
      const cost = loadout.reduce((n, id) => n + loadoutCost(id, op.tier), 0);
      if (cost > 0) {
        const paid = get().spend(cost, "txn.loadout", "purchase", { name: op.name });
        if (!paid.ok) return paid;
      }
      const { hosts, stages } = opHosts(op);
      const t = now();
      const net = get().game.net;
      patch({
        net: { ...net, hosts: [...net.hosts.filter((h) => !hosts.some((x) => x.ip === h.ip)), ...hosts] },
        ops: {
          ...get().game.ops,
          active: { opId, op: { ...op, stages }, startedAt: t, trace: 0, stage: 0, banked: 0, loadout, proxies: loadout.filter((l) => l === "ghost_proxy").length, pulled: 0 },
        },
      });
      return OK;
    },

    useProxy: () => {
      const g = get().game;
      const run = g.ops.active;
      if (!run) return fail("err.noOp");
      if (run.proxies <= 0) return fail("err.noProxy");
      patch({ ops: { ...g.ops, active: { ...run, proxies: run.proxies - 1, pausedUntil: now() + PROXY_MS } } });
      return OK;
    },

    exfil: () => {
      const g = get().game;
      const run = g.ops.active;
      if (!run) return fail("err.noOp");
      const events: GameEvent[] = [];
      const out = endOp(g, now(), false, events);
      set({ game: out });
      const ended = events.find((e) => e.type === "opEnded");
      if (ended && ended.type === "opEnded") {
        get().addXp(ended.xp);
        // First S on an op: a bonus skill point. S or A may drop a module.
        if (ended.result.grade === "S" && !g.ops.sGrades.includes(run.op.name)) {
          patch({ ops: { ...get().game.ops, sGrades: [...get().game.ops.sGrades, run.op.name] } });
          grantPoints(1);
        }
        if (ended.result.grade === "S" || ended.result.grade === "A") {
          const def = moduleForTier(run.op.tier, Math.random());
          if (def) {
            get().writeFile(`C:/tools/${def.file}`, moduleFile(def));
            const ops = get().game.ops;
            patch({ ops: { ...ops, history: [{ ...ops.history[0], drop: def.file }, ...ops.history.slice(1)] } });
          }
        }
      }
      emitAll(events);
      return OK;
    },

    replyRelay: (faction, id, choice) => {
      const g = get().game;
      let f = g.factions;
      const m = f.threads[faction].find((x) => x.id === id);
      if (!m || !m.choices?.includes(choice)) return fail("err.replyClosed");
      const close = (fs: typeof f) => ({ ...fs, threads: { ...fs.threads, [faction]: fs.threads[faction].map((x) => (x.id === id ? { ...x, choices: undefined } : x)) } });
      const rep = (fs: typeof f, who: FactionId, d: number) => ({ ...fs, rep: { ...fs.rep, [who]: clampRep(fs.rep[who] + d) } });
      const t = now();
      f = close(f);
      if (m.offer) {
        const o = m.offer;
        const contract = (credits: number) => ({
          id: uid("ctr"),
          goal: o.goal,
          tier: o.tier,
          need: o.need,
          progress: 0,
          reward: { credits, xp: Math.round(credits / 10) },
          status: "active" as const,
          faction,
          rep: o.rep,
        });
        f = send(f, faction, { from: "me", key: `relay.reply.${choice}`, vars: { rival: RIVAL_OF[faction] } }, t, []);
        if (choice === "accept") {
          patch({ contracts: [...get().game.contracts, contract(o.credits)] });
          f = send(f, faction, { from: "them", key: `relay.ack.${faction}` }, t, []);
        } else if (choice === "counter") {
          if (Math.random() < 0.6) {
            patch({ contracts: [...get().game.contracts, contract(Math.round(o.credits * 1.25))] });
            f = send(rep(f, faction, -2), faction, { from: "them", key: "relay.counter.yes", vars: { credits: Math.round(o.credits * 1.25) } }, t, []);
          } else f = send(rep(f, faction, -5), faction, { from: "them", key: "relay.counter.no" }, t, []);
        } else {
          const rival = RIVAL_OF[faction];
          f = rep(rep(f, faction, o.leak.from), rival, o.leak.to);
          f = send(f, rival, { from: "them", key: `relay.leaked.${rival}`, vars: { from: faction } }, t, []);
          patch({ contracts: [...get().game.contracts, { ...contract(Math.round(o.credits * 0.8)), faction: rival, rep: o.rep }] });
          patch({ factions: f });
          // Hostile factions hit back: Halcyon raises your Heat, The Static glitches your desktop.
          if (faction === "halcyon") get().addHeat(8);
          if (faction === "static" || repTier(f.rep.static) === "hostile") emit({ type: "glitch" });
          return OK;
        }
      } else if (m.chapter) {
        const ch = m.chapter;
        f = send(f, faction, { from: "me", key: `story.${faction}.${ch}.${choice}` }, t, []);
        f = choice === "a" ? rep(f, faction, STORY_REP[0]) : rep(rep(f, faction, STORY_REP[1]), RIVAL_OF[faction], 4);
        f = { ...f, chapter: { ...f.chapter, [faction]: Math.max(f.chapter[faction], ch) }, ending: ch === 5 ? `${faction}-${choice}` : f.ending, nextOfferAt: Math.min(f.nextOfferAt, t + 45_000) };
        patch({ factions: f });
        if (CHAPTER_POINT.includes(ch)) grantPoints(1);
        return OK;
      }
      patch({ factions: f });
      return OK;
    },

    readRelay: (faction) => {
      const f = get().game.factions;
      if (f.unread[faction]) patch({ factions: { ...f, unread: { ...f.unread, [faction]: 0 } } });
    },

    recordTrial: (id, rec) => {
      const g = get().game;
      const prev = g.trials[id];
      const better = !prev || MEDAL_RANK[rec.medal] > MEDAL_RANK[prev.medal] || (rec.medal === prev.medal && rec.best < prev.best);
      if (better) patch({ trials: { ...g.trials, [id]: { ...rec, best: Math.min(rec.best, prev?.best ?? Infinity) } } });
      const xp = prev ? 0 : trialXp(TRIALS.findIndex((x) => x.id === id));
      if (xp) get().addXp(xp);
      // First Gold in a trial: a bonus skill point.
      const point = rec.medal === "gold" && prev?.medal !== "gold";
      if (point) grantPoints(1);
      void TRIAL;
      return { xp, point, best: better };
    },

    writeFile: (path, f) => applyFs(vfs.writeFile(get().game.fs, path, { ...f, modified: now() })),
    mkdir: (path) => applyFs(vfs.mkdir(get().game.fs, path)),
    restoreFs: (root) => patch({ fs: root }),
    remove: (path) => applyFs(vfs.remove(get().game.fs, path)),
    copy: (from, to) => applyFs(vfs.copy(get().game.fs, from, to)),
    move: (from, to) => applyFs(vfs.move(get().game.fs, from, to)),
  };
});

/** Disk usage of the player's drive, in MB. */
export function diskUsage(g: Pick<GameState, "fs" | "rig">): { used: number; total: number } {
  return { used: vfs.sizeOf(g.fs), total: diskCapacityMB(g.rig) };
}

/** How long pulling a file of this size would take on the current rig (ms), for File Explorer. */
export function pullEstimate(g: Pick<GameState, "rig" | "modules">, sizeMB: number): number {
  const s = rigStats(g.rig);
  return jobDuration({ kind: "pull", size: sizeMB }, { ...s, netMbps: s.netMbps * (1 + moduleBonus(g.modules).net) });
}
