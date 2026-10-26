// Shared helpers prepended to every build script (runs inside the Figma plugin).
// Everything binds to the file's existing ByteCore variables and styles.

const V = {};
for (const c of await figma.variables.getLocalVariableCollectionsAsync()) {
  for (const id of c.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id);
    V[v.name] = v;
  }
}
const TS = {};
for (const s of await figma.getLocalTextStylesAsync()) TS[s.name.replace("ByteCore/", "")] = s;
const ES = {};
for (const s of await figma.getLocalEffectStylesAsync()) ES[s.name.replace("ByteCore/Elevation/", "")] = s;

await Promise.all(
  [
    { family: "Inter", style: "Regular" },
    { family: "Inter", style: "Semi Bold" },
    { family: "Inter", style: "Bold" },
    { family: "Cascadia Mono", style: "Regular" },
  ].map((f) => figma.loadFontAsync(f))
);

const SPACE = { 2: "space/2", 4: "space/4", 8: "space/8", 12: "space/12", 16: "space/16", 24: "space/24", 36: "space/36", 48: "space/48" };
const RADIUS = { 0: "radius/none", 4: "radius/control", 8: "radius/overlay" };

function paint(name, opacity) {
  if (!V[name]) throw new Error("Unknown color variable " + name);
  const p = figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", V[name]);
  return opacity === undefined ? p : Object.assign({}, p, { opacity });
}
function fill(node, name, opacity) {
  node.fills = name ? [paint(name, opacity)] : [];
  return node;
}
function stroke(node, name, weight = 1, align = "INSIDE") {
  node.strokes = [paint(name)];
  node.strokeWeight = weight;
  node.strokeAlign = align;
  return node;
}
function bindNum(node, field, value) {
  const varName = field === "cornerRadius" ? RADIUS[value] : SPACE[value];
  if (varName && V[varName]) node.setBoundVariable(field, V[varName]);
  else node[field] = value;
}
function radius(node, r) {
  if (RADIUS[r]) {
    for (const f of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) node.setBoundVariable(f, V[RADIUS[r]]);
  } else node.cornerRadius = r;
  return node;
}

// Auto-layout frame. opts: name, gap, pad (n | [v,h] | [t,r,b,l]), fill, stroke, r, w, h,
// main (MIN/CENTER/MAX/SPACE_BETWEEN), cross (MIN/CENTER/MAX), wrap, clip, effect
const PENDING_EFFECTS = [];
// Effect styles must be set asynchronously; call this before returning from a script
async function flushEffects() {
  for (const [node, name] of PENDING_EFFECTS.splice(0)) await node.setEffectStyleIdAsync(ES[name].id);
}
function AL(dir, opts = {}) {
  const f = figma.createFrame();
  f.layoutMode = dir === "H" ? "HORIZONTAL" : "VERTICAL";
  f.primaryAxisSizingMode = "AUTO";
  f.counterAxisSizingMode = "AUTO";
  f.name = opts.name || "frame";
  f.fills = [];
  if (opts.gap !== undefined) bindNum(f, "itemSpacing", opts.gap);
  if (opts.pad !== undefined) {
    let p = opts.pad;
    if (typeof p === "number") p = [p, p, p, p];
    else if (p.length === 2) p = [p[0], p[1], p[0], p[1]];
    bindNum(f, "paddingTop", p[0]);
    bindNum(f, "paddingRight", p[1]);
    bindNum(f, "paddingBottom", p[2]);
    bindNum(f, "paddingLeft", p[3]);
  }
  if (opts.fill) fill(f, opts.fill, opts.fillOpacity);
  if (opts.stroke) stroke(f, opts.stroke, opts.strokeWeight || 1);
  if (opts.r !== undefined) radius(f, opts.r);
  if (opts.main) f.primaryAxisAlignItems = opts.main;
  if (opts.cross) f.counterAxisAlignItems = opts.cross;
  if (opts.wrap) f.layoutWrap = "WRAP";
  if (opts.w !== undefined || opts.h !== undefined) {
    f.resize(opts.w !== undefined ? opts.w : f.width, opts.h !== undefined ? opts.h : f.height);
    const horiz = dir === "H";
    if (opts.w !== undefined) horiz ? (f.primaryAxisSizingMode = "FIXED") : (f.counterAxisSizingMode = "FIXED");
    else horiz ? (f.primaryAxisSizingMode = "AUTO") : (f.counterAxisSizingMode = "AUTO");
    if (opts.h !== undefined) horiz ? (f.counterAxisSizingMode = "FIXED") : (f.primaryAxisSizingMode = "FIXED");
    else horiz ? (f.counterAxisSizingMode = "AUTO") : (f.primaryAxisSizingMode = "AUTO");
  }
  if (opts.clip) f.clipsContent = true;
  if (opts.effect) PENDING_EFFECTS.push([f, opts.effect]);
  return f;
}

// Append child, then apply FILL/HUG sizing (must happen after append).
function add(parent, child, sizing = {}) {
  parent.appendChild(child);
  if (sizing.fw) child.layoutSizingHorizontal = "FILL";
  if (sizing.fh) child.layoutSizingVertical = "FILL";
  if (sizing.grow) child.layoutGrow = 1;
  return child;
}
function addAll(parent, children) {
  for (const c of children) if (c) parent.appendChild(c);
  return parent;
}

// Text node using a ByteCore text style and color variable.
async function T(text, style = "Body", color = "text/primary", opts = {}) {
  const t = figma.createText();
  await t.setTextStyleIdAsync(TS[style].id);
  t.characters = String(text);
  fill(t, color);
  if (opts.name) t.name = opts.name;
  else t.name = String(text).slice(0, 32);
  if (opts.w) {
    t.resize(opts.w, t.height);
    t.textAutoResize = "HEIGHT";
  }
  if (opts.align) t.textAlignHorizontal = opts.align;
  if (opts.truncate) {
    t.textAutoResize = "NONE";
    t.resize(opts.truncate, t.height);
    t.textTruncation = "ENDING";
  }
  return t;
}

function spacer(name = "spacer") {
  const f = figma.createFrame();
  f.name = name;
  f.fills = [];
  f.resize(1, 1);
  return f;
}
function divider(dir = "H", name = "divider") {
  const r = figma.createRectangle();
  r.name = name;
  r.resize(dir === "H" ? 100 : 1, dir === "H" ? 1 : 100);
  fill(r, "stroke/divider");
  return r;
}

// Existing design-system components (02 Components) and new game components (07)
const COMPONENT_SECTIONS = ["02 Components", "07 Game Components"];
function findSet(name) {
  for (const secName of COMPONENT_SECTIONS) {
    const sec = figma.currentPage.children.find((n) => n.name === secName);
    if (!sec) continue;
    const hit = sec.findOne((n) => (n.type === "COMPONENT_SET" || (n.type === "COMPONENT" && n.parent.type !== "COMPONENT_SET")) && n.name === name);
    if (hit) return hit;
  }
  throw new Error("Component not found: " + name);
}
function variant(setName, props = {}) {
  const set = findSet(setName);
  if (set.type === "COMPONENT") return set;
  const want = Object.entries(props);
  const v = set.children.find((c) => want.every(([k, val]) => c.name.split(", ").includes(k + "=" + val)));
  if (!v) throw new Error(`Variant not found: ${setName} ${JSON.stringify(props)}`);
  return v;
}
// Create an instance and override text layers by layer name: texts = { label: "Run" }
function inst(setName, props = {}, texts = {}) {
  const i = variant(setName, props).createInstance();
  setTexts(i, texts);
  return i;
}
function setTexts(node, texts) {
  for (const [layer, value] of Object.entries(texts)) {
    const t = node.findOne((n) => n.type === "TEXT" && n.name === layer);
    if (!t) throw new Error(`Text layer "${layer}" not in ${node.name}`);
    t.characters = String(value);
  }
  return node;
}
// Set component properties on an instance by bare property name
function props(instance, values) {
  const defs = instance.componentProperties;
  const out = {};
  for (const [name, value] of Object.entries(values)) {
    const key = Object.keys(defs).find((k) => k === name || k.split("#")[0] === name);
    if (!key) throw new Error(`No property ${name} on ${instance.name}`);
    out[key] = value;
  }
  instance.setProperties(out);
  return instance;
}

// Icon instance from the Icon component set (Name=..)
function icon(name, color) {
  const i = variant("Icon", { Name: name }).createInstance();
  if (color) recolorIcon(i, color);
  return i;
}
function recolorIcon(node, color) {
  for (const v of node.findAll((n) => n.type === "VECTOR")) {
    if (v.strokes.length) v.strokes = [paint(color)];
    if (v.fills.length) v.fills = [paint(color)];
  }
  return node;
}

// Section helper: reuse an existing section by name or create one
function getSection(name, x, y, w, h) {
  let s = figma.currentPage.children.find((n) => n.type === "SECTION" && n.name === name);
  if (!s) {
    s = figma.createSection();
    s.name = name;
  }
  s.x = x;
  s.y = y;
  s.resizeWithoutConstraints(w, h);
  s.fills = [{ type: "SOLID", color: { r: 0.267, g: 0.267, b: 0.267 } }];
  return s;
}
function clearByName(parent, name) {
  for (const n of parent.children.filter((c) => c.name === name)) n.remove();
}

// Standard app window shell: frame with Mica fill, 8px radius, window elevation,
// title bar (icon + title + caption buttons). Returns { win, body }.
async function appWindow(parent, name, title, iconName, w, h, x, y) {
  clearByName(parent, name);
  const win = AL("V", { name, w, h, fill: "bg/solid-base", stroke: "stroke/surface", r: 8, clip: true, effect: "Window" });
  win.x = x;
  win.y = y;
  parent.appendChild(win);
  const tb = inst("AppTitleBar", {}, {});
  add(win, tb, { fw: true });
  props(tb, { Title: title });
  if (iconName) props(tb, { Icon: variant("Icon", { Name: iconName }).id });
  const body = AL("H", { name: "Body" });
  add(win, body, { fw: true, fh: true });
  return { win, body, titleBar: tb };
}
