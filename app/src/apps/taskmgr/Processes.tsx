import { useT } from "../../i18n";
import { openContextMenu, separator } from "../../os/contextMenu";
import { Icon } from "../../ui";
import type { ProcRow, Snapshot } from "./data";
import { Glyph } from "./glyphs";

/** Cell tint grows with load, like the Figma heat map. */
const heat = (v: number) => ({ background: `rgba(96, 205, 255, ${0.06 + Math.min(1, v) * 0.32})` });

export function Processes({
  snap,
  query,
  selected,
  onSelect,
  onEnd,
  onSwitch,
}: {
  snap: Snapshot;
  query: string;
  selected: string | null;
  onSelect: (id: string) => void;
  onEnd: (row: ProcRow) => void;
  onSwitch: (row: ProcRow) => void;
}) {
  const t = useT();
  const q = query.trim().toLowerCase();
  const match = (r: ProcRow) => !q || r.name.toLowerCase().includes(q);
  const apps = snap.apps.filter(match);
  const bg = snap.background.filter(match);

  const row = (r: ProcRow) => (
    <div
      key={r.id}
      className={`tmp-row ${selected === r.id ? "selected" : ""}`}
      onPointerDown={() => onSelect(r.id)}
      onDoubleClick={() => r.kind === "app" && onSwitch(r)}
      onContextMenu={(e) => {
        onSelect(r.id);
        openContextMenu(e, [
          ...(r.kind === "app" ? [{ label: t("taskmgr.switchTo"), icon: r.icon, onClick: () => onSwitch(r) }, separator] : []),
          { label: t("taskmgr.endTask"), icon: "icon/dismiss", danger: true, disabled: r.kind === "sys", onClick: () => onEnd(r) },
        ]);
      }}
    >
      <span className="tmp-name">
        {r.kind === "app" ? <Glyph name="chevron" size={12} /> : <span className="tmp-chev-gap" />}
        <Icon name={r.icon} size={16} />
        <span className="ellipsis">{r.name}</span>
      </span>
      <span className="tmp-status">{r.kind === "app" ? <span className="c-success">✓</span> : <span className="c-secondary">{r.status}</span>}</span>
      <span className="tmp-cell" style={heat(r.cpu / 100)}>{r.cpu.toFixed(1)}%</span>
      <span className="tmp-cell" style={heat(r.mem / snap.ramMB)}>{r.mem.toFixed(1)} MB</span>
      <span className="tmp-cell" style={heat(r.disk / 5)}>{r.disk.toFixed(1)} MB/s</span>
      <span className="tmp-cell" style={heat(snap.netMbps ? r.net / snap.netMbps : 0)}>{r.net.toFixed(1)} Mbps</span>
    </div>
  );

  const total = (v: number, label: string) => (
    <span className="tmp-total">
      <span className="tmp-total-v">{Math.round(v)}%</span>
      <span className="tmp-total-l">{label}</span>
    </span>
  );

  return (
    <div className="tmp">
      <div className="tmp-head">
        <span className="tmp-name">{t("taskmgr.name")}</span>
        <span className="tmp-status">{t("taskmgr.status")}</span>
        {total(snap.totals.cpu, t("taskmgr.cpu"))}
        {total(snap.totals.memory, t("taskmgr.memory"))}
        {total(snap.totals.disk, t("taskmgr.disk"))}
        {total(snap.totals.network, t("taskmgr.network"))}
      </div>
      <div className="tmp-body">
        <div className="tmp-group">{t("taskmgr.groupApps", { count: apps.length })}</div>
        {apps.map(row)}
        <div className="tmp-group">{t("taskmgr.groupBackground", { count: bg.length })}</div>
        {bg.map(row)}
      </div>
    </div>
  );
}
