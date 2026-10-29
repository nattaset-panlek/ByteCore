import { tm } from "../../i18n";
import { t } from "../../i18n";
import { jobProgress } from "../../game/jobs";
import { useGame } from "../../game/store";
import type { JobOutcome } from "../../game/events";
import type { DirNode, Host } from "../../game/types";
import * as vfs from "../../game/vfs";
import { duration, fileSize } from "../common";
import { startDownload } from "../../game/appsdk/jobs";
import { pickLocalFiles } from "../userApp/importLocal";
import { useWindows } from "../../os/windowStore";
import { activeSkill, SKILL } from "../../game/skills";

export type Tone = "ok" | "err" | "muted" | "accent" | "warn";
export interface OutLine {
  text: string;
  tone?: Tone;
  /** Echoed command: the prompt is drawn green before the white command text */
  prompt?: string;
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

const HELP_ORDER = ["help", "clear", "ls", "cd", "cat", "pwd", "scan", "probe", "crack", "connect", "disconnect", "pull", "jobs", "kill", "skill", "op", "wget", "import"];

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

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

/** Local "C:\Users\name>", remote "[name@host ~]#" (Figma 06 Terminal). */
export function promptFor(scope: Scope, cwd: string): string {
  if (scope === "local") return `${cwd.replace(/\//g, "\\")}>`;
  const g = useGame.getState().game;
  const host = g.net.hosts.find((h) => h.ip === g.net.session?.ip);
  const dir = cwd === "/" ? "~" : cwd.split("/").pop();
  return `[${g.player.name}@${host?.name ?? g.net.session?.ip ?? "?"} ${dir}]#`;
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

    case "skill":
      return skillCommand(args);

    case "op":
      return opCommand(args);

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
      // Remote listings are a table: ATTR OWNER SIZE NAME.
      if (scope === "remote") {
        const row = (a: string, o: string, s: string, n: string) => `${a.padEnd(8)}${o.padEnd(8)}${s.padEnd(11)}${n}`;
        return {
          lines: [
            line(row("ATTR", "OWNER", "SIZE", "NAME"), "accent"),
            ...items.map((n) =>
              n.type === "dir" ? line(row("drwx", "root", "-", `${n.name}/`)) : line(row(n.loot ? "-rw-" : "-r--", n.loot ? "admin" : "root", fileSize(vfs.sizeOf(n)), n.name))
            ),
          ],
        };
      }
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
      // crack <addr> --manual opens the Lockgrid instead of starting the job.
      if (cmd === "crack" && args.includes("--manual")) {
        const ip = args.find((a) => !a.startsWith("--"))!;
        const r = store.checkCrack(ip);
        if (!r.ok) return { lines: [err(tm(r.error))] };
        useWindows.getState().open("lockgrid", { ip });
        return { lines: [] };
      }
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

    case "wget":
    case "curl": {
      // wget <url> [dir]  /  curl -o <file> <url> style flags are accepted and ignored
      const rest = args.filter((a) => !a.startsWith("-"));
      if (!rest[0]) return { lines: [err(t("terminal.needArg", { cmd, usage: `${cmd} <url> [dir]` }))] };
      if (scope !== "local") return { lines: [err(t("terminal.localOnly", { cmd }))] };
      const dest = rest[1] ? resolve("local", cwd, rest[1]).display : undefined;
      const r = startDownload(rest[0], dest);
      if (!r.ok) return { lines: [err(tm(r.error))] };
      return { lines: [line(t("terminal.job.download", { url: rest[0] }), "muted")] };
    }

    case "import": {
      if (scope !== "local") return { lines: [err(t("terminal.localOnly", { cmd }))] };
      pickLocalFiles(cwd);
      return { lines: [line(t("terminal.import.picking", { dir: cwd }), "muted")] };
    }

    default:
      return { lines: [err(t("terminal.unknownCmd", { cmd }))] };
  }
}

/** skill [list | use <name>]: active skills from the Skill Tree. */
function skillCommand(args: string[]): CmdOutcome {
  const store = useGame.getState();
  const sk = store.game.player.skills;
  if (args[0] === "use") {
    if (!args[1]) return { lines: [err(t("terminal.needArg", { cmd: "skill use", usage: "skill use <ghost|overdrive>" }))] };
    const r = store.useSkill(args[1]);
    if (!r.ok) return { lines: [err(tm(r.error))] };
    const def = activeSkill(args[1])!;
    return { lines: [line(t(`event.skillUsed.${def.id}`), "ok"), line(t("terminal.skill.cooldown", { time: mmss(def.active!.cooldownMs) }), "muted")] };
  }
  const learned = Object.entries(sk.ranks).filter(([, r]) => (r ?? 0) > 0);
  if (!learned.length) return { lines: [line(t("terminal.skill.none", { points: sk.points }), "muted")] };
  const now = Date.now();
  return {
    lines: [
      line(t("terminal.skill.title", { points: sk.points }), "accent"),
      ...learned.map(([id, r]) => {
        const def = SKILL[id as keyof typeof SKILL];
        const cd = sk.cooldowns[def.id] ?? 0;
        const state = def.active ? (now < cd ? t("terminal.skill.cd", { time: mmss(cd - now) }) : t("terminal.skill.ready", { alias: def.active.alias })) : "";
        return line(`${t(`skill.${id}`).padEnd(16)} ${r}/${def.max}  ${state}`);
      }),
    ],
  };
}

/** op [status | exfil | proxy]: the running Operation. */
function opCommand(args: string[]): CmdOutcome {
  const store = useGame.getState();
  const run = store.game.ops.active;
  if (!run) return { lines: [line(t("ops.noActive"), "muted")] };
  if (args[0] === "exfil" || args[0] === "proxy") {
    const r = args[0] === "exfil" ? store.exfil() : store.useProxy();
    return r.ok ? { lines: [line(args[0] === "exfil" ? t("ops.complete") : t("ops.load.ghost_proxy.fx"), "ok")] } : { lines: [err(tm(r.error))] };
  }
  const stage = run.op.stages[run.stage];
  return {
    lines: [
      line(`${run.op.name} · ${t("ops.sharedTrace")} ${Math.round(run.trace)}% · ${t("ops.banked")} ${run.banked}`, "accent"),
      ...run.op.stages.map((s, i) => line(`${i + 1}. ${t(`ops.stage.${s.kind}`)} · ${s.ip}  ${i < run.stage ? "✓" : i === run.stage ? "◀" : ""}`, i < run.stage ? "ok" : i === run.stage ? undefined : "muted")),
      stage ? line(stage.kind === "pull" ? t("ops.do.pull", { ip: stage.ip!, n: (stage.need ?? 1) - run.pulled }) : t("ops.do.crack", { ip: stage.ip! }), "muted") : line(t("ops.exfil"), "muted"),
    ],
  };
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
      if (o.manual)
        return [
          line(o.manual.clean ? t("terminal.crack.clean", { ip: o.ip, time: mmss(o.manual.leftMs) }) : t("terminal.crack.manual", { ip: o.ip, time: mmss(o.manual.leftMs) }), "ok"),
          line(t("terminal.crack.xp", { xp: o.manual.xp, moves: o.manual.moves }), "muted"),
        ];
      return o.ok ? [line(t("terminal.crack.ok", { ip: o.ip }), "ok")] : [line(t("terminal.crack.fail", { ip: o.ip }), "warn")];
    case "pull":
      return o.ok
        ? [line(t("terminal.pull.ok", { name: o.remotePath.split("/").pop() ?? o.remotePath, size: fileSize(o.size ?? 0), dest: o.dest ?? "" }), "ok")]
        : [line(t("terminal.pull.fail", { error: o.error ? tm(o.error) : "" }), "err")];
    case "download":
      return o.ok
        ? [line(t("terminal.download.ok", { dest: o.dest ?? "", size: fileSize(o.size ?? 0) }), "ok")]
        : [line(t("terminal.download.fail", { url: o.url, error: o.error ? tm(o.error) : "" }), "err")];
    case "compile":
      return o.ok ? [line(t("sdk.compile.ok", { dest: o.dest ?? "" }), "ok")] : [line(t("sdk.compile.fail", { error: o.error ?? "" }), "err")];
  }
}

export { duration };
