import { jobProgress, pullThroughput } from "../../game/jobs";
import { rigStats } from "../../game/rig";
import { diskUsage, useGame } from "../../game/store";
import { t } from "../../i18n";
import { APPS, appName, type AppId } from "../../os/apps";
import { useWindows } from "../../os/windowStore";

// What Task Manager shows, computed from the open windows, running jobs and the rig.

export type Metric = "cpu" | "memory" | "disk" | "network";

export interface ProcRow {
  id: string;
  kind: "app" | "job" | "sys";
  name: string;
  icon: string;
  status: string;
  /** percent of CPU */
  cpu: number;
  /** MB */
  mem: number;
  /** MB/s */
  disk: number;
  /** Mbps */
  net: number;
  /** window id or job id, for End task */
  ref?: string | number;
}

/** Rough memory footprint per app window, MB. */
const APP_MEM: Record<AppId, number> = {
  explorer: 85,
  terminal: 40,
  browser: 210,
  rigManager: 70,
  rigStock: 55,
  wallet: 60,
  taskManager: 48,
  profile: 45,
  settings: 65,
  scriptEditor: 95,
  contracts: 50,
  chimeraKit: 75,
};

const SYSTEM = [
  { key: "shell", cpu: 0.6, mem: 90 },
  { key: "wm", cpu: 0.4, mem: 140 },
  { key: "desktop", cpu: 0.2, mem: 70 },
  { key: "net", cpu: 0.1, mem: 40 },
];

/** Small deterministic wobble so idle numbers look alive. */
const wobble = (seed: number, now: number) => (Math.sin(now / 1700 + seed) + 1) / 2;

export interface Snapshot {
  apps: ProcRow[];
  background: ProcRow[];
  totals: Record<Metric, number>;
  ramMB: number;
  netMbps: number;
  cpuGHz: number;
}

export function snapshot(now: number): Snapshot {
  const g = useGame.getState().game;
  const stats = rigStats(g.rig);
  const ramMB = Math.max(1, stats.ramGB * 1024);

  const apps: ProcRow[] = useWindows.getState().windows.map((w, i) => ({
    id: w.id,
    kind: "app",
    name: appName(w.appId),
    icon: APPS[w.appId].icon,
    status: "",
    cpu: 0.1 + wobble(i * 3.1, now) * 0.9,
    mem: APP_MEM[w.appId] * (0.95 + wobble(i * 1.7, now) * 0.1),
    disk: 0,
    net: w.appId === "browser" ? 0.1 : 0,
    ref: w.id,
  }));

  const jobs: ProcRow[] = g.jobs.map((j) => ({
    id: `job-${j.id}`,
    kind: "job",
    name: t(`taskmgr.job.${j.kind}`, { target: j.target ?? "" }),
    icon: "app/Terminal",
    status: `${Math.round(jobProgress(j, now) * 100)}%`,
    cpu: j.kind === "crack" ? j.load * 100 : j.load * 20,
    mem: 30,
    disk: j.kind === "pull" ? 0.4 : 0,
    net: j.kind === "pull" ? pullThroughput(stats) * 8 : j.kind === "scan" ? Math.min(stats.netMbps, 1) : 0,
    ref: j.id,
  }));

  const system: ProcRow[] = SYSTEM.map((s, i) => ({
    id: `sys-${s.key}`,
    kind: "sys",
    name: t(`taskmgr.sys.${s.key}`),
    icon: "app/XeaLogo",
    status: "",
    cpu: s.cpu * (0.6 + wobble(i * 2.3 + 9, now) * 0.8),
    mem: s.mem,
    disk: 0,
    net: s.key === "net" ? 0.02 : 0,
  }));

  const background = [...jobs, ...system];
  const all = [...apps, ...background];
  const sum = (k: "cpu" | "mem" | "disk" | "net") => all.reduce((s, r) => s + r[k], 0);
  const disk = diskUsage(g);

  return {
    apps,
    background,
    ramMB,
    netMbps: stats.netMbps,
    cpuGHz: stats.cpu,
    totals: {
      cpu: Math.min(100, sum("cpu")),
      memory: Math.min(100, (sum("mem") / ramMB) * 100),
      disk: Math.min(100, sum("disk") * 10 + (disk.total ? 0 : 0)),
      network: stats.netMbps ? Math.min(100, (sum("net") / stats.netMbps) * 100) : 0,
    },
  };
}
