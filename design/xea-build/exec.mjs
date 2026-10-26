// Run Plugin API scripts through the Xea Bridge dev plugin (channel "xea").
// Usage: bun exec.mjs <script.js> [more.js ...]   Each script body may use `figma` and top-level await; `return` sends a result.
import fs from "node:fs";
import path from "node:path";

process.env.TTF_CHANNEL = "xea";
const { connect, cmd, close } = await import("../figma-tool/client.mjs");

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"));
const prelude = fs.readFileSync(path.join(here, "prelude.js"), "utf8");

await connect();
for (const f of process.argv.slice(2)) {
  const body = fs.readFileSync(f, "utf8");
  const t0 = Date.now();
  try {
    const r = await cmd("exec", { code: prelude + "\n" + body }, 600000);
    const s = JSON.stringify(r);
    console.log(`[ok] ${path.basename(f)} ${((Date.now() - t0) / 1000).toFixed(1)}s ${s.length > 3000 ? s.slice(0, 3000) + "..." : s}`);
  } catch (e) {
    console.log(`[error] ${path.basename(f)}: ${e.message}`);
    process.exitCode = 1;
    break;
  }
}
close();
