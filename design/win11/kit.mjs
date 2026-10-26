// Xea OS Windows 11 build kit for the Talk To Figma plugin.
// Declarative layout tree -> plugin commands over the local socket (see ../figma-tool/client.mjs).
import fs from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import { connect, cmd, close } from "../figma-tool/client.mjs";
import { APPS, FILES } from "./assets.mjs";

const here = new URL(".", import.meta.url);
const FL20 = JSON.parse(fs.readFileSync(new URL("assets/fluent20.json", here), "utf8"));

// ---- tokens (same values as the "ByteCore Color" variables, Windows 11 dark) ----
export const K = {
  "bg/solid-base": ["#202020"], "bg/solid-secondary": ["#1C1C1C"], "bg/solid-tertiary": ["#282828"], "bg/layer": ["#272727"],
  "bg/card": ["#2B2B2B"], "bg/card-secondary": ["#262626"], "bg/flyout": ["#2C2C2C"], "bg/taskbar": ["#1C1C1C"], "bg/smoke": ["#000000", 0.3],
  "bg/mica": ["#1F1F1F"], "transparent": ["#000000", 0],
  "control/default": ["#2D2D2D"], "control/hover": ["#323232"], "control/pressed": ["#272727"], "control/disabled": ["#2A2A2A"], "control/input-active": ["#1F1F1F"],
  "subtle/hover": ["#FFFFFF", 0.06], "subtle/pressed": ["#FFFFFF", 0.04], "subtle/selected": ["#FFFFFF", 0.06],
  "control/strong": ["#FFFFFF", 0.54],
  "stroke/control": ["#FFFFFF", 0.07], "stroke/control-strong": ["#FFFFFF", 0.54], "stroke/card": ["#000000", 0.1], "stroke/divider": ["#FFFFFF", 0.084], "stroke/surface": ["#757575", 0.4],
  "text/primary": ["#FFFFFF"], "text/secondary": ["#C5C5C5"], "text/tertiary": ["#9D9D9D"], "text/disabled": ["#5D5D5D"], "text/on-accent": ["#000000"],
  "accent/default": ["#60CDFF"], "accent/hover": ["#5AB9E6"], "accent/pressed": ["#53A5CC"], "accent/disabled": ["#FFFFFF", 0.16], "accent/text": ["#99EBFF"],
  "system/success": ["#6CCB5F"], "system/caution": ["#FCE100"], "system/critical": ["#FF99A4"], "system/neutral": ["#9D9D9D"],
  "system/success-bg": ["#393D1B"], "system/caution-bg": ["#433519"], "system/critical-bg": ["#442726"], "system/attention-bg": ["#2B2B2B"],
  "shell/close-hover": ["#C42B1C"],
  "terminal/bg": ["#0C0C0C"], "terminal/text": ["#CCCCCC"], "terminal/blue": ["#3B78FF"], "terminal/green": ["#16C60C"], "terminal/red": ["#E74856"], "terminal/yellow": ["#F9F1A5"],
  "rarity/common": ["#C5C5C5"], "rarity/rare": ["#60CDFF"], "rarity/epic": ["#D3A6FF"], "rarity/legendary": ["#FFB900"],
};
const hexOf = (c) => (K[c] ? K[c][0] : c);
export function rgba(c, aOverride) {
  const [hex, a0 = 1] = K[c] || [c, 1];
  const a = aOverride ?? a0;
  const h = hex.replace("#", "");
  return { r: parseInt(h.slice(0, 2), 16) / 255, g: parseInt(h.slice(2, 4), 16) / 255, b: parseInt(h.slice(4, 6), 16) / 255, a: a <= 0 ? 0.001 : a };
}

// Windows type ramp (Inter stands in for Segoe UI Variable)
export const TYPE = { Caption: [12, 400], Body: [14, 400], BodyStrong: [14, 600], BodyLarge: [18, 400], Subtitle: [20, 600], Title: [28, 600], TitleLarge: [40, 600], Display: [68, 600] };

// ---- tree constructors ----
export const F = (p = {}, ...c) => ({ t: "F", p, c: c.flat(9).filter(Boolean) });
export const H = (p, ...c) => F({ dir: "H", cross: "CENTER", ...p }, ...c);
export const V = (p, ...c) => F({ dir: "V", ...p }, ...c);
export const T = (text, style = "Body", color = "text/primary", p = {}) => ({ t: "T", text: String(text), style, color, p });
export const IMG = (svg, w, h, p = {}) => ({ t: "IMG", svg, w, h, p });
export const Icon = (name, size = 16, color = "text/primary") => {
  if (!FL20[name]) throw new Error("no fluent icon " + name);
  return IMG(`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><path d="${FL20[name]}" fill="${hexOf(color)}" fill-opacity="${(K[color] || [0, 1])[1] ?? 1}"/></svg>`, size, size, { name: "icon/" + name });
};
export const App = (name, size = 24) => IMG(APPS[name], size, size, { name: "app/" + name });
export const File = (name, size = 48) => IMG(FILES[name], size, size, { name: "file/" + name });
export const Spacer = () => H({ name: "spacer", fillW: true, h: 1 });
// Instance of a registered component. o: { variant, text: {layer: "value"}, icon: "name" | {index: name}, app, file, w, fillW, name }
export const INST = (name, o = {}) => ({ t: "INST", name, o, p: { name: o.name, w: o.w, fillW: o.fillW, fillH: o.fillH, x: o.x, y: o.y } });
let resolver = null;
export const setResolver = (fn) => { resolver = fn; };
export const Div = (o = {}) => V({ name: "divider", fillW: !o.vertical, w: o.vertical ? 1 : undefined, h: o.vertical ? o.h || 20 : 1, fill: "stroke/divider" });

// ---- builder ----
const pngCache = new Map();
function png(svg, w) {
  const k = w + svg;
  if (!pngCache.has(k)) pngCache.set(k, Buffer.from(new Resvg(svg, { fitTo: { mode: "width", value: Math.min(4096, Math.round(w)) } }).render().asPng()).toString("base64"));
  return pngCache.get(k);
}
export const stats = { cmds: 0 };
const c = (n, p) => { stats.cmds++; return cmd(n, p); };
function pads(v) { const a = Array.isArray(v) ? v : [v ?? 0]; const [t, r = t, b = t, l = r] = a; return { paddingTop: t, paddingRight: r, paddingBottom: b, paddingLeft: l }; }

async function buildInstance(node, parentId) {
  const p = node.p || {}, o = node.o;
  const r = await c("create_component_instance", { componentId: resolver(node.name, o.variant), x: p.x || 0, y: p.y || 0, parentId });
  const tree = await c("get_node_info", { nodeId: r.id });
  const all = [];
  const walk = (n) => { for (const ch of n.children || []) { all.push(ch); walk(ch); } };
  walk(tree);
  const byName = (name, type) => all.filter((n) => n.name === name && (!type || n.type === type));
  // text: { layer: "value" } or { layer: ["first match", "second match"] }
  let grow = 0; // width change of direct text, so hug-like instances fit their new text
  for (const [layer, val] of Object.entries(o.text || {})) {
    const hits = byName(layer, "TEXT");
    const vals = Array.isArray(val) ? val : [val];
    if (hits.length < vals.length) throw new Error(`text layer ${layer} x${vals.length} not in ${node.name}`);
    for (let i = 0; i < vals.length; i++) {
      if (vals[i] === null || vals[i] === undefined) continue;
      await c("set_text_content", { nodeId: hits[i].id, text: String(vals[i]) || " " });
      if (vals.length === 1) {
        const after = await c("get_node_info", { nodeId: hits[i].id });
        grow = Math.max(grow, after.absoluteBoundingBox.width - hits[i].absoluteBoundingBox.width) || grow;
        if (Object.keys(o.text).length === 1) grow = after.absoluteBoundingBox.width - hits[i].absoluteBoundingBox.width;
      }
    }
  }
  // colors: { layer: token } recolors text or frame fills (first match)
  for (const [layer, tok] of Object.entries(o.colors || {})) {
    for (const h of byName(layer)) await c("set_fill_color", { nodeId: h.id, color: rgba(tok) });
  }
  if (o.bg) { const ct = byName("content")[0] || tree; await c("set_fill_color", { nodeId: ct.id, color: rgba(o.bg) }); }
  if (o.stroke) { const ct = byName("content")[0] || tree; await c("set_stroke_color", { nodeId: ct.id, color: rgba(o.stroke), weight: 1 }); }
  const swap = async (prefix, spec, mk) => {
    if (!spec) return;
    const layers = all.filter((n) => n.name.startsWith(prefix));
    const map = typeof spec === "string" ? { 0: spec } : spec;
    for (const [i, nm] of Object.entries(map)) {
      const L = layers[Number(i)];
      if (!L) throw new Error(`no ${prefix} layer ${i} in ${node.name}`);
      const img = mk(nm, L.absoluteBoundingBox.width);
      await c("set_image_fill", { nodeId: L.id, imageBase64: png(img.svg, L.absoluteBoundingBox.width * 3), scaleMode: "FILL" });
    }
  };
  await swap("icon/", o.icon, (nm, w) => Icon(nm, w, o.iconColor || "text/primary"));
  await swap("app/", o.app, (nm, w) => (nm.startsWith("file:") ? File(nm.slice(5), w) : App(nm, w)));
  await swap("file/", o.file, (nm, w) => (nm.startsWith("app:") ? App(nm.slice(4), w) : File(nm, w)));
  const hug = !p.w && !p.fillW && Math.abs(grow) > 0.5;
  if (p.w || o.h || hug) await c("resize_node", { nodeId: r.id, width: p.w || Math.ceil(tree.absoluteBoundingBox.width + (hug ? grow : 0)), height: o.h || tree.absoluteBoundingBox.height });
  if (p.name) await c("rename_node", { nodeId: r.id, name: p.name });
  return r.id;
}

export async function build(node, parentId) {
  const p = node.p || {};
  if (node.t === "INST") return buildInstance(node, parentId);
  if (node.t === "T") {
    const [size, weight] = TYPE[node.style] || TYPE.Body;
    const r = await c("create_text", { text: node.text, fontSize: p.size || size, fontWeight: p.weight || weight, fontColor: rgba(node.color), name: p.name || node.text.slice(0, 40), parentId, x: p.x || 0, y: p.y || 0 });
    return r.id;
  }
  if (node.t === "IMG") {
    const r = await c("create_frame", { name: p.name || "image", width: node.w, height: node.h, x: p.x || 0, y: p.y || 0, parentId, fillColor: rgba("#000000", 0) });
    await c("set_image_fill", { nodeId: r.id, imageBase64: png(node.svg, Math.max(node.w, node.h) * (p.scale || 3)), scaleMode: p.scaleMode || "FILL" });
    if (p.r) await c("set_corner_radius", { nodeId: r.id, radius: p.r });
    return r.id;
  }
  const auto = p.dir === "H" ? "HORIZONTAL" : p.dir === "V" ? "VERTICAL" : "NONE";
  const params = {
    name: p.name || "frame", x: p.x || 0, y: p.y || 0, width: p.w || 10, height: p.h || 10, parentId,
    fillColor: p.fill ? rgba(p.fill, p.fa) : rgba("#000000", 0), layoutMode: auto, layoutWrap: p.wrap ? "WRAP" : "NO_WRAP", ...pads(p.pad),
    primaryAxisAlignItems: p.main || "MIN", counterAxisAlignItems: p.cross || "MIN",
    layoutSizingHorizontal: p.w ? "FIXED" : "HUG", layoutSizingVertical: p.h ? "FIXED" : "HUG", itemSpacing: p.gap || 0,
  };
  if (p.stroke) { params.strokeColor = rgba(p.stroke); params.strokeWeight = p.sw || 1; }
  const r = await c("create_frame", params);
  if (p.r) {
    // per-corner radius applies, but the plugin fails to serialize the mixed result; ignore that error
    try { await c("set_corner_radius", { nodeId: r.id, radius: p.r, corners: p.corners }); } catch (e) { if (!/unwrap symbol/.test(e.message)) throw e; }
  }
  if (p.wrap && p.rowGap) await c("set_item_spacing", { nodeId: r.id, counterAxisSpacing: p.rowGap });
  if (p.image) await c("set_image_fill", { nodeId: r.id, imageBase64: png(p.image, p.imageW || p.w || 1920), scaleMode: "FILL" });
  for (const ch of node.c) {
    const id = await build(ch, r.id);
    const cp = ch.p || {};
    if (auto !== "NONE" && ((ch.t === "F" && ch.p.dir) || ch.t === "INST") && (cp.fillW || cp.fillH)) {
      await c("set_layout_sizing", { nodeId: id, ...(cp.fillW ? { layoutSizingHorizontal: "FILL" } : {}), ...(cp.fillH ? { layoutSizingVertical: "FILL" } : {}) });
    }
  }
  return r.id;
}

export async function info(id) { return cmd("get_node_info", { nodeId: id }); }
export { connect, cmd, close };

// Build items at page level inside a box starting at (x, y), then wrap them in a new section.
// items: [{ node, br?: true }]
export async function buildSection(name, x0, y0, items, o = {}) {
  const t0 = Date.now();
  if (o.replace) { try { await cmd("delete_node", { nodeId: o.replace }); } catch {} }
  const gap = o.gap ?? 120, pad = o.pad ?? 120, maxW = o.maxW ?? 6000;
  let x = pad, y = pad + 40, rowH = 0, mx = 0;
  const ids = [];
  for (const it of items) {
    if (it.br && x > pad) { x = pad; y += rowH + gap; rowH = 0; }
    const id = await build({ ...it.node, p: { ...it.node.p, x: x0 + x, y: y0 + y } });
    const bb = (await info(id)).absoluteBoundingBox;
    ids.push(id);
    rowH = Math.max(rowH, bb.height); mx = Math.max(mx, x + bb.width);
    x += bb.width + gap;
    if (x > maxW) { x = pad; y += rowH + gap; rowH = 0; }
    console.log("  built", it.node.p.name || "", id, Math.round(bb.width) + "x" + Math.round(bb.height));
  }
  const w = mx + pad, h = y + rowH + pad;
  const sec = await cmd("create_section", { x: x0, y: y0, width: w, height: h, name });
  for (const id of ids) await cmd("set_parent", { nodeId: id, parentId: sec.id });
  console.log(`section "${name}" ${sec.id} ${w}x${h} cmds=${stats.cmds} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  return { id: sec.id, w, h };
}
