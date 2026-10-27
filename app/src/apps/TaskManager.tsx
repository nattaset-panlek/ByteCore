import { useEffect, useRef, useState } from "react";
import { jobProgress } from "../game/jobs";
import { rigStats } from "../game/rig";
import { diskUsage, useGame } from "../game/store";
import type { Job } from "../game/types";
import { useT } from "../i18n";
import { TitleBar } from "../os/Window";
import { Button } from "../ui";
import { netSpeed } from "./RigManager";
import { fileSize, useNow } from "./common";

type Tab = "processes" | "performance";

const SYS = [
  { key: "shell", cpu: 1.2, ram: 90 },
  { key: "wm", cpu: 0.8, ram: 140 },
  { key: "desktop", cpu: 0.4, ram: 70 },
  { key: "net", cpu: 0.2, ram: 40 },
] as const;

/** Task Manager: running jobs and rig performance graphs. */
export function TaskManager() {
  const t = useT();
  const [tab, setTab] = useState<Tab>("processes");
  return (
    <>
      <TitleBar />
      <div className="taskmgr">
        <div className="seg">
          <button type="button" className={tab === "processes" ? "on" : ""} onClick={() => setTab("processes")}>
            {t("taskmgr.processes")}
          </button>
          <button type="button" className={tab === "performance" ? "on" : ""} onClick={() => setTab("performance")}>
            {t("taskmgr.performance")}
          </button>
        </div>
        {tab === "processes" ? <Processes /> : <Performance />}
      </div>
    </>
  );
}

/** Live rig usage (0..1 each) derived from active jobs and disk. */
function usage(jobs: Job[], g: ReturnType<typeof useGame.getState>["game"]) {
  const stats = rigStats(g.rig);
  const cpu = Math.min(1, 0.04 + jobs.reduce((s, j) => s + (j.kind === "crack" ? j.load : j.load * 0.3), 0));
  const net = Math.min(1, jobs.some((j) => j.kind === "pull" || j.kind === "scan") ? 0.2 + jobs.filter((j) => j.kind === "pull").length * 0.4 : 0.02);
  const disk = diskUsage(g).total ? diskUsage(g).used / diskUsage(g).total : 0;
  const ram = Math.min(1, 0.18 + jobs.length * 0.12);
  return { cpu, net, disk, ram, stats };
}

function Processes() {
  const t = useT();
  const jobs = useGame((s) => s.game.jobs);
  const killJob = useGame((s) => s.killJob);
  const now = useNow(500);
  const cols = { gridTemplateColumns: "1fr 120px 70px 90px 90px" };
  return (
    <div className="tm-table">
      <div className="tm-row head" style={cols}>
        <span>{t("taskmgr.name")}</span>
        <span>{t("taskmgr.status")}</span>
        <span className="num">{t("taskmgr.cpu")}</span>
        <span className="num">{t("taskmgr.network")}</span>
        <span />
      </div>
      <div className="tm-group">{t("taskmgr.group.apps")}</div>
      {jobs.length === 0 && <div className="tm-row muted" style={cols}><span>—</span></div>}
      {jobs.map((j) => (
        <div className="tm-row" key={j.id} style={cols}>
          <span className="ellipsis">{t(`taskmgr.job.${j.kind}`, { target: j.target ?? "" })}</span>
          <span className="c-secondary">{Math.round(jobProgress(j, now) * 100)}%</span>
          <span className="num">{Math.round(j.load * 100)}%</span>
          <span className="num c-secondary">{j.kind === "pull" || j.kind === "scan" ? t("taskmgr.running") : "—"}</span>
          <span className="num">
            <Button onClick={() => killJob(j.id)}>{t("taskmgr.endTask")}</Button>
          </span>
        </div>
      ))}
      <div className="tm-group">{t("taskmgr.group.background")}</div>
      {SYS.map((s) => (
        <div className="tm-row" key={s.key} style={cols}>
          <span>{t(`taskmgr.sys.${s.key}`)}</span>
          <span className="c-secondary">{t("taskmgr.running")}</span>
          <span className="num">{s.cpu.toFixed(1)}%</span>
          <span className="num c-secondary">—</span>
          <span />
        </div>
      ))}
    </div>
  );
}

function Performance() {
  const t = useT();
  const jobs = useGame((s) => s.game.jobs);
  const game = useGame((s) => s.game);
  const u = usage(jobs, game);
  const [hist, setHist] = useState<{ cpu: number[]; ram: number[]; net: number[]; disk: number[] }>({ cpu: [], ram: [], net: [], disk: [] });
  const uRef = useRef(u);
  uRef.current = u;
  useEffect(() => {
    const push = (a: number[], v: number) => [...a.slice(-59), v];
    const id = window.setInterval(() => {
      const c = uRef.current;
      setHist((h) => ({ cpu: push(h.cpu, c.cpu), ram: push(h.ram, c.ram), net: push(h.net, c.net), disk: push(h.disk, c.disk) }));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);
  const disk = diskUsage(game);
  return (
    <div className="tm-perf">
      <Graph title={t("taskmgr.cpu")} color="var(--accent)" data={hist.cpu} value={`${Math.round(u.cpu * 100)}%`} sub={`${u.stats.cpu.toFixed(1)} GHz`} />
      <Graph title={t("taskmgr.memory")} color="var(--rarity-epic)" data={hist.ram} value={`${Math.round(u.ram * 100)}%`} sub={`${u.stats.ramGB} GB`} />
      <Graph title={t("taskmgr.network")} color="var(--success)" data={hist.net} value={`${Math.round(u.net * 100)}%`} sub={netSpeed(u.stats.netMbps)} />
      <Graph title={t("taskmgr.disk")} color="var(--caution)" data={hist.disk} value={`${Math.round((disk.used / (disk.total || 1)) * 100)}%`} sub={`${fileSize(disk.used)} / ${fileSize(disk.total)}`} />
    </div>
  );
}

function Graph({ title, color, data, value, sub }: { title: string; color: string; data: number[]; value: string; sub: string }) {
  const W = 300;
  const H = 70;
  const pts = data.length < 2 ? "" : data.map((v, i) => `${(i / 59) * W},${H - Math.max(0, Math.min(1, v)) * H}`).join(" ");
  return (
    <div className="card tm-graph">
      <div className="tm-graph-head">
        <span className="t-body-strong">{title}</span>
        <span className="t-subtitle">{value}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="tm-graph-svg">
        <defs>
          <linearGradient id={`g-${title}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {pts && <polygon points={`0,${H} ${pts} ${W},${H}`} fill={`url(#g-${title})`} />}
        {pts && <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" />}
      </svg>
      <span className="t-caption c-secondary">{sub}</span>
    </div>
  );
}
