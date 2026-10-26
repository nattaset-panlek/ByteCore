// 07 Game Components, part 1: Icon set, AppTitleBar, TerminalTab, Badge, Meter, KeyValue, SectionHeader
const sec = getSection("07 Game Components", 80, 17514, 4200, 2200);
for (const c of sec.children.slice()) c.remove();

const created = {};
function toComponent(frame, name, description) {
  const c = figma.createComponentFromNode(frame);
  c.name = name;
  if (description) c.description = description;
  return c;
}
function textProp(owner, name, layers) {
  const key = owner.addComponentProperty(name, "TEXT", layers[0].characters);
  for (const l of layers) l.componentPropertyReferences = Object.assign({}, l.componentPropertyReferences || {}, { characters: key });
  return key;
}
function boolProp(owner, name, layers, def = true) {
  const key = owner.addComponentProperty(name, "BOOLEAN", def);
  for (const l of layers) l.componentPropertyReferences = Object.assign({}, l.componentPropertyReferences || {}, { visible: key });
  return key;
}
function combine(comps, name, x, y, description, gap = 16) {
  const set = figma.combineAsVariants(comps, sec);
  set.name = name;
  if (description) set.description = description;
  set.layoutMode = "HORIZONTAL";
  set.layoutWrap = "WRAP";
  set.itemSpacing = gap;
  set.counterAxisSpacing = gap;
  set.paddingTop = set.paddingBottom = set.paddingLeft = set.paddingRight = 16;
  set.primaryAxisSizingMode = "AUTO";
  set.counterAxisSizingMode = "AUTO";
  fill(set, "bg/solid-base");
  set.cornerRadius = 8;
  set.x = x;
  set.y = y;
  return set;
}
function place(node, x, y) {
  sec.appendChild(node);
  node.x = x;
  node.y = y;
  return node;
}

// ---- Icons (Fluent-style 20px outline, 1.5 stroke) ----
const S = (body) =>
  `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const ICONS = {
  terminal: '<rect x="2.5" y="3.5" width="15" height="13" rx="2"/><path d="M6 8l2.5 2L6 12"/><path d="M10.5 12.5H14"/>',
  code: '<path d="M7 6l-4 4 4 4"/><path d="M13 6l4 4-4 4"/>',
  play: '<path d="M6.5 4.5v11l8.5-5.5z"/>',
  stop: '<rect x="5" y="5" width="10" height="10" rx="1.5"/>',
  search: '<circle cx="8.5" cy="8.5" r="5"/><path d="M12.5 12.5L17 17"/>',
  folder: '<path d="M2.5 5.5a1 1 0 011-1h4l2 2h7a1 1 0 011 1v8a1 1 0 01-1 1h-13a1 1 0 01-1-1z"/>',
  file: '<path d="M5 2.5h6.5L15 6v11a.5.5 0 01-.5.5h-9.5a.5.5 0 01-.5-.5V3a.5.5 0 01.5-.5z"/><path d="M11.5 2.5V6H15"/>',
  document: '<path d="M5 2.5h6.5L15 6v11a.5.5 0 01-.5.5h-9.5a.5.5 0 01-.5-.5V3a.5.5 0 01.5-.5z"/><path d="M11.5 2.5V6H15"/><path d="M7 10h6"/><path d="M7 13h6"/>',
  upload: '<path d="M10 13V3.5"/><path d="M6 7.5l4-4 4 4"/><path d="M3.5 13.5v2a1 1 0 001 1h11a1 1 0 001-1v-2"/>',
  download: '<path d="M10 3.5V13"/><path d="M6 9l4 4 4-4"/><path d="M3.5 13.5v2a1 1 0 001 1h11a1 1 0 001-1v-2"/>',
  link: '<path d="M8.5 11.5l3-3"/><path d="M7 9.5l-2 2a2.5 2.5 0 003.5 3.5l2-2"/><path d="M13 10.5l2-2A2.5 2.5 0 0011.5 5l-2 2"/>',
  clipboard: '<rect x="4.5" y="3.5" width="11" height="14" rx="1.5"/><rect x="7.5" y="2" width="5" height="3" rx="1"/>',
  cpu: '<rect x="5.5" y="5.5" width="9" height="9" rx="1.5"/><rect x="8" y="8" width="4" height="4" rx=".5"/><path d="M8 2.5v3M12 2.5v3M8 14.5v3M12 14.5v3M2.5 8h3M2.5 12h3M14.5 8h3M14.5 12h3"/>',
  memory: '<rect x="2.5" y="6" width="15" height="8" rx="1"/><path d="M6 9v2M10 9v2M14 9v2M5 14v2M8 14v2M12 14v2M15 14v2"/>',
  network: '<circle cx="10" cy="10" r="7.5"/><path d="M2.5 10h15"/><path d="M10 2.5c2 2 3 4.6 3 7.5s-1 5.5-3 7.5c-2-2-3-4.6-3-7.5s1-5.5 3-7.5z"/>',
  disk: '<rect x="2.5" y="5.5" width="15" height="9" rx="2"/><path d="M5.5 11h5"/><circle cx="14" cy="10" r=".75"/>',
  wallet: '<rect x="2.5" y="4.5" width="15" height="12" rx="2"/><path d="M2.5 8h15"/><path d="M12.5 12h2"/>',
  shield: '<path d="M10 2.5l6 2.5v4.5c0 4-2.6 6.6-6 8-3.4-1.4-6-4-6-8V5z"/>',
  warning: '<path d="M10 3l7.5 13.5h-15z"/><path d="M10 8v3.5"/><path d="M10 14v.01"/>',
  info: '<circle cx="10" cy="10" r="7.5"/><path d="M10 9v4.5"/><path d="M10 6.5v.01"/>',
  check: '<path d="M4.5 10.5L8 14l7.5-8"/>',
  close: '<path d="M5 5l10 10"/><path d="M15 5L5 15"/>',
  plus: '<path d="M10 4v12"/><path d="M4 10h12"/>',
  minus: '<path d="M4 10h12"/>',
  chevronRight: '<path d="M8 5l5 5-5 5"/>',
  chevronDown: '<path d="M5 8l5 5 5-5"/>',
  lock: '<rect x="4.5" y="9" width="11" height="8.5" rx="1.5"/><path d="M7 9V6.5a3 3 0 016 0V9"/>',
  unlock: '<rect x="4.5" y="9" width="11" height="8.5" rx="1.5"/><path d="M7 9V6.5a3 3 0 015.8-1"/>',
  clock: '<circle cx="10" cy="10" r="7.5"/><path d="M10 6v4.5l3 2"/>',
  person: '<circle cx="10" cy="7" r="3.5"/><path d="M3.5 17c1-3.5 3.6-5 6.5-5s5.5 1.5 6.5 5"/>',
  identity: '<rect x="2.5" y="4.5" width="15" height="11" rx="2"/><circle cx="7.5" cy="9" r="1.75"/><path d="M5 13c.5-1.2 1.4-1.8 2.5-1.8s2 .6 2.5 1.8"/><path d="M12.5 8.5h2.5M12.5 11h2.5"/>',
  settings: '<circle cx="10" cy="10" r="2.5"/><circle cx="10" cy="10" r="5.5"/><path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4"/>',
  more: '<path d="M5 10h.01M10 10h.01M15 10h.01" stroke-width="2.25"/>',
  refresh: '<path d="M15.5 10a5.5 5.5 0 11-1.6-3.9"/><path d="M15.5 3.5v3h-3"/>',
  filter: '<path d="M3 5.5h14"/><path d="M5.5 10h9"/><path d="M8 14.5h4"/>',
  trash: '<path d="M4 5.5h12"/><path d="M8 5.5V4h4v1.5"/><path d="M5.5 5.5l.8 11h7.4l.8-11"/>',
  arrowUp: '<path d="M10 16V4"/><path d="M5 9l5-5 5 5"/>',
  arrowDown: '<path d="M10 4v12"/><path d="M5 11l5 5 5-5"/>',
  cart: '<path d="M2.5 3.5h2l2 9.5h9l1.5-7H6"/><circle cx="8" cy="16" r="1"/><circle cx="14" cy="16" r="1"/>',
  chart: '<path d="M3 16.5h14"/><path d="M5.5 14V9"/><path d="M9.5 14V5"/><path d="M13.5 14V8"/>',
  eye: '<path d="M2 10s3-5.5 8-5.5 8 5.5 8 5.5-3 5.5-8 5.5S2 10 2 10z"/><circle cx="10" cy="10" r="2.5"/>',
  pen: '<path d="M13.5 3.5l3 3-9 9H4.5v-3z"/>',
  exit: '<path d="M8 3.5h7.5v13H8"/><path d="M11.5 10H3"/><path d="M6 7l-3 3 3 3"/>',
  power: '<path d="M10 2.5V9"/><path d="M6 5a6 6 0 108 0"/>',
  bolt: '<path d="M11 2.5L4.5 11H10l-1 6.5L15.5 9H10z"/>',
  briefcase: '<rect x="2.5" y="6" width="15" height="10.5" rx="1.5"/><path d="M7 6V4.5a1 1 0 011-1h4a1 1 0 011 1V6"/><path d="M2.5 10.5h15"/>',
  grid: '<rect x="3" y="3" width="5.5" height="5.5" rx="1"/><rect x="11.5" y="3" width="5.5" height="5.5" rx="1"/><rect x="3" y="11.5" width="5.5" height="5.5" rx="1"/><rect x="11.5" y="11.5" width="5.5" height="5.5" rx="1"/>',
  puzzle: '<path d="M4 7h3a2 2 0 114 0h3v3a2 2 0 110 4v3H4z"/>',
  scale: '<path d="M10 3v14"/><path d="M5 17h10"/><path d="M4 6h12"/><path d="M4 6l-2 5a2 2 0 004 0z"/><path d="M16 6l-2 5a2 2 0 004 0z"/>',
};
const iconComps = [];
for (const [name, body] of Object.entries(ICONS)) {
  const svg = figma.createNodeFromSvg(S(body));
  sec.appendChild(svg);
  const comp = toComponent(svg, "Name=" + name);
  comp.fills = [];
  comp.clipsContent = false;
  for (const v of comp.findAll((n) => n.type === "VECTOR")) {
    v.constraints = { horizontal: "SCALE", vertical: "SCALE" };
    if (v.strokes.length) v.strokes = [paint("text/primary")];
    if (v.fills.length) v.fills = [paint("text/primary")];
  }
  iconComps.push(comp);
}
const iconSet = combine(iconComps, "Icon", 40, 80, "Fluent-style 20px outline icons. Swap via the Name variant; recolor vectors per use.", 12);
iconSet.resize(560, iconSet.height);
iconSet.primaryAxisSizingMode = "FIXED";
created.Icon = iconSet.id;
const iconByName = (n) => iconSet.children.find((c) => c.name === "Name=" + n);

// ---- AppTitleBar ----
{
  const f = AL("H", { name: "AppTitleBar", h: 32, w: 960, pad: [0, 0, 0, 16], gap: 12, cross: "CENTER" });
  const ic = iconByName("terminal").createInstance();
  ic.name = "icon";
  ic.resize(16, 16);
  f.appendChild(ic);
  const title = await T("App title", "Caption", "text/primary", { name: "title" });
  f.appendChild(title);
  add(f, spacer(), { grow: true });
  const caps = AL("H", { name: "CaptionButtons" });
  for (const type of ["Minimize", "Maximize", "Close"]) caps.appendChild(inst("CaptionButton", { Type: type, State: "Rest" }));
  f.appendChild(caps);
  caps.layoutAlign = "STRETCH";
  const c = toComponent(f, "AppTitleBar", "Window title bar: 16px app icon, Caption title, caption buttons. 32px tall per Windows 11 metrics.");
  textProp(c, "Title", [title]);
  const k = c.addComponentProperty("Icon", "INSTANCE_SWAP", iconByName("terminal").id);
  ic.componentPropertyReferences = { mainComponent: k };
  place(c, 640, 80);
  created.AppTitleBar = c.id;
}

// ---- TerminalTab ----
{
  const variants = [];
  for (const state of ["Selected", "Rest"]) {
    const f = AL("H", { name: "State=" + state, w: 240, h: 32, pad: [0, 12], gap: 8, cross: "CENTER", fill: state === "Selected" ? "terminal/bg" : null, r: 8 });
    f.topLeftRadius = 8;
    f.topRightRadius = 8;
    f.bottomLeftRadius = 0;
    f.bottomRightRadius = 0;
    const ic = iconByName("terminal").createInstance();
    ic.resize(16, 16);
    recolorIcon(ic, state === "Selected" ? "accent/text" : "text/tertiary");
    f.appendChild(ic);
    const label = await T("Tab title", "Caption", state === "Selected" ? "text/primary" : "text/secondary", { name: "label" });
    add(f, label, { grow: true });
    const x = iconByName("close").createInstance();
    x.name = "close";
    x.resize(12, 12);
    recolorIcon(x, "text/tertiary");
    f.appendChild(x);
    variants.push(toComponent(f, "State=" + state));
  }
  const set = combine(variants, "TerminalTab", 640, 160, "Tab for the Terminal tab strip.");
  textProp(set, "Label", variants.map((v) => v.findOne((n) => n.name === "label")));
  created.TerminalTab = set.id;
}

// ---- Badge ----
{
  const tones = {
    Neutral: ["system/attention-bg", "text/secondary"],
    Accent: ["system/attention-bg", "accent/text"],
    Success: ["system/success-bg", "system/success"],
    Caution: ["system/caution-bg", "system/caution"],
    Critical: ["system/critical-bg", "system/critical"],
  };
  const variants = [];
  for (const [tone, [bg, fg]] of Object.entries(tones)) {
    const f = AL("H", { name: "Tone=" + tone, pad: [2, 8], gap: 6, cross: "CENTER", fill: bg });
    f.cornerRadius = 999;
    const dot = figma.createEllipse();
    dot.name = "dot";
    dot.resize(6, 6);
    fill(dot, fg);
    f.appendChild(dot);
    f.appendChild(await T("Status", "Caption", fg, { name: "label" }));
    variants.push(toComponent(f, "Tone=" + tone));
  }
  const set = combine(variants, "Badge", 640, 240, "Status pill. Tone maps to Fluent system colors.");
  textProp(set, "Label", variants.map((v) => v.findOne((n) => n.name === "label")));
  boolProp(set, "Dot", variants.map((v) => v.findOne((n) => n.name === "dot")));
  created.Badge = set.id;
}

// ---- Meter (heat / trace / usage) ----
{
  const levels = { Low: [0.2, "system/success"], Medium: [0.45, "system/caution"], High: [0.7, "system/caution"], Critical: [0.92, "system/critical"] };
  const variants = [];
  for (const [level, [pct, color]] of Object.entries(levels)) {
    const f = AL("V", { name: "Level=" + level, w: 240, gap: 8 });
    const top = AL("H", { name: "header", main: "SPACE_BETWEEN", cross: "CENTER" });
    add(f, top, { fw: true });
    top.appendChild(await T("Label", "Caption", "text/secondary", { name: "label" }));
    top.appendChild(await T("00%", "Body Strong", color, { name: "value" }));
    const track = AL("H", { name: "track", h: 4, fill: "subtle/hover" });
    track.cornerRadius = 2;
    add(f, track, { fw: true });
    const bar = figma.createRectangle();
    bar.name = "fill";
    bar.resize(Math.round(240 * pct), 4);
    bar.cornerRadius = 2;
    fill(bar, color);
    track.appendChild(bar);
    variants.push(toComponent(f, "Level=" + level));
  }
  const set = combine(variants, "Meter", 640, 320, "Horizontal meter for Heat, Trace and resource usage. Level sets fill length and color.");
  textProp(set, "Label", variants.map((v) => v.findOne((n) => n.name === "label")));
  textProp(set, "Value", variants.map((v) => v.findOne((n) => n.name === "value")));
  created.Meter = set.id;
}

// ---- KeyValue ----
{
  const f = AL("H", { name: "KeyValue", w: 320, gap: 12, cross: "CENTER" });
  const k = await T("Label", "Caption", "text/tertiary", { name: "key" });
  k.resize(120, k.height);
  k.textAutoResize = "HEIGHT";
  f.appendChild(k);
  const v = await T("Value", "Caption", "text/primary", { name: "value" });
  add(f, v, { grow: true });
  const c = toComponent(f, "KeyValue", "Label/value row for property lists.");
  textProp(c, "Label", [k]);
  textProp(c, "Value", [v]);
  place(c, 640, 440);
  created.KeyValue = c.id;
}

// ---- SectionHeader ----
{
  const f = AL("H", { name: "SectionHeader", w: 400, main: "SPACE_BETWEEN", cross: "CENTER" });
  const t = await T("Section title", "Body Strong", "text/primary", { name: "title" });
  const a = await T("Action", "Caption", "accent/text", { name: "action" });
  addAll(f, [t, a]);
  const c = toComponent(f, "SectionHeader", "Title row above a group of content with an optional text action.");
  textProp(c, "Title", [t]);
  textProp(c, "Action", [a]);
  boolProp(c, "Show action", [a]);
  place(c, 640, 490);
  created.SectionHeader = c.id;
}

await flushEffects();
return created;
