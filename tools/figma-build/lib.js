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

// Resolve a variable's value in its collection's first mode so the raw paint matches the binding
const COLLECTION_MODE = {};
for (const c of await figma.variables.getLocalVariableCollectionsAsync()) COLLECTION_MODE[c.id] = c.modes[0].modeId;
function resolveColor(v) {
  let val = v.valuesByMode[COLLECTION_MODE[v.variableCollectionId]];
  while (val && val.type === "VARIABLE_ALIAS") {
    const next = Object.values(V).find((x) => x.id === val.id);
    val = next.valuesByMode[COLLECTION_MODE[next.variableCollectionId]];
  }
  return val;
}
function paint(name, opacity) {
  if (!V[name]) throw new Error("Unknown color variable " + name);
  const c = resolveColor(V[name]);
  const base = { type: "SOLID", color: { r: c.r, g: c.g, b: c.b }, opacity: c.a === undefined ? 1 : c.a };
  const p = figma.variables.setBoundVariableForPaint(base, "color", V[name]);
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
// main (MIN/CENTER/MAX/SPACE_BETWEEN), cross (MIN/CENTER/MAX), wrap, clip.
// No `effect` option: canvas windows and cards never carry shadows (see STYLE_NOTES.md).
// flushEffects is kept as a no-op so older scripts keep running.
async function flushEffects() {}
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
  if (opts.effect) throw new Error("AL: effect styles are not used on canvas frames");
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
  for (const v of node.findAll((n) => ["VECTOR","RECTANGLE","ELLIPSE","LINE"].includes(n.type))) {
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

// Window fill (#1F1F1F, Mica on dark) is not in the original palette; add it once.
if (!V["bg/mica"]) {
  const col = (await figma.variables.getLocalVariableCollectionsAsync()).find((c) => c.id === V["bg/layer"].variableCollectionId);
  const v = figma.variables.createVariable("bg/mica", col, "COLOR");
  for (const m of col.modes) v.setValueForMode(m.modeId, { r: 31 / 255, g: 31 / 255, b: 31 / 255, a: 1 });
  v.description = "Window background (Mica, dark). Matches File Explorer and Settings.";
  V["bg/mica"] = v;
}

// Image icons already in the file (app/* and Fluent icon/*). Copy their image paint, never redraw.
const APP_ICON_IDS = {
  "app/Terminal": "13:25172", "app/TaskManager": "13:25187", "app/RigManager": "13:25181", "app/Settings": "13:25190",
  "app/Profile": "13:24985", "app/Wallet": "I13:25211;13:19696", "app/FileExplorer": "I13:28656;13:19478",
};
const IMG = {};
async function imgPaints(name) {
  if (IMG[name]) return IMG[name];
  let src = APP_ICON_IDS[name] ? await figma.getNodeByIdAsync(APP_ICON_IDS[name]) : null;
  if (!src) {
    const isImg = (x) => x.type === "FRAME" && x.name === name && x.fills.length && x.fills[0].type === "IMAGE";
    const sec = figma.currentPage.children.find((n) => n.name === "02 Components");
    src = sec.findOne(isImg) || figma.currentPage.findOne(isImg);
  }
  if (!src) throw new Error("Image icon not found: " + name);
  return (IMG[name] = JSON.parse(JSON.stringify(src.fills)));
}
async function imgIcon(name, size = 16) {
  const f = figma.createFrame();
  f.name = name;
  f.resize(size, size);
  f.fills = await imgPaints(name);
  return f;
}
// Swap the image of an icon frame (also inside instances, e.g. the app icon in TitleBar / TabViewItem)
async function setImg(node, name) {
  node.fills = await imgPaints(name);
  node.name = name;
  return node;
}

// TitleBar component (02 Components): 32px, 16px app image icon, 12px title, caption buttons.
async function titleBar(title, appIcon, kind = "Default") {
  const tb = inst("TitleBar", { Kind: kind }, { title });
  await setImg(tb.findOne((n) => n.type === "FRAME" && n.name.startsWith("app/")), appIcon);
  return tb;
}
// File Explorer tab row: 44px, pad 4/0/0/8, gap 4, TabViewItem instances, new-tab button,
// caption buttons in a 138x44 column. tabs: [[label, selected, width?]].
// selectedFill recolors the selected tab so it joins the content below (e.g. terminal/bg).
async function tabRow(win, tabs, appIcon, selectedFill) {
  const row = AL("H", { name: "TitleBar with tabs", h: 44, pad: [4, 0, 0, 8], gap: 4, cross: "MAX" });
  add(win, row, { fw: true });
  for (const [label, selected, w] of tabs) {
    const t = inst("TabViewItem", { State: selected ? "Selected" : "Rest" }, { label });
    t.resize(w || 240, t.height);
    await setImg(t.findOne((n) => n.type === "FRAME" && n.name.startsWith("app/")), appIcon);
    if (selected && selectedFill) fill(t.findOne((n) => n.name === "content"), selectedFill);
    row.appendChild(t);
  }
  const plus = AL("H", { name: "New tab", w: 32, h: 40, cross: "CENTER" });
  const ib = inst("IconButton", { State: "Rest" });
  await setImg(ib.findOne((n) => n.type === "FRAME" && n.name.startsWith("icon/")), "icon/add");
  plus.appendChild(ib);
  row.appendChild(plus);
  add(row, spacer(), { grow: true });
  const capCol = AL("V", { name: "Caption column", w: 138, h: 44 });
  row.appendChild(capCol);
  capCol.layoutAlign = "STRETCH";
  const caps = AL("H", { name: "CaptionButtons" });
  for (const type of ["Minimize", "Maximize", "Close"]) caps.appendChild(inst("CaptionButton", { Type: type, State: "Rest" }));
  capCol.appendChild(caps);
  return row;
}

// Standard app window shell: bg/mica (#1F1F1F), stroke/surface, radius 8, no shadow,
// TitleBar instance (or a File Explorer tab row when opts.tabs is set). Returns { win, body, titleBar }.
// opts: { kind: "Default" | "Back", tabs: [[label, selected, w]], selectedTabFill, bodyDir: "H" | "V" }
async function appWindow(parent, name, title, appIcon, w, h, x, y, opts = {}) {
  clearByName(parent, name);
  const win = AL("V", { name, w, h, fill: "bg/mica", stroke: "stroke/surface", r: 8, clip: true });
  win.x = x;
  win.y = y;
  parent.appendChild(win);
  let tb;
  if (opts.tabs) tb = await tabRow(win, opts.tabs, appIcon, opts.selectedTabFill);
  else {
    tb = await titleBar(title, appIcon, opts.kind || "Default");
    add(win, tb, { fw: true });
  }
  const body = AL(opts.bodyDir || "H", { name: "Body" });
  add(win, body, { fw: true, fh: true });
  return { win, body, titleBar: tb };
}

// Settings navigation: NavigationViewItem (image icon, 36px, selected = white 6% + accent pill).
async function navItem(label, iconName, selected = false) {
  const n = inst("NavigationViewItem", { State: selected ? "Selected" : "Rest" }, { label });
  n.name = "Nav/" + label;
  await setImg(n.findOne((x) => x.type === "FRAME" && x.name.startsWith("icon/")), iconName);
  return n;
}
// Settings navigation column: 320px, pad 8/16/16/16, gap 4.
function navColumn(w = 320) {
  return AL("V", { name: "Navigation", w, pad: [8, 16, 16, 16], gap: 4 });
}
// Command bar: 48px, pad 0/12, gap 2 (put it on a bg/layer "Toolbar layer").
function cmdBar(name = "Command bar") {
  return AL("H", { name, h: 48, pad: [0, 12], gap: 2, cross: "CENTER" });
}
// AppBarButton with an image icon; label omitted = icon-only. Width follows the label.
async function appBarButton(label, iconName, state = "Rest", chevron = false) {
  const kind = !label ? "Icon" : chevron ? "IconLabelChevron" : "IconLabel";
  const b = variant("AppBarButton", { Kind: kind, State: state }).createInstance();
  const t = b.findOne((n) => n.type === "TEXT");
  if (t) {
    const before = t.width;
    t.characters = label;
    b.resize(Math.round(b.width - before + t.width), b.height);
  }
  if (iconName) await setImg(b.findOne((n) => n.type === "FRAME" && n.name.startsWith("icon/") && n.name !== "icon/chevron_down"), iconName);
  b.name = "AppBarButton/" + (label || iconName);
  return b;
}
function appBarSeparator() {
  return findSet("AppBarSeparator").createInstance();
}
// Status bar: 24px, transparent, pad 0/12, gap 16, caption text.
// items: "text" | "|" (flex spacer) | [text, colorVar, layerName] | SceneNode
async function statusBar(parent, items) {
  const sb = AL("H", { name: "Status bar", h: 24, pad: [0, 12], gap: 16, cross: "CENTER" });
  add(parent, sb, { fw: true });
  for (const it of items) {
    if (it === "|") add(sb, spacer(), { grow: true });
    else if (typeof it === "string") sb.appendChild(await T(it, "Caption", "text/secondary"));
    else if (Array.isArray(it)) sb.appendChild(await T(it[0], "Caption", it[1] || "text/secondary", it[2] ? { name: it[2] } : {}));
    else sb.appendChild(it);
  }
  return sb;
}
// Inline meter that fits a 24px status bar: label, 80x4 track, value.
async function miniMeter(label, value, ratio, color) {
  const m = AL("H", { name: "Meter/" + label, gap: 8, cross: "CENTER" });
  m.appendChild(await T(label, "Caption", "text/secondary"));
  const track = AL("H", { name: "track", w: 80, h: 4, fill: "subtle/hover" });
  track.cornerRadius = 2;
  const bar = figma.createRectangle();
  bar.name = "fill";
  bar.resize(Math.max(2, Math.round(80 * ratio)), 4);
  bar.cornerRadius = 2;
  fill(bar, color);
  track.appendChild(bar);
  m.appendChild(track);
  m.appendChild(await T(value, "Caption", color, { name: "value" }));
  return m;
}

// Button instance sized to its label (Button components are fixed-width)
function btn(label, style = "Standard") {
  const b = inst("Button", { Style: style, State: "Rest", Icon: "No" }, { label });
  const t = b.findOne((n) => n.type === "TEXT");
  b.resize(Math.ceil(t.width) + 24, b.height);
  return b;
}
function textBox(placeholder, w = 240, search = false) {
  const tb = inst("TextBox", { State: "Rest", Icon: search ? "Search" : "None" }, { value: placeholder });
  tb.resize(w, tb.height);
  return tb;
}
async function pageTitle(parent, title, subtitle) {
  const h = AL("V", { name: "Page header", gap: 4 });
  add(parent, h, { fw: true });
  h.appendChild(await T(title, "Title", "text/primary", { name: "title" }));
  if (subtitle) h.appendChild(await T(subtitle, "Body", "text/secondary", { name: "subtitle" }));
  return h;
}
// Card: bg/card, stroke/card, radius 8, pad 16, gap 10, no shadow.
function card(name, opts = {}) {
  return AL(opts.dir || "V", Object.assign({ name, pad: 16, gap: 10, fill: "bg/card", stroke: "stroke/card", r: 8 }, opts));
}

// ---- Settings-style app shell (matches Window/Settings) ----
// PersonPicture: circle on control/default with a surface stroke and initials (Subtitle, text/secondary).
async function personPicture(initials, size = 64) {
  const p = AL("H", { name: "PersonPicture", w: size, h: size, fill: "control/default", stroke: "stroke/control", main: "CENTER", cross: "CENTER" });
  p.cornerRadius = size / 2;
  p.appendChild(await T(initials, size >= 64 ? "Subtitle" : "Body Strong", "text/secondary"));
  return p;
}
// Back TitleBar + 320px navigation (header block, search box, NavigationViewItems, optional footer item)
// + page (pad 12/56/24/40, gap 8) with a 28px title. nav: [[label, "icon/x"]]; footer: [label, icon].
async function settingsWindow(parent, name, title, appIcon, x, y, o) {
  const { win, body } = await appWindow(parent, name, title, appIcon, o.w || 1280, o.h || 800, x, y, { kind: "Back" });
  const nav = navColumn();
  add(body, nav, { fh: true });
  if (o.navHeader) {
    const h = AL("H", { name: "Nav header", pad: [8, 4, 16, 4], gap: 16, cross: "CENTER" });
    nav.appendChild(h);
    h.appendChild(o.navHeader.picture);
    const t = AL("V", { name: "text", gap: 0 });
    h.appendChild(t);
    t.appendChild(await T(o.navHeader.title, "Body Strong", "text/primary"));
    t.appendChild(await T(o.navHeader.caption, "Caption", "text/secondary"));
  }
  add(nav, textBox(o.search || "Find a setting", 288, true), { fw: true });
  const gap = spacer("gap");
  gap.resize(10, 8);
  nav.appendChild(gap);
  for (const [label, ic] of o.nav) add(nav, await navItem(label, ic, label === o.selected), { fw: true });
  if (o.footer) {
    add(nav, spacer(), { grow: true });
    add(nav, await navItem(o.footer[0], o.footer[1], false), { fw: true });
  }
  const page = AL("V", { name: "Page", pad: [12, 56, 24, 40], gap: 8, clip: true });
  add(body, page, { grow: true, fh: true });
  if (o.pageTitle) {
    const pt = AL("H", { name: "Page title", pad: [0, 0, 20, 0], gap: 16, cross: "CENTER" });
    page.appendChild(pt);
    pt.appendChild(await T(o.pageTitle, "Title", "text/primary"));
  }
  return { win, page, nav };
}
// Group heading above SettingsCards (Body Strong, 20px top spacing like Settings)
async function groupTitle(parent, text) {
  const g = AL("H", { name: "Group title", pad: [20, 0, 6, 0] });
  add(parent, g, { fw: true });
  g.appendChild(await T(text, "Body Strong", "text/primary"));
  return g;
}
// SettingsCard instance. trailing: Navigation | ToggleOn | ToggleOff | ComboBox | Button | Text | None
async function settingsCard(header, description, iconName, trailing = "Navigation", value) {
  const c = inst("SettingsCard", { Trailing: trailing, Description: description ? "Yes" : "No" }, { header });
  c.name = "SettingsCard/" + header;
  if (description) setTexts(c, { description });
  if (value !== undefined) {
    const t = c.findOne((n) => n.type === "TEXT" && (n.name === "value" || n.name === "label"));
    t.characters = String(value);
    if (trailing === "Button") {
      const b = c.findOne((n) => n.type === "INSTANCE" && n.name === "Button");
      b.resize(Math.ceil(t.width) + 24, b.height);
    }
  }
  if (iconName) await setImg(c.findOne((n) => n.type === "FRAME" && n.name.startsWith("icon/") && n.name !== "icon/chevron_right" && n.name !== "icon/chevron_down"), iconName);
  return c;
}
// StatCard (02): header with image icon, value, caption
async function statCard(header, value, caption, iconName) {
  const s = findSet("StatCard").createInstance();
  setTexts(s, { header, value, caption });
  if (iconName) await setImg(s.findOne((n) => n.type === "FRAME" && n.name.startsWith("icon/")), iconName);
  s.name = "StatCard/" + header;
  return s;
}
// IconButton (02) with an image icon
async function iconButton(iconName, state = "Rest") {
  const b = inst("IconButton", { State: state });
  await setImg(b.findOne((n) => n.type === "FRAME" && n.name.startsWith("icon/")), iconName);
  b.name = "IconButton/" + iconName.replace("icon/", "");
  return b;
}
// 40px icon tile (white 6%, radius 4) holding a 20px vector Icon, as in HardwareSlot
function iconTile(name, size = 40, color = "text/primary") {
  const t = AL("H", { name: "icon tile", w: size, h: size, fill: "subtle/hover", main: "CENTER", cross: "CENTER", r: 4 });
  const i = icon(name, color);
  if (size >= 80) i.resize(40, 40);
  t.appendChild(i);
  return t;
}
