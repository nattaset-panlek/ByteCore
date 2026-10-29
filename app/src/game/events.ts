import type { Msg } from "../i18n";
import type { Host, Job, Order } from "./types";
import type { HostSummary } from "./network";
import type { OpResult } from "./ops";

// Game -> UI events. The game layer never imports the OS; the shell subscribes and shows toasts.
// The Terminal and Chimera Kit subscribe for job results and session changes.

/** Result of a finished job, formatted into output lines by the Terminal. */
export type JobOutcome =
  | { kind: "scan"; found: HostSummary[] }
  | { kind: "probe"; host: Host }
  | { kind: "crack"; ip: string; ok: boolean; manual?: { clean: boolean; leftMs: number; moves: number; xp: number } }
  | { kind: "pull"; ip: string; remotePath: string; ok: boolean; dest?: string; size?: number; error?: Msg }
  | { kind: "download"; url: string; ok: boolean; dest?: string; size?: number; error?: Msg }
  | { kind: "compile"; src: string; ok: boolean; dest?: string; error?: string };

export type GameEvent =
  | { type: "orderDelivered"; order: Order }
  | { type: "levelUp"; level: number }
  | { type: "interestCharged"; amount: number }
  | { type: "warrant"; bail: number }
  | { type: "released" }
  | { type: "jobComplete"; job: Job; outcome: JobOutcome }
  | { type: "traced"; ip: string }
  | { type: "traceWarning"; ip: string; secondsLeft: number }
  | { type: "sessionEnded"; ip: string; reason: "disconnect" | "traced" }
  | { type: "contractComplete"; contractId: string }
  | { type: "skillPoint"; points: number }
  | { type: "skillUsed"; skill: string }
  | { type: "thermalThrottle"; temp: number }
  | { type: "thermalShutdown"; temp: number; cancelled: number }
  | { type: "opStage"; name: string; stage: number; banked: number; trace: number }
  | { type: "opWarn"; name: string }
  | { type: "opEnded"; result: OpResult; xp: number }
  | { type: "relayMessage"; faction: string; key: string }
  | { type: "glitch" }
  | { type: "raceStarted"; rival: string; ip: string; bounty: number }
  | { type: "raceEnded"; won: boolean; rival: string; bounty: number }
  | { type: "contractSniped"; rival: string; tier: number }
  | { type: "weekEnded"; rank: number; reward: number; league: number; promoted: boolean; demoted: boolean }
  | { type: "trialUnlock"; key: string };

type Listener = (e: GameEvent) => void;
const listeners = new Set<Listener>();

export function onGameEvent(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emit(e: GameEvent) {
  for (const fn of listeners) fn(e);
}
