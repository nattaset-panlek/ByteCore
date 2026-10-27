import type { Msg } from "../i18n";
import type { Host, Job, Order } from "./types";
import type { HostSummary } from "./network";

// Game -> UI events. The game layer never imports the OS; the shell subscribes and shows toasts.
// The Terminal and Chimera Kit subscribe for job results and session changes.

/** Result of a finished job, formatted into output lines by the Terminal. */
export type JobOutcome =
  | { kind: "scan"; found: HostSummary[] }
  | { kind: "probe"; host: Host }
  | { kind: "crack"; ip: string; ok: boolean }
  | { kind: "pull"; ip: string; remotePath: string; ok: boolean; dest?: string; size?: number; error?: Msg };

export type GameEvent =
  | { type: "orderDelivered"; order: Order }
  | { type: "levelUp"; level: number }
  | { type: "heatMax" }
  | { type: "interestCharged"; amount: number }
  | { type: "jobComplete"; job: Job; outcome: JobOutcome }
  | { type: "traced"; ip: string }
  | { type: "traceWarning"; ip: string; secondsLeft: number }
  | { type: "sessionEnded"; ip: string; reason: "disconnect" | "traced" }
  | { type: "contractComplete"; contractId: string };

type Listener = (e: GameEvent) => void;
const listeners = new Set<Listener>();

export function onGameEvent(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emit(e: GameEvent) {
  for (const fn of listeners) fn(e);
}
