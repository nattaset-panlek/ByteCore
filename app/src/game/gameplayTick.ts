import { HEAT_MAX, HEAT } from "./balance";
import type { GameEvent } from "./events";
import { FACTIONS, msgId, OFFER_EVERY_MS, openChapter, pendingMsg, rollOffer, type FactionId, type FactionState, type RelayMsg } from "./factions";
import { addTxn } from "./loop";
import { makeHost, scanTiers } from "./network";
import { BLOWN_HEAT, GRADE_BONUS, grade, opTraceRate, refillBoard, type OpResult } from "./ops";
import { RACE_EVERY_MS, raceBounty, RANK_REWARD, RANK_REWARD_REST, RIVALS, rivalById, SNIPE_CHANCE, SNIPE_EVERY_MS, standings, weekOf, type RivalState } from "./rivals";
import { rigStats } from "./rig";
import { skillEffects } from "./skills";
import type { GameState } from "./state";
import { pushHistory, SHUTDOWN_MS, SHUTDOWN_WEAR, stepTemp, targetTemp, THROTTLE, WEAR_PER_MIN, zone } from "./thermal";
import { refillContracts } from "./contracts";
import { CONTRACT_POOL } from "./balance";
import * as vfs from "./vfs";

// The gameplay systems layered on the core loop (docs/gameplay-ideas.md): Overclock thermals, the
// Operation trace budget, Relay messages and Ghost Board weeks/races. Called from tick() each second.

const HW_JOBS = new Set(["scan", "probe", "crack", "pull"]);

export function tickGameplay(g: GameState, now: number, dt: number, events: GameEvent[]): GameState {
  g = tickThermal(g, now, dt, events);
  g = tickOp(g, now, dt, events);
  g = tickFactions(g, now, events);
  g = tickRivals(g, now, events);
  return g;
}

// ---- Overclock ----

function tickThermal(g: GameState, now: number, dt: number, events: GameEvent[]): GameState {
  let tuning = g.tuning;
  let jobs = g.jobs;
  let rig = g.rig;
  const off = tuning.shutdownUntil && now < tuning.shutdownUntil;
  const load = off ? 0 : Math.min(1, jobs.filter((j) => HW_JOBS.has(j.kind)).reduce((n, j) => n + j.load, 0));
  const ceiling = rigStats(rig).ceiling + skillEffects(g.player.skills).coolHead;
  const temp = stepTemp(tuning.temp, targetTemp(load, tuning), dt);
  const z = zone(temp, ceiling);
  const throttled = z === "hot";
  if (throttled && !tuning.throttled) events.push({ type: "thermalThrottle", temp: Math.round(temp) });
  // Hot: running hardware jobs lose THROTTLE of their speed.
  if (throttled && dt < 10_000) jobs = jobs.map((j) => (HW_JOBS.has(j.kind) ? { ...j, endsAt: j.endsAt + dt * THROTTLE } : j));
  tuning = { ...tuning, temp, throttled, history: pushHistory(tuning.history, temp), shutdownUntil: off ? tuning.shutdownUntil : undefined };
  // Critical: the processor shuts down for a minute and cancels the crack it was running.
  if (z === "critical" && !off) {
    const cancelled = jobs.filter((j) => j.kind === "crack").length;
    jobs = jobs.filter((j) => j.kind !== "crack");
    if (rig.cpu) rig = { ...rig, cpu: { ...rig.cpu, condition: Math.max(0, rig.cpu.condition - SHUTDOWN_WEAR) } };
    tuning = { ...tuning, shutdownUntil: now + SHUTDOWN_MS };
    events.push({ type: "thermalShutdown", temp: Math.round(temp), cancelled });
  }
  // Wear while overclocked and warm or hotter.
  if (z !== "cool" && (tuning.cpu > 0 || tuning.net > 0)) {
    const wear = (WEAR_PER_MIN * dt) / 60_000;
    if (tuning.cpu > 0 && rig.cpu) rig = { ...rig, cpu: { ...rig.cpu, condition: Math.max(0, rig.cpu.condition - wear) } };
    if (tuning.net > 0 && rig.net) rig = { ...rig, net: { ...rig.net, condition: Math.max(0, rig.net.condition - wear) } };
  }
  return { ...g, tuning, jobs, rig };
}

// ---- Operations ----

function tickOp(g: GameState, now: number, dt: number, events: GameEvent[]): GameState {
  let ops = g.ops;
  if (!ops.active && now >= ops.refreshAt) ops = { ...ops, ...refillBoard(g.player.level, now, g.net.seed ^ (now & 0xffff)) };
  const run = ops.active;
  if (!run) return ops === g.ops ? g : { ...g, ops };
  if (run.pausedUntil && now < run.pausedUntil) return { ...g, ops };
  const trace = run.trace + (opTraceRate(run, skillEffects(g.player.skills).trace) * dt) / 1000;
  if (trace >= 100) return endOp({ ...g, ops }, now, true, events);
  let next = { ...run, trace, pausedUntil: undefined };
  if (!run.warned && trace >= 70) {
    next = { ...next, warned: true };
    events.push({ type: "opWarn", name: run.op.name });
  }
  // A session on an op host follows the shared trace.
  let net = g.net;
  if (net.session && g.net.hosts.find((h) => h.ip === net.session!.ip)?.op === run.opId) net = { ...net, session: { ...net.session, trace } };
  return { ...g, net, ops: { ...ops, active: next } };
}

/** Finish the active op: exfil (graded) or blown (keep banked, Heat spike). Removes the op hosts. */
export function endOp(g: GameState, now: number, blown: boolean, events: GameEvent[]): GameState {
  const run = g.ops.active;
  if (!run) return g;
  const timeMs = now - run.startedAt;
  const traceLeft = Math.max(0, Math.round(100 - run.trace));
  const gr = blown ? "blown" : grade(timeMs, traceLeft, run.op.par);
  const payout = Math.round(run.banked * (gr === "blown" ? 1 : GRADE_BONUS[gr]));
  const xp = Math.round(payout / 15);
  const result: OpResult = { opId: run.opId, name: run.op.name, tier: run.op.tier, grade: gr, payout, xp, timeMs, traceLeft, stagesDone: run.stage, stages: run.op.stages.length, at: now };
  const opIps = new Set(g.net.hosts.filter((h) => h.op === run.opId).map((h) => h.ip));
  const session = g.net.session && opIps.has(g.net.session.ip) ? null : g.net.session;
  if (g.net.session && !session) events.push({ type: "sessionEnded", ip: g.net.session.ip, reason: blown ? "traced" : "disconnect" });
  let out: GameState = {
    ...g,
    net: { ...g.net, session, hosts: g.net.hosts.filter((h) => !opIps.has(h.ip)) },
    jobs: g.jobs.filter((j) => !j.target || !opIps.has(j.target)),
    ops: { ...g.ops, active: null, history: [result, ...g.ops.history].slice(0, 20), board: g.ops.board.filter((o) => o.id !== run.opId) },
    player: { ...g.player, stats: { ...g.player.stats, ops: (g.player.stats.ops ?? 0) + 1 } },
  };
  if (payout > 0) out = { ...out, wallet: { ...out.wallet, balance: out.wallet.balance + payout }, txns: addTxn(out.txns, "txn.op", payout, "sale", now, { name: run.op.name }), rivals: { ...out.rivals, score: out.rivals.score + payout } };
  if (blown) out = { ...out, heat: Math.min(HEAT_MAX, out.heat + BLOWN_HEAT) };
  events.push({ type: "opEnded", result, xp });
  return out;
}

// ---- Factions ----

function tickFactions(g: GameState, now: number, events: GameEvent[]): GameState {
  let f = g.factions;
  if (now < f.nextOfferAt) return g;
  // Story first: any faction with an open chapter sends it; otherwise a job offer from someone not waiting on a reply.
  // Story and job offers take turns (an open chapter goes first half the time) so both keep coming.
  const story = FACTIONS.find((id) => openChapter(f, id, g.player.level));
  const free = FACTIONS.filter((id) => !pendingMsg(f, id) && f.rep[id] > -60);
  if (story && (Math.random() < 0.5 || !free.length)) f = send(f, story, { from: "them", key: `story.${story}.${openChapter(f, story, g.player.level)}`, chapter: openChapter(f, story, g.player.level), choices: ["a", "b"] }, now, events);
  else {
    if (free.length) {
      const id = free[Math.floor(Math.random() * free.length)];
      const offer = rollOffer(id, g.player.level, Math.random);
      f = send(f, id, { from: "them", key: `relay.offer.${id}`, vars: { credits: offer.credits }, offer, choices: ["accept", "counter", "leak"] }, now, events);
    }
  }
  return { ...g, factions: { ...f, nextOfferAt: now + OFFER_EVERY_MS } };
}

export function send(f: FactionState, id: FactionId, m: Omit<RelayMsg, "id" | "at">, now: number, events: GameEvent[]): FactionState {
  const msg: RelayMsg = { ...m, id: msgId(), at: now };
  if (m.from === "them") events.push({ type: "relayMessage", faction: id, key: m.key });
  return {
    ...f,
    threads: { ...f.threads, [id]: [...f.threads[id], msg].slice(-60) },
    unread: { ...f.unread, [id]: m.from === "them" ? f.unread[id] + 1 : f.unread[id] },
  };
}

// ---- Ghost Board ----

function tickRivals(g: GameState, now: number, events: GameEvent[]): GameState {
  let r: RivalState = g.rivals;
  let out = g;
  // Week rollover: rank rewards, promotion / demotion.
  if (weekOf(now) !== r.week) {
    const table = standings(r, g.player.name, (r.week + 1) * 7 * 20 * 60_000 - 1);
    const me = table.find((s) => s.id === "you")!;
    const reward = Math.round((RANK_REWARD[me.rank - 1] ?? RANK_REWARD_REST) * (1 + r.league * 0.5));
    const league = me.rank <= 3 ? Math.min(3, r.league + 1) : me.rank >= table.length - 1 ? Math.max(0, r.league - 1) : r.league;
    const badge = me.rank <= 3 ? `w${r.week}-${me.rank}` : null;
    out = { ...out, wallet: { ...out.wallet, balance: out.wallet.balance + reward }, txns: addTxn(out.txns, "txn.weekReward", reward, "sale", now, { rank: me.rank }) };
    events.push({ type: "weekEnded", rank: me.rank, reward, league, promoted: league > r.league, demoted: league < r.league });
    r = {
      ...r,
      week: weekOf(now),
      league,
      score: 0,
      lastRank: Object.fromEntries(table.map((s) => [s.id, s.rank])),
      badges: badge ? [...r.badges, badge] : r.badges,
      feed: [{ at: now, key: "ghost.feed.weekEnd", vars: { rank: me.rank } }, ...r.feed].slice(0, 30),
    };
  }
  // Race timeout: the rival got there first and the marked file is burned.
  if (r.race && now >= r.race.endsAt) {
    const race = r.race;
    const hosts = out.net.hosts.map((h) => (h.ip === race.ip ? { ...h, fs: rmFile(h.fs, race.path) } : h));
    out = { ...out, net: { ...out.net, hosts } };
    const rec = r.h2h[race.rival] ?? [0, 0];
    r = { ...r, race: null, h2h: { ...r.h2h, [race.rival]: [rec[0], rec[1] + 1] }, feed: [{ at: now, key: "ghost.feed.raceLost", vars: { ip: race.ip }, rival: race.rival }, ...r.feed].slice(0, 30) };
    events.push({ type: "raceEnded", won: false, rival: race.rival, bounty: race.bounty });
  }
  // A new race once in a while (from level 2, not during an op).
  if (!r.race && now >= r.nextRaceAt && g.player.level >= 2 && !g.ops.active && g.legal.state === "free") {
    const rival = RIVALS[Math.floor(Math.random() * 5)];
    const tiers = scanTiers(g.player.level);
    const tier = tiers[tiers.length - 1];
    const seed = (Math.random() * 0x7fffffff) | 0;
    const host = { ...makeHost(seed, tier), discovered: true };
    const bounty = raceBounty(tier);
    const path = "/var/data/vault.db";
    const size = 4 + tier * 4;
    const w = vfs.writeFile(host.fs, path, { size, modified: now, loot: { hash: `race-${seed.toString(36)}`, value: Math.round(bounty / 3), tier, source: host.ip } });
    if (w.ok) host.fs = w.root;
    out = { ...out, net: { ...out.net, hosts: [...out.net.hosts.filter((h) => h.ip !== host.ip), host] } };
    const span = (rival.raceSec + tier * 30) * 1000;
    r = { ...r, race: { rival: rival.id, ip: host.ip, path, size, bounty, startedAt: now, endsAt: now + span }, nextRaceAt: now + RACE_EVERY_MS[0] + Math.random() * (RACE_EVERY_MS[1] - RACE_EVERY_MS[0]) };
    events.push({ type: "raceStarted", rival: rival.id, ip: host.ip, bounty });
  }
  // Snipes: a rival takes one available contract off the pool.
  if (now >= r.nextSnipeAt) {
    r = { ...r, nextSnipeAt: now + SNIPE_EVERY_MS };
    const pool = out.contracts.filter((c) => c.status === "available");
    if (pool.length && Math.random() < SNIPE_CHANCE) {
      const c = pool[Math.floor(Math.random() * pool.length)];
      const rival = RIVALS[Math.floor(Math.random() * RIVALS.length)];
      out = { ...out, contracts: refillContracts(out.contracts.filter((x) => x.id !== c.id), g.player.level, CONTRACT_POOL) };
      r = { ...r, feed: [{ at: now, key: "ghost.feed.snipe", vars: { tier: c.tier }, rival: rival.id }, ...r.feed].slice(0, 30) };
      events.push({ type: "contractSniped", rival: rival.id, tier: c.tier });
    }
  }
  return r === g.rivals && out === g ? g : { ...out, rivals: r };
}

function rmFile(fs: GameState["fs"], path: string) {
  const r = vfs.remove(fs, path);
  return r.ok ? r.root : fs;
}

export { rivalById, HEAT };
