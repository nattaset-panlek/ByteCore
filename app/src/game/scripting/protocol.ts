// Messages between the main thread and the script Web Worker (GDD 3.3).

/** Main -> worker */
export type ToWorker = { type: "run"; code: string; sandbox?: boolean } | { type: "reply"; id: number; ok: boolean; result?: unknown; error?: string };

/** Worker -> main */
export type FromWorker =
  | { type: "rpc"; id: number; method: string; args: unknown[] }
  | { type: "log"; level: LogLevel; text: string }
  | { type: "done"; error?: string };

export type LogLevel = "info" | "warn" | "error";

/** Game API methods the worker may call. Each maps to a safe store action on the main thread. */
export const API_METHODS = [
  "player",
  "targets",
  "scan",
  "probe",
  "crack",
  "connect",
  "disconnect",
  "pull",
  "ls",
  "read",
  "write",
  "loot",
  "sellData",
  "scrubHeat",
] as const;
