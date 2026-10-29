import { msg, tm, type Msg } from "../../i18n";
import { emit } from "../events";
import { jobDuration } from "../jobs";
import { rigStats } from "../rig";
import { registerJobHandler, useGame } from "../store";
import type { Job } from "../types";
import * as vfs from "../vfs";
import { softItemForUrl } from "./catalog";
import { DOWNLOADS_DIR } from "./installed";
import { codeStats, compileMs, encodePackage, installerName, parseXjs, syntaxError } from "./xjs";

// Download (wget / curl / Xea Soft) and compile (IDE) jobs. Both run on the game clock like scan or pull,
// show in Task Manager and the Terminal, and write their file when they finish.

/** Real URLs: the largest file wget will fetch. */
export const MAX_DOWNLOAD_BYTES = 1024 * 1024;
/** Placeholder finish time while a real URL is still being fetched. */
const RESOLVING_MS = 10 * 60 * 1000;

export type StartResult = { ok: true; job: Job } | { ok: false; error: Msg };

const store = () => useGame.getState();

/** Download time: the payload is billed as if it shipped with assets so small files still take a moment. */
function downloadMs(chars: number): number {
  const sizeMB = Math.max(0.4, chars / 1e4);
  return Math.max(2500, jobDuration({ kind: "download", size: sizeMB }, rigStats(store().game.rig)));
}

/** Last path segment of a URL, cleaned up as a file name. */
function fileNameFor(url: string): string {
  let last = "";
  try {
    last = decodeURIComponent(new URL(url).pathname.split("/").filter(Boolean).pop() ?? "");
  } catch {
    last = url.split(/[?#]/)[0].split("/").filter(Boolean).pop() ?? "";
  }
  const clean = last.replace(/[<>:"|?*\\/]/g, "").trim();
  return clean || "download.xjs";
}

/** Fetch content for jobs still waiting on the network, keyed by job id. */
const pending = new Map<number, AbortController>();

/**
 * Start a download. In-game addresses (core://soft/dl/<file>) come from the Xea Soft catalog; http(s) URLs
 * are fetched for real (the host must allow CORS, e.g. raw.githubusercontent.com). The file lands in destDir.
 */
export function startDownload(url: string, destDir = DOWNLOADS_DIR): StartResult {
  const target = url.trim();
  const item = softItemForUrl(target);
  if (item === undefined) return { ok: false, error: msg("sdk.err.404", { url: target }) };
  if (item) {
    if (item.price > 0 && !store().game.software.includes(item.id)) return { ok: false, error: msg("sdk.err.402", { url: target }) };
    const job = store().startTimedJob("download", { target, payload: { url: target, dest: destDir, name: item.file, content: item.source } }, downloadMs(item.source.length));
    return { ok: true, job };
  }
  if (!/^https?:\/\//i.test(target)) return { ok: false, error: msg("sdk.err.badUrl", { url: target }) };

  const name = fileNameFor(target);
  const job = store().startTimedJob("download", { target, payload: { url: target, dest: destDir, name } }, RESOLVING_MS);
  const ctl = new AbortController();
  pending.set(job.id, ctl);
  const failJob = (error: Msg) => {
    pending.delete(job.id);
    if (!store().game.jobs.some((j) => j.id === job.id)) return;
    store().killJob(job.id);
    emit({ type: "jobComplete", job, outcome: { kind: "download", url: target, ok: false, error } });
  };
  fetch(target, { signal: ctl.signal, credentials: "omit", referrerPolicy: "no-referrer" })
    .then(async (res) => {
      if (!res.ok) return failJob(msg("sdk.err.http", { status: res.status }));
      const len = Number(res.headers.get("content-length") ?? 0);
      if (len > MAX_DOWNLOAD_BYTES) return failJob(msg("sdk.err.tooBig"));
      const text = await res.text();
      if (text.length > MAX_DOWNLOAD_BYTES) return failJob(msg("sdk.err.tooBig"));
      pending.delete(job.id);
      const live = store().game.jobs.find((j) => j.id === job.id);
      if (!live) return; // killed with Ctrl+C meanwhile
      useGame.setState((s) => ({
        game: { ...s.game, jobs: s.game.jobs.map((j) => (j.id === job.id ? { ...j, payload: { ...j.payload!, content: text } } : j)) },
      }));
      store().retimeJob(job.id, downloadMs(text.length));
    })
    .catch((e: unknown) => {
      if ((e as Error)?.name === "AbortError") return;
      failJob(msg("sdk.err.network"));
    });
  return { ok: true, job };
}

registerJobHandler("download", (job) => {
  const p = job.payload ?? {};
  const url = p.url ?? job.target ?? "";
  pending.get(job.id)?.abort();
  pending.delete(job.id);
  if (p.content === undefined) return { kind: "download", url, ok: false, error: msg("sdk.err.network") };
  const dest = p.dest || DOWNLOADS_DIR;
  store().mkdir(dest);
  const dir = vfs.getNode(store().game.fs, dest);
  let name = p.name || "download.xjs";
  if (dir?.type === "dir" && dir.children[name]) name = vfs.copyName(dir, name);
  const size = Math.max(0.001, p.content.length / 1e6);
  const r = store().writeFile(`${dest}/${name}`, { size, content: p.content });
  if (!r.ok) return { kind: "download", url, ok: false, error: r.error };
  return { kind: "download", url, ok: true, dest: `${dest}/${name}`, size };
});

// ---- compile ----

export type CompileStart = { ok: true; job: Job; ms: number } | { ok: false; error: string; line?: number };

/** Start compiling an .xjs file. Header problems fail at once; a syntax error fails part-way through. */
export function startCompile(path: string, source?: string): CompileStart {
  const node = vfs.getNode(store().game.fs, path);
  const text = source ?? (node?.type === "file" ? node.content ?? "" : null);
  if (text === null) return { ok: false, error: `File not found: ${path}` };
  const parsed = parseXjs(text);
  if (!parsed.ok) return parsed;
  const running = store().game.jobs.find((j) => j.kind === "compile" && j.payload?.src === path);
  if (running) return { ok: true, job: running, ms: running.endsAt - Date.now() };
  const stats = codeStats(parsed.app.code);
  const full = compileMs(stats, rigStats(store().game.rig).cpu);
  const error = syntaxError(parsed.app.code);
  const ms = error ? Math.max(1500, Math.round(full * 0.35)) : full;
  const folder = path.slice(0, path.lastIndexOf("/"));
  const out = `${folder}/${installerName(parsed.app.manifest.id)}`;
  const name = path.slice(path.lastIndexOf("/") + 1);
  const job = store().startTimedJob("compile", { target: name, payload: { src: path, out, source: text, ...(error ? { error } : {}) } }, ms);
  return { ok: true, job, ms };
}

registerJobHandler("compile", (job) => {
  const p = job.payload ?? {};
  const src = p.src ?? "";
  if (p.error) return { kind: "compile", src, ok: false, error: p.error };
  const parsed = parseXjs(p.source ?? "");
  if (!parsed.ok) return { kind: "compile", src, ok: false, error: parsed.error };
  const content = encodePackage({ manifest: parsed.app.manifest, source: p.source!, builtAt: Date.now() });
  const r = store().writeFile(p.out!, { size: Math.max(0.05, content.length / 1e6), content });
  if (!r.ok) return { kind: "compile", src, ok: false, error: tm(r.error) };
  return { kind: "compile", src, ok: true, dest: p.out };
});
