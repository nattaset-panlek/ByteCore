// Real Figma components through Talk To Figma only.
// The plugin has no "create component" command, but clone_node on an existing COMPONENT_SET / COMPONENT
// creates a new one. We clone a seed set, move it into our section, then replace its content.
import fs from "node:fs";
import { cmd, build, rgba, stats } from "./kit.mjs";

const SEED_SET = "1:8103"; // MapLab UI / Toggle (2 plain variants), never modified, only cloned
const REG = new URL("components.json", import.meta.url);
export const reg = fs.existsSync(REG) ? JSON.parse(fs.readFileSync(REG, "utf8")) : {};
export const saveReg = () => fs.writeFileSync(REG, JSON.stringify(reg, null, 1));

const kids = async (id) => (await cmd("get_node_info", { nodeId: id })).children || [];

// Turn an existing component node into a clean container and build `node` inside it.
async function fillComponent(compId, node, name) {
  const old = await kids(compId);
  if (old.length) await cmd("delete_multiple_nodes", { nodeIds: old.map((c) => c.id) });
  await cmd("rename_node", { nodeId: compId, name });
  await cmd("set_fill_color", { nodeId: compId, color: rgba("#000000", 0) });
  await cmd("set_stroke_color", { nodeId: compId, color: rgba("#000000", 0), weight: 0 });
  await cmd("set_corner_radius", { nodeId: compId, radius: 0 });
  await cmd("set_layout_mode", { nodeId: compId, layoutMode: "VERTICAL" });
  await cmd("set_padding", { nodeId: compId, paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0 });
  await cmd("set_item_spacing", { nodeId: compId, itemSpacing: 0 });
  const content = await build({ ...node, p: { ...node.p, name: "content" } }, compId);
  const bb = (await cmd("get_node_info", { nodeId: content })).absoluteBoundingBox;
  await cmd("resize_node", { nodeId: compId, width: Math.ceil(bb.width), height: Math.ceil(bb.height) });
  if (node.t === "F" && node.p.dir) await cmd("set_layout_sizing", { nodeId: content, layoutSizingHorizontal: "FILL", layoutSizingVertical: "FILL" });
  return { w: Math.ceil(bb.width), h: Math.ceil(bb.height) };
}

// Component set with variants. variants: [{ name: "Style=Accent, State=Rest", node }]
export async function makeSet(name, variants, parentId, x, y, o = {}) {
  const t0 = Date.now();
  if (reg[name]?.set) { try { await cmd("delete_node", { nodeId: reg[name].set }); } catch {} }
  const set = await cmd("clone_node", { nodeId: SEED_SET });
  await cmd("set_parent", { nodeId: set.id, parentId, x, y });
  let ids = (await kids(set.id)).map((c) => c.id);
  while (ids.length < variants.length) ids.push((await cmd("clone_node", { nodeId: ids[0] })).id);
  if (ids.length > variants.length) { await cmd("delete_multiple_nodes", { nodeIds: ids.slice(variants.length) }); ids = ids.slice(0, variants.length); }
  // lay out the set first so variants never overlap
  const W = o.width || 1000;
  await cmd("set_layout_mode", { nodeId: set.id, layoutMode: "HORIZONTAL", layoutWrap: "WRAP" });
  await cmd("set_padding", { nodeId: set.id, paddingTop: 24, paddingBottom: 24, paddingLeft: 24, paddingRight: 24 });
  await cmd("set_item_spacing", { nodeId: set.id, itemSpacing: o.gap ?? 16, counterAxisSpacing: o.gap ?? 16 });
  await cmd("set_axis_align", { nodeId: set.id, primaryAxisAlignItems: "MIN", counterAxisAlignItems: "MIN" });
  await cmd("set_fill_color", { nodeId: set.id, color: rgba("#202020") });
  await cmd("set_stroke_color", { nodeId: set.id, color: rgba("#9747FF", 0.6), weight: 1 });
  await cmd("set_corner_radius", { nodeId: set.id, radius: 8 });
  await cmd("resize_node", { nodeId: set.id, width: W, height: 4000 });
  const out = {}, sizes = [];
  for (let i = 0; i < variants.length; i++) {
    sizes.push(await fillComponent(ids[i], variants[i].node, variants[i].name));
    out[variants[i].name] = ids[i];
  }
  await cmd("rename_node", { nodeId: set.id, name });
  // height = wrapped rows of variants (same rule as auto-layout wrap)
  const gap = o.gap ?? 16, inner = W - 48;
  let cx = 0, rowH = 0, total = 0;
  for (const sz of sizes) {
    if (cx > 0 && cx + sz.w > inner) { total += rowH + gap; cx = 0; rowH = 0; }
    cx += sz.w + gap; rowH = Math.max(rowH, sz.h);
  }
  total += rowH;
  await cmd("resize_node", { nodeId: set.id, width: W, height: Math.ceil(total + 48) });
  reg[name] = { set: set.id, variants: out };
  saveReg();
  console.log(`  set ${name} ${set.id} ${variants.length} variants ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  return set.id;
}

// Single component (no variants): clone the seed set, move one variant out, drop the rest.
export async function makeSingle(name, node, parentId, x, y) {
  if (reg[name]?.comp) { try { await cmd("delete_node", { nodeId: reg[name].comp }); } catch {} }
  const set = await cmd("clone_node", { nodeId: SEED_SET });
  const [first] = await kids(set.id);
  await cmd("set_parent", { nodeId: first.id, parentId, x, y });
  await cmd("delete_node", { nodeId: set.id });
  await fillComponent(first.id, node, name);
  reg[name] = { comp: first.id };
  saveReg();
  console.log(`  component ${name} ${first.id}`);
  return first.id;
}

export function componentId(name, variant) {
  const r = reg[name];
  if (!r) throw new Error("no component " + name);
  if (r.comp) return r.comp;
  if (!variant) return Object.values(r.variants)[0];
  const want = typeof variant === "string" ? variant : Object.entries(variant).map(([k, v]) => `${k}=${v}`).join(", ");
  if (r.variants[want]) return r.variants[want];
  // tolerate partial variant spec: match all given pairs
  const pairs = want.split(", ");
  const hit = Object.entries(r.variants).find(([n]) => pairs.every((p) => n.split(", ").includes(p)));
  if (!hit) throw new Error(`no variant ${want} in ${name}`);
  return hit[1];
}
