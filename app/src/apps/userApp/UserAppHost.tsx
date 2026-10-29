import { useEffect, useMemo, useRef, useState } from "react";
import { appPath, getApp, storageSet } from "../../game/appsdk/installed";
import { MAX_DOWNLOAD_BYTES } from "../../game/appsdk/jobs";
import { useGame } from "../../game/store";
import * as vfs from "../../game/vfs";
import { tm, useT } from "../../i18n";
import { notify } from "../../os/toasts";
import { TitleBar, useWindow } from "../../os/Window";
import { useWindows } from "../../os/windowStore";
import { InfoBar } from "../../ui";
import { appDocument } from "./runtime";
import "./userApp.css";

/** Least time between two xea.notify toasts from one app. */
const NOTIFY_GAP_MS = 1500;

type Call = { __xea: 1; id: number; method: string; args: unknown[] };

/** Window body of an installed player app: a sandboxed iframe plus the host side of the xea API. */
export function UserAppHost() {
  const t = useT();
  const { win } = useWindow();
  const id = win.appId.slice("user.".length);
  const app = useGame((s) => s.game.apps.find((a) => a.id === id));
  const frame = useRef<HTMLIFrameElement>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastNotify = useRef(0);
  // Rebuild the page only when the code changes (an upgrade), not on storage writes.
  const source = app?.source;
  const doc = useMemo(() => (app ? appDocument(app) : ""), [source]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!frame.current || e.source !== frame.current.contentWindow) return;
      const d = e.data as Call;
      if (!d || d.__xea !== 1 || typeof d.method !== "string") return;
      const reply = (result: unknown, err?: string) =>
        frame.current?.contentWindow?.postMessage(err ? { __xea: 1, id: d.id, error: err } : { __xea: 1, id: d.id, result }, "*");
      try {
        const r = handle(id, d.method, Array.isArray(d.args) ? d.args : [], {
          setTitle: (s) => setTitle(s.slice(0, 80)),
          close: () => useWindows.getState().close(win.id),
          error: (s) => setError(s.split("\n")[0].slice(0, 300)),
          notify: (title, message) => {
            if (Date.now() - lastNotify.current < NOTIFY_GAP_MS) throw new Error("notify: too many notifications");
            lastNotify.current = Date.now();
            notify({ appId: win.appId, title: title.slice(0, 80), message: message.slice(0, 200) });
          },
        });
        if (d.id) reply(r);
      } catch (err) {
        if (d.id) reply(null, err instanceof Error ? err.message : String(err));
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [id, win.id, win.appId]);

  // Clicks inside the iframe never reach the window, so focus the window when the frame takes focus.
  useEffect(() => {
    const onBlur = () =>
      window.setTimeout(() => {
        if (document.activeElement === frame.current) useWindows.getState().focus(win.id);
      });
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, [win.id]);

  if (!app) {
    return (
      <>
        <TitleBar />
        <div className="uapp-missing">
          <InfoBar severity="warning" title={t("sdk.host.missingTitle")} message={t("sdk.host.missingMsg")} />
        </div>
      </>
    );
  }

  return (
    <>
      <TitleBar title={title ?? app.name} />
      <div className="uapp">
        <iframe ref={frame} className="uapp-frame" title={app.name} sandbox="allow-scripts" srcDoc={doc} onLoad={() => frame.current?.focus()} />
        {error && (
          <div className="uapp-error t-caption" onClick={() => setError(null)} title={t("sdk.host.dismiss")}>
            {t("sdk.host.error", { error })}
          </div>
        )}
      </div>
    </>
  );
}

interface HostUi {
  setTitle: (s: string) => void;
  close: () => void;
  error: (s: string) => void;
  notify: (title: string, message: string) => void;
}

const str = (v: unknown) => (typeof v === "string" ? v : String(v ?? ""));

/** One xea API call. Throws with a message the app sees as a rejected promise. */
function handle(id: string, method: string, args: unknown[], ui: HostUi): unknown {
  const app = getApp(id);
  if (!app) throw new Error("app is not installed");
  const store = useGame.getState();
  const path = (i = 0) => {
    const p = appPath(app, str(args[i]));
    if (!p) throw new Error("path leaves the app folder");
    return p;
  };
  const check = (r: { ok: true } | { ok: false; error: Parameters<typeof tm>[0] }) => {
    if (!r.ok) throw new Error(tm(r.error));
    return true;
  };
  switch (method) {
    case "window.setTitle":
      return ui.setTitle(str(args[0]));
    case "window.close":
      return ui.close();
    case "error":
      return ui.error(str(args[0]));
    case "log":
      return console.info(`[${app.name}]`, str(args[0]));
    case "notify":
      return ui.notify(str(args[0]), str(args[1]));
    case "player": {
      const g = store.game;
      return { name: g.player.name, level: g.player.level, balance: Math.floor(g.wallet.balance), heat: Math.round(g.heat) };
    }
    case "storage.get":
      return app.storage[str(args[0])] ?? null;
    case "storage.set":
      return check(storageSet(id, str(args[0]), str(args[1])));
    case "storage.remove":
      return check(storageSet(id, str(args[0]), null));
    case "storage.keys":
      return Object.keys(app.storage);
    case "fs.list": {
      const node = vfs.getNode(store.game.fs, path());
      if (!node || node.type !== "dir") throw new Error("not a folder");
      return vfs.list(store.game.fs, path()).map((n) => ({ name: n.name, type: n.type, size: vfs.sizeOf(n) }));
    }
    case "fs.read": {
      const node = vfs.getNode(store.game.fs, path());
      if (!node || node.type !== "file") throw new Error("file not found");
      return node.content ?? "";
    }
    case "fs.write": {
      const text = str(args[1]);
      if (text.length > MAX_DOWNLOAD_BYTES) throw new Error("file too large (1 MB max)");
      const p = path();
      store.mkdir(p.slice(0, p.lastIndexOf("/")));
      return check(store.writeFile(p, { size: Math.max(0.001, text.length / 1e6), content: text }));
    }
    case "fs.mkdir":
      return check(store.mkdir(path()));
    case "fs.remove":
      if (path() === `${app.dir}/data`) throw new Error("cannot remove the app folder");
      return check(store.remove(path()));
    case "fs.exists":
      return !!vfs.getNode(store.game.fs, path());
    default:
      throw new Error(`unknown method ${method}`);
  }
}
