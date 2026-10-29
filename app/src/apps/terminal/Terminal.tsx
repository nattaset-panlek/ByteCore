import { memo, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { onGameEvent } from "../../game/events";
import { jobProgress } from "../../game/jobs";
import { useGame } from "../../game/store";
import { useT } from "../../i18n";
import { openContextMenu, separator } from "../../os/contextMenu";
import { TabRow, useWindow } from "../../os/Window";
import { TabViewItem } from "../../ui";
import { formatOutcome, LOCAL_HOME, promptFor, runCommand, type OutLine, type Scope } from "./commands";
import "./terminal.css";

interface Shell {
  id: number;
  scope: Scope;
  lines: OutLine[];
  cwd: string;
}

const REMOTE = -1;
let shellSeq = 0;
const newLocal = (welcome: string, cwd = LOCAL_HOME): Shell => ({ id: ++shellSeq, scope: "local", lines: [{ text: welcome, tone: "muted" }], cwd });

/** Terminal (GDD 3.1): any number of Local shell tabs, plus a Remote session tab while connected. */
export function Terminal() {
  const t = useT();
  const { win } = useWindow();
  const session = useGame((s) => s.game.net.session);
  const connected = !!session;

  // Launch arg `cwd` (File Explorer > Open in Terminal) starts the first shell in that folder.
  const [shells, setShells] = useState<Shell[]>(() => [newLocal(t("terminal.welcome"), win.args?.cwd)]);
  const [activeId, setActiveId] = useState(shells[0].id);
  const [input, setInput] = useState("");
  const history = useRef<string[]>([]);
  const histPos = useRef(-1);
  const viewRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  /** job id -> tab that started it, so results print where the command was typed */
  const jobTab = useRef(new Map<number, number>());

  const shell = shells.find((s) => s.id === activeId) ?? shells[0];

  // Like a real console: while a command started in this tab is running, the prompt is replaced by its
  // progress and typing waits. Ctrl+C stops it.
  const jobs = useGame((s) => s.game.jobs);
  const running = jobs.filter((j) => jobTab.current.get(j.id) === shell.id);
  const busy = running.length > 0;
  const [, setPulse] = useState(0);
  useEffect(() => {
    if (!busy) return;
    const id = window.setInterval(() => setPulse((n) => n + 1), 200);
    return () => window.clearInterval(id);
  }, [busy]);
  const update = (id: number, fn: (s: Shell) => Shell) => setShells((all) => all.map((s) => (s.id === id ? fn(s) : s)));

  // Follow the session: open/focus the remote tab when connecting, drop it when the session ends.
  const prevConnected = useRef(connected);
  useEffect(() => {
    if (connected && !prevConnected.current) {
      setShells((all) => [...all.filter((s) => s.id !== REMOTE), { id: REMOTE, scope: "remote", lines: [], cwd: "/" }]);
      setActiveId(REMOTE);
    } else if (!connected && prevConnected.current) {
      setShells((all) => {
        const rest = all.filter((s) => s.id !== REMOTE);
        setActiveId((a) => (a === REMOTE ? rest[0].id : a));
        return rest;
      });
    }
    prevConnected.current = connected;
  }, [connected]);

  // Job results and trace drops append to the right tab.
  useEffect(
    () =>
      onGameEvent((e) => {
        if (e.type === "jobComplete") {
          const lines = formatOutcome(e.outcome);
          const target = e.outcome.kind === "pull" ? REMOTE : jobTab.current.get(e.job.id);
          jobTab.current.delete(e.job.id);
          setShells((all) => {
            const id = all.some((s) => s.id === target) ? target! : all.find((s) => s.scope === "local")!.id;
            return all.map((s) => (s.id === id ? { ...s, lines: keep([...s.lines, ...lines]) } : s));
          });
        } else if (e.type === "traced") {
          const line: OutLine = { text: t("terminal.traced.line", { ip: e.ip }), tone: "err" };
          setShells((all) => all.map((s) => (s.scope === "local" ? { ...s, lines: keep([...s.lines, line]) } : s)));
        }
      }),
    [t]
  );

  useLayoutEffect(() => {
    viewRef.current?.scrollTo(0, viewRef.current.scrollHeight);
  }, [shells, activeId]);

  const addTab = () => {
    const s = newLocal(t("terminal.welcome"));
    setShells((all) => [...all.filter((x) => x.id !== REMOTE), s, ...all.filter((x) => x.id === REMOTE)]);
    setActiveId(s.id);
  };

  const closeTab = (id: number) => {
    if (id === REMOTE) {
      useGame.getState().disconnect();
      return;
    }
    const locals = shells.filter((s) => s.scope === "local");
    if (locals.length <= 1) return;
    const rest = shells.filter((s) => s.id !== id);
    setShells(rest);
    if (activeId === id) setActiveId(rest.find((s) => s.scope === "local")!.id);
  };

  const submit = () => {
    const cmd = input;
    setInput("");
    if (cmd.trim()) {
      history.current = [...history.current, cmd];
      histPos.current = history.current.length;
    }
    const echo: OutLine = { text: `${promptFor(shell.scope, shell.cwd)} ${cmd}`, tone: "muted" };
    const jobBefore = useGame.getState().game.nextJob;
    const out = runCommand(cmd, shell.scope, shell.cwd);
    const jobAfter = useGame.getState().game.nextJob;
    for (let id = jobBefore; id < jobAfter; id++) jobTab.current.set(id, shell.id);
    if (out.clear) {
      update(shell.id, (s) => ({ ...s, lines: [] }));
      return;
    }
    update(shell.id, (s) => ({ ...s, lines: keep([...s.lines, echo, ...out.lines]), cwd: out.cwd ?? s.cwd }));
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (busy) {
      e.preventDefault();
      if (e.key === "c" && e.ctrlKey) {
        running.forEach((j) => {
          jobTab.current.delete(j.id);
          useGame.getState().killJob(j.id);
        });
        update(shell.id, (s) => ({ ...s, lines: keep([...s.lines, { text: "^C", tone: "muted" }]) }));
      }
      return;
    }
    if (e.key === "Enter") submit();
    else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (histPos.current > 0) histPos.current--;
      setInput(history.current[histPos.current] ?? "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histPos.current < history.current.length - 1) {
        histPos.current++;
        setInput(history.current[histPos.current] ?? "");
      } else {
        histPos.current = history.current.length;
        setInput("");
      }
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      update(shell.id, (s) => ({ ...s, lines: [] }));
    } else if (e.key === "t" && e.ctrlKey && e.shiftKey) {
      e.preventDefault();
      addTab();
    }
  };

  const locals = shells.filter((s) => s.scope === "local");
  const tabLabel = (s: Shell) => (s.scope === "remote" ? t("terminal.remote") : locals.length > 1 ? `${t("terminal.local")} ${locals.indexOf(s) + 1}` : t("terminal.local"));
  const copyAll = () => navigator.clipboard?.writeText(shell.lines.map((l) => l.text).join("\n")).catch(() => {});

  return (
    <>
      <TabRow onNewTab={addTab}>
        {shells.map((s) => (
          <TabViewItem
            key={s.id}
            icon={s.scope === "remote" ? "icon/globe" : "app/Terminal"}
            label={tabLabel(s)}
            selected={s.id === shell.id}
            onClick={() => setActiveId(s.id)}
            onClose={s.scope === "remote" || locals.length > 1 ? () => closeTab(s.id) : undefined}
          />
        ))}
      </TabRow>
      <div
        className="term"
        onPointerDown={() => inputRef.current?.focus()}
        onContextMenu={(e) =>
          openContextMenu(e, [
            { label: t("terminal.ctx.newTab"), icon: "icon/add", onClick: addTab },
            separator,
            { label: t("terminal.ctx.copyAll"), icon: "icon/copy", onClick: copyAll },
            { label: t("terminal.ctx.clear"), icon: "icon/delete", onClick: () => update(shell.id, (s) => ({ ...s, lines: [] })) },
            ...(connected ? [separator, { label: t("chimera.disconnect"), icon: "icon/dismiss", danger: true, onClick: () => useGame.getState().disconnect() }] : []),
          ])
        }
      >
        <div className="term-view" ref={viewRef}>
          <TermLines lines={shell.lines} />
          {busy &&
            running.map((j) => {
              const pct = Math.max(0, Math.min(1, jobProgress(j, Date.now())));
              const filled = Math.round(pct * 24);
              return (
                <div key={j.id} className="term-line tone-muted">
                  {`${j.kind}${j.target ? ` ${j.target}` : ""} [${"#".repeat(filled)}${"-".repeat(24 - filled)}] ${Math.round(pct * 100)}%`}
                </div>
              );
            })}
          {busy && <div className="term-line tone-muted">{t("terminal.busyHint")}</div>}
          <div className={`term-input-row ${busy ? "busy" : ""}`}>
            <span className="term-prompt">{promptFor(shell.scope, shell.cwd)}</span>
            <input
              ref={inputRef}
              className="term-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder={busy ? "" : t("terminal.input")}
              autoFocus
              spellCheck={false}
              autoComplete="off"
            />
          </div>
        </div>
      </div>
    </>
  );
}

/** Scrollback kept per tab, like a real console buffer. */
const MAX_LINES = 1000;
const keep = <T,>(lines: T[]) => (lines.length > MAX_LINES ? lines.slice(-MAX_LINES) : lines);

/** The output history. Memoized so the job progress pulse (5x a second) only redraws the progress line. */
const TermLines = memo(function TermLines({ lines }: { lines: { text: string; tone?: string }[] }) {
  return (
    <>
      {lines.map((l, i) => (
        <div key={i} className={`term-line ${l.tone ? `tone-${l.tone}` : ""}`}>
          {l.text || " "}
        </div>
      ))}
    </>
  );
});
