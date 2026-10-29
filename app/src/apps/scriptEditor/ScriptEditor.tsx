import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { runScript, type ScriptHandle } from "../../game/scripting/host";
import type { LogLevel } from "../../game/scripting/protocol";
import { useGame } from "../../game/store";
import type { DirNode } from "../../game/types";
import * as vfs from "../../game/vfs";
import { useT } from "../../i18n";
import { separator, type MenuItem } from "../../os/contextMenu";
import { CaptionButtons, useWindow } from "../../os/Window";
import { useWindows } from "../../os/windowStore";
import { Button, Icon, TextBox } from "../../ui";
import { CompileStatus, compileLines, isXjs } from "../userApp/CompileStatus";
import { caretPos, dropdown, editSelection, loadDoc, newDoc, saveText, SaveAsDialog, UnsavedDialog, useOpenRequests, type Doc } from "../editorShared";
import { highlight } from "./highlight";
import { completionsAt, errorLine, fixHint, SNIPPETS, type Completion } from "./assist";
import { skillEffects } from "../../game/skills";
import { SAMPLE_SCRIPT } from "./sample";
import "./editor.css";

// IDE (GDD 3.3.1, Figma Window/IDE): VS Code-style editor for scripts (.js) and styles (.css).
// Edit, save to the VFS, and run .js in a Worker with the ByteCore API.

const DIR = "C:/Scripts";
const LINE_H = 20;
const PAD_TOP = 8;
/** Minimap: px per code line */
const MINI_H = 3;

type View = "explorer" | "search" | "run" | "snippets";
type PanelTab = "problems" | "output" | "console";
interface Line {
  level: LogLevel | "sys";
  text: string;
}

let untitledSeq = 0;
const isScript = (name: string) => name.toLowerCase().endsWith(".js") || isXjs(name);
const language = (name: string) => (isScript(name) ? "JavaScript" : name.toLowerCase().endsWith(".css") ? "CSS" : "Plain Text");
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (code: string) => unknown;

/** Every file under a VFS folder, as full paths. */
function walk(root: DirNode, dir: string): string[] {
  return vfs.list(root, dir).flatMap((n) => (n.type === "dir" ? walk(root, `${dir}/${n.name}`) : [`${dir}/${n.name}`]));
}

/** Functions (JS) or selectors (CSS) with their 1-based line. */
function outline(name: string, code: string): { label: string; line: number }[] {
  const out: { label: string; line: number }[] = [];
  code.split("\n").forEach((l, i) => {
    const m = isScript(name)
      ? /^\s*(?:export\s+)?(?:async\s+)?function\s*\*?\s*(\w+)/.exec(l) ?? /^\s*(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?(?:\(|function|\w+\s*=>)/.exec(l)
      : /^\s*([^{}/\s][^{}]*?)\s*\{/.exec(l);
    if (m) out.push({ label: isScript(name) ? `${m[1]}()` : m[1], line: i + 1 });
  });
  return out;
}

export function ScriptEditor() {
  const t = useT();
  const { win, dragStart } = useWindow();
  const ws = useWindows.getState;
  const fs = useGame((s) => s.game.fs);

  const [docs, setDocs] = useState<Doc[]>(() => [(win.args?.path && loadDoc(win.args.path)) || newDoc(`untitled-${++untitledSeq}.js`, SAMPLE_SCRIPT)]);
  const [activeId, setActiveId] = useState(docs[0].id);
  const [view, setView] = useState<View | null>("explorer");
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [panel, setPanel] = useState<PanelTab | null>("console");
  const [lines, setLines] = useState<Line[]>([]);
  const [output, setOutput] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const [scroll, setScroll] = useState({ top: 0, h: 400 });
  const [query, setQuery] = useState("");
  const [cmdOpen, setCmdOpen] = useState(false);
  const [find, setFind] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [saveAs, setSaveAs] = useState<Doc | null>(null);
  const [closing, setClosing] = useState<Doc | null>(null);
  const [showMinimap, setShowMinimap] = useState(true);
  // Code-branch skills: Autocomplete flyout, Snippets view, Error lens
  const skillFx = useGame((s) => skillEffects(s.game.player.skills));
  const [ac, setAc] = useState<{ from: number; items: Completion[]; sel: number } | null>(null);

  const handle = useRef<ScriptHandle | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const consoleRef = useRef<HTMLDivElement>(null);
  const cmdRef = useRef<HTMLInputElement>(null);

  const doc = docs.find((d) => d.id === activeId) ?? docs[0];
  const script = isScript(doc.name);

  useEffect(() => () => handle.current?.stop(), []);
  useLayoutEffect(() => {
    consoleRef.current?.scrollTo(0, consoleRef.current.scrollHeight);
  }, [lines, output, panel]);

  // ---- documents ----
  const open = (path: string, line?: number) => {
    const hit = docs.find((d) => d.path === path);
    if (hit) setActiveId(hit.id);
    else {
      const d = loadDoc(path);
      if (!d) return;
      setDocs((ds) => [...ds, d]);
      setActiveId(d.id);
    }
    if (line) requestAnimationFrame(() => requestAnimationFrame(() => goToLine(line)));
  };
  useOpenRequests(win, (p) => open(p));

  const patch = (id: number, p: Partial<Doc>) => setDocs((ds) => ds.map((d) => (d.id === id ? { ...d, ...p } : d)));
  const setContent = (content: string) => patch(doc.id, { content, dirty: true });
  const addDoc = (d: Doc) => {
    setDocs((ds) => [...ds, d]);
    setActiveId(d.id);
  };
  const newFile = () => addDoc(newDoc(`untitled-${++untitledSeq}.js`));

  const dropTab = (d: Doc) => {
    const rest = docs.filter((x) => x.id !== d.id);
    if (!rest.length) return ws().close(win.id);
    setDocs(rest);
    if (d.id === activeId) setActiveId(rest[Math.min(docs.indexOf(d), rest.length - 1)].id);
  };
  const closeTab = (d: Doc) => (d.dirty ? setClosing(d) : dropTab(d));

  const log = (text: string) => setOutput((o) => [...o, `[${new Date().toLocaleTimeString()}] ${text}`]);
  const write = (d: Doc, path = d.path): boolean => {
    if (!path) {
      setSaveAs(d);
      return false;
    }
    const err = saveText(path, d.content);
    if (err) {
      log(err);
      setPanel("output");
      return false;
    }
    const name = path.slice(path.lastIndexOf("/") + 1);
    patch(d.id, { path, name, dirty: false });
    log(t("editor.saved", { name }));
    return true;
  };

  const newFolder = () => {
    const dir = vfs.getNode(fs, DIR);
    let name = t("explorer.newFolder");
    for (let i = 2; dir?.type === "dir" && dir.children[name]; i++) name = t("explorer.newFolderN", { n: String(i) });
    useGame.getState().mkdir(`${DIR}/${name}`);
  };

  // ---- run ----
  const sys = (level: Line["level"], text: string) => setLines((l) => [...l, { level, text }]);
  const run = () => {
    if (running || !script) return;
    // .xjs apps are compiled into a Setup file instead of run (docs/app-sdk.md).
    if (isXjs(doc.name)) {
      if ((doc.dirty || !doc.path) && !write(doc)) return;
      setPanel("console");
      setLines(compileLines(doc.path!, doc.content));
      return;
    }
    setPanel("console");
    setLines([{ level: "sys", text: t("editor.running") }]);
    setRunning(true);
    handle.current = runScript(doc.content, {
      onLog: (level, text) => setLines((l) => [...l, { level, text }]),
      onDone: (error) => {
        setRunning(false);
        handle.current = null;
        sys(error ? "error" : "sys", error === "stopped" ? t("editor.stopped") : error ? t("editor.error", { error }) : t("editor.done"));
      },
    });
  };
  const stop = () => handle.current?.stop();

  // ---- analysis ----
  const lens = useMemo(() => {
    if (!script || !skillFx.errorLens) return null;
    const n = errorLine(doc.content, (src) => void new AsyncFunction(src));
    return n;
  }, [doc.content, script, skillFx.errorLens]);
  const problems = useMemo(() => {
    if (!script) return [];
    try {
      new AsyncFunction(doc.content);
      return [];
    } catch (e) {
      return [(e as Error).message];
    }
  }, [doc.content, script]);
  const symbols = useMemo(() => outline(doc.name, doc.content), [doc.name, doc.content]);
  const symbolAt = [...symbols].reverse().find((s) => s.line <= cursor.line);
  const codeLines = doc.content.split("\n");

  // ---- editor helpers ----
  const ta = () => taRef.current!;
  const goToLine = (line: number) => {
    const el = taRef.current;
    if (!el) return;
    const n = Math.max(1, Math.min(line, el.value.split("\n").length));
    const at = el.value.split("\n").slice(0, n - 1).join("\n").length + (n > 1 ? 1 : 0);
    el.focus();
    el.setSelectionRange(at, at);
    el.scrollTop = Math.max(0, (n - 1) * LINE_H - el.clientHeight / 3);
    setCursor(caretPos(el));
  };
  const syncScroll = () => {
    const el = taRef.current;
    if (!el) return;
    if (preRef.current) {
      preRef.current.scrollTop = el.scrollTop;
      preRef.current.scrollLeft = el.scrollLeft;
    }
    if (gutterRef.current) gutterRef.current.scrollTop = el.scrollTop;
    setScroll({ top: el.scrollTop, h: el.clientHeight });
  };
  useLayoutEffect(syncScroll, [activeId]);
  const track = () => taRef.current && setCursor(caretPos(taRef.current));
  const clip = (cmd: "cut" | "copy") => {
    ta().focus();
    document.execCommand(cmd);
  };
  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      editSelection(ta(), setContent, (v, s, e) => ({ value: v.slice(0, s) + text + v.slice(e), start: s + text.length, end: s + text.length }));
    } catch {
      log(t("textEditor.pasteBlocked"));
    }
  };
  const duplicateLine = () =>
    editSelection(ta(), setContent, (v, s) => {
      const a = v.lastIndexOf("\n", s - 1) + 1;
      const bEnd = v.indexOf("\n", s);
      const b = bEnd < 0 ? v.length : bEnd;
      const line = v.slice(a, b);
      return { value: v.slice(0, b) + "\n" + line + v.slice(b), start: s + line.length + 1, end: s + line.length + 1 };
    });
  const toggleView = (v: View) => setView((cur) => (cur === v ? null : v));
  const focusCommand = (prefix = "") => {
    setQuery(prefix);
    setCmdOpen(true);
    requestAnimationFrame(() => cmdRef.current?.focus());
  };

  // ---- menus ----
  const menus: [string, MenuItem[]][] = [
    [
      t("textEditor.file"),
      [
        { label: t("ide.newFile"), icon: "icon/add", onClick: newFile },
        { label: t("ide.openFolder"), icon: "icon/folder", onClick: () => ws().open("explorer", { path: DIR }) },
        { label: t("editor.import"), icon: "icon/arrow_download", onClick: () => setImportOpen(true) },
        separator,
        { label: t("editor.save"), icon: "icon/save", onClick: () => write(doc) },
        { label: t("textEditor.saveAs"), icon: "icon/save", onClick: () => setSaveAs(doc) },
        separator,
        { label: t("ide.closeEditor"), icon: "icon/dismiss", onClick: () => closeTab(doc) },
        { label: t("textEditor.closeWindow"), onClick: () => ws().close(win.id) },
      ],
    ],
    [
      t("textEditor.edit"),
      [
        { label: t("textEditor.undo"), onClick: () => (ta().focus(), document.execCommand("undo")) },
        separator,
        { label: t("explorer.cut"), icon: "icon/cut", onClick: () => clip("cut") },
        { label: t("explorer.copy"), icon: "icon/copy", onClick: () => clip("copy") },
        { label: t("explorer.paste"), onClick: paste },
        separator,
        { label: t("ide.findInFiles"), icon: "icon/search", onClick: () => setView("search") },
      ],
    ],
    [
      t("ide.selection"),
      [
        { label: t("textEditor.selectAll"), onClick: () => (ta().focus(), ta().select()) },
        { label: t("ide.duplicateLine"), onClick: duplicateLine },
      ],
    ],
    [
      t("textEditor.view"),
      [
        { label: t("ide.explorer"), icon: "icon/square_multiple", onClick: () => setView("explorer") },
        { label: t("ide.search"), icon: "icon/search", onClick: () => setView("search") },
        { label: t("ide.runView"), icon: "icon/developer_board", onClick: () => setView("run") },
        separator,
        { label: t("ide.togglePanel"), onClick: () => setPanel(panel ? null : "console") },
        { label: t("ide.minimap"), icon: showMinimap ? "icon/checkmark" : undefined, onClick: () => setShowMinimap(!showMinimap) },
      ],
    ],
    [
      t("ide.go"),
      [
        { label: t("ide.goToFile"), onClick: () => focusCommand() },
        { label: t("ide.goToLine"), onClick: () => focusCommand(":") },
        ...(symbols.length ? [separator] : []),
        ...symbols.slice(0, 10).map((s) => ({ label: s.label, onClick: () => goToLine(s.line) })),
      ],
    ],
    [
      t("ide.run"),
      [
        { label: t("ide.runScript"), icon: "icon/chevron_right", disabled: !script || running, onClick: run },
        { label: t("editor.stop"), icon: "icon/subtract", disabled: !running, onClick: stop },
      ],
    ],
    [
      t("ide.terminal"),
      [
        { label: t("ide.newTerminal"), icon: "app/Terminal", onClick: () => ws().open("terminal") },
        { label: t("ide.showConsole"), onClick: () => setPanel("console") },
        { label: t("ide.clearConsole"), icon: "icon/delete", onClick: () => setLines([]) },
      ],
    ],
    [
      t("ide.help"),
      [
        { label: t("ide.sample"), icon: "icon/document", onClick: () => addDoc(newDoc(`sample-${++untitledSeq}.js`, SAMPLE_SCRIPT)) },
        { label: t("ide.gettingStarted"), onClick: () => ws().open("pdfReader", { path: "C:/Users/ghost_user/Documents/getting-started.pdf" }) },
      ],
    ],
  ];

  // ---- keyboard ----
  const accept = (c: Completion) => {
    const el = ta();
    const from = ac!.from;
    const at = el.selectionStart;
    const value = el.value.slice(0, from) + c.insert + el.value.slice(at);
    setContent(value);
    setAc(null);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(from + c.insert.length, from + c.insert.length);
    });
  };
  const insertSnippet = (code: string) => {
    editSelection(ta(), setContent, (v, s, en) => ({ value: v.slice(0, s) + code + v.slice(en), start: s + code.length, end: s + code.length }));
    ta().focus();
  };
  const onEdit = (value: string, caret: number) => {
    setContent(value);
    const c = script ? completionsAt(value, caret, skillFx.autocomplete) : null;
    setAc(c ? { ...c, sel: 0 } : null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (ac) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setAc({ ...ac, sel: (ac.sel + (e.key === "ArrowDown" ? 1 : ac.items.length - 1)) % ac.items.length });
        return;
      }
      if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        accept(ac.items[ac.sel]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setAc(null);
        return;
      }
    }
    const k = e.key.toLowerCase();
    if (ctrl && k === "s") e.shiftKey ? setSaveAs(doc) : write(doc);
    else if (ctrl && e.key === "Enter") run();
    else if (ctrl && k === "p") focusCommand();
    else if (ctrl && k === "g") focusCommand(":");
    else if (ctrl && k === "b") setView(view ? null : "explorer");
    else if (ctrl && k === "w") closeTab(doc);
    else if (ctrl && e.key === "`") setPanel(panel ? null : "console");
    else if (ctrl && e.shiftKey && k === "f") setView("search");
    else if (e.key === "Tab") editSelection(e.currentTarget, setContent, (v, s, en) => ({ value: v.slice(0, s) + "  " + v.slice(en), start: s + 2, end: s + 2 }));
    else return;
    e.preventDefault();
  };

  // ---- command center ----
  const allScripts = walk(fs, DIR);
  const q = query.trim().toLowerCase();
  const fileHits = q.startsWith(":") ? [] : [...new Set([...docs.map((d) => d.path).filter((p): p is string => !!p), ...allScripts])].filter((p) => p.toLowerCase().includes(q)).slice(0, 8);
  const runCommand = () => {
    if (q.startsWith(":")) {
      const n = parseInt(q.slice(1), 10);
      if (n) goToLine(n);
    } else if (fileHits[0]) open(fileHits[0]);
    setCmdOpen(false);
    setQuery("");
  };

  // ---- search view ----
  const f = find.trim().toLowerCase();
  const searchHits = f
    ? allScripts
        .map((p) => {
          const node = vfs.getNode(fs, p);
          const text = node?.type === "file" ? node.content ?? "" : "";
          const hits = text.split("\n").flatMap((l, i) => (l.toLowerCase().includes(f) ? [{ line: i + 1, text: l.trim() }] : []));
          return { path: p, hits };
        })
        .filter((r) => r.hits.length)
    : [];

  // ---- explorer tree ----
  const tree = (dir: string, depth: number): ReactNode =>
    vfs
      .list(fs, dir)
      .sort((a, b) => (a.type !== b.type ? (a.type === "dir" ? -1 : 1) : a.name.localeCompare(b.name)))
      .map((n) => {
        const p = `${dir}/${n.name}`;
        const isOpen = n.type === "dir" && !collapsed.includes(p);
        return (
          <div key={p}>
            <button
              type="button"
              className={`ide-tree-item ${doc.path === p ? "on" : ""}`}
              style={{ paddingLeft: 8 + depth * 16 }}
              onClick={() => (n.type === "dir" ? setCollapsed((c) => (isOpen ? [...c, p] : c.filter((x) => x !== p))) : open(p))}
            >
              <span className="ide-tree-exp">{n.type === "dir" && <Icon name={isOpen ? "icon/chevron_down" : "icon/chevron_right"} size={12} />}</span>
              <Icon name={n.type === "dir" ? "icon/folder" : "icon/document"} size={16} />
              <span className="ide-ellipsis">{n.name}</span>
            </button>
            {isOpen && tree(p, depth + 1)}
          </div>
        );
      });

  const crumbs = doc.path ? vfs.splitPath(doc.path) : [doc.name];
  const scrollMax = Math.max(1, codeLines.length * LINE_H + PAD_TOP * 2 - scroll.h);

  return (
    <div className="ide">
      {/* Title bar with menus and command center */}
      <div className="ide-title" onPointerDown={dragStart} onDoubleClick={(e) => e.target === e.currentTarget && ws().toggleMaximize(win.id)}>
        <Icon name="icon/document" size={16} />
        <div className="ide-menus">
          {menus.map(([label, items]) => (
            <button type="button" key={label} className="ide-menu" onClick={(e) => dropdown(e, items)}>
              {label}
            </button>
          ))}
        </div>
        <span className="spacer" />
        <div className="ide-cmd">
          <Icon name="icon/search" size={12} />
          <input
            ref={cmdRef}
            value={query}
            placeholder={doc.path ? vfs.splitPath(doc.path).slice(-2, -1)[0] ?? "C:" : t("ide.cmdPlaceholder")}
            spellCheck={false}
            onFocus={() => setCmdOpen(true)}
            onBlur={() => setTimeout(() => setCmdOpen(false), 150)}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") runCommand();
              if (e.key === "Escape") (e.currentTarget.blur(), setQuery(""));
            }}
          />
          {cmdOpen && (
            <div className="ide-cmd-list">
              {q.startsWith(":") ? (
                <div className="ide-cmd-hint t-caption c-secondary">{t("ide.goToLineHint", { n: codeLines.length })}</div>
              ) : fileHits.length ? (
                fileHits.map((p) => (
                  <button type="button" key={p} className="ide-cmd-item" onMouseDown={(e) => (e.preventDefault(), open(p), setCmdOpen(false), setQuery(""))}>
                    <Icon name="icon/document" size={14} />
                    <span>{p.slice(p.lastIndexOf("/") + 1)}</span>
                    <span className="c-tertiary t-caption ide-ellipsis">{p.slice(0, p.lastIndexOf("/"))}</span>
                  </button>
                ))
              ) : (
                <div className="ide-cmd-hint t-caption c-secondary">{t("ide.noMatch")}</div>
              )}
            </div>
          )}
        </div>
        <span className="spacer" />
        <CaptionButtons />
      </div>

      <div className="ide-body">
        {/* Activity bar */}
        <nav className="ide-activity">
          {(
            [
              ["explorer", "icon/square_multiple", t("ide.explorer")],
              ["search", "icon/search", t("ide.search")],
              ["run", "icon/developer_board", t("ide.runView")],
              ...(skillFx.snippets ? ([["snippets", "icon/document", t("skill.snippets")]] as [View, string, string][]) : []),
            ] as [View, string, string][]
          ).map(([v, icon, label]) => (
            <button type="button" key={v} className={`ide-act ${view === v ? "on" : ""}`} title={label} aria-label={label} onClick={() => toggleView(v)}>
              <Icon name={icon} size={24} />
            </button>
          ))}
          <button type="button" className="ide-act" title={t("trials.title")} aria-label={t("trials.title")} onClick={() => ws().open("trials")}>
            <Icon name="icon/checkmark_circle" size={24} />
          </button>
          <span className="spacer" />
          <button type="button" className="ide-act" title={t("app.settings")} aria-label={t("app.settings")} onClick={() => ws().open("settings")}>
            <Icon name="icon/settings" size={24} />
          </button>
        </nav>

        {/* Side bar */}
        {view && (
          <aside className="ide-side">
            {view === "explorer" && (
              <>
                <div className="ide-side-head t-caption">{t("ide.explorer").toUpperCase()}</div>
                <div className="ide-root">
                  <Icon name="icon/chevron_down" size={12} />
                  <span className="t-caption">SCRIPTS</span>
                  <span className="spacer" />
                  <button type="button" className="ide-mini-btn" title={t("ide.newFile")} onClick={newFile}>
                    <Icon name="icon/add" size={12} />
                  </button>
                  <button type="button" className="ide-mini-btn" title={t("explorer.newFolder")} onClick={newFolder}>
                    <Icon name="icon/folder" size={12} />
                  </button>
                </div>
                <div className="ide-tree">
                  {tree(DIR, 0)}
                  {allScripts.length === 0 && <div className="t-caption c-tertiary ide-pad">{t("editor.noFiles")}</div>}
                </div>
                <span className="spacer" />
                <button type="button" className="ide-section" onClick={() => setOutlineOpen(!outlineOpen)}>
                  <Icon name={outlineOpen ? "icon/chevron_down" : "icon/chevron_right"} size={12} />
                  <span className="t-caption">{t("ide.outline")}</span>
                </button>
                {outlineOpen && (
                  <div className="ide-outline">
                    {symbols.length === 0 && <div className="t-caption c-tertiary ide-pad">{t("ide.noSymbols")}</div>}
                    {symbols.map((s) => (
                      <button type="button" key={s.line} className={`ide-tree-item ${symbolAt === s ? "on" : ""}`} style={{ paddingLeft: 24 }} onClick={() => goToLine(s.line)}>
                        <span className="ide-ellipsis">{s.label}</span>
                        <span className="spacer" />
                        <span className="t-caption c-tertiary">{s.line}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            {view === "search" && (
              <>
                <div className="ide-side-head t-caption">{t("ide.search").toUpperCase()}</div>
                <div className="ide-pad">
                  <input className="ide-find" value={find} autoFocus placeholder={t("ide.searchPlaceholder")} spellCheck={false} onChange={(e) => setFind(e.target.value)} />
                  {f && <div className="t-caption c-secondary ide-find-count">{t("ide.results", { n: searchHits.reduce((s, r) => s + r.hits.length, 0), files: searchHits.length })}</div>}
                </div>
                <div className="ide-tree">
                  {searchHits.map((r) => (
                    <div key={r.path}>
                      <div className="ide-hit-file">
                        <Icon name="icon/document" size={14} />
                        <span className="ide-ellipsis">{r.path.slice(r.path.lastIndexOf("/") + 1)}</span>
                        <span className="ide-badge">{r.hits.length}</span>
                      </div>
                      {r.hits.slice(0, 20).map((h) => (
                        <button type="button" key={h.line} className="ide-tree-item ide-hit" onClick={() => open(r.path, h.line)}>
                          <span className="ide-ellipsis">{h.text}</span>
                          <span className="t-caption c-tertiary">{h.line}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
            {view === "run" && (
              <>
                <div className="ide-side-head t-caption">{t("ide.runView").toUpperCase()}</div>
                <div className="ide-run">
                  {running ? (
                    <Button icon="icon/subtract" onClick={stop}>
                      {t("editor.stop")}
                    </Button>
                  ) : (
                    <Button variant="accent" icon="icon/chevron_right" disabled={!script} onClick={run}>
                      {t("ide.runFile", { name: doc.name })}
                    </Button>
                  )}
                  <div className="t-caption c-secondary">{script ? t("ide.runHint") : t("ide.notRunnable")}</div>
                  <Button icon="icon/arrow_download" onClick={() => setImportOpen(true)}>
                    {t("editor.import")}
                  </Button>
                </div>
              </>
            )}
            {view === "snippets" && (
              <>
                <div className="ide-side-head t-caption">{t("skill.snippets").toUpperCase()}</div>
                <div className="ide-run">
                  {SNIPPETS.slice(0, skillFx.snippets).map((s) => (
                    <div key={s.id} className="ide-snippet">
                      <div className="t-body-strong">{t(`snippet.${s.id}`)}</div>
                      <pre className="t-caption c-secondary">{s.code.split("\n").slice(0, 3).join("\n")}…</pre>
                      <Button disabled={!script} onClick={() => insertSnippet(s.code)}>
                        {t("snippet.insert")}
                      </Button>
                    </div>
                  ))}
                  {skillFx.snippets < SNIPPETS.length && <div className="t-caption c-tertiary">{t("snippet.more")}</div>}
                </div>
              </>
            )}
          </aside>
        )}

        {/* Editor group */}
        <div className="ide-editor">
          <div className="ide-tabs">
            {docs.map((d) => (
              <div key={d.id} className={`ide-tab ${d.id === doc.id ? "on" : ""} ${d.dirty ? "dirty" : ""}`} onClick={() => setActiveId(d.id)} onAuxClick={(e) => e.button === 1 && closeTab(d)}>
                <Icon name="icon/document" size={14} />
                <span>{d.name}</span>
                <button
                  type="button"
                  className="ide-tab-close"
                  aria-label={t("ui.closeTab")}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(d);
                  }}
                >
                  <span className="ide-dot" />
                  <Icon name="icon/dismiss" size={10} />
                </button>
              </div>
            ))}
            <span className="spacer" />
            <div className="ide-tab-actions">
              {script && (
                <button type="button" className="ide-mini-btn" title={t("ide.runScript")} disabled={running} onClick={run}>
                  <Icon name="icon/chevron_right" size={14} />
                </button>
              )}
              <button
                type="button"
                className="ide-mini-btn"
                title={t("ide.more")}
                onClick={(e) =>
                  dropdown(e, [
                    { label: t("ide.closeSaved"), onClick: () => setDocs(docs.filter((d) => d.dirty || d.id === doc.id)) },
                  ])
                }
              >
                <Icon name="icon/more_horizontal" size={14} />
              </button>
            </div>
          </div>

          <div className="ide-crumbs t-caption">
            {crumbs.map((c, i) => (
              <span key={i} className={i === crumbs.length - 1 && !symbolAt ? "c-primary" : ""}>
                {i > 0 && <Icon name="icon/chevron_right" size={10} />}
                {c}
              </span>
            ))}
            {symbolAt && (
              <span className="c-primary">
                <Icon name="icon/chevron_right" size={10} />
                {symbolAt.label}
              </span>
            )}
          </div>

          <div className="ide-code">
            <div className="ide-gutter" ref={gutterRef}>
              {codeLines.map((_, i) => (
                <div key={i} className={`${i + 1 === cursor.line ? "on" : ""} ${i + 1 === lens ? "lens" : ""}`}>
                  {i + 1}
                </div>
              ))}
            </div>
            <div className="ide-input">
              <div className="ide-active-line" style={{ top: PAD_TOP + (cursor.line - 1) * LINE_H - scroll.top }} />
              {lens && <div className="ide-lens-line" style={{ top: PAD_TOP + (lens - 1) * LINE_H - scroll.top }} />}
              {ac && (
                <div className="ide-ac" style={{ top: PAD_TOP + cursor.line * LINE_H - scroll.top + 2, left: Math.min(420, cursor.col * 7.8) }}>
                  {ac.items.map((c, i) => (
                    <button
                      type="button"
                      key={c.label}
                      className={`ide-ac-item ${i === ac.sel ? "on" : ""}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        accept(c);
                      }}
                    >
                      <span className="t-mono">{c.label}</span>
                      <span className="t-caption c-tertiary">{c.ret}</span>
                    </button>
                  ))}
                  {skillFx.autocomplete >= 2 && (
                    <div className="ide-ac-doc t-caption">
                      <div className="c-secondary">{ac.items[ac.sel].sig}</div>
                      <div className="c-accent">{t("ac.footer", { rank: skillFx.autocomplete })}</div>
                    </div>
                  )}
                </div>
              )}
              <pre className="editor-highlight" ref={preRef} aria-hidden dangerouslySetInnerHTML={{ __html: highlight(doc.content, !script) }} />
              <textarea
                ref={taRef}
                key={doc.id}
                className="editor-textarea"
                value={doc.content}
                spellCheck={false}
                autoFocus
                onChange={(e) => onEdit(e.target.value, e.target.selectionStart)}
                onBlur={() => setAc(null)}
                onScroll={syncScroll}
                onKeyDown={onKeyDown}
                onKeyUp={track}
                onClick={track}
                onSelect={track}
                wrap="off"
              />
            </div>
            {showMinimap && (
              <div
                className="ide-minimap"
                onPointerDown={(e) => {
                  const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
                  const el = taRef.current;
                  if (el) el.scrollTop = (y / MINI_H) * LINE_H - el.clientHeight / 2;
                }}
              >
                {codeLines.slice(0, 600).map((l, i) => (
                  <div key={i} className="ide-mini-line" style={{ marginLeft: (l.length - l.trimStart().length) * 0.8, width: Math.min(52, l.trim().length * 0.8) }} />
                ))}
                <div className="ide-mini-view" style={{ top: Math.min(scroll.top, scrollMax) * (MINI_H / LINE_H), height: scroll.h * (MINI_H / LINE_H) }} />
              </div>
            )}
          </div>

          {panel && (
            <div className="ide-panel">
              <div className="ide-panel-tabs">
                {(
                  [
                    ["problems", t("ide.problems")],
                    ["output", t("ide.output")],
                    ["console", t("ide.console")],
                  ] as [PanelTab, string][]
                ).map(([p, label]) => (
                  <button type="button" key={p} className={`ide-panel-tab ${panel === p ? "on" : ""}`} onClick={() => setPanel(p)}>
                    {label}
                    {p === "problems" && problems.length > 0 && <span className="ide-badge">{problems.length}</span>}
                  </button>
                ))}
                <span className="spacer" />
                <button type="button" className="ide-mini-btn" title={t("ide.clearConsole")} onClick={() => (panel === "output" ? setOutput([]) : setLines([]))}>
                  <Icon name="icon/delete" size={14} />
                </button>
                <button type="button" className="ide-mini-btn" title={t("ide.togglePanel")} onClick={() => setPanel(null)}>
                  <Icon name="icon/dismiss" size={14} />
                </button>
              </div>
              <div className="ide-panel-body" ref={consoleRef}>
                {panel === "problems" &&
                  (problems.length ? (
                    problems.map((p, i) => (
                      <div key={i} className="ide-problem">
                        <Icon name="icon/error_circle" size={14} />
                        <span>{p}</span>
                        {lens && (
                          <button type="button" className="link-btn t-caption" onClick={() => goToLine(lens)}>
                            {t("lens.line", { n: lens })} · {t(fixHint(p))}
                          </button>
                        )}
                        <span className="c-tertiary">{doc.name}</span>
                      </div>
                    ))
                  ) : (
                    <div className="c-tertiary">{t("ide.noProblems")}</div>
                  ))}
                {panel === "output" && (output.length ? output.map((o, i) => <div key={i}>{o}</div>) : <div className="c-tertiary">{t("ide.noOutput")}</div>)}
                {panel === "console" && <CompileStatus path={doc.path} />}
                {panel === "console" &&
                  (lines.length ? (
                    lines.map((l, i) => (
                      <div key={i} className={`editor-log log-${l.level}`}>
                        {l.text}
                      </div>
                    ))
                  ) : (
                    <div className="c-tertiary">{t("editor.consoleHint")}</div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="ide-status t-caption">
        <button type="button" className="ide-status-btn" onClick={() => setPanel("problems")}>
          <Icon name="icon/error_circle" size={12} /> {problems.length}
          <Icon name="icon/warning" size={12} /> 0
        </button>
        <span className={running ? "c-caution" : "c-success"}>{running ? t("editor.statusRunning") : t("editor.statusReady")}</span>
        <span className="spacer" />
        <button type="button" className="ide-status-btn" onClick={() => focusCommand(":")}>
          {t("editor.lineCol", { line: cursor.line, col: cursor.col })}
        </button>
        <span>{t("ide.spaces")}</span>
        <span>UTF-8</span>
        <span>{doc.content.includes("\r\n") ? "CRLF" : "LF"}</span>
        <span>{language(doc.name)}</span>
      </div>

      {importOpen && (
        <ImportDialog
          onClose={() => setImportOpen(false)}
          onImport={(name, content) => {
            addDoc({ ...newDoc(name, content), dirty: true });
            setImportOpen(false);
          }}
        />
      )}
      <SaveAsDialog
        open={!!saveAs}
        dir={saveAs?.path ? saveAs.path.slice(0, saveAs.path.lastIndexOf("/")) : DIR}
        initial={saveAs?.name ?? ""}
        onClose={() => setSaveAs(null)}
        onSave={(path) => {
          if (!saveAs) return;
          const d = saveAs;
          setSaveAs(null);
          if (write(d, path) && closing?.id === d.id) {
            setClosing(null);
            dropTab(d);
          }
        }}
      />
      <UnsavedDialog
        doc={saveAs ? null : closing}
        onClose={() => setClosing(null)}
        onDiscard={() => {
          if (closing) dropTab(closing);
          setClosing(null);
        }}
        onSave={() => {
          if (!closing) return;
          if (write(closing)) {
            dropTab(closing);
            setClosing(null);
          }
        }}
      />
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
