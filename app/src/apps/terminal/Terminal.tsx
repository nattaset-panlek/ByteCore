import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { onGameEvent } from "../../game/events";
import { useGame } from "../../game/store";
import { useT } from "../../i18n";
import { TabRow, useWindow } from "../../os/Window";
import { TabViewItem } from "../../ui";
import { formatOutcome, LOCAL_HOME, promptFor, runCommand, type OutLine, type Scope } from "./commands";
import "./terminal.css";

interface ShellState {
  lines: OutLine[];
  cwd: string;
}

/** Terminal (GDD 3.1): Local shell and, while connected, a Remote session tab. */
export function Terminal() {
  const t = useT();
  useWindow();
  const session = useGame((s) => s.game.net.session);
  const connected = !!session;

  const [local, setLocal] = useState<ShellState>(() => ({ lines: [{ text: t("terminal.welcome"), tone: "muted" }], cwd: LOCAL_HOME }));
  const [remote, setRemote] = useState<ShellState>({ lines: [], cwd: "/" });
  const [tab, setTab] = useState<Scope>("local");
  const [input, setInput] = useState("");
  const history = useRef<string[]>([]);
  const histPos = useRef(-1);
  const viewRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scope: Scope = tab;
  const shell = scope === "local" ? local : remote;
  const setShell = scope === "local" ? setLocal : setRemote;

  // Follow the session: focus the remote tab when it opens, drop back to local when it closes.
  const prevConnected = useRef(connected);
  useEffect(() => {
    if (connected && !prevConnected.current) {
      setRemote({ lines: [], cwd: "/" });
      setTab("remote");
    } else if (!connected && prevConnected.current) {
      setTab("local");
    }
    prevConnected.current = connected;
  }, [connected]);

  // Job results and trace drops append to the right shell.
  useEffect(
    () =>
      onGameEvent((e) => {
        if (e.type === "jobComplete") {
          const lines = formatOutcome(e.outcome);
          if (e.outcome.kind === "pull") setRemote((s) => ({ ...s, lines: [...s.lines, ...lines] }));
          else setLocal((s) => ({ ...s, lines: [...s.lines, ...lines] }));
        } else if (e.type === "traced") {
          setRemote((s) => ({ ...s, lines: [...s.lines, { text: t("terminal.traced.line", { ip: e.ip }), tone: "err" }] }));
        }
      }),
    [t]
  );

  useLayoutEffect(() => {
    viewRef.current?.scrollTo(0, viewRef.current.scrollHeight);
  }, [local.lines, remote.lines, tab]);

  const submit = () => {
    const cmd = input;
    setInput("");
    if (cmd.trim()) {
      history.current = [...history.current, cmd];
      histPos.current = history.current.length;
    }
    const prompt = promptFor(scope, shell.cwd);
    const echo: OutLine = { text: `${prompt} ${cmd}`, tone: "muted" };
    const out = runCommand(cmd, scope, shell.cwd);
    if (out.clear) {
      setShell((s) => ({ ...s, lines: [] }));
      return;
    }
    setShell((s) => ({ lines: [...s.lines, echo, ...out.lines], cwd: out.cwd ?? s.cwd }));
    // openRemote / closeRemote are handled by the session effect above.
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
      setShell((s) => ({ ...s, lines: [] }));
    }
  };

  const disconnect = () => useGame.getState().disconnect();

  return (
    <>
      <TabRow>
        <TabViewItem icon="app/Terminal" label={t("terminal.local")} selected={tab === "local"} onClick={() => setTab("local")} />
        {connected && (
          <TabViewItem icon="icon/globe" label={t("terminal.remote")} selected={tab === "remote"} onClick={() => setTab("remote")} onClose={disconnect} />
        )}
      </TabRow>
      <div className="term" onPointerDown={() => inputRef.current?.focus()}>
        <div className="term-view" ref={viewRef}>
          {shell.lines.map((l, i) => (
            <div key={i} className={`term-line ${l.tone ? `tone-${l.tone}` : ""}`}>
              {l.text || " "}
            </div>
          ))}
          <div className="term-input-row">
            <span className="term-prompt">{promptFor(scope, shell.cwd)}</span>
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
