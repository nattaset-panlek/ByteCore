import { tm } from "../../i18n";
import type { JobOutcome } from "../events";
import { onGameEvent } from "../events";
import { rigStats } from "../rig";
import { useGame, type Result } from "../store";
import type { Host } from "../types";
import * as vfs from "../vfs";
import ScriptWorker from "./worker.ts?worker&inline";
import type { FromWorker, LogLevel, ToWorker } from "./protocol";
import { msg } from "../../i18n";
import { skillEffects } from "../skills";
import { codeLines, goals, makeSandbox, medalFor, passed, sandboxCall, clockText, type Medal, type Sandbox, type TrialDef } from "../trials";

// Main-thread bridge (GDD 3.3.2): turns the worker's RPC calls into safe store actions.
// Job-based calls (scan/probe/crack/pull) resolve when the matching job finishes in the loop.

export interface ScriptCallbacks {
  onLog: (level: LogLevel, text: string) => void;
  onDone: (error?: string) => void;
}

export interface ScriptHandle {
  stop: () => void;
}

const summary = (h: Host) => ({ ip: h.ip, name: h.name, org: h.org, tier: h.tier, security: h.security, admin: h.admin, cracked: h.cracked });

function check(r: Result): void {
  if (!r.ok) throw new Error(tm(r.error));
}

/** Scripts running right now; the Twin threads skill allows a second one. */
let running = 0;
export const runningScripts = () => running;

export function runScript(code: string, cb: ScriptCallbacks): ScriptHandle {
  const slots = skillEffects(useGame.getState().game.player.skills).scriptSlots;
  if (running >= slots) {
    queueMicrotask(() => cb.onDone(tm(msg("err.scriptSlots", { n: slots }))));
    return { stop: () => {} };
  }
  running++;
  let counted = true;
  const release = () => {
    if (counted) running--;
    counted = false;
  };
  const worker: Worker = new ScriptWorker();
  const g = () => useGame.getState();
  let finished = false;

  // Pending job-completion waiters keyed by kind (+ optional target).
  const waiters: { kind: JobOutcome["kind"]; target?: string; resolve: (o: JobOutcome) => void; reject: (e: Error) => void }[] = [];
  const off = onGameEvent((e) => {
    if (e.type !== "jobComplete") return;
    const i = waiters.findIndex((w) => w.kind === e.outcome.kind && (!w.target || w.target === (e.outcome as { ip?: string }).ip));
    if (i >= 0) waiters.splice(i, 1)[0].resolve(e.outcome);
  });
  const waitJob = (kind: JobOutcome["kind"], target?: string) =>
    new Promise<JobOutcome>((resolve, reject) => waiters.push({ kind, target, resolve, reject }));

  async function handle(method: string, args: unknown[]): Promise<unknown> {
    const s = g();
    const a = args as string[];
    switch (method) {
      case "player": {
        const st = rigStats(s.game.rig);
        return {
          level: s.game.player.level,
          xp: s.game.player.xp,
          balance: s.game.wallet.balance,
          heat: Math.round(s.game.heat),
          stats: { cpu: st.cpu, ramGB: st.ramGB, netMbps: st.netMbps, diskGB: st.diskGB },
        };
      }
      case "targets":
        return s.game.net.hosts.map(summary);
      case "scan": {
        check(s.scan());
        const o = await waitJob("scan");
        return o.kind === "scan" ? o.found : [];
      }
      case "probe": {
        check(s.probe(a[0]));
        const o = await waitJob("probe", a[0]);
        return o.kind === "probe" ? summary(o.host) : null;
      }
      case "crack": {
        check(s.crack(a[0]));
        const o = await waitJob("crack", a[0]);
        return { ok: o.kind === "crack" ? o.ok : false };
      }
      case "connect":
        check(s.connect(a[0]));
        return true;
      case "disconnect":
        s.disconnect();
        return true;
      case "pull": {
        check(s.pull(a[0], a[1]));
        const o = await waitJob("pull");
        if (o.kind !== "pull" || !o.ok) throw new Error(o.kind === "pull" && o.error ? tm(o.error) : "pull failed");
        return { dest: o.dest, size: o.size };
      }
      case "ls":
        return vfs.list(s.game.fs, a[0]).map((n) => ({ name: n.name, type: n.type, size: n.type === "file" ? n.size : undefined }));
      case "read": {
        const n = vfs.getNode(s.game.fs, a[0]);
        if (!n || n.type !== "file") throw new Error(`No such file: ${a[0]}`);
        return n.content ?? "";
      }
      case "write": {
        const content = String(args[1] ?? "");
        check(s.writeFile(a[0], { size: Math.max(0.001, content.length / 1024 / 1024), content }));
        return true;
      }
      case "loot":
        return vfs.lootFiles(s.game.fs).map(({ path, file }) => ({
          path,
          value: file.loot!.value,
          tier: file.loot!.tier,
          sold: s.game.soldHashes.includes(file.loot!.hash),
        }));
      case "sellData":
        check(s.sellData(args[0] as string[]));
        return true;
      case "scrubHeat":
        check(s.scrubHeat());
        return true;
      default:
        throw new Error(`Unknown API: ${method}`);
    }
  }

  const reply = (m: ToWorker) => worker.postMessage(m);

  worker.onmessage = async (e: MessageEvent<FromWorker>) => {
    const m = e.data;
    if (m.type === "log") {
      cb.onLog(m.level, m.text);
    } else if (m.type === "done") {
      cleanup();
      if (!finished) {
        finished = true;
        cb.onDone(m.error);
      }
    } else if (m.type === "rpc") {
      try {
        const result = await handle(m.method, m.args);
        reply({ type: "reply", id: m.id, ok: true, result });
      } catch (err) {
        reply({ type: "reply", id: m.id, ok: false, error: err instanceof Error ? err.message : String(err) });
      }
    }
  };

  function cleanup() {
    release();
    off();
    waiters.splice(0).forEach((w) => w.reject(new Error("stopped")));
  }

  reply({ type: "run", code });

  return {
    stop: () => {
      cleanup();
      worker.terminate();
      if (!finished) {
        finished = true;
        cb.onDone("stopped");
      }
    },
  };
}

export interface TrialResult {
  pass: boolean;
  medal?: Medal;
  reason?: "goals" | "calls" | "time" | "error" | "stopped";
  sandbox: Sandbox;
  lines: number;
}

/**
 * Run a script against a Script Trials sandbox (game/trials.ts). Calls never touch the real store;
 * each one is answered after a short real delay so the console streams.
 */
export function runTrial(code: string, def: TrialDef, cb: { onLog: (level: LogLevel, text: string) => void; onUpdate: (s: Sandbox) => void; onDone: (r: TrialResult) => void }): ScriptHandle {
  const worker: Worker = new ScriptWorker();
  const sb = makeSandbox(def);
  const lines = codeLines(code);
  let finished = false;
  const finish = (r: Omit<TrialResult, "sandbox" | "lines">) => {
    if (finished) return;
    finished = true;
    worker.terminate();
    cb.onUpdate({ ...sb });
    cb.onDone({ ...r, sandbox: sb, lines });
  };
  const stamp = (text: string) => `[${clockText(sb)}] ${text}`;
  worker.onmessage = (e: MessageEvent<FromWorker>) => {
    const m = e.data;
    if (m.type === "log") cb.onLog(m.level, stamp(m.text));
    else if (m.type === "done") {
      if (m.error) return finish({ pass: false, reason: "error" });
      const ok = passed(sb);
      finish(ok ? { pass: true, medal: medalFor(def, sb.clock) } : { pass: false, reason: "goals" });
    } else if (m.type === "rpc") {
      window.setTimeout(() => {
        if (finished) return;
        try {
          const { result, log } = sandboxCall(sb, m.method, m.args);
          if (log) cb.onLog("info", stamp(log));
          cb.onUpdate({ ...sb });
          if (sb.calls > def.maxCalls) return finish({ pass: false, reason: "calls" });
          if (sb.clock > def.maxSec) return finish({ pass: false, reason: "time" });
          worker.postMessage({ type: "reply", id: m.id, ok: true, result } satisfies ToWorker);
        } catch (err) {
          worker.postMessage({ type: "reply", id: m.id, ok: false, error: err instanceof Error ? err.message : String(err) } satisfies ToWorker);
        }
      }, m.method === "sleep" ? 10 : 40);
    }
  };
  worker.postMessage({ type: "run", code, sandbox: true } satisfies ToWorker);
  void goals;
  return { stop: () => finish({ pass: false, reason: "stopped" }) };
}
