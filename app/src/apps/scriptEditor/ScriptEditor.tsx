import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { runScript, type ScriptHandle } from "../../game/scripting/host";
import type { LogLevel } from "../../game/scripting/protocol";
import { useGame } from "../../game/store";
import { useT } from "../../i18n";
import { useWindow } from "../../os/Window";
import { Button, Icon, IconButton, TextBox } from "../../ui";
import * as vfs from "../../game/vfs";
import { highlight } from "./highlight";
import { SAMPLE_SCRIPT } from "./sample";
import "./editor.css";

const DIR = "C:/Scripts";

interface Tab {
  /** VFS path once saved, else null (untitled) */
  path: string | null;
  name: string;
  content: string;
  dirty: boolean;
}

interface Line {
  level: LogLevel | "sys";
  text: string;
}

let untitledSeq = 0;

/** Script Editor (GDD 3.3.1): edit, run (in a Worker) and save JS that automates the game. */
export function ScriptEditor() {
  const t = useT();
  const { win } = useWindow();
  const fs = useGame((s) => s.game.fs);
  const scriptFiles = vfs.list(fs, DIR).filter((n) => n.type === "file" && n.name.endsWith(".js"));

  const [tabs, setTabs] = useState<Tab[]>(() => {
    const open = win.args?.path ? vfs.getNode(fs, win.args.path) : null;
    if (open && open.type === "file") return [{ path: win.args!.path, name: open.name, content: open.content ?? "", dirty: false }];
    return [{ path: null, name: `untitled-${++untitledSeq}.js`, content: SAMPLE_SCRIPT, dirty: false }];
  });
  const [active, setActive] = useState(0);
  const [lines, setLines] = useState<Line[]>([]);
  const [running, setRunning] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const handle = useRef<ScriptHandle | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const consoleRef = useRef<HTMLDivElement>(null);

  const tab = tabs[active];

  useEffect(() => () => handle.current?.stop(), []);
  useLayoutEffect(() => {
    consoleRef.current?.scrollTo(0, consoleRef.current.scrollHeight);
  }, [lines]);

  const update = (content: string) => setTabs((ts) => ts.map((x, i) => (i === active ? { ...x, content, dirty: true } : x)));

  const openFile = (path: string) => {
    const existing = tabs.findIndex((x) => x.path === path);
    if (existing >= 0) return setActive(existing);
    const node = vfs.getNode(fs, path);
    if (!node || node.type !== "file") return;
    setTabs((ts) => [...ts, { path, name: node.name, content: node.content ?? "", dirty: false }]);
    setActive(tabs.length);
  };

  const newFile = () => {
    setTabs((ts) => [...ts, { path: null, name: `untitled-${++untitledSeq}.js`, content: "", dirty: false }]);
    setActive(tabs.length);
  };

  const closeTab = (i: number) => {
    if (tabs.length === 1) return;
    setTabs((ts) => ts.filter((_, x) => x !== i));
    setActive((a) => (a >= i ? Math.max(0, a - 1) : a));
  };

  const save = () => {
    const store = useGame.getState();
    let name = tab.name;
    if (!tab.path) {
      const input = window.prompt(t("editor.saveAs"), name);
      if (!input) return;
      name = input.endsWith(".js") ? input : `${input}.js`;
    }
    const path = `${DIR}/${name}`;
    store.mkdir(DIR);
    const r = store.writeFile(path, { size: Math.max(0.001, tab.content.length / 1024 / 1024), content: tab.content });
    if (!r.ok) {
      sys("error", typeof r.error === "object" ? t(r.error.key, r.error.vars) : String(r.error));
      return;
    }
    setTabs((ts) => ts.map((x, i) => (i === active ? { ...x, path, name, dirty: false } : x)));
    sys("sys", t("editor.saved", { name }));
  };

  const sys = (level: Line["level"], text: string) => setLines((l) => [...l, { level, text }]);

  const run = () => {
    if (running) return;
    setLines([{ level: "sys", text: t("editor.running") }]);
    setRunning(true);
    handle.current = runScript(tab.content, {
      onLog: (level, text) => setLines((l) => [...l, { level, text }]),
      onDone: (error) => {
        setRunning(false);
        handle.current = null;
        sys(error ? "error" : "sys", error === "stopped" ? t("editor.stopped") : error ? t("editor.error", { error }) : t("editor.done"));
      },
    });
  };

  const stop = () => handle.current?.stop();

  const syncScroll = () => {
    if (preRef.current && taRef.current) {
      preRef.current.scrollTop = taRef.current.scrollTop;
      preRef.current.scrollLeft = taRef.current.scrollLeft;
    }
    if (gutterRef.current && taRef.current) gutterRef.current.scrollTop = taRef.current.scrollTop;
  };

  const onSelect = () => {
    const ta = taRef.current;
    if (!ta) return;
    const upto = ta.value.slice(0, ta.selectionStart);
    const line = upto.split("\n").length;
    const col = upto.length - upto.lastIndexOf("\n");
    setCursor({ line, col });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      save();
    } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      run();
    } else if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const s = ta.selectionStart;
      const v = ta.value;
      update(v.slice(0, s) + "  " + v.slice(ta.selectionEnd));
      requestAnimationFrame(() => ta.setSelectionRange(s + 2, s + 2));
    }
  };

  const lineCount = tab.content.split("\n").length;

  return (
    <div className="editor">
      <div className="editor-toolbar">
        {running ? (
          <Button icon="icon/subtract" onClick={stop}>
            {t("editor.stop")}
          </Button>
        ) : (
          <Button variant="accent" icon="icon/chevron_right" onClick={run}>
            {t("editor.run")}
          </Button>
        )}
        <Button icon="icon/save" onClick={save}>
          {t("editor.save")}
        </Button>
        <Button icon="icon/arrow_download" onClick={() => setImportOpen(true)}>
          {t("editor.import")}
        </Button>
        <span className="spacer" />
        <Button variant="subtle" icon="icon/add" onClick={newFile}>
          {t("editor.new")}
        </Button>
      </div>

      <div className="editor-main">
        <aside className="editor-files">
          <div className="editor-files-head t-caption c-secondary">{DIR}</div>
          {scriptFiles.length === 0 && <div className="t-caption c-tertiary editor-files-empty">{t("editor.noFiles")}</div>}
          {scriptFiles.map((f) => (
            <button type="button" key={f.name} className={`editor-file ${tab.path === `${DIR}/${f.name}` ? "on" : ""}`} onClick={() => openFile(`${DIR}/${f.name}`)}>
              <Icon name="icon/document" size={14} />
              {f.name}
            </button>
          ))}
        </aside>

        <div className="editor-pane">
          <div className="editor-tabs">
            {tabs.map((x, i) => (
              <div key={i} className={`editor-tab ${i === active ? "on" : ""}`} onClick={() => setActive(i)}>
                <span>{x.name}{x.dirty ? " •" : ""}</span>
                {tabs.length > 1 && (
                  <IconButton
                    icon="icon/dismiss"
                    label="Close"
                    size={20}
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(i);
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="editor-code">
            <div className="editor-gutter" ref={gutterRef}>
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <div className="editor-input">
              <pre className="editor-highlight" ref={preRef} aria-hidden dangerouslySetInnerHTML={{ __html: highlight(tab.content) }} />
              <textarea
                ref={taRef}
                className="editor-textarea"
                value={tab.content}
                spellCheck={false}
                onChange={(e) => update(e.target.value)}
                onScroll={syncScroll}
                onKeyDown={onKeyDown}
                onKeyUp={onSelect}
                onClick={onSelect}
                wrap="off"
              />
            </div>
          </div>

          <div className="editor-console" ref={consoleRef}>
            {lines.length === 0 && <div className="t-caption c-tertiary">{t("editor.consoleHint")}</div>}
            {lines.map((l, i) => (
              <div key={i} className={`editor-log log-${l.level}`}>
                {l.text}
              </div>
            ))}
          </div>

          <div className="editor-status t-caption">
            <span>{running ? t("editor.statusRunning") : t("editor.statusReady")}</span>
            <span className="spacer" />
            <span>
              {t("editor.lineCol", { line: cursor.line, col: cursor.col })} · {t("editor.chars", { n: tab.content.length })}
            </span>
          </div>
        </div>
      </div>

      {importOpen && <ImportDialog onClose={() => setImportOpen(false)} onImport={(name, content) => {
        setTabs((ts) => [...ts, { path: null, name, content, dirty: true }]);
        setActive(tabs.length);
        setImportOpen(false);
      }} />}
    </div>
  );
}

/** Import a script by pasting text or dropping a .js file (GDD 3.3.1). */
function ImportDialog({ onClose, onImport }: { onClose: () => void; onImport: (name: string, content: string) => void }) {
  const t = useT();
  const [name, setName] = useState("imported.js");
  const [text, setText] = useState("");
  const [drag, setDrag] = useState(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    setName(file.name.endsWith(".js") ? file.name : `${file.name}.js`);
    file.text().then(setText);
  };

  return (
    <div className="dialog-smoke" onPointerDown={(e) => e.stopPropagation()}>
      <div className="dialog editor-import">
        <div className="dialog-body">
          <div className="t-subtitle">{t("editor.importTitle")}</div>
          <TextBox value={name} onChange={setName} header={t("editor.fileName")} />
          <div
            className={`editor-drop ${drag ? "over" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
          >
            <Icon name="icon/arrow_download" size={24} />
            <span className="t-caption c-secondary">{t("editor.dropHint")}</span>
          </div>
          <textarea className="editor-import-text" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("editor.pasteHint")} spellCheck={false} />
        </div>
        <div className="dialog-footer">
          <Button variant="accent" disabled={!text.trim()} onClick={() => onImport(name.endsWith(".js") ? name : `${name}.js`, text)}>
            {t("editor.importBtn")}
          </Button>
          <Button onClick={onClose}>{t("editor.cancel")}</Button>
        </div>
      </div>
    </div>
  );
}
