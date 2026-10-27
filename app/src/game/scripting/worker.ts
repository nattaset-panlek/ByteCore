/// <reference lib="webworker" />
import type { FromWorker, LogLevel, ToWorker } from "./protocol";

// Runs the player's script in isolation (GDD 3.3). The ByteCore SDK here only posts RPC
// messages to the main thread, which performs the actual (safe) game actions and replies.

const ctx = self as unknown as Worker;
const post = (m: FromWorker) => ctx.postMessage(m);

let seq = 0;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

function rpc<T = unknown>(method: string, args: unknown[] = []): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
    post({ type: "rpc", id, method, args });
  });
}

const log = (level: LogLevel, args: unknown[]) => post({ type: "log", level, text: args.map(str).join(" ") });
function str(v: unknown): string {
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/** The SDK exposed to player scripts as `ByteCore`. All calls are async. */
const ByteCore = {
  /** Player snapshot: { level, xp, balance, heat, stats: { cpu, ramGB, netMbps, diskGB } } */
  player: () => rpc("player"),
  net: {
    /** Scan for targets; resolves when the scan finishes. */
    scan: () => rpc<{ ip: string; name: string; org: string; tier: number }[]>("scan"),
    /** Known targets so far. */
    targets: () => rpc("targets"),
    probe: (ip: string) => rpc("probe", [ip]),
    /** Resolves { ok } once the crack job finishes. */
    crack: (ip: string) => rpc<{ ok: boolean }>("crack", [ip]),
  },
  connect: (ip: string) => rpc("connect", [ip]),
  disconnect: () => rpc("disconnect"),
  /** Copy a remote file to the rig; resolves { dest, size } when the transfer finishes. */
  pull: (remotePath: string, destDir?: string) => rpc("pull", [remotePath, destDir]),
  fs: {
    ls: (path: string) => rpc<{ name: string; type: string; size?: number }[]>("ls", [path]),
    read: (path: string) => rpc<string>("read", [path]),
    write: (path: string, content: string) => rpc("write", [path, content]),
  },
  /** Loot files on the drive, with value and sold status. */
  loot: () => rpc("loot"),
  sellData: (paths: string[]) => rpc("sellData", [paths]),
  scrubHeat: () => rpc("scrubHeat"),
  /** Pause the script (max 60 s per call). */
  sleep: (ms: number) => new Promise((r) => setTimeout(r, Math.max(0, Math.min(60000, ms)))),
  logger: {
    info: (...a: unknown[]) => log("info", a),
    warn: (...a: unknown[]) => log("warn", a),
    error: (...a: unknown[]) => log("error", a),
  },
  log: (...a: unknown[]) => log("info", a),
};

const consoleShim = {
  log: (...a: unknown[]) => log("info", a),
  info: (...a: unknown[]) => log("info", a),
  warn: (...a: unknown[]) => log("warn", a),
  error: (...a: unknown[]) => log("error", a),
};

async function run(code: string) {
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("ByteCore", "console", `"use strict";\nreturn (async () => {\n${code}\n})();`);
    await fn(ByteCore, consoleShim);
    post({ type: "done" });
  } catch (err) {
    log("error", [err instanceof Error ? err.message : String(err)]);
    post({ type: "done", error: err instanceof Error ? err.message : String(err) });
  }
}

ctx.onmessage = (e: MessageEvent<ToWorker>) => {
  const m = e.data;
  if (m.type === "run") {
    run(m.code);
  } else if (m.type === "reply") {
    const p = pending.get(m.id);
    if (!p) return;
    pending.delete(m.id);
    if (m.ok) p.resolve(m.result);
    else p.reject(new Error(m.error ?? "error"));
  }
};
