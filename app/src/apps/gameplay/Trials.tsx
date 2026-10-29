import { useEffect, useRef, useState } from "react";
import { runTrial, type ScriptHandle, type TrialResult } from "../../game/scripting/host";
import { codeLines, goals, makeSandbox, TRIAL, TRIALS, trialOpen, trialXp, type Sandbox, type TrialId } from "../../game/trials";
import { useGame } from "../../game/store";
import { useT } from "../../i18n";
import { TitleBar } from "../../os/Window";
import { Badge, Button, KeyValue, Meter } from "../../ui";
import { highlight } from "../scriptEditor/highlight";
import { Glyph } from "./Glyph";
import "../scriptEditor/editor.css";

// Script Editor · Trials (docs/gameplay-ideas.md §6): pick a trial, write the script, run it against the
// seeded sandbox; the checker grades goals, time, API calls and lines.

const mmss = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
const KEY = (id: TrialId) => `bytecore.trial.${id}`;
const loadDraft = (id: TrialId) => {
  try {
    return localStorage.getItem(KEY(id)) ?? TRIAL[id].starter;
  } catch {
    return TRIAL[id].starter;
  }
};
const saveDraft = (id: TrialId, code: string) => {
  try {
    localStorage.setItem(KEY(id), code);
  } catch {
    /* storage unavailable */
  }
};

interface Log {
  level: string;
  text: string;
}

export function Trials() {
  const t = useT();
  const records = useGame((s) => s.game.trials);
  const [id, setId] = useState<TrialId>(() => TRIALS.find((x) => !records[x.id] && trialOpen(records, x.id))?.id ?? "hello");
  const def = TRIAL[id];
  const [code, setCode] = useState(() => loadDraft(id));
  const [logs, setLogs] = useState<Log[]>([]);
  const [sb, setSb] = useState<Sandbox>(() => makeSandbox(def));
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<(TrialResult & { xp: number; point: boolean }) | null>(null);
  const [line, setLine] = useState(1);
  const handle = useRef<ScriptHandle | null>(null);
  const pre = useRef<HTMLPreElement>(null);
  const gutter = useRef<HTMLDivElement>(null);

  useEffect(() => () => handle.current?.stop(), []);

  const pick = (next: TrialId) => {
    if (running || !trialOpen(records, next)) return;
    setId(next);
    setCode(loadDraft(next));
    setSb(makeSandbox(TRIAL[next]));
    setLogs([]);
    setResult(null);
  };
  const edit = (v: string) => {
    setCode(v);
    saveDraft(id, v);
  };
  const run = () => {
    if (running) return handle.current?.stop();
    setResult(null);
    setRunning(true);
    setLogs([{ level: "sys", text: t("trial.start", { seed: def.seed.toString(16).toUpperCase(), hosts: def.hosts, time: mmss(def.medals[1]), calls: def.maxCalls }) }]);
    handle.current = runTrial(code, def, {
      onLog: (level, text) => setLogs((l) => [...l, { level, text }].slice(-400)),
      onUpdate: setSb,
      onDone: (r) => {
        setRunning(false);
        handle.current = null;
        if (r.pass && r.medal) {
          const rec = useGame.getState().recordTrial(id, { medal: r.medal, best: Math.round(r.sandbox.clock), calls: r.sandbox.calls, lines: r.lines });
          setLogs((l) => [...l, { level: "ok", text: t("trial.pass", { medal: t(`trial.medal.${r.medal}`), calls: r.sandbox.calls, lines: r.lines }) }]);
          setResult({ ...r, xp: rec.xp, point: rec.point });
        } else {
          const reason = r.reason === "calls" ? t("trial.failCalls") : r.reason === "time" ? t("trial.failTime") : r.reason === "stopped" ? t("trial.stop") : t("trial.failGoals");
          setLogs((l) => [...l, { level: "error", text: t("trial.fail", { reason }) }]);
          setResult({ ...r, xp: 0, point: false });
        }
      },
    });
  };
  const reset = () => {
    edit(def.starter);
    setSb(makeSandbox(def));
    setLogs([]);
    setResult(null);
  };

  const checks = goals(sb);
  const rec = records[id];
  const idx = TRIALS.findIndex((x) => x.id === id);
  const lines = code.split("\n");

  return (
    <>
      <TitleBar title={`${t("app.scriptEditor")} · ${t("trials.title")}`} />
      <div className="trials">
        <aside className="trials-list">
          <span className="t-body-strong">{t("trials.title")}</span>
          {TRIALS.map((x, i) => {
            const r = records[x.id];
            const open = trialOpen(records, x.id);
            return (
              <button type="button" key={x.id} className={`trials-item ${x.id === id ? "on" : ""} ${open ? "" : "locked"}`} onClick={() => pick(x.id)} disabled={!open}>
                <span>
                  {String(i + 1).padStart(2, "0")} {t(`trial.${x.id}`)}
                </span>
                {r ? (
                  <Badge tone={r.medal === "gold" ? "success" : r.medal === "silver" ? "neutral" : "caution"}>{t(`trial.medal.${r.medal}`)}</Badge>
                ) : open ? (
                  <Badge tone="accent">{t("trial.new")}</Badge>
                ) : (
                  <Badge>{t("trial.locked")}</Badge>
                )}
              </button>
            );
          })}
        </aside>

        <div className="trials-main">
          <div className="trials-code">
            <div className="ide-gutter" ref={gutter}>
              {lines.map((_, i) => (
                <div key={i} className={i + 1 === line ? "on" : ""}>
                  {i + 1}
                </div>
              ))}
            </div>
            <div className="ide-input">
              <pre className="editor-highlight" ref={pre} aria-hidden dangerouslySetInnerHTML={{ __html: highlight(code, false) }} />
              <textarea
                className="editor-textarea"
                value={code}
                spellCheck={false}
                wrap="off"
                readOnly={running}
                onChange={(e) => edit(e.target.value)}
                onScroll={(e) => {
                  if (pre.current) {
                    pre.current.scrollTop = e.currentTarget.scrollTop;
                    pre.current.scrollLeft = e.currentTarget.scrollLeft;
                  }
                  if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop;
                }}
                onKeyUp={(e) => setLine(e.currentTarget.value.slice(0, e.currentTarget.selectionStart).split("\n").length)}
                onClick={(e) => setLine(e.currentTarget.value.slice(0, e.currentTarget.selectionStart).split("\n").length)}
                onKeyDown={(e) => {
                  if (e.key === "Tab") {
                    e.preventDefault();
                    const el = e.currentTarget;
                    const s = el.selectionStart;
                    edit(el.value.slice(0, s) + "  " + el.value.slice(el.selectionEnd));
                    requestAnimationFrame(() => el.setSelectionRange(s + 2, s + 2));
                  } else if (e.ctrlKey && e.key === "Enter") {
                    e.preventDefault();
                    run();
                  }
                }}
              />
            </div>
          </div>
          <div className="trials-console">
            <div className="trials-console-head t-caption">{t("trial.console")}</div>
            <div className="trials-console-body">
              {logs.map((l, i) => (
                <div key={i} className={`editor-log log-${l.level === "ok" ? "sys ok" : l.level}`}>
                  {l.text}
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="trials-pane">
          <div className="t-subtitle">
            {String(idx + 1).padStart(2, "0")} · {t(`trial.${id}`)}
          </div>
          <span className="t-caption c-secondary">{def.hosts ? t("trial.sandbox", { hosts: def.hosts }) : t("trial.sandboxNoHosts")}</span>
          <div className="card">
            <span className="t-body-strong">{t("trial.goals")}</span>
            {checks.map((g, i) => (
              <div key={i} className={`trials-goal ${g.ok ? "ok" : running || logs.length ? "bad" : ""}`}>
                <Glyph name={g.ok ? "check" : "info"} size={16} />
                <span>{t(g.key, g.vars)}</span>
              </div>
            ))}
          </div>
          <div className="card">
            <span className="t-body-strong">{t("trial.limits")}</span>
            <KeyValue k={t("trial.gold")} v={`≤ ${mmss(def.medals[0])}`} />
            <KeyValue k={t("trial.silver")} v={`≤ ${mmss(def.medals[1])}`} />
            <KeyValue k={t("trial.calls")} v={`${sb.calls} / ${def.maxCalls}`} />
            <KeyValue k={t("trial.best")} v={rec ? mmss(rec.best) : "—"} />
          </div>
          {result && <ResultCard r={result} n={idx + 1} id={id} onRetry={run} onNext={() => TRIALS[idx + 1] && pick(TRIALS[idx + 1].id)} />}
          <span className="spacer" />
          <div className="trials-actions">
            <Button variant="accent" onClick={run}>
              {running ? t("trial.stop") : t("trial.run")}
            </Button>
            <Button disabled={running} onClick={reset}>
              {t("trial.reset")}
            </Button>
          </div>
        </aside>
      </div>
      <div className="grid-status t-caption">
        <span className="c-accent">{t("trial.status")}</span>
        <span>{t("editor.lineCol", { line, col: 1 })}</span>
        <span>{t("trial.lines", { n: codeLines(code) })}</span>
        <span>{mmss(sb.clock)}</span>
        <span className="spacer" />
        <span className="c-tertiary">{t("trial.seed", { seed: def.seed.toString(16).toUpperCase() })}</span>
      </div>
    </>
  );
}

function ResultCard({ r, n, id, onRetry, onNext }: { r: TrialResult & { xp: number; point: boolean }; n: number; id: TrialId; onRetry: () => void; onNext: () => void }) {
  const t = useT();
  const def = TRIAL[id];
  const letter = r.medal === "gold" ? "G" : r.medal === "silver" ? "S" : r.medal === "bronze" ? "B" : "×";
  return (
    <div className="card trials-result">
      <div className="card-title">
        <span className="t-body-strong">{t("trial.result", { n: String(n).padStart(2, "0"), name: t(`trial.${id}`) })}</span>
        {r.medal ? <Badge tone={r.medal === "gold" ? "success" : "neutral"}>{t(`trial.medal.${r.medal}`)}</Badge> : <Badge tone="critical">FAIL</Badge>}
      </div>
      <div className="trials-result-body">
        <span className={`trials-medal medal-${r.medal ?? "fail"}`}>{letter}</span>
        <div className="ops-result-bars">
          <Meter label={t("trial.time")} value={Math.min(1, r.sandbox.clock / def.maxSec)} text={mmss(r.sandbox.clock)} tone="caution" />
          <Meter label={t("trial.calls")} value={r.sandbox.calls / def.maxCalls} text={String(r.sandbox.calls)} tone="success" />
          <Meter label={t("trial.linesLabel")} value={Math.min(1, r.lines / 40)} text={String(r.lines)} tone="success" />
        </div>
      </div>
      {r.pass && <KeyValue k={t("trial.reward")} v={r.xp ? t("trial.rewardXp", { xp: r.xp || trialXp(n - 1) }) : t("trial.rewardNone")} />}
      {r.point && <KeyValue k={t("trial.goldUnlocks")} v={t("trial.goldPoint")} />}
      <div className="trials-actions">
        <Button onClick={onRetry}>{t("trial.retry")}</Button>
        <Button variant="accent" disabled={!r.pass || n >= TRIALS.length} onClick={onNext}>
          {t("trial.next")}
        </Button>
      </div>
    </div>
  );
}
