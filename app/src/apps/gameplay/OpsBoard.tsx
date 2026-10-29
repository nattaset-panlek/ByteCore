import { useState } from "react";
import { LOADOUT, LOADOUT_SLOTS, loadoutCost, opTraceRate, type LoadoutId, type Operation, type OpRun, type OpResult } from "../../game/ops";
import { skillEffects } from "../../game/skills";
import { useGame } from "../../game/store";
import { tm, useT } from "../../i18n";
import { useWindows } from "../../os/windowStore";
import { TitleBar } from "../../os/Window";
import { Badge, Button, Card, InfoBar, KeyValue, Meter } from "../../ui";
import { credits, dateTime, duration, EmptyState, NavApp, NavHeader, usePages, useNow } from "../common";
import { Glyph } from "./Glyph";

// Ops Board (docs/gameplay-ideas.md §2): Available ops with a stage map, loadout and payout; the Active
// run; History. The Op HUD window is the compact view while an op runs.

type Page = "available" | "active" | "history";
const NAV: { id: Page; label: string; icon: string }[] = [
  { id: "available", label: "ops.nav.available", icon: "icon/grid" },
  { id: "active", label: "ops.nav.active", icon: "icon/power" },
  { id: "history", label: "ops.nav.history", icon: "icon/document" },
];

const mmss = (ms: number) => duration(ms).slice(3);

export function OpsBoard() {
  const t = useT();
  const active = useGame((s) => s.game.ops.active);
  const board = useGame((s) => s.game.ops.board);
  const pages = usePages<Page>(active ? "active" : "available");
  const [find, setFind] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const nav = NAV.map((n) => ({ ...n, label: t(n.label) })).filter((n) => n.label.toLowerCase().includes(find.toLowerCase()));
  const op = board.find((o) => o.id === sel) ?? board[0];

  return (
    <NavApp
      header={<NavHeader icon="app/OpsBoard" title={t("ops.header")} caption={t("ops.caption", { count: board.length })} />}
      search={{ value: find, onChange: setFind, placeholder: t("ops.find") }}
      items={nav}
      pages={pages}
      title={pages.page === "available" ? op?.name ?? t("ops.nav.available") : t(`ops.nav.${pages.page}`)}
    >
      {pages.page === "available" &&
        (board.length === 0 ? (
          <EmptyState icon="icon/grid" title={t("ops.none")} text={t("ops.noneText")} />
        ) : (
          <>
            {board.length > 1 && (
              <div className="segmented ops-pick">
                {board.map((o) => (
                  <button type="button" key={o.id} className={o.id === op.id ? "on" : ""} onClick={() => setSel(o.id)}>
                    {o.name}
                  </button>
                ))}
              </div>
            )}
            <OpDetail key={op.id} op={op} onLaunched={() => pages.go("active")} />
          </>
        ))}
      {pages.page === "active" && (active ? <ActiveOp run={active} /> : <EmptyState icon="icon/power" title={t("ops.noActive")} text={t("ops.noActiveText")} />)}
      {pages.page === "history" && <History />}
    </NavApp>
  );
}

function OpDetail({ op, onLaunched }: { op: Operation; onLaunched: () => void }) {
  const t = useT();
  const level = useGame((s) => s.game.player.level);
  const refreshAt = useGame((s) => s.game.ops.refreshAt);
  const running = useGame((s) => !!s.game.ops.active);
  const now = useNow();
  const [load, setLoad] = useState<LoadoutId[]>(["ghost_proxy"]);
  const [error, setError] = useState<string | null>(null);
  const cost = load.reduce((n, id) => n + loadoutCost(id, op.tier), 0);
  const locked = level < op.level;
  const toggle = (id: LoadoutId) =>
    setLoad((l) => (l.includes(id) && id !== "ghost_proxy" ? l.filter((x) => x !== id) : l.length >= LOADOUT_SLOTS ? l : [...l, id]));
  const remove = (i: number) => setLoad((l) => l.filter((_, j) => j !== i));
  const launch = () => {
    const r = useGame.getState().launchOp(op.id, load);
    if (!r.ok) return setError(tm(r.error));
    useWindows.getState().open("opHud");
    onLaunched();
  };

  return (
    <>
      <div className="ops-tags">
        <Badge tone="accent">{t("ops.tier", { tier: op.tier })}</Badge>
        <Badge>{t("ops.stagesN", { n: op.stages.length })}</Badge>
        <Badge tone={locked ? "critical" : "neutral"}>{t("ops.level", { level: op.level })}</Badge>
        <Badge tone="caution">{t("ops.refresh", { time: duration(Math.max(0, refreshAt - now)) })}</Badge>
      </div>
      {error && <InfoBar severity="error" title={t("common.failed")} message={error} onClose={() => setError(null)} />}
      <Card>
        <div className="card-title">
          <span className="t-body-strong">{t("ops.stages")}</span>
          <span className="t-caption c-secondary">{t("ops.budgetNote")}</span>
        </div>
        <div className="ops-stages">
          {op.stages.map((s, i) => (
            <div key={i} className="ops-stage-wrap">
              {i > 0 && <span className="ops-arrow">›</span>}
              <div className={`ops-stage ${s.optional ? "optional" : ""}`}>
                <span className="t-body-strong">
                  {i + 1} {t(`ops.stage.${s.kind}`)}
                </span>
                <span className="t-caption c-secondary">{t(`ops.stage.${s.kind}.sub`, { n: s.need ?? 0 })}</span>
                <span className="t-caption c-success">{credits(s.payout)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div className="card-title">
          <span className="t-body-strong">{t("ops.loadout")}</span>
          <span className="t-caption c-secondary">{t("ops.slots", { n: load.length, max: LOADOUT_SLOTS })}</span>
        </div>
        <div className="ops-slots">
          {Array.from({ length: LOADOUT_SLOTS }, (_, i) => {
            const id = load[i];
            const def = LOADOUT.find((l) => l.id === id);
            return def ? (
              <button type="button" key={i} className="ops-slot" onClick={() => remove(i)}>
                <Glyph name={def.glyph} size={18} />
                <span className="ops-slot-text">
                  <span>{t(`ops.load.${def.id}`)}</span>
                  <span className="t-caption c-success">{t(`ops.load.${def.id}.fx`)}</span>
                </span>
                <span className="t-caption c-tertiary">{credits(loadoutCost(def.id, op.tier))}</span>
              </button>
            ) : (
              <div key={i} className="ops-slot empty">
                <Glyph name="plus" size={18} />
                <span className="ops-slot-text">
                  <span>{t("ops.emptySlot")}</span>
                  <span className="t-caption">
                    {LOADOUT.map((l) => (
                      <button type="button" key={l.id} className="link-btn t-caption" onClick={() => toggle(l.id)}>
                        {t(`ops.load.${l.id}`)}
                      </button>
                    ))}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </Card>
      <Card>
        <span className="t-body-strong">{t("ops.payout")}</span>
        <KeyValue k={t("ops.checkpoints")} v={op.stages.map((s) => credits(s.payout)).join(" / ")} />
        <KeyValue k={t("ops.budget")} v={t("ops.budgetValue", { sec: op.budget })} />
        <KeyValue k={t("ops.ifBlown")} v={t("ops.ifBlownValue")} />
        <KeyValue k={t("ops.bestGrade")} v={t("ops.bestGradeValue", { time: mmss(op.par * 1000) })} />
        <KeyValue k={t("ops.loadoutCost")} v={credits(cost)} />
      </Card>
      <div className="ops-actions">
        <Button variant="accent" disabled={locked || running} onClick={launch}>
          {locked ? t("ops.locked", { level: op.level }) : t("ops.launchCost", { cost: credits(cost) })}
        </Button>
      </div>
    </>
  );
}

function ActiveOp({ run }: { run: OpRun }) {
  const t = useT();
  return (
    <>
      <Card>
        <OpHudBody run={run} />
      </Card>
      <InfoBar severity="info" title={t("ops.nav.active")} message={t("ops.hostsHint", { ip: run.op.stages[0].ip ?? "" })} />
      <div className="ops-actions">
        <Button onClick={() => useWindows.getState().open("opHud")}>{t("ops.openHud")}</Button>
      </div>
    </>
  );
}

/** Stage stepper, shared trace and actions. Used by the Op HUD window and the Active page. */
export function OpHudBody({ run }: { run: OpRun }) {
  const t = useT();
  const now = useNow(250);
  const skills = useGame((s) => s.game.player.skills);
  const [error, setError] = useState<string | null>(null);
  const rate = opTraceRate(run, skillEffects(skills).trace);
  const paused = run.pausedUntil && now < run.pausedUntil;
  const leftMs = ((100 - run.trace) / rate) * 1000;
  const tone = run.trace > 70 ? "critical" : run.trace > 45 ? "caution" : "success";
  const stage = run.op.stages[run.stage];
  const act = (r: ReturnType<ReturnType<typeof useGame.getState>["exfil"]>) => !r.ok && setError(tm(r.error));
  return (
    <div className="ophud">
      <div className="ophud-steps">
        {run.op.stages.map((s, i) => {
          const st = i < run.stage ? "done" : i === run.stage ? "now" : s.optional ? "optional" : "pending";
          return (
            <div key={i} className={`ophud-step ${st}`}>
              <span className="ophud-bar" />
              <span className="t-caption">
                {t(`ops.stage.${s.kind}`)} <Badge tone={st === "done" ? "success" : st === "now" ? "accent" : "neutral"}>{t(`ops.${st}`)}</Badge>
              </span>
            </div>
          );
        })}
      </div>
      <div className="ophud-mid">
        <div className="ophud-trace">
          <Meter label={t("ops.sharedTrace")} value={run.trace / 100} text={`${Math.round(run.trace)}%`} tone={tone} />
          <KeyValue k={t("ops.banked")} v={credits(run.banked)} />
          {stage?.kind === "pull" && <KeyValue k={t("ops.archivePull")} v={t("ops.archiveValue", { n: run.pulled, need: stage.need ?? 1 })} />}
          {stage && <span className="t-caption c-secondary">{stage.kind === "pull" ? t("ops.do.pull", { ip: stage.ip!, n: (stage.need ?? 1) - run.pulled }) : t("ops.do.crack", { ip: stage.ip! })}</span>}
        </div>
        <div className="ophud-clock">
          <span className="t-caption c-secondary">{t("ops.traceFullIn")}</span>
          <span className={`grid-clock ${paused ? "c-accent" : "c-critical"}`}>{duration(leftMs)}</span>
        </div>
      </div>
      {error && <InfoBar severity="error" title={t("common.failed")} message={error} onClose={() => setError(null)} />}
      <div className="ops-actions">
        <Button disabled={run.proxies <= 0 || !!paused} onClick={() => act(useGame.getState().useProxy())}>
          {t("ops.proxy", { n: run.proxies })}
        </Button>
        <Button variant="accent" onClick={() => act(useGame.getState().exfil())}>
          {t("ops.exfil")}
        </Button>
      </div>
    </div>
  );
}

/** Op HUD window: the running op, or the last result. */
export function OpHud() {
  const t = useT();
  const run = useGame((s) => s.game.ops.active);
  const last = useGame((s) => s.game.ops.history[0]);
  return (
    <>
      <TitleBar title={run ? `Op · ${run.op.name}` : t("app.opHud")} />
      <div className="ophud-window">{run ? <OpHudBody run={run} /> : last ? <OpResultCard r={last} /> : <EmptyState icon="icon/power" title={t("ops.noActive")} text={t("ops.noActiveText")} />}</div>
    </>
  );
}

export function OpResultCard({ r }: { r: OpResult }) {
  const t = useT();
  const blown = r.grade === "blown";
  return (
    <div className="ops-result">
      <div className="card-title">
        <span className="t-body-strong">{blown ? t("ops.blown") : t("ops.complete")}</span>
        <Badge tone={blown ? "critical" : r.grade === "S" || r.grade === "A" ? "success" : "caution"}>{blown ? "—" : t("ops.grade", { grade: r.grade })}</Badge>
      </div>
      <div className="ops-result-body">
        <span className={`ops-grade grade-${r.grade}`}>{blown ? "×" : r.grade}</span>
        <div className="ops-result-bars">
          <Meter label={t("ops.time")} value={Math.min(1, r.timeMs / 300_000)} text={mmss(r.timeMs)} tone="accent" />
          <Meter label={t("ops.traceLeft")} value={r.traceLeft / 100} text={`${r.traceLeft}%`} tone="caution" />
          <Meter label={t("ops.stagesDone")} value={r.stagesDone / r.stages} text={t("ops.stagesValue", { n: r.stagesDone, total: r.stages })} tone="success" />
        </div>
      </div>
      <KeyValue k={t("ops.payout")} v={credits(r.payout)} />
      <KeyValue k={t("ops.xp")} v={`+${r.xp}`} />
      {r.drop && <KeyValue k={t("ops.drop")} v={r.drop} />}
    </div>
  );
}

function History() {
  const t = useT();
  const history = useGame((s) => s.game.ops.history);
  if (!history.length) return <EmptyState icon="icon/document" title={t("ops.noHistory")} />;
  return (
    <div className="card-grid ops-history">
      {history.map((r) => (
        <Card key={r.at}>
          <div className="card-title">
            <span className="t-body-strong">{r.name}</span>
            <span className="t-caption c-tertiary">{dateTime(r.at)}</span>
          </div>
          <OpResultCard r={r} />
        </Card>
      ))}
    </div>
  );
}
