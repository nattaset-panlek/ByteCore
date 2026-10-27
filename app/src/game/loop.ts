import {
  DEBT_DAILY_INTEREST,
  GAME_DAY_MS,
  HEAT,
  HEAT_DECAY_PER_MIN,
  HEAT_MAX,
  INCOME_PAYOUT_MS,
  MAX_OFFLINE_MS,
  MAX_TXNS,
  ORDER_STAGES,
} from "./balance";
import type { GameEvent } from "./events";
import { TRACE_PER_SEC } from "./network";
import { incomePerHour, uid, type GameState } from "./state";
import type { Order, OrderStage, Session, Txn } from "./types";

export const STAGE_LABELS = ["Ordered", "Packed", "On the way", "Delivered"] as const;

export function orderStage(o: Order, now: number): OrderStage {
  if (now >= o.arrivesAt) return 3;
  const t = (now - o.placedAt) / Math.max(1, o.arrivesAt - o.placedAt);
  return t >= ORDER_STAGES.onTheWay ? 2 : t >= ORDER_STAGES.packed ? 1 : 0;
}

export function addTxn(txns: Txn[], label: string, amount: number, kind: Txn["kind"], at: number, vars?: Txn["vars"]): Txn[] {
  return [{ id: uid("txn"), at, label, vars, amount, kind }, ...txns].slice(0, MAX_TXNS);
}

/**
 * Advance the game from g.lastTick to now (one 1s tick, or a long offline gap after loading).
 * Pure: returns the new state and the events to emit.
 */
export function tick(g: GameState, now: number): { game: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  const from = Math.max(g.lastTick, now - MAX_OFFLINE_MS);
  const dt = Math.max(0, now - from);
  if (dt === 0) return { game: g, events };

  let { wallet, txns, heat, orders } = g;
  let session: Session | null = g.net.session;

  // Trace while connected (GDD 3.6): disconnect is forced at 100.
  if (session) {
    const host = g.net.hosts.find((h) => h.ip === session!.ip);
    const rate = host ? TRACE_PER_SEC[host.admin] : TRACE_PER_SEC.Medium;
    const trace = session.trace + (rate * dt) / 1000;
    if (trace >= 100) {
      heat = Math.min(HEAT_MAX, heat + HEAT.traced);
      events.push({ type: "traced", ip: session.ip });
      events.push({ type: "sessionEnded", ip: session.ip, reason: "traced" });
      session = null;
    } else {
      const secondsLeft = Math.ceil((100 - trace) / rate);
      session = { ...session, trace };
      if (!session.warned && secondsLeft <= 30) {
        session = { ...session, warned: true };
        events.push({ type: "traceWarning", ip: session.ip, secondsLeft });
      }
    }
  }

  // Deliveries
  if (orders.some((o) => !o.notified && !o.cancelled && now >= o.arrivesAt)) {
    orders = orders.map((o) => {
      if (o.notified || o.cancelled || now < o.arrivesAt) return o;
      const done = { ...o, notified: true };
      events.push({ type: "orderDelivered", order: done });
      return done;
    });
  }

  // Passive income, paid out once per INCOME_PAYOUT_MS
  const pending = wallet.pending + (incomePerHour(g) * dt) / 3_600_000;
  wallet = { ...wallet, pending };
  if (now - wallet.lastPayoutAt >= INCOME_PAYOUT_MS) {
    const pay = Math.floor(wallet.pending);
    wallet = { ...wallet, pending: wallet.pending - pay, lastPayoutAt: now };
    if (pay > 0) {
      wallet = { ...wallet, balance: wallet.balance + pay };
      // One row per game day window instead of one per minute
      const last = txns[0];
      if (last?.kind === "mining" && Math.floor(last.at / GAME_DAY_MS) === Math.floor(now / GAME_DAY_MS))
        txns = [{ ...last, amount: last.amount + pay, at: now }, ...txns.slice(1)];
      else txns = addTxn(txns, "txn.mining", pay, "mining", now);
    }
  }

  // Heat decay
  if (heat > 0) heat = Math.max(0, heat - (HEAT_DECAY_PER_MIN * dt) / 60_000);

  // Debt interest, once per game day
  if (wallet.debt <= 0) {
    if (wallet.lastInterestAt !== now) wallet = { ...wallet, lastInterestAt: now };
  } else {
    while (now - wallet.lastInterestAt >= GAME_DAY_MS) {
      const interest = Math.ceil(wallet.debt * DEBT_DAILY_INTEREST);
      wallet = { ...wallet, debt: wallet.debt + interest, lastInterestAt: wallet.lastInterestAt + GAME_DAY_MS };
      txns = addTxn(txns, "txn.interest", -interest, "interest", now);
      events.push({ type: "interestCharged", amount: interest });
    }
  }

  const net = session === g.net.session ? g.net : { ...g.net, session };
  return { game: { ...g, lastTick: now, wallet, txns, heat, orders, net }, events };
}
