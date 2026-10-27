import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { onGameEvent } from "../../game/events";
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
const newLocal = (welcome: string): Shell => ({ id: ++shellSeq, scope: "local", lines: [{ text: welcome, tone: "muted" }], cwd: LOCAL_HOME });

/** Terminal (GDD 3.1): any number of Local shell tabs, plus a Remote session tab while connected. */
export function Terminal() {
  const t = useT();
  useWindow();
  const session = useGame((s) => s.game.net.session);
  const connected = !!session;

  const [shells, setShells] = useState<Shell[]>(() => [newLocal(t("terminal.welcome"))]);
  const [activeId, setActiveId] = useState(shells[0].id);
  const [input, setInput] = useState("");
  const history = useRef<string[]>([]);
  const histPos = useRef(-1);
  const viewRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  /** job id -> tab that started it, so results print where the command was typed */
  const jobTab = useRef(new Map<number, number>());

  const shell = shells.find((s) => s.id === activeId) ?? shells[0];
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
            return all.map((s) => (s.id === id ? { ...s, lines: [...s.lines, ...lines] } : s));
          });
        } else if (e.type === "traced") {
          const line: OutLine = { text: t("terminal.traced.line", { ip: e.ip }), tone: "err" };
          setShells((all) => all.map((s) => (s.scope === "local" ? { ...s, lines: [...s.lines, line] } : s)));
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
    update(shell.id, (s) => ({ ...s, lines: [...s.lines, echo, ...out.lines], cwd: out.cwd ?? s.cwd }));
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
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
          {shell.lines.map((l, i) => (
            <div key={i} className={`term-line ${l.tone ? `tone-${l.tone}` : ""}`}>
              {l.text || " "}
            </div>
          ))}
          <div className="term-input-row">
            <span className="term-prompt">{promptFor(shell.scope, shell.cwd)}</span>
            <input
              ref={inputRef}
              className="term-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder={t("terminal.input")}
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
