import { tm } from "../../i18n";
import { t } from "../../i18n";
import { jobProgress } from "../../game/jobs";
import { useGame } from "../../game/store";
import type { JobOutcome } from "../../game/events";
import type { DirNode, Host } from "../../game/types";
import * as vfs from "../../game/vfs";
import { duration, fileSize } from "../common";

export type Tone = "ok" | "err" | "muted" | "accent" | "warn";
export interface OutLine {
  text: string;
  tone?: Tone;
}
export type Scope = "local" | "remote";

export interface CmdOutcome {
  lines: OutLine[];
  /** New cwd for this shell */
  cwd?: string;
  clear?: boolean;
  openRemote?: boolean;
  closeRemote?: boolean;
}

const line = (text: string, tone?: Tone): OutLine => ({ text, tone });
const err = (text: string): OutLine => ({ text, tone: "err" });

export const LOCAL_HOME = "C:/Users/ghost_user";

const HELP_ORDER = ["help", "clear", "ls", "cd", "cat", "pwd", "scan", "probe", "crack", "connect", "disconnect", "pull", "jobs", "kill"];

/** Resolve a path argument against the shell's cwd, handling "." and "..". */
function resolve(scope: Scope, cwd: string, arg: string): { parts: string[]; display: string } {
  const raw = arg.replace(/\\/g, "/");
  const isAbs = raw.startsWith("/") || /^[a-z]:/i.test(raw);
  const parts = isAbs ? [] : vfs.splitPath(cwd);
  for (const seg of raw.replace(/^[a-z]:/i, "").split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  const display = scope === "local" ? "C:/" + parts.join("/") : "/" + parts.join("/");
  return { parts, display };
}

function rootFor(scope: Scope): DirNode | null {
  if (scope === "local") return useGame.getState().game.fs;
  const s = useGame.getState().game.net.session;
  if (!s) return null;
  return useGame.getState().game.net.hosts.find((h) => h.ip === s.ip)?.fs ?? null;
}

function nodeAt(scope: Scope, display: string) {
  const root = rootFor(scope);
  return root ? vfs.getNode(root, display) : null;
}

export function promptFor(scope: Scope, cwd: string): string {
  if (scope === "local") return `${cwd}>`;
  const ip = useGame.getState().game.net.session?.ip ?? "?";
  return `${ip}:${cwd}$`;
}

/** Run one command line. Instant commands return their output; job commands start a job and confirm. */
export function runCommand(raw: string, scope: Scope, cwd: string): CmdOutcome {
  const input = raw.trim();
  if (!input) return { lines: [] };
  const [cmd, ...args] = input.split(/\s+/);
  const g = useGame.getState;
  const store = useGame.getState();

  switch (cmd) {
    case "help": {
      if (args[0]) {
        const key = `terminal.help.${args[0]}`;
        const text = t(key);
        return { lines: [line(text === key ? t("terminal.unknownCmd", { cmd: args[0] }) : text, "muted")] };
      }
      return { lines: [line(t("terminal.help.title"), "accent"), ...HELP_ORDER.map((c) => line(t(`terminal.help.${c}`), "muted"))] };
    }

    case "clear":
      return { lines: [], clear: true };

    case "pwd":
      return { lines: [line(scope === "local" ? cwd : promptFor(scope, cwd))] };

    case "ls": {
      const target = args[0] ? resolve(scope, cwd, args[0]) : { display: cwd, parts: vfs.splitPath(cwd) };
      const node = nodeAt(scope, target.display);
      if (!node) return { lines: [err(t("terminal.noSuchPath", { path: args[0] ?? cwd }))] };
      if (node.type !== "dir") return { lines: [err(t("terminal.notADir", { path: target.display }))] };
      const items = Object.values(node.children).sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1));
      if (items.length === 0) return { lines: [line("(empty)", "muted")] };
      return {
        lines: items.map((n) =>
          n.type === "dir" ? line(`${n.name}/`, "accent") : line(`${n.name}  ${fileSize(vfs.sizeOf(n))}${n.loot ? "  *" : ""}`)
        ),
      };
    }

    case "cd": {
      if (!args[0]) return { lines: [], cwd: scope === "local" ? LOCAL_HOME : "/" };
      const target = resolve(scope, cwd, args[0]);
      const node = nodeAt(scope, target.display);
      if (!node) return { lines: [err(t("terminal.noSuchPath", { path: args[0] }))] };
      if (node.type !== "dir") return { lines: [err(t("terminal.notADir", { path: target.display }))] };
      return { lines: [], cwd: target.display };
    }

    case "cat": {
      if (!args[0]) return { lines: [err(t("terminal.needArg", { cmd: "cat", usage: "cat <file>" }))] };
      const target = resolve(scope, cwd, args[0]);
      const node = nodeAt(scope, target.display);
      if (!node) return { lines: [err(t("terminal.noSuchPath", { path: args[0] }))] };
      if (node.type !== "file") return { lines: [err(t("terminal.notAFile", { path: target.display }))] };
      if (!node.content) return { lines: [line(t("terminal.emptyFile"), "muted")] };
      return { lines: node.content.split("\n").map((l) => line(l)) };
    }

    case "scan": {
      if (scope !== "local") return { lines: [err(t("terminal.localOnly", { cmd: "scan" }))] };
      const r = store.scan();
      if (!r.ok) return { lines: [err(tm(r.error))] };
      return { lines: [line(t("terminal.job.scan"), "muted")] };
    }

    case "probe":
    case "crack": {
      if (scope !== "local") return { lines: [err(t("terminal.localOnly", { cmd }))] };
      if (!args[0]) return { lines: [err(t("terminal.needArg", { cmd, usage: `${cmd} <addr>` }))] };
      const r = cmd === "probe" ? store.probe(args[0]) : store.crack(args[0]);
      if (!r.ok) return { lines: [err(tm(r.error))] };
      return { lines: [line(t(`terminal.job.${cmd}`, { ip: args[0] }), "muted")] };
    }

    case "connect": {
      if (!args[0]) return { lines: [err(t("terminal.needArg", { cmd: "connect", usage: "connect <addr>" }))] };
      const r = store.connect(args[0]);
      if (!r.ok) return { lines: [err(tm(r.error))] };
      return { lines: [line(t("terminal.connect.ok", { ip: args[0] }), "ok"), line(t("terminal.connect.prompt"), "muted")], openRemote: true };
    }

    case "disconnect": {
      const ip = g().game.net.session?.ip;
      if (!ip) return { lines: [err(t("terminal.notConnectedHere", { cmd: "disconnect" }))] };
      store.disconnect();
      return { lines: [line(t("terminal.disconnect.ok", { ip }), "muted")], closeRemote: true };
    }

    case "pull": {
      if (scope !== "remote") return { lines: [err(t("terminal.notConnectedHere", { cmd: "pull" }))] };
      if (!args[0]) return { lines: [err(t("terminal.needArg", { cmd: "pull", usage: "pull <path> [dir]" }))] };
      const remote = resolve("remote", cwd, args[0]).display;
      const r = store.pull(remote, args[1]);
      if (!r.ok) return { lines: [err(tm(r.error))] };
      return { lines: [line(t("terminal.job.pull", { path: remote }), "muted")] };
    }

    case "jobs": {
      const jobs = g().game.jobs;
      if (jobs.length === 0) return { lines: [line(t("terminal.jobs.none"), "muted")] };
      const now = Date.now();
      return {
        lines: jobs.map((j) =>
          line(t("terminal.jobs.row", { id: j.id, job: j.kind, progress: Math.round(jobProgress(j, now) * 100), target: j.target ?? "" }))
        ),
      };
    }

    case "kill": {
      const id = Number(args[0]);
      if (!id || !g().game.jobs.some((j) => j.id === id)) return { lines: [err(t("terminal.kill.none", { id: args[0] ?? "" }))] };
      store.killJob(id);
      return { lines: [line(t("terminal.kill.ok", { id }), "muted")] };
    }

    default:
      return { lines: [err(t("terminal.unknownCmd", { cmd }))] };
  }
}

/** Turn a finished job's outcome into scrollback lines. */
export function formatOutcome(o: JobOutcome): OutLine[] {
  switch (o.kind) {
    case "scan":
      if (o.found.length === 0) return [line(t("terminal.scan.none"), "muted")];
      return [
        line(t("terminal.scan.found", { count: o.found.length }), "ok"),
        ...o.found.map((h) => line(t("terminal.scan.row", { ip: h.ip, org: h.org, tier: h.tier }))),
      ];
    case "probe": {
      const h: Host = o.host;
      return [
        line(t("terminal.probe.done", { ip: h.ip, security: h.security, admin: h.admin }), "ok"),
        line(t("terminal.probe.ports", { ports: h.ports.join(", ") }), "muted"),
      ];
    }
    case "crack":
      return o.ok ? [line(t("terminal.crack.ok", { ip: o.ip }), "ok")] : [line(t("terminal.crack.fail", { ip: o.ip }), "warn")];
    case "pull":
      return o.ok
        ? [line(t("terminal.pull.ok", { name: o.remotePath.split("/").pop() ?? o.remotePath, size: fileSize(o.size ?? 0), dest: o.dest ?? "" }), "ok")]
        : [line(t("terminal.pull.fail", { error: o.error ? tm(o.error) : "" }), "err")];
  }
}

export { duration };
