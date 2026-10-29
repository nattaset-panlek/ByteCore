import { useRef, useState, type KeyboardEvent } from "react";
import { useT } from "../../i18n";
import { separator, type MenuItem } from "../../os/contextMenu";
import { TabRow, useWindow } from "../../os/Window";
import { useWindows } from "../../os/windowStore";
import { Icon, TabViewItem } from "../../ui";
import { caretPos, dropdown, editSelection, loadDoc, newDoc, saveText, SaveAsDialog, UnsavedDialog, useOpenRequests, type Doc } from "../editorShared";
import "./textEditor.css";

// Text Editor (Notepad-style, Figma Window/Text Editor): tabs of plain text files (.txt, .log).
// The format bar writes Markdown-style markers into the plain text.

const DOCS_DIR = "C:/Users/ghost_user/Documents";
const ZOOMS = [50, 75, 90, 100, 110, 125, 150, 200];
let untitledSeq = 0;
const untitled = () => newDoc(`Untitled-${++untitledSeq}.txt`);

export function TextEditor() {
  const t = useT();
  const { win } = useWindow();
  const [docs, setDocs] = useState<Doc[]>(() => [(win.args?.path && loadDoc(win.args.path)) || untitled()]);
  const [activeId, setActiveId] = useState(docs[0].id);
  const [wrap, setWrap] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [showStatus, setShowStatus] = useState(true);
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const [notice, setNotice] = useState("");
  const [saveAs, setSaveAs] = useState<Doc | null>(null);
  const [closing, setClosing] = useState<Doc | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const doc = docs.find((d) => d.id === activeId) ?? docs[0];

  const open = (path: string) => {
    const hit = docs.find((d) => d.path === path);
    if (hit) return setActiveId(hit.id);
    const d = loadDoc(path);
    if (!d) return;
    setDocs((ds) => [...ds, d]);
    setActiveId(d.id);
  };
  useOpenRequests(win, open);

  const patch = (id: number, p: Partial<Doc>) => setDocs((ds) => ds.map((d) => (d.id === id ? { ...d, ...p } : d)));
  const setContent = (content: string) => patch(doc.id, { content, dirty: true });

  const newTab = () => {
    const d = untitled();
    setDocs((ds) => [...ds, d]);
    setActiveId(d.id);
  };

  const dropTab = (d: Doc) => {
    const rest = docs.filter((x) => x.id !== d.id);
    if (!rest.length) return useWindows.getState().close(win.id);
    setDocs(rest);
    if (d.id === activeId) setActiveId(rest[Math.min(docs.indexOf(d), rest.length - 1)].id);
  };
  const closeTab = (d: Doc) => (d.dirty ? setClosing(d) : dropTab(d));

  /** Save d (to path, or its own path). Returns false when it needs a name or failed. */
  const write = (d: Doc, path = d.path): boolean => {
    if (!path) {
      setSaveAs(d);
      return false;
    }
    const err = saveText(path, d.content);
    if (err) {
      setNotice(err);
      return false;
    }
    patch(d.id, { path, name: path.slice(path.lastIndexOf("/") + 1), dirty: false });
    setNotice(t("editor.saved", { name: path.slice(path.lastIndexOf("/") + 1) }));
    return true;
  };

  // ---- formatting (Markdown-style markers) ----
  const ta = () => taRef.current!;
  const wrapSel = (mark: string, after = mark) =>
    editSelection(ta(), setContent, (v, s, e) => ({ value: v.slice(0, s) + mark + v.slice(s, e) + after + v.slice(e), start: s + mark.length, end: e + mark.length }));
  /** Apply fn to every line touched by the selection. */
  const eachLine = (fn: (line: string, i: number) => string) =>
    editSelection(ta(), setContent, (v, s, e) => {
      const a = v.lastIndexOf("\n", s - 1) + 1;
      const bEnd = v.indexOf("\n", e);
      const b = bEnd < 0 ? v.length : bEnd;
      const out = v.slice(a, b).split("\n").map(fn).join("\n");
      return { value: v.slice(0, a) + out + v.slice(b), start: a, end: a + out.length };
    });
  const stripLine = (l: string) => l.replace(/^(#{1,6} |[-*] |\d+\. )/, "");
  const heading = (n: number) => eachLine((l) => (n ? "#".repeat(n) + " " : "") + stripLine(l));
  const list = (numbered: boolean) => eachLine((l, i) => (numbered ? `${i + 1}. ` : "- ") + stripLine(l));
  const clearFormat = () => eachLine((l) => stripLine(l).replace(/\*\*|~~|\*/g, ""));
  const link = () =>
    editSelection(ta(), setContent, (v, s, e) => {
      const label = v.slice(s, e) || t("textEditor.linkText");
      const ins = `[${label}](https://)`;
      return { value: v.slice(0, s) + ins + v.slice(e), start: s + label.length + 3, end: s + label.length + 11 };
    });
  const table = () =>
    editSelection(ta(), setContent, (v, s) => {
      const ins = `${s && v[s - 1] !== "\n" ? "\n" : ""}| ${t("textEditor.column")} | ${t("textEditor.column")} |\n| --- | --- |\n|  |  |\n`;
      return { value: v.slice(0, s) + ins + v.slice(s), start: s + ins.length, end: s + ins.length };
    });

  // ---- menus ----
  const clip = (cmd: "cut" | "copy") => {
    ta().focus();
    document.execCommand(cmd);
  };
  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      editSelection(ta(), setContent, (v, s, e) => ({ value: v.slice(0, s) + text + v.slice(e), start: s + text.length, end: s + text.length }));
    } catch {
      setNotice(t("textEditor.pasteBlocked"));
    }
  };
  const stamp = () =>
    editSelection(ta(), setContent, (v, s, e) => {
      const d = new Date().toLocaleString();
      return { value: v.slice(0, s) + d + v.slice(e), start: s + d.length, end: s + d.length };
    });
  const zoomBy = (dir: number) => setZoom((z) => ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, ZOOMS.indexOf(z) + dir))]);

  const fileMenu: MenuItem[] = [
    { label: t("textEditor.newTab"), icon: "icon/add", onClick: newTab },
    { label: t("textEditor.openFolder"), icon: "icon/folder", onClick: () => useWindows.getState().open("explorer", { path: DOCS_DIR }) },
    separator,
    { label: t("editor.save"), icon: "icon/save", onClick: () => write(doc) },
    { label: t("textEditor.saveAs"), icon: "icon/save", onClick: () => setSaveAs(doc) },
    separator,
    { label: t("textEditor.closeTab"), icon: "icon/dismiss", onClick: () => closeTab(doc) },
    { label: t("textEditor.closeWindow"), onClick: () => useWindows.getState().close(win.id) },
  ];
  const editMenu: MenuItem[] = [
    { label: t("textEditor.undo"), onClick: () => (ta().focus(), document.execCommand("undo")) },
    separator,
    { label: t("explorer.cut"), icon: "icon/cut", onClick: () => clip("cut") },
    { label: t("explorer.copy"), icon: "icon/copy", onClick: () => clip("copy") },
    { label: t("explorer.paste"), onClick: paste },
    separator,
    { label: t("textEditor.selectAll"), onClick: () => (ta().focus(), ta().select()) },
    { label: t("textEditor.timeDate"), onClick: stamp },
  ];
  const viewMenu: MenuItem[] = [
    { label: t("textEditor.zoomIn"), onClick: () => zoomBy(1) },
    { label: t("textEditor.zoomOut"), onClick: () => zoomBy(-1) },
    { label: t("textEditor.zoomReset"), onClick: () => setZoom(100) },
    separator,
    { label: t("textEditor.wordWrap"), icon: wrap ? "icon/checkmark" : undefined, onClick: () => setWrap(!wrap) },
    { label: t("textEditor.statusBar"), icon: showStatus ? "icon/checkmark" : undefined, onClick: () => setShowStatus(!showStatus) },
  ];

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const ctrl = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    if (ctrl && k === "s") e.shiftKey ? setSaveAs(doc) : write(doc);
    else if (ctrl && k === "b") wrapSel("**");
    else if (ctrl && k === "i") wrapSel("*");
    else if (ctrl && k === "n") newTab();
    else if (ctrl && k === "w") closeTab(doc);
    else if (ctrl && (k === "=" || k === "+")) zoomBy(1);
    else if (ctrl && k === "-") zoomBy(-1);
    else if (ctrl && k === "0") setZoom(100);
    else if (e.key === "F5") stamp();
    else if (e.key === "Tab") editSelection(e.currentTarget, setContent, (v, s, en) => ({ value: v.slice(0, s) + "\t" + v.slice(en), start: s + 1, end: s + 1 }));
    else return;
    e.preventDefault();
  };
  const track = () => taRef.current && setCursor(caretPos(taRef.current));

  const fmt = (label: string, title: string, onClick: () => void, cls = "") => (
    <button type="button" className={`te-btn ${cls}`} title={title} aria-label={title} onClick={onClick}>
      {label}
    </button>
  );
  const iconBtn = (icon: string, title: string, onClick: () => void) => (
    <button type="button" className="te-btn" title={title} aria-label={title} onClick={onClick}>
      <Icon name={icon} size={16} />
    </button>
  );

  return (
    <div className="te">
      <TabRow onNewTab={newTab}>
        {docs.map((d) => (
          <TabViewItem key={d.id} icon="icon/document" label={d.name + (d.dirty ? " •" : "")} selected={d.id === doc.id} onClick={() => setActiveId(d.id)} onClose={() => closeTab(d)} />
        ))}
      </TabRow>

      <div className="te-bar">
        <div className="te-menus">
          <button type="button" className="te-menu" onClick={(e) => dropdown(e, fileMenu)}>{t("textEditor.file")}</button>
          <button type="button" className="te-menu" onClick={(e) => dropdown(e, editMenu)}>{t("textEditor.edit")}</button>
          <button type="button" className="te-menu" onClick={(e) => dropdown(e, viewMenu)}>{t("textEditor.view")}</button>
        </div>
        <div className="te-format">
          <button
            type="button"
            className="te-btn te-drop"
            onClick={(e) =>
              dropdown(e, [
                { label: t("textEditor.h1"), onClick: () => heading(1) },
                { label: t("textEditor.h2"), onClick: () => heading(2) },
                { label: t("textEditor.h3"), onClick: () => heading(3) },
                { label: t("textEditor.normal"), onClick: () => heading(0) },
              ])
            }
          >
            H1 <Icon name="icon/chevron_down" size={12} />
          </button>
          <button
            type="button"
            className="te-btn te-drop c-secondary"
            onClick={(e) =>
              dropdown(e, [
                { label: t("textEditor.bulleted"), onClick: () => list(false) },
                { label: t("textEditor.numbered"), onClick: () => list(true) },
              ])
            }
          >
            {t("textEditor.list")} <Icon name="icon/chevron_down" size={12} />
          </button>
          <span className="te-sep" />
          {fmt("B", t("textEditor.bold"), () => wrapSel("**"), "b")}
          {fmt("I", t("textEditor.italic"), () => wrapSel("*"), "i")}
          {fmt("S", t("textEditor.strike"), () => wrapSel("~~"), "s")}
          {iconBtn("icon/share", t("textEditor.link"), link)}
          {iconBtn("icon/table", t("textEditor.table"), table)}
          <span className="te-sep" />
          {iconBtn("icon/rename", t("textEditor.clearFormat"), clearFormat)}
        </div>
        <div className="te-end">{iconBtn("icon/settings", t("app.settings"), () => useWindows.getState().open("settings"))}</div>
      </div>

      <div className="te-page">
        <textarea
          ref={taRef}
          key={doc.id}
          className="te-text"
          style={{ fontSize: (14 * zoom) / 100, lineHeight: `${(20 * zoom) / 100}px` }}
          value={doc.content}
          wrap={wrap ? "soft" : "off"}
          spellCheck={false}
          autoFocus
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={onKey}
          onKeyUp={track}
          onClick={track}
          onSelect={track}
        />
      </div>

      {showStatus && (
        <div className="te-status t-caption">
          <span>{t("editor.lineCol", { line: cursor.line, col: cursor.col })}</span>
          <span>{t("textEditor.characters", { n: doc.content.length })}</span>
          {notice && <span className="te-notice">{notice}</span>}
          <span className="spacer" />
          <span>{zoom}%</span>
          <span>{doc.content.includes("\r\n") ?"Windows (CRLF)" : "Unix (LF)"}</span>
          <span>UTF-8</span>
        </div>
      )}

      <SaveAsDialog
        open={!!saveAs}
        dir={saveAs?.path ? saveAs.path.slice(0, saveAs.path.lastIndexOf("/")) : DOCS_DIR}
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
