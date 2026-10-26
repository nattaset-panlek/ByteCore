import { connect, cmd, close } from "./client.mjs";
import { build, stats } from "./dsl.mjs";
import fs from "node:fs";

const STATE = new URL("./state.json", import.meta.url);
export const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, "utf8")) : {};
export const save = () => fs.writeFileSync(STATE, JSON.stringify(state, null, 1));

// items: [{ key, node }] laid out left→right in columns of maxW, wrapping rows.
export async function runSection({ name, x, y, items, gap = 80, rowWidth = 4000, pad = 100 }) {
  await connect();
  const t0 = Date.now();
  if (state[name]?.section) {
    try { await cmd("delete_node", { nodeId: state[name].section }); } catch {}
  }
  const ids = {};
  let cx = x + pad, cy = y + pad + 40, rowH = 0, maxX = 0;
  for (const it of items) {
    const id = await build({ ...it.node, p: { ...it.node.p, x: cx, y: cy } });
    const info = await cmd("get_node_info", { nodeId: id });
    const bb = info.absoluteBoundingBox || { width: info.width, height: info.height };
    ids[it.key] = id;
    rowH = Math.max(rowH, bb.height);
    maxX = Math.max(maxX, cx + bb.width);
    cx += bb.width + gap;
    if (it.br || cx - x > rowWidth) { cx = x + pad; cy += rowH + gap; rowH = 0; }
    console.log("built", it.key, id, Math.round(bb.width), "x", Math.round(bb.height));
  }
  const bottom = cy + rowH + pad;
  const sec = await cmd("create_section", { x, y, width: maxX - x + pad, height: bottom - y, name });
  for (const id of Object.values(ids)) await cmd("set_parent", { nodeId: id, parentId: sec.id });
  state[name] = { section: sec.id, ids, bounds: { x, y, w: maxX - x + pad, h: bottom - y } };
  save();
  console.log(`section ${name} ${sec.id} cmds=${stats.cmds} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  close();
}
