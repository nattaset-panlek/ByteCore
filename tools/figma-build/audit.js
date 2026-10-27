const hex = (c) => "#" + [c.r, c.g, c.b].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
async function paintDesc(list) {
  const out = [];
  for (const f of list) {
    if (f.type !== "SOLID") { out.push(f.type); continue; }
    let d = hex(f.color);
    if (f.boundVariables && f.boundVariables.color) d = "var:" + (await figma.variables.getVariableByIdAsync(f.boundVariables.color.id)).name;
    out.push(d + "@" + (+f.opacity).toFixed(2));
  }
  return out.join(",");
}
async function info(n, depth, max) {
  const o = { name: n.name, type: n.type, w: Math.round(n.width), h: Math.round(n.height) };
  if ("fills" in n && n.fills !== figma.mixed && n.fills.length) o.fill = await paintDesc(n.fills);
  if ("strokes" in n && n.strokes.length) o.stroke = (await paintDesc(n.strokes)) + " w" + n.strokeWeight + " " + n.strokeAlign;
  if ("effects" in n && n.effects.length) o.effects = n.effects.map((e) => e.type + (e.radius ? " r" + e.radius : "") + (e.offset ? " y" + e.offset.y : "") + (e.color ? " a" + e.color.a.toFixed(2) : ""));
  if ("effectStyleId" in n && n.effectStyleId) o.effectStyle = (await figma.getStyleByIdAsync(n.effectStyleId)).name;
  if ("cornerRadius" in n && n.cornerRadius) o.r = n.cornerRadius === figma.mixed ? [n.topLeftRadius, n.topRightRadius] : n.cornerRadius;
  if ("layoutMode" in n && n.layoutMode !== "NONE") o.al = n.layoutMode[0] + " gap" + n.itemSpacing + " pad" + [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft].join("/");
  if (n.type === "TEXT") { o.text = n.characters.slice(0, 24); o.font = n.fontSize + " " + (n.fontName.style || ""); o.ts = n.textStyleId ? (await figma.getStyleByIdAsync(n.textStyleId)).name : "none"; }
  if (n.type === "INSTANCE") { const m = await n.getMainComponentAsync(); o.comp = m.parent.type === "COMPONENT_SET" ? m.parent.name + "/" + m.name : m.name; }
  if (depth < max && "children" in n && n.type !== "INSTANCE") { o.c = []; for (const c of n.children.slice(0, 8)) o.c.push(await info(c, depth + 1, max)); }
  return o;
}
const out = [];
for (const id of ARGS) out.push(await info(await figma.getNodeByIdAsync(id), 0, DEPTH));
return out;
