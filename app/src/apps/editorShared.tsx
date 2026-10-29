import { useEffect, useRef, useState, type MouseEvent as RMouseEvent } from "react";
import { useGame } from "../game/store";
import * as vfs from "../game/vfs";
import { tm, useT } from "../i18n";
import { openContextMenu, type MenuItem } from "../os/contextMenu";
import type { WinState } from "../os/windowStore";
import { ContentDialog, TextBox } from "../ui";

// Shared by Text Editor and the IDE (Script Editor): VFS load/save, open requests, dialogs.

/** One open file. path is null until an untitled buffer is saved. */
export interface Doc {
  id: number;
  path: string | null;
  name: string;
  content: string;
  dirty: boolean;
}

let docSeq = 0;
export const newDoc = (name: string, content = "", path: string | null = null): Doc => ({ id: ++docSeq, path, name, content, dirty: false });

export function loadDoc(path: string): Doc | null {
  const node = vfs.getNode(useGame.getState().game.fs, path);
  if (!node || node.type !== "file") return null;
  return newDoc(node.name, node.content ?? "", vfs.joinPath(vfs.splitPath(path)));
}

/** Write text back to the VFS, keeping loot/module data on an existing file. Returns an error message or null. */
export function saveText(path: string, content: string): string | null {
  const store = useGame.getState();
  store.mkdir(vfs.joinPath(vfs.splitPath(path).slice(0, -1)));
  const prev = vfs.getNode(store.game.fs, path);
  const keep = prev?.type === "file" ? { loot: prev.loot, module: prev.module } : {};
  const r = store.writeFile(path, { ...keep, size: Math.max(0.001, content.length / 1024 / 1024), content });
  return r.ok ? null : tm(r.error);
}

/** Call onOpen(path) when the window is re-opened with a new `path` argument (e.g. from File Explorer). */
export function useOpenRequests(win: WinState, onOpen: (path: string) => void) {
  const seen = useRef(win.args?.nonce);
  const cb = useRef(onOpen);
  cb.current = onOpen;
  useEffect(() => {
    if (!win.args?.path || win.args.nonce === seen.current) return;
    seen.current = win.args.nonce;
    cb.current(win.args.path);
  }, [win.args]);
}

/** Open a menu below a button (menu bar entries, dropdown buttons). */
export function dropdown(e: RMouseEvent<HTMLElement>, items: MenuItem[]) {
  const r = e.currentTarget.getBoundingClientRect();
  openContextMenu({ preventDefault() {}, stopPropagation() {}, clientX: r.left, clientY: r.bottom + 2 } as RMouseEvent, items);
}

/** 1-based line and column of the textarea caret. */
export function caretPos(ta: HTMLTextAreaElement) {
  const upto = ta.value.slice(0, ta.selectionStart);
  return { line: upto.split("\n").length, col: upto.length - upto.lastIndexOf("\n") };
}

/** Replace the textarea selection through onChange, then restore a selection. */
export function editSelection(
  ta: HTMLTextAreaElement,
  onChange: (v: string) => void,
  fn: (value: string, start: number, end: number) => { value: string; start: number; end: number }
) {
  const r = fn(ta.value, ta.selectionStart, ta.selectionEnd);
  onChange(r.value);
  requestAnimationFrame(() => {
    ta.focus();
    ta.setSelectionRange(r.start, r.end);
  });
}

/** "Save as" file-name dialog. dir is where the file goes. */
export function SaveAsDialog({ open, dir, initial, onSave, onClose }: { open: boolean; dir: string; initial: string; onSave: (path: string) => void; onClose: () => void }) {
  const t = useT();
  const [name, setName] = useState(initial);
  useEffect(() => {
    if (open) setName(initial);
  }, [open, initial]);
  const submit = () => name.trim() && onSave(`${dir}/${name.trim()}`);
  return (
    <ContentDialog open={open} title={t("editors.saveAsTitle")} primary={t("editor.save")} onPrimary={submit} onClose={onClose}>
      <TextBox value={name} onChange={setName} header={t("editors.fileNameIn", { dir })} autoFocus onKeyDown={(e) => e.key === "Enter" && submit()} />
    </ContentDialog>
  );
}

/** Asked before closing a tab with unsaved changes. */
export function UnsavedDialog({ doc, onSave, onDiscard, onClose }: { doc: Doc | null; onSave: () => void; onDiscard: () => void; onClose: () => void }) {
  const t = useT();
  return (
    <ContentDialog open={!!doc} title={t("editors.unsavedTitle")} primary={t("editor.save")} secondary={t("editors.dontSave")} onPrimary={onSave} onSecondary={onDiscard} onClose={onClose}>
      {t("editors.unsavedText", { name: doc?.name ?? "" })}
    </ContentDialog>
  );
}
