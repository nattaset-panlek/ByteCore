import { useEffect, useState } from "react";
import { startCompile } from "../../game/appsdk/jobs";
import { onGameEvent } from "../../game/events";
import { codeStats, parseXjs } from "../../game/appsdk/xjs";
import { jobProgress } from "../../game/jobs";
import { useGame } from "../../game/store";
import { t, useT } from "../../i18n";
import { useWindows } from "../../os/windowStore";
import { Button, Meter } from "../../ui";
import { duration } from "../common";
import "./userApp.css";

// IDE side of the build: Run on an .xjs starts a compile job; the console shows a live progress bar.

export const isXjs = (name: string) => name.toLowerCase().endsWith(".xjs");

export interface ConsoleLine {
  level: "sys" | "error" | "info";
  text: string;
}

/** Start a build for a saved .xjs and describe it for the IDE console. */
export function compileLines(path: string, content: string): ConsoleLine[] {
  const r = startCompile(path, content);
  const name = path.slice(path.lastIndexOf("/") + 1);
  if (!r.ok) return [{ level: "error", text: r.line ? t("sdk.compile.headerFail", { line: r.line, error: r.error }) : t("sdk.compile.fail", { error: r.error }) }];
  const parsed = parseXjs(content);
  const s = codeStats(parsed.ok ? parsed.app.code : content);
  return [
    { level: "sys", text: t("sdk.compile.started", { name, time: duration(r.ms), stats: t("sdk.compile.stats", { chars: s.chars, functions: s.functions, depth: s.depth }) }) },
    { level: "sys", text: t("sdk.compile.hint") },
  ];
}

/** Live progress of the build for this file (renders nothing when idle). */
export function CompileStatus({ path }: { path?: string | null }) {
  const tr = useT();
  const job = useGame((s) => s.game.jobs.find((j) => j.kind === "compile" && j.payload?.src === path));
  const [, setPulse] = useState(0);
  const [result, setResult] = useState<{ ok: boolean; dest?: string; error?: string } | null>(null);
  useEffect(() => {
    if (!job) return;
    setResult(null);
    const id = window.setInterval(() => setPulse((n) => n + 1), 250);
    return () => window.clearInterval(id);
  }, [job]);
  useEffect(() => onGameEvent((e) => e.type === "jobComplete" && e.outcome.kind === "compile" && e.outcome.src === path && setResult(e.outcome)), [path]);
  if (!path) return null;
  if (!job) {
    if (!result) return null;
    return result.ok ? (
      <div className="compile-status">
        <div className="editor-log log-info">{tr("sdk.compile.ok", { dest: result.dest ?? "" })}</div>
        <div className="compile-row">
          <Button variant="accent" icon="icon/arrow_download" onClick={() => useWindows.getState().open("installer", { path: result.dest! })}>
            {tr("sdk.compile.install")}
          </Button>
          <Button onClick={() => useWindows.getState().open("explorer", { path: path.slice(0, path.lastIndexOf("/")) })}>{tr("sdk.compile.open")}</Button>
        </div>
      </div>
    ) : (
      <div className="compile-status">
        <div className="editor-log log-error">{tr("sdk.compile.fail", { error: result.error ?? "" })}</div>
      </div>
    );
  }
  const now = Date.now();
  const name = path.slice(path.lastIndexOf("/") + 1);
  return (
    <div className="compile-status">
      <Meter value={jobProgress(job, now)} text={tr("sdk.compile.running", { name, time: duration(Math.max(0, job.endsAt - now)) })} />
      <div className="compile-row">
        <Button onClick={() => useWindows.getState().open("explorer", { path: path.slice(0, path.lastIndexOf("/")) })}>{tr("sdk.compile.open")}</Button>
        <Button onClick={() => useGame.getState().killJob(job.id)}>{tr("sdk.setup.cancel")}</Button>
      </div>
    </div>
  );
}
