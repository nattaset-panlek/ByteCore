// ---- shared helpers (prepended to every script) ----
const PAGE = await figma.getNodeByIdAsync('4:2051');
await figma.setCurrentPageAsync(PAGE);
const SEC = { root: '11:2132', found: '11:2133', comp: '11:2134', shell: '11:2135', explorer: '11:2136', settings: '11:2137', apps: '11:2138', dialogs: '11:2139' };
const getSec = async (k) => figma.getNodeByIdAsync(SEC[k]);
const V = Object.fromEntries((await figma.variables.getLocalVariablesAsync()).map((v) => [v.name, v]));
const TS = Object.fromEntries((await figma.getLocalTextStylesAsync()).map((s) => [s.name.replace('ByteCore/', ''), s]));
const ES = Object.fromEntries((await figma.getLocalEffectStylesAsync()).map((s) => [s.name.replace('ByteCore/', ''), s]));
await Promise.all([['Inter', 'Regular'], ['Inter', 'Semi Bold'], ['Inter', 'Medium'], ['Cascadia Mono', 'Regular']].map(([family, style]) => figma.loadFontAsync({ family, style })));

const vp = (name) => { if (!V[name]) throw new Error('no var ' + name); return figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', V[name]); };
const fill = (n, name) => { n.fills = name ? [vp(name)] : []; return n; };
const stroke = (n, name, w = 1, align = 'INSIDE') => { n.strokes = [vp(name)]; n.strokeWeight = w; n.strokeAlign = align; return n; };
const rad = (n, name) => { const v = V['radius/' + name]; for (const k of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) n.setBoundVariable(k, v); return n; };
const solid = (hex, a = 1) => { const h = hex.replace('#', ''); return { type: 'SOLID', color: { r: parseInt(h.slice(0, 2), 16) / 255, g: parseInt(h.slice(2, 4), 16) / 255, b: parseInt(h.slice(4, 6), 16) / 255 }, opacity: a }; };

function txt(chars, style = 'Body', color = 'text/primary', o = {}) {
  const t = figma.createText();
  t.textStyleId = TS[style].id;
  t.characters = String(chars);
  t.fills = [vp(color)];
  if (o.name) t.name = o.name;
  if (o.width) { t.textAutoResize = 'HEIGHT'; t.resize(o.width, t.height); }
  if (o.align) t.textAlignHorizontal = o.align;
  if (o.truncate) { t.textTruncation = 'ENDING'; t.maxLines = o.truncate; }
  return t;
}
function al(dir, props = {}, children = []) {
  const f = figma.createAutoLayout(dir === 'H' ? 'HORIZONTAL' : 'VERTICAL');
  f.fills = [];
  const { name, gap, pad, fillVar, strokeVar, sw, radius, main, cross, w, h, clip, effect, wrap } = props;
  if (name) f.name = name;
  if (gap !== undefined) f.itemSpacing = gap;
  if (pad !== undefined) { const p = Array.isArray(pad) ? pad : [pad]; const [t, r = t, b = t, l = r] = p; Object.assign(f, { paddingTop: t, paddingRight: r, paddingBottom: b, paddingLeft: l }); }
  if (fillVar) fill(f, fillVar);
  if (strokeVar) stroke(f, strokeVar, sw || 1);
  if (radius) rad(f, radius);
  if (main) f.primaryAxisAlignItems = main;
  if (cross) f.counterAxisAlignItems = cross;
  if (wrap) f.layoutWrap = 'WRAP';
  if (effect) f.effectStyleId = ES[effect].id;
  f.clipsContent = !!clip;
  for (const c of children.flat()) if (c) add(f, c);
  if (w !== undefined) { f.resize(w, f.height); f.layoutSizingHorizontal = 'FIXED'; }
  if (h !== undefined) { f.resize(f.width, h); f.layoutSizingVertical = 'FIXED'; }
  return f;
}
// append child; honors c.__fill = 'W' | 'H' | 'WH' set via grow()
function add(parent, c) {
  parent.appendChild(c);
  const g = c.__grow;
  if (g && parent.layoutMode && parent.layoutMode !== 'NONE') {
    if (g.includes('W')) c.layoutSizingHorizontal = 'FILL';
    if (g.includes('H')) c.layoutSizingVertical = 'FILL';
  }
  if (c.__abs) { c.layoutPositioning = 'ABSOLUTE'; c.x = c.__abs[0]; c.y = c.__abs[1]; if (c.__abs[2]) c.constraints = c.__abs[2]; }
  return c;
}
const grow = (n, g = 'W') => { n.__grow = g; return n; };
const abs = (n, x, y, constraints) => { n.__abs = [x, y, constraints]; return n; };
const spacer = () => grow(al('H', { name: 'spacer' }), 'W');
function rect(w, h, color, r) { const x = figma.createRectangle(); x.resize(w, h); if (color) fill(x, color); else x.fills = []; if (r) rad(x, r); return x; }
function frame(name, w, h, color) { const f = figma.createFrame(); f.name = name; f.resize(w, h); if (color) fill(f, color); else f.fills = []; f.clipsContent = true; return f; }

// ---- component lookup ----
let __compIndex = null;
async function compIndex() {
  if (__compIndex) return __compIndex;
  const s = await getSec('comp');
  __compIndex = {};
  for (const n of s.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] })) {
    if (n.type === 'COMPONENT' && n.parent && n.parent.type === 'COMPONENT_SET') continue;
    __compIndex[n.name] = n;
  }
  return __compIndex;
}
async function C(name) { const i = await compIndex(); if (!i[name]) throw new Error('no component ' + name); return i[name]; }
function propKey(set, label) { const defs = set.componentPropertyDefinitions; return Object.keys(defs).find((k) => k.split('#')[0] === label); }
// inst('Button', { Style: 'Accent' }, { Label: 'OK' })
async function inst(name, variant = {}, props = {}) {
  const c = await C(name);
  let main = c;
  if (c.type === 'COMPONENT_SET') {
    main = c.children.find((v) => Object.entries(variant).every(([k, val]) => v.variantProperties[k] === val)) || c.defaultVariant;
  }
  const i = main.createInstance();
  if (Object.keys(props).length) {
    const owner = c.type === 'COMPONENT_SET' ? c : main;
    const set = {};
    for (const [label, val] of Object.entries(props)) {
      const k = propKey(owner, label);
      if (!k) throw new Error(`no prop ${label} on ${name}`);
      set[k] = typeof val === 'object' && val && val.id ? val.id : val;
    }
    i.setProperties(set);
  }
  return i;
}
async function icon(name, size = 16, color = 'text/primary') {
  const i = (await C('Icon/' + name)).createInstance();
  i.resize(size, size);
  const g = i.findOne((n) => n.name === 'glyph');
  if (g && color !== 'text/primary') g.fills = [vp(color)];
  return i;
}
async function appIcon(name, size = 32) { const i = (await C('AppIcon/' + name)).createInstance(); i.resize(size, size); return i; }
async function fileIcon(name, size = 48) { const i = (await C('FileIcon/' + name)).createInstance(); i.resize(size, size); return i; }

// place a node in a section on a simple flow grid; returns node
function place(sec, node, x, y) { sec.appendChild(node); node.x = x; node.y = y; return node; }
function fitSection(sec, pad = 80) {
  let mx = 0, my = 0;
  for (const c of sec.children) { mx = Math.max(mx, c.x + c.width); my = Math.max(my, c.y + c.height); }
  sec.resizeWithoutConstraints(mx + pad, my + pad);
}
function label(text, size = 'Subtitle') { return txt(text, size, 'text/primary'); }

// ---- component builders ----
// combos: array of variant value objects; build(vals) returns a FRAME (converted to component).
// props: [{ name, type: 'TEXT'|'BOOLEAN'|'INSTANCE_SWAP', value, node: 'layerName', field }]
function cartesian(axes) {
  return Object.entries(axes).reduce((acc, [k, vals]) => acc.flatMap((o) => vals.map((v) => ({ ...o, [k]: v }))), [{}]);
}
async function variantSet(name, axes, build, props = [], o = {}) {
  const comps = [];
  for (const vals of cartesian(axes)) {
    const f = await build(vals);
    const c = figma.createComponentFromNode(f);
    c.name = Object.entries(vals).map(([k, v]) => `${k}=${v}`).join(', ');
    comps.push(c);
  }
  const host = o.host;
  const set = figma.combineAsVariants(comps, host || figma.currentPage);
  set.name = name;
  set.layoutMode = 'HORIZONTAL'; set.layoutWrap = 'WRAP'; set.itemSpacing = o.gap ?? 16; set.counterAxisSpacing = o.gap ?? 16;
  set.paddingTop = set.paddingBottom = set.paddingLeft = set.paddingRight = 24;
  set.primaryAxisSizingMode = 'FIXED'; set.counterAxisSizingMode = 'AUTO';
  set.resize(o.width || 1000, 100);
  set.fills = [vp('bg/solid-base')]; set.strokes = [solid('#9747FF')]; set.strokeWeight = 1; set.dashPattern = [6, 4]; set.cornerRadius = 8;
  if (o.description) set.description = o.description;
  await bindProps(set, props);
  (await compIndex())[name] = set;
  return set;
}
async function single(name, frameNode, props = [], o = {}) {
  const c = figma.createComponentFromNode(frameNode);
  c.name = name;
  if (o.description) c.description = o.description;
  await bindProps(c, props);
  (await compIndex())[name] = c;
  return c;
}
async function bindProps(owner, props) {
  const variants = owner.type === 'COMPONENT_SET' ? owner.children : [owner];
  for (const p of props) {
    let def = p.value;
    if (p.type === 'INSTANCE_SWAP') def = (await C(p.value)).id;
    const opts = {};
    if (p.type === 'INSTANCE_SWAP' && p.preferred) {
      opts.preferredValues = [];
      for (const n of p.preferred) { const pc = await C(n); opts.preferredValues.push({ type: pc.type === 'COMPONENT_SET' ? 'COMPONENT_SET' : 'COMPONENT', key: pc.key }); }
    }
    const key = owner.addComponentProperty(p.name, p.type, def, Object.keys(opts).length ? opts : undefined);
    const field = p.type === 'TEXT' ? 'characters' : p.type === 'BOOLEAN' ? 'visible' : 'mainComponent';
    for (const v of variants) {
      for (const n of v.findAll((x) => x.name === p.node)) {
        if (p.type === 'INSTANCE_SWAP' && n.type !== 'INSTANCE') continue;
        if (p.type === 'TEXT' && n.type !== 'TEXT') continue;
        n.componentPropertyReferences = { ...(n.componentPropertyReferences || {}), [field]: key };
      }
    }
  }
}
// showcase block: title + description + node
function block(title, desc, node) {
  return al('V', { name: 'Block/' + title, gap: 12 }, [txt(title, 'Body Strong'), desc ? txt(desc, 'Caption', 'text/secondary') : null, node]);
}
const ICON_PREF = ['Icon/add', 'Icon/search', 'Icon/settings', 'Icon/home', 'Icon/folder', 'Icon/delete', 'Icon/copy', 'Icon/cut', 'Icon/arrow_sort', 'Icon/grid', 'Icon/info', 'Icon/power', 'Icon/person'];
// ---- end prelude ----
