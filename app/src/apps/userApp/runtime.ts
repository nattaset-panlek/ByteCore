import type { InstalledApp } from "../../game/types";
import { parseXjs } from "../../game/appsdk/xjs";

// The page a player app runs in: a sandboxed iframe (allow-scripts only, so an opaque origin with no
// access to the game) that talks to the host through postMessage. docs/app-sdk.md documents `xea`.

/** Fluent-dark base styles so a bare app already looks like Xea OS. */
const BASE_CSS = `
:root { color-scheme: dark; --accent: #60cdff; --text: #fff; --text-2: #c5c5c5; --text-3: #9d9d9d; --bg: #202020; --card: #2b2b2b; --stroke: #ffffff15; --control: #2d2d2d; --control-hover: #323232; --success: #6ccb5f; --caution: #fce100; --critical: #ff99a4; }
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; }
body { background: var(--bg); color: var(--text); font: 400 14px/20px "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif; overflow: auto; user-select: none; }
#app { min-height: 100%; }
h1 { font: 600 28px/36px "Segoe UI Variable Display", "Segoe UI", sans-serif; margin: 0 0 8px; }
h2 { font: 600 20px/28px "Segoe UI Variable Display", "Segoe UI", sans-serif; margin: 0 0 8px; }
.xea-btn { font: inherit; color: var(--text); background: var(--control); border: 1px solid #ffffff12; border-bottom-color: #ffffff1f; border-radius: 4px; padding: 5px 12px; cursor: default; }
.xea-btn:hover { background: var(--control-hover); }
.xea-btn:active { background: #272727; color: var(--text-2); }
.xea-btn.accent { background: var(--accent); color: #000; border-color: transparent; }
.xea-btn.accent:hover { background: #5ab9e6; }
.xea-btn:disabled { opacity: .45; }
.xea-input { font: inherit; color: var(--text); background: #ffffff0f; border: 1px solid #ffffff12; border-bottom: 1px solid #ffffff8a; border-radius: 4px; padding: 5px 10px; outline: none; }
.xea-input:focus { background: #1f1f1f; border-bottom: 2px solid var(--accent); }
.xea-card { background: var(--card); border: 1px solid #0000001a; border-radius: 8px; padding: 16px; }
.xea-muted { color: var(--text-2); }
::-webkit-scrollbar { width: 8px; height: 8px; } ::-webkit-scrollbar-thumb { background: #ffffff3d; border-radius: 4px; }
`;

/** Runs inside the iframe before the app code: defines window.xea. */
const RUNTIME = String.raw`
(() => {
  const pending = new Map();
  const handlers = {};
  let seq = 0;
  const call = (method, ...args) => new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    parent.postMessage({ __xea: 1, id, method, args }, "*");
  });
  addEventListener("message", (e) => {
    const d = e.data;
    if (e.source !== parent || !d || d.__xea !== 1) return;
    if (d.event) { (handlers[d.event] || []).forEach((fn) => { try { fn(d.data); } catch (err) { report(err); } }); return; }
    const p = pending.get(d.id);
    if (!p) return;
    pending.delete(d.id);
    d.error ? p.reject(new Error(d.error)) : p.resolve(d.result);
  });
  const report = (err) => parent.postMessage({ __xea: 1, id: 0, method: "error", args: [String(err && err.stack || err)] }, "*");
  addEventListener("error", (e) => report(e.error || e.message));
  addEventListener("unhandledrejection", (e) => report(e.reason));
  const xea = {
    app: __APP__,
    window: {
      setTitle: (title) => call("window.setTitle", String(title)),
      close: () => call("window.close"),
    },
    storage: {
      get: async (key, fallback = null) => { const v = await call("storage.get", String(key)); return v == null ? fallback : JSON.parse(v); },
      set: (key, value) => call("storage.set", String(key), JSON.stringify(value === undefined ? null : value)),
      remove: (key) => call("storage.remove", String(key)),
      keys: () => call("storage.keys"),
    },
    fs: {
      list: (path = "") => call("fs.list", String(path)),
      read: (path) => call("fs.read", String(path)),
      write: (path, text) => call("fs.write", String(path), String(text)),
      remove: (path) => call("fs.remove", String(path)),
      mkdir: (path) => call("fs.mkdir", String(path)),
      exists: (path) => call("fs.exists", String(path)),
    },
    notify: (title, message = "") => call("notify", String(title), String(message)),
    player: () => call("player"),
    log: (...parts) => call("log", parts.map((p) => typeof p === "string" ? p : JSON.stringify(p)).join(" ")),
    on: (event, fn) => { (handlers[event] = handlers[event] || []).push(fn); },
    style: (css) => { const s = document.createElement("style"); s.textContent = String(css); document.head.append(s); return s; },
    el: (tag, props = {}, ...children) => {
      const node = document.createElement(tag);
      for (const [k, v] of Object.entries(props || {})) {
        if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === "style" && typeof v === "object") Object.assign(node.style, v);
        else if (k in node) node[k] = v;
        else node.setAttribute(k, v);
      }
      node.append(...children.flat().filter((c) => c != null && c !== false));
      return node;
    },
  };
  Object.freeze(xea.window); Object.freeze(xea.storage); Object.freeze(xea.fs);
  window.xea = Object.freeze(xea);
})();
`;

/** Keep app code from closing the inline <script> early. */
const scriptSafe = (s: string) => s.replace(/<\/(script)/gi, "<\\/$1").replace(/<!--/g, "<\\!--");

export function appDocument(app: InstalledApp): string {
  const parsed = parseXjs(app.source);
  const code = parsed.ok ? parsed.app.code : `throw new Error(${JSON.stringify(parsed.ok ? "" : parsed.error)});`;
  const info = JSON.stringify({ id: app.id, name: app.name, version: app.version, author: app.author });
  return `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}</style>
<script>${scriptSafe(RUNTIME.replace("__APP__", info))}</script></head>
<body><div id="app"></div><script>
"use strict";
(async (xea) => {
${scriptSafe(code)}
})(window.xea).catch((e) => { throw e; });
</script></body></html>`;
}
