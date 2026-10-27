import { useGame, diskUsage } from "../../game/store";
import { useT } from "../../i18n";
import { fileSize } from "../common";
import { netSpeed } from "../RigManager";
import type { Metric, Snapshot } from "./data";

export const METRIC_COLOR: Record<Metric, string> = { cpu: "#4cc2ff", memory: "#d3a6ff", disk: "#6ccb5f", network: "#f2a6d8" };
const METRICS: Metric[] = ["cpu", "memory", "disk", "network"];

/** Line + area chart of the last 60 samples (0..100). */
function Chart({ data, color, w, h, grid }: { data: number[]; color: string; w: number; h: number; grid?: boolean }) {
  const start = ((60 - data.length) / 59) * w;
  const shifted = data.map((v, i) => `${start + (i / 59) * w},${h - (Math.max(0, Math.min(100, v)) / 100) * h}`);
  const line = data.length > 1 ? shifted.join(" ") : "";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="tmf-chart" style={{ borderColor: color }}>
      {grid &&
        Array.from({ length: 9 }, (_, i) => <line key={`v${i}`} x1={((i + 1) * w) / 10} y1={0} x2={((i + 1) * w) / 10} y2={h} className="tmf-grid" />)}
      {grid && Array.from({ length: 4 }, (_, i) => <line key={`h${i}`} x1={0} y1={((i + 1) * h) / 5} x2={w} y2={((i + 1) * h) / 5} className="tmf-grid" />)}
      {line && <polygon points={`${start},${h} ${line} ${w},${h}`} fill={color} fillOpacity={0.35} />}
      {line && <polyline points={line} fill="none" stroke={color} strokeWidth={grid ? 1.5 : 1} />}
    </svg>
  );
}

export function Performance({
  snap,
  history,
  metric,
  onMetric,
}: {
  snap: Snapshot;
  history: Record<Metric, number[]>;
  metric: Metric;
  onMetric: (m: Metric) => void;
}) {
  const t = useT();
  const g = useGame((s) => s.game);
  const disk = diskUsage(g);
  const usedRamGB = (snap.totals.memory / 100) * (snap.ramMB / 1024);

  const caption: Record<Metric, string> = {
    cpu: `${Math.round(snap.totals.cpu)}%  ${snap.cpuGHz.toFixed(1)} GHz`,
    memory: `${usedRamGB.toFixed(1)}/${(snap.ramMB / 1024).toFixed(0)} GB (${Math.round(snap.totals.memory)}%)`,
    disk: `${fileSize(disk.used)} / ${fileSize(disk.total)}`,
    network: netSpeed(snap.netMbps),
  };
  const big: Record<Metric, string> = {
    cpu: `${Math.round(snap.totals.cpu)}%`,
    memory: `${usedRamGB.toFixed(1)} GB`,
    disk: `${Math.round(snap.totals.disk)}%`,
    network: `${Math.round(snap.totals.network)}%`,
  };

  const details: Record<Metric, [string, string][]> = {
    cpu: [
      [t("taskmgr.d.utilization"), `${Math.round(snap.totals.cpu)}%`],
      [t("taskmgr.d.speed"), `${snap.cpuGHz.toFixed(1)} GHz`],
      [t("taskmgr.d.processes"), String(snap.apps.length + snap.background.length)],
      [t("taskmgr.d.jobs"), String(g.jobs.length)],
    ],
    memory: [
      [t("taskmgr.d.inUse"), `${usedRamGB.toFixed(1)} GB`],
      [t("taskmgr.d.available"), `${Math.max(0, snap.ramMB / 1024 - usedRamGB).toFixed(1)} GB`],
      [t("taskmgr.d.capacity"), `${(snap.ramMB / 1024).toFixed(0)} GB`],
    ],
    disk: [
      [t("taskmgr.d.used"), fileSize(disk.used)],
      [t("taskmgr.d.free"), fileSize(disk.total - disk.used)],
      [t("taskmgr.d.capacity"), fileSize(disk.total)],
    ],
    network: [
      [t("taskmgr.d.linkSpeed"), netSpeed(snap.netMbps)],
      [t("taskmgr.d.utilization"), `${Math.round(snap.totals.network)}%`],
      [t("taskmgr.d.session"), g.net.session ? g.net.session.ip : "—"],
    ],
  };

  return (
    <div className="tmf">
      <div className="tmf-list">
        {METRICS.map((m) => (
          <button type="button" key={m} className={`tmf-item ${metric === m ? "on" : ""}`} onClick={() => onMetric(m)}>
            <span className="tmf-mini">
              <Chart data={history[m]} color={METRIC_COLOR[m]} w={64} h={40} />
            </span>
            <span className="tmf-item-text">
              <span className="t-body-large">{t(`taskmgr.m.${m}`)}</span>
              <span className="t-caption c-secondary">{caption[m]}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="tmf-main">
        <div className="tmf-title">
          <span className="t-title">{t(`taskmgr.m.${metric}`)}</span>
          <span className="t-subtitle">{big[metric]}</span>
        </div>
        <div className="tmf-axis t-caption c-secondary">
          <span>{t("taskmgr.usage", { name: t(`taskmgr.m.${metric}`) })}</span>
          <span>100%</span>
        </div>
        <Chart data={history[metric]} color={METRIC_COLOR[metric]} w={600} h={220} grid />
        <div className="tmf-axis t-caption c-secondary">
          <span>{t("taskmgr.seconds60")}</span>
          <span>0</span>
        </div>
        <div className="tmf-details">
          {details[metric].map(([k, v]) => (
            <div key={k} className="tmf-detail">
              <span className="t-caption c-secondary">{k}</span>
              <span className="t-subtitle">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

