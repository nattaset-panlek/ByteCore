import { cmd } from "./client.mjs";
import { Resvg } from "@resvg/resvg-js";
import { ICONS } from "./icons.mjs";

export const C = {
  desk: "#DDE5EE", win: "#FFFFFF", title: "#FFFFFF", panel: "#F7F7F7", card: "#FFFFFF",
  hover: "#F2F2F2", input: "#FFFFFF", border: "#E5E5E5", border2: "#D4D4D4",
  t1: "#1B1B1B", t2: "#5C5C5C", t3: "#8B8B8B",
  accent: "#0067C0", onAccent: "#FFFFFF", info: "#0067C0", warn: "#9D5D00", danger: "#C42B1C", ok: "#0F7B0F",
  gold: "#1B1B1B", xp: "#0067C0", term: "#0C0C0C", termText: "#CCCCCC", prompt: "#CCCCCC", log: "#F7F7F7",
  common: "#5C5C5C", rare: "#0067C0", epic: "#8764B8", legendary: "#CA5010",
};

export function rgba(hex, a = 1) {
  const h = hex.replace("#", "");
  return { r: parseInt(h.slice(0, 2), 16) / 255, g: parseInt(h.slice(2, 4), 16) / 255, b: parseInt(h.slice(4, 6), 16) / 255, a: a <= 0 ? 0.001 : a };
}

export const F = (p = {}, ...c) => ({ t: "F", p, c: c.flat(9).filter(Boolean) });
export const H = (p, ...c) => F({ dir: "H", cross: "CENTER", ...p }, ...c);
export const V = (p, ...c) => F({ dir: "V", ...p }, ...c);
export const T = (text, p = {}) => ({ t: "T", text: String(text), p });
export const I = (name, size = 16, color = C.t2) => ({ t: "I", name, size, color });
export const IMG = (svg, w, h, p = {}) => ({ t: "IMG", svg, w, h, p });

const pngCache = new Map();
function svgPng(svg, w) {
  const k = svg + w;
  if (!pngCache.has(k)) pngCache.set(k, Buffer.from(new Resvg(svg, { fitTo: { mode: "width", value: w } }).render().asPng()).toString("base64"));
  return pngCache.get(k);
}
export function iconSvg(name, color) {
  const body = ICONS[name];
  if (!body) throw new Error("no icon " + name);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" color="${color}">${body.replaceAll("currentColor", color)}</svg>`;
}

export let stats = { cmds: 0 };
async function c(name, params) { stats.cmds++; return cmd(name, params); }

function pads(p) {
  const v = p.pad ?? 0;
  const a = Array.isArray(v) ? v : [v];
  const [t, r = t, b = t, l = r] = a;
  return { paddingTop: t, paddingRight: r, paddingBottom: b, paddingLeft: l };
}

export async function build(node, parentId, parentAuto = false) {
  if (node.t === "T") {
    const p = node.p;
    const r = await c("create_text", { text: node.text, fontSize: p.size || 13, fontWeight: p.w || 400, fontColor: rgba(p.color || C.t1, p.a ?? 1), name: p.name || node.text.slice(0, 40), parentId, x: p.x || 0, y: p.y || 0 });
    return r.id;
  }
  if (node.t === "I" || node.t === "IMG") {
    const isIcon = node.t === "I";
    const w = isIcon ? node.size : node.w, h = isIcon ? node.size : node.h;
    const p = node.p || {};
    const r = await c("create_frame", { name: isIcon ? `icon/${node.name}` : p.name || "image", width: w, height: h, x: p.x || 0, y: p.y || 0, parentId, fillColor: rgba("#000000", 0) });
    const svg = isIcon ? iconSvg(node.name, node.color) : node.svg;
    await c("set_image_fill", { nodeId: r.id, imageBase64: svgPng(svg, isIcon ? w * 3 : Math.min(w * (p.scale || 1), 4096)), scaleMode: "FILL" });
    if (p.r) await c("set_corner_radius", { nodeId: r.id, radius: p.r });
    return r.id;
  }
  const p = node.p;
  const auto = p.dir === "H" ? "HORIZONTAL" : p.dir === "V" ? "VERTICAL" : "NONE";
  const params = {
    name: p.name || "frame", x: p.x || 0, y: p.y || 0, width: p.w || 10, height: p.h || 10, parentId,
    fillColor: p.fill ? rgba(p.fill, p.fa ?? 1) : rgba("#000000", 0),
    layoutMode: auto, ...pads(p),
    primaryAxisAlignItems: p.main || "MIN", counterAxisAlignItems: p.cross || "MIN",
    layoutSizingHorizontal: p.w ? "FIXED" : "HUG", layoutSizingVertical: p.h ? "FIXED" : "HUG",
    itemSpacing: p.gap || 0,
  };
  if (p.stroke) { params.strokeColor = rgba(p.stroke, p.sa ?? 1); params.strokeWeight = p.sw || 1; }
  const r = await c("create_frame", params);
  if (p.r) await c("set_corner_radius", { nodeId: r.id, radius: p.r, corners: p.corners });
  for (const ch of node.c) {
    const id = await build(ch, r.id, auto !== "NONE");
    if (auto !== "NONE" && ch.t === "F" && ch.p.dir && (ch.p.fillW || ch.p.fillH)) {
      await c("set_layout_sizing", { nodeId: id, ...(ch.p.fillW ? { layoutSizingHorizontal: "FILL" } : {}), ...(ch.p.fillH ? { layoutSizingVertical: "FILL" } : {}) });
    }
  }
  if (p.image) await c("set_image_fill", { nodeId: r.id, imageBase64: svgPng(p.image, p.imageW || p.w), scaleMode: "FILL" });
  return r.id;
}
