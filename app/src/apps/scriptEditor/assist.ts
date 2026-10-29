// Code-branch skills in the IDE (docs/gameplay-ideas.md §7): Autocomplete, Snippets, Error lens.

export interface Completion {
  /** Text inserted after the dot, e.g. "net.crack(" */
  insert: string;
  label: string;
  sig: string;
  ret: string;
}

/** The ByteCore SDK (mirrors game/scripting/worker.ts). */
const API: Completion[] = [
  { insert: "player()", label: "player()", sig: "player(): Promise<{ level, xp, balance, heat, stats }>", ret: "→ Player" },
  { insert: "net.scan()", label: "net.scan()", sig: "net.scan(): Promise<Host[]>", ret: "→ Host[]" },
  { insert: "net.targets()", label: "net.targets()", sig: "net.targets(): Promise<Host[]>", ret: "→ Host[]" },
  { insert: "net.probe(", label: "net.probe(ip)", sig: "net.probe(ip: string): Promise<Host>", ret: "→ Host" },
  { insert: "net.crack(", label: "net.crack(ip)", sig: "net.crack(ip: string): Promise<{ ok: boolean }>", ret: "→ { ok }" },
  { insert: "connect(", label: "connect(ip)", sig: "connect(ip: string): Promise<true>", ret: "→ session" },
  { insert: "disconnect()", label: "disconnect()", sig: "disconnect(): Promise<true>", ret: "" },
  { insert: "pull(", label: "pull(path, dir?)", sig: "pull(remotePath: string, destDir?: string): Promise<{ dest, size }>", ret: "→ { dest, size }" },
  { insert: "fs.ls(", label: "fs.ls(path)", sig: "fs.ls(path: string): Promise<{ name, type, size }[]>", ret: "→ Entry[]" },
  { insert: "fs.read(", label: "fs.read(path)", sig: "fs.read(path: string): Promise<string>", ret: "→ string" },
  { insert: "fs.write(", label: "fs.write(path, text)", sig: "fs.write(path: string, content: string): Promise<true>", ret: "" },
  { insert: "loot()", label: "loot()", sig: "loot(): Promise<{ path, value, tier, sold }[]>", ret: "→ Loot[]" },
  { insert: "sellData(", label: "sellData(paths)", sig: "sellData(paths: string[]): Promise<true>", ret: "" },
  { insert: "scrubHeat()", label: "scrubHeat()", sig: "scrubHeat(): Promise<true>", ret: "" },
  { insert: "sleep(", label: "sleep(ms)", sig: "sleep(ms: number): Promise<void>  (max 60 s)", ret: "" },
  { insert: "logger.info(", label: "logger.info(...)", sig: "logger.info(...values): void", ret: "" },
  { insert: "logger.warn(", label: "logger.warn(...)", sig: "logger.warn(...values): void", ret: "" },
  { insert: "log(", label: "log(...)", sig: "log(...values): void", ret: "" },
];

/** Completions at the caret: after `ByteCore.` (and, at rank 3, the script's own functions). */
export function completionsAt(code: string, caret: number, rank: number): { from: number; items: Completion[] } | null {
  if (rank <= 0) return null;
  const before = code.slice(0, caret);
  const m = /ByteCore\.([A-Za-z.]*)$/.exec(before);
  if (m) {
    const typed = m[1];
    const items = API.filter((a) => a.insert.startsWith(typed) && a.insert !== typed).slice(0, 8);
    return items.length ? { from: caret - typed.length, items } : null;
  }
  if (rank >= 3) {
    const w = /(?:^|[^\w.])([A-Za-z_]\w{1,})$/.exec(before);
    if (!w) return null;
    const own = [...code.matchAll(/(?:function\s+|const\s+|let\s+)([A-Za-z_]\w*)\s*(?:=\s*(?:async\s*)?\(|\()/g)].map((x) => x[1]);
    const items = [...new Set(own)]
      .filter((n) => n.startsWith(w[1]) && n !== w[1])
      .slice(0, 6)
      .map((n) => ({ insert: `${n}(`, label: `${n}()`, sig: `${n}(...) · your function`, ret: "" }));
    return items.length ? { from: caret - w[1].length, items } : null;
  }
  return null;
}

/** Ready-made blocks; each Snippets rank adds one. */
export const SNIPPETS: { id: string; code: string }[] = [
  {
    id: "scanLoop",
    code: `const hosts = await ByteCore.net.scan();
for (const h of hosts) {
  await ByteCore.net.probe(h.ip);
  const r = await ByteCore.net.crack(h.ip);
  ByteCore.logger.info(h.ip, r.ok ? "cracked" : "failed");
}
`,
  },
  {
    id: "safePull",
    code: `try {
  await ByteCore.connect(ip);
  const files = await ByteCore.fs.ls("/var/data");
  for (const f of files) await ByteCore.pull("/var/data/" + f.name);
} catch (e) {
  ByteCore.logger.warn("pull stopped:", e.message);
} finally {
  await ByteCore.disconnect();
}
`,
  },
  {
    id: "heatWait",
    code: `let me = await ByteCore.player();
while (me.heat > 20) {
  ByteCore.logger.info("heat", me.heat, "- waiting");
  await ByteCore.sleep(20000);
  me = await ByteCore.player();
}
`,
  },
];

/** Syntax error line: the shortest prefix that fails with something other than "unexpected end". */
export function errorLine(code: string, compile: (src: string) => void): number | null {
  try {
    compile(code);
    return null;
  } catch {
    /* find it below */
  }
  const lines = code.split("\n");
  for (let n = 1; n <= lines.length; n++) {
    const prefix = lines.slice(0, n).join("\n");
    try {
      compile(prefix);
    } catch (e) {
      const m = (e as Error).message.toLowerCase();
      if (!m.includes("end of input") && !m.includes("unterminated") && !m.includes("missing }")) return n;
    }
  }
  return lines.length;
}

/** A plain-words fix hint for common syntax errors (Error lens). */
export function fixHint(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("await is only valid") || m.includes("await")) return "lens.await";
  if (m.includes("unexpected end") || m.includes("missing }")) return "lens.brace";
  if (m.includes("unexpected string") || m.includes("unexpected identifier")) return "lens.comma";
  if (m.includes("unexpected token ')'") || m.includes("unexpected token '}'")) return "lens.extra";
  if (m.includes("invalid or unexpected token")) return "lens.quote";
  return "lens.generic";
}
