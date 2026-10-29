import { MODULES } from "../../game/modules";
import { TRACE_PER_SEC } from "../../game/network";
import { rigStats } from "../../game/rig";
import { skillEffects } from "../../game/skills";
import { diskUsage, useGame } from "../../game/store";
import type { Job } from "../../game/types";
import * as vfs from "../../game/vfs";
import { useT } from "../../i18n";
import { useWindows } from "../../os/windowStore";
import { Badge, Button, KeyValue } from "../../ui";
import { duration, fileSize, useNow } from "../common";
import type { Scope } from "./commands";

// Terminal side panel and status bar (Figma 06 Terminal: Local shell / Remote session).

const traceColor = (v: number) => (v > 75 ? "var(--critical)" : v > 45 ? "var(--caution)" : "var(--success)");

/** A running job drawn as a transfer row: name, bar, %, size done / total, speed. */
export function TransferRow({ job, pct }: { job: Job; pct: number }) {
  const host = useGame((s) => (job.target ? s.game.net.hosts.find((h) => h.ip === job.target) : undefined));
  const name = job.remotePath ? job.remotePath.split("/").pop()! : `${job.kind}${job.target ? ` ${job.target}` : ""}`;
  const node = job.remotePath && host ? vfs.getNode(host.fs, job.remotePath) : null;
  const size = node?.type === "file" ? node.size : 0;
  const secs = Math.max(0.001, (job.endsAt - job.startedAt) / 1000);
  return (
    <div className="term-line term-transfer">
      <span className="term-transfer-name">{name}</span>
      <span className="term-bar">
        <span style={{ width: `${pct * 100}%` }} />
      </span>
      <span>{String(Math.round(pct * 100)).padStart(2, "0")}%</span>
      {size > 0 && (
        <>
          <span>
            {fileSize(size * pct)} / {fileSize(size)}
          </span>
          <span>{fileSize(size / secs)}/s</span>
        </>
      )}
    </div>
  );
}

/** Remote session tab: target, trace and running processes, with Disconnect. */
export function TermSession() {
  const t = useT();
  const session = useGame((s) => s.game.net.session);
  const host = useGame((s) => (session ? s.game.net.hosts.find((h) => h.ip === session.ip) : undefined));
  const jobs = useGame((s) => s.game.jobs);
  const modules = useGame((s) => s.game.modules);
  const skills = useGame((s) => s.game.player.skills);
  useNow(1000);
  if (!session || !host) return null;
  const trace = Math.round(session.trace);
  const rate = TRACE_PER_SEC[host.admin] * skillEffects(skills).trace;
  const left = Math.max(0, Math.ceil((100 - session.trace) / rate));
  const procs = jobs.filter((j) => !j.target || j.target === host.ip);
  return (
    <aside className="term-session">
      <div>
        <div className="t-subtitle">{t("term.session")}</div>
        <div className="t-caption c-secondary">
          {host.name} · {host.ip}
        </div>
      </div>
      <div className="card">
        <span className="t-body-strong">{t("grid.target")}</span>
        <KeyValue k={t("grid.address")} v={host.ip} />
        <KeyValue k={t("term.system")} v={host.org} />
        <KeyValue k={t("term.security")} v={`Lv.${host.security}`} />
        <KeyValue k={t("term.admin")} v={host.admin} />
      </div>
      <div className="card">
        <span className="t-body-strong">{t("chimera.trace")}</span>
        <span className="term-trace" style={{ color: traceColor(trace) }}>
          {String(trace).padStart(2, "0")}%
        </span>
        <div className="kv t-caption">
          <span className="c-secondary">{t("term.traceLevel")}</span>
          <span style={{ color: traceColor(trace) }}>{String(trace).padStart(2, "0")}%</span>
        </div>
        <div className="meter-track">
          <div className="meter-fill" style={{ width: `${trace}%`, background: traceColor(trace) }} />
        </div>
        <span className="t-caption c-tertiary">{t("term.traceHint", { seconds: left })}</span>
      </div>
      <div className="card">
        <span className="t-body-strong">{t("term.processes")}</span>
        {procs.length === 0 && modules.length === 0 && <span className="t-caption c-tertiary">{t("term.noProcesses")}</span>}
        {procs.map((j) => (
          <div key={j.id} className="kv">
            <span className="t-caption">{j.remotePath ? j.remotePath.split("/").pop() : `${j.kind}.exe`}</span>
            <Badge tone="success">● {t("term.running")}</Badge>
          </div>
        ))}
        {modules.map((id) => (
          <div key={id} className="kv">
            <span className="t-caption">{MODULES[id]?.file ?? id}</span>
            <span className="t-caption c-secondary">● {t("term.idle")}</span>
          </div>
        ))}
      </div>
      <span className="spacer" />
      <div className="term-session-actions">
        <Button onClick={() => useGame.getState().disconnect()}>{t("chimera.disconnect")}</Button>
        <Button variant="accent" onClick={() => useWindows.getState().open("explorer", { path: "Z:/" })}>
          {t("term.browse")}
        </Button>
      </div>
    </aside>
  );
}

/** LOCAL / REMOTE · where · Proxy · Heat ……… rig (local) or session time (remote). */
export function TermStatus({ scope, cwd }: { scope: Scope; cwd: string }) {
  const t = useT();
  const g = useGame((s) => s.game);
  const now = useNow(1000);
  const heat = Math.round(g.heat);
  const proxy = g.modules.some((id) => MODULES[id]?.kind === "heat") || (!!g.net.session?.pausedUntil && now < g.net.session.pausedUntil);
  const host = g.net.hosts.find((h) => h.ip === g.net.session?.ip);
  const stats = rigStats(g.rig);
  const disk = diskUsage(g);
  return (
    <div className="term-status t-caption">
      <span className="c-accent">{scope === "remote" ? "REMOTE" : "LOCAL"}</span>
      <span>{scope === "remote" ? `${g.player.name}@${host?.name ?? "?"}` : cwd.replace(/\//g, "\\")}</span>
      <span className={proxy ? "c-success" : scope === "remote" ? "c-critical" : "c-secondary"}>{t(proxy ? "term.proxyOn" : "term.proxyOff")}</span>
      <span className="term-heat">
        {t("grid.heat")}
        <span className="term-bar small">
          <span style={{ width: `${heat}%`, background: heat > 60 ? "var(--critical)" : heat > 30 ? "var(--caution)" : "var(--success)" }} />
        </span>
        <span style={{ color: heat > 60 ? "var(--critical)" : heat > 30 ? "var(--caution)" : "var(--success)" }}>{String(heat).padStart(2, "0")}%</span>
      </span>
      <span className="spacer" />
      {scope === "remote" && g.net.session ? (
        <span className="c-secondary">{t("term.sessionTime", { time: duration(now - g.net.session.connectedAt) })}</span>
      ) : (
        <span className="c-secondary">
          CPU Lv.{stats.levels.cpu} · RAM {stats.ramGB} GB · Disk {fileSize(disk.used)} / {fileSize(disk.total)}
        </span>
      )}
    </div>
  );
}
