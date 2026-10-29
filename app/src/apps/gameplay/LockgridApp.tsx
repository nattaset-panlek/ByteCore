import { useEffect, useMemo, useRef, useState } from "react";
import { crackChance } from "../../game/jobs";
import { CLEAN_SHARE, exits, hintCells, lit, makeLockgrid, noiseTick, onPathLit, pathLength, solved, turn, TIMEOUT_PENALTY, E, N, S, W, type Lockgrid } from "../../game/lockgrid";
import { rigStats } from "../../game/rig";
import { skillEffects } from "../../game/skills";
import { useGame } from "../../game/store";
import { cpuBoost } from "../../game/thermal";
import { moduleBonus } from "../../game/modules";
import { tm, useT } from "../../i18n";
import { TitleBar, useWindow } from "../../os/Window";
import { useWindows } from "../../os/windowStore";
import { Badge, Button, Icon, InfoBar, KeyValue, Meter } from "../../ui";
import { EmptyState } from "../common";
import { emitTerminal } from "./terminalBus";

// Lockgrid window (Chimera Kit · Lockgrid). Launch arg `ip`. The sweep runs in real time; solving it cracks
// the host at once (Clean with time to spare), timing out falls back to the dice roll at worse odds.

const TILE = 56;
const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export function LockgridApp() {
  const t = useT();
  const { win } = useWindow();
  const ip = win.args?.ip ?? "";
  const host = useGame((s) => s.game.net.hosts.find((h) => h.ip === ip));
  const nonce = win.args?.nonce;
  if (!host) {
    return (
      <>
        <TitleBar title={`${t("app.chimeraKit")} · ${t("app.lockgrid")}`} />
        <div className="grid-empty">
          <EmptyState icon="icon/lock_closed" title={t("grid.noTarget")} text={t("grid.noTargetText")} />
        </div>
      </>
    );
  }
  return <Board key={`${ip}-${nonce}`} ip={ip} />;
}

type End = { solved: boolean; leftMs: number; chance?: number } | null;

function Board({ ip }: { ip: string }) {
  const t = useT();
  const { win } = useWindow();
  const host = useGame((s) => s.game.net.hosts.find((h) => h.ip === ip))!;
  const g = useGame((s) => s.game);
  const fx = skillEffects(g.player.skills);
  const [grid, setGrid] = useState<Lockgrid>(() => makeLockgrid(host.tier, host.security, (Date.now() ^ host.security * 7919) >>> 0));
  const [moves, setMoves] = useState(0);
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(Date.now());
  const [end, setEnd] = useState<End>(null);
  const [error, setError] = useState<string | null>(null);
  const lastNoise = useRef(Date.now());
  const done = !!end;

  const left = Math.max(0, grid.limitMs - (now - start));
  const lights = useMemo(() => lit(grid), [grid]);
  const hints = useMemo(() => new Set(hintCells(grid, fx.hints)), [grid, fx.hints]);
  const stats = rigStats(g.rig);
  const cpu = stats.cpu * (1 + moduleBonus(g.modules).crack) * cpuBoost(g.tuning);
  const auto = Math.min(0.99, crackChance(cpu, host.security, host.tier) + fx.luck);
  const noiseCount = grid.tiles.filter((x) => x.noise).length;

  // Terminal echo when the grid opens.
  useEffect(() => {
    emitTerminal([{ text: t("terminal.grid.ready", { size: grid.size, sec: Math.round(grid.limitMs / 1000), noise: noiseCount }), tone: "accent" }, { text: t("terminal.grid.waiting"), tone: "muted" }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sweep clock and noise tiles.
  useEffect(() => {
    if (done) return;
    const id = window.setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n - lastNoise.current >= grid.noiseMs) {
        lastNoise.current = n;
        setGrid((x) => noiseTick(x));
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [done, grid.noiseMs]);

  const finish = (ok: boolean, leftMs: number) => {
    if (done) return;
    const r = useGame.getState().finishManualCrack(ip, { solved: ok, leftMs, limitMs: grid.limitMs, moves });
    if (!r.ok) {
      setError(tm(r.error));
      return;
    }
    setEnd({ solved: ok, leftMs, chance: ok ? undefined : Math.round((auto - TIMEOUT_PENALTY) * 100) });
  };

  // Solved or timed out.
  useEffect(() => {
    if (done) return;
    if (solved(grid)) finish(true, left);
    else if (left <= 0) finish(false, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, left <= 0]);

  const click = (i: number) => {
    if (done || grid.tiles[i].locked) return;
    setGrid((x) => turn(x, i));
    setMoves((m) => m + 1);
  };
  const autoSolve = () => {
    const r = useGame.getState().crack(ip);
    if (!r.ok) setError(tm(r.error));
    else useWindows.getState().close(win.id);
  };

  const sweepPct = 1 - left / grid.limitMs;
  const clean = left >= grid.limitMs * CLEAN_SHARE;
  const boardPx = grid.size * (TILE + 4) - 4;

  return (
    <>
      <TitleBar title={`${t("app.chimeraKit")} · ${t("app.lockgrid")}`} />
      <div className="grid-app">
        <div className="grid-stage">
          <div className="grid-sweepbar">
            <span className="t-body-strong">{t("grid.sweep")}</span>
            <div className="grid-sweeptrack">
              <div style={{ width: `${sweepPct * 100}%` }} />
            </div>
            <span className={left < 10_000 ? "c-critical" : "c-secondary"}>{t("grid.left", { time: mmss(left) })}</span>
          </div>
          <div className="grid-wrap">
            <div className="grid-side" style={{ marginTop: grid.inRow * (TILE + 4) + TILE / 2 - 20 }}>
              <span className="c-accent t-body-strong">{t("grid.in")}</span>
              <span className="t-caption c-tertiary">{t("grid.row", { n: grid.inRow + 1 })}</span>
            </div>
            <div className="grid-board" style={{ width: boardPx, gridTemplateColumns: `repeat(${grid.size}, ${TILE}px)` }}>
              {grid.tiles.map((tile, i) => {
                const m = exits(tile);
                const on = lights.has(i);
                return (
                  <button
                    type="button"
                    key={i}
                    className={`grid-tile ${tile.locked ? "locked" : ""} ${tile.noise ? "noise" : ""} ${hints.has(i) ? "hint" : ""} ${on ? "on" : ""}`}
                    onClick={() => click(i)}
                    disabled={done}
                  >
                    <svg viewBox="0 0 56 56" width={TILE} height={TILE}>
                      {m & N ? <line x1="28" y1="28" x2="28" y2="0" /> : null}
                      {m & E ? <line x1="28" y1="28" x2="56" y2="28" /> : null}
                      {m & S ? <line x1="28" y1="28" x2="28" y2="56" /> : null}
                      {m & W ? <line x1="28" y1="28" x2="0" y2="28" /> : null}
                      <circle cx="28" cy="28" r="6" />
                    </svg>
                    {tile.locked && <span className="grid-mark"><Icon name="icon/lock_closed" size={10} /></span>}
                    {tile.noise && <span className="grid-mark noise">~</span>}
                  </button>
                );
              })}
              <div className="grid-sweepline" style={{ left: `${sweepPct * 100}%` }} />
            </div>
            <div className="grid-side" style={{ marginTop: grid.coreRow * (TILE + 4) + TILE / 2 - 20 }}>
              <span className="c-success t-body-strong">{t("grid.core")}</span>
              <span className="t-caption c-tertiary">{t("grid.row", { n: grid.coreRow + 1 })}</span>
            </div>
          </div>
          <div className="t-caption c-tertiary grid-help">{t("grid.help")}</div>
          {error && <InfoBar severity="error" title={t("common.failed")} message={error} onClose={() => setError(null)} />}
          {end && (
            <InfoBar
              severity={end.solved ? "success" : "warning"}
              title={end.solved ? t("grid.solved") : t("grid.timeout")}
              message={end.solved ? t("grid.solvedText", { ip, time: mmss(end.leftMs) }) : t("grid.timeoutText", { chance: end.chance ?? 0 })}
              action={<Button onClick={() => useWindows.getState().close(win.id)}>{t("grid.close")}</Button>}
            />
          )}
        </div>

        <aside className="grid-pane">
          <div className="card">
            <div className="card-title">
              <span className="t-body-strong">{t("grid.target")}</span>
              <Badge tone="accent">{t("chimera.tier", { tier: host.tier })}</Badge>
            </div>
            <KeyValue k={t("grid.address")} v={ip} />
            <KeyValue k={t("grid.security")} v={`Lv.${host.security}`} />
            <KeyValue k={t("grid.size")} v={`${grid.size} × ${grid.size}`} />
            <KeyValue k={t("grid.noise")} v={String(noiseCount)} />
          </div>
          <div className="grid-countdown">
            <span className="t-caption c-secondary">{t("grid.endsIn")}</span>
            <span className={`grid-clock ${left < 10_000 ? "c-critical" : clean ? "" : "c-caution"}`}>00:{mmss(left)}</span>
          </div>
          <div className="card">
            <span className="t-body-strong">{t("grid.run")}</span>
            <KeyValue k={t("grid.moves")} v={String(moves)} />
            <KeyValue k={t("grid.progress")} v={t("grid.progressValue", { n: onPathLit(grid), total: pathLength(grid) })} />
            <KeyValue k={t("grid.cleanBonus")} v={t("grid.cleanValue", { time: mmss(grid.limitMs * CLEAN_SHARE) })} />
            <Meter value={onPathLit(grid) / Math.max(1, pathLength(grid))} tone={clean ? "accent" : "caution"} />
          </div>
          <div className="card">
            <span className="t-body-strong">{t("grid.tiles")}</span>
            <KeyValue k={t("grid.tile.locked")} v={<span className="c-tertiary">{t("grid.tile.lockedText")}</span>} />
            <KeyValue k={t("grid.tile.relay")} v={<span className="c-tertiary">{t("grid.tile.relayText")}</span>} />
            <KeyValue k={t("grid.tile.noise")} v={<span className="c-tertiary">{t("grid.tile.noiseText")}</span>} />
            {fx.hints > 0 && <KeyValue k={t("grid.tile.hint")} v={<span className="c-tertiary">{t("grid.tile.hintText")}</span>} />}
          </div>
          <span className="spacer" />
          <div className="grid-actions">
            <Button disabled={done} onClick={autoSolve}>
              {t("grid.auto", { chance: Math.round(auto * 100) })}
            </Button>
            <Button onClick={() => useWindows.getState().close(win.id)}>{t("grid.abort")}</Button>
          </div>
        </aside>
      </div>
      <div className="grid-status t-caption">
        <span className="c-accent">{t("grid.status")}</span>
        <span>{ip}</span>
        <span>
          Heat <Meter value={g.heat / 100} tone={g.heat > 60 ? "critical" : g.heat > 30 ? "caution" : "success"} /> {Math.round(g.heat)}%
        </span>
        <span className="spacer" />
        <span className="c-tertiary">{t("grid.statusCpu", { level: stats.levels.cpu, sec: Math.round(grid.limitMs / 1000) })}</span>
      </div>
    </>
  );
}
