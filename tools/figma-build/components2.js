// 07 Game Components, part 2
const sec = figma.currentPage.children.find((n) => n.type === "SECTION" && n.name === "07 Game Components");
const NAMES = ["ConsoleLine", "CodeLine", "TableRow", "LootRow", "HardwareSlot", "ModuleChip", "Dropzone", "Countdown", "RedactionLine", "NavItem"];
for (const c of sec.children.filter((n) => NAMES.includes(n.name))) c.remove();
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
function swapProp(owner, name, layers, defId) {
  const key = owner.addComponentProperty(name, "INSTANCE_SWAP", defId);
  for (const l of layers) l.componentPropertyReferences = Object.assign({}, l.componentPropertyReferences || {}, { mainComponent: key });
}
function combine(comps, name, x, y, description, gap = 12) {
  const set = figma.combineAsVariants(comps, sec);
  set.name = name;
  if (description) set.description = description;
  set.layoutMode = "VERTICAL";
  set.itemSpacing = gap;
  set.paddingTop = set.paddingBottom = set.paddingLeft = set.paddingRight = 16;
  set.primaryAxisSizingMode = "AUTO";
  set.counterAxisSizingMode = "AUTO";
  fill(set, "bg/solid-base");
  set.cornerRadius = 8;
  set.x = x;
  set.y = y;
  return set;
}
// Find a layer by name that is owned by the component itself (not inside a nested instance)
function own(root, name) {
  return root.findOne((n) => {
    if (n.name !== name) return false;
    for (let p = n.parent; p && p !== root; p = p.parent) if (p.type === "INSTANCE") return false;
    return true;
  });
}
function place(node, x, y) {
  sec.appendChild(node);
  node.x = x;
  node.y = y;
  return node;
}
const iconComp = (n) => variant("Icon", { Name: n });
function sizedIcon(name, size, color) {
  const i = iconComp(name).createInstance();
  i.resize(size, size);
  if (color) recolorIcon(i, color);
  return i;
}
async function cell(text, w, style = "Body", color = "text/primary", name) {
  const t = await T(text, style, color, { name: name || "cell" });
  t.textAutoResize = "NONE";
  t.resize(w, t.height);
  t.textTruncation = "ENDING";
  return t;
}

// ---- ConsoleLine (Cascadia Mono) ----
{
  const levels = {
    Default: "terminal/text",
    Muted: "text/tertiary",
    Info: "terminal/blue",
    Success: "terminal/green",
    Warning: "terminal/yellow",
    Error: "terminal/red",
  };
  const variants = [];
  for (const [lvl, color] of Object.entries(levels)) {
    const f = AL("H", { name: "Level=" + lvl, w: 720, gap: 8 });
    const t = await T("Output line placeholder", "Mono", color, { name: "text" });
    f.appendChild(t);
    variants.push(toComponent(f, "Level=" + lvl));
  }
  const p = AL("H", { name: "Level=Prompt", w: 720, gap: 8 });
  const pr = await T("C:\\Users\\ByteCore>", "Mono", "terminal/green", { name: "prompt" });
  const cm = await T("command --option <value>", "Mono", "text/primary", { name: "text" });
  addAll(p, [pr, cm]);
  variants.push(toComponent(p, "Level=Prompt"));
  const r = AL("H", { name: "Level=Remote prompt", w: 720, gap: 8 });
  const rp = await T("[user@host ~]#", "Mono", "accent/text", { name: "prompt" });
  const rc = await T("command <argument>", "Mono", "text/primary", { name: "text" });
  addAll(r, [rp, rc]);
  variants.push(toComponent(r, "Level=Remote prompt"));
  const set = combine(variants, "ConsoleLine", 1320, 80, "One line of terminal output in Cascadia Mono. Prompt variants split prompt and command.", 4);
  textProp(set, "Text", variants.map((v) => own(v, "text")));
  textProp(set, "Prompt", variants.map((v) => own(v, "prompt")).filter(Boolean));
  created.ConsoleLine = set.id;
}

// ---- CodeLine (editor gutter + code) ----
{
  const states = { Default: null, Active: "subtle/selected", Error: "system/critical-bg" };
  const variants = [];
  for (const [state, bg] of Object.entries(states)) {
    const f = AL("H", { name: "State=" + state, w: 720, h: 20, gap: 16, cross: "CENTER", fill: bg });
    const num = await T("1", "Mono", state === "Active" ? "text/primary" : "text/disabled", { name: "number" });
    num.textAutoResize = "NONE";
    num.resize(40, 20);
    num.textAlignHorizontal = "RIGHT";
    f.appendChild(num);
    const code = await T("const value = placeholder;", "Mono", "terminal/text", { name: "code" });
    f.appendChild(code);
    variants.push(toComponent(f, "State=" + state));
  }
  const set = combine(variants, "CodeLine", 1320, 420, "Editor line: right-aligned gutter number and code text. Color code tokens with text range fills.", 0);
  textProp(set, "Number", variants.map((v) => own(v, "number")));
  textProp(set, "Code", variants.map((v) => own(v, "code")));
  created.CodeLine = set.id;
}

// ---- TableRow (5 text columns) ----
{
  const states = { Rest: null, Hover: "subtle/hover", Selected: "subtle/selected" };
  const variants = [];
  for (const [state, bg] of Object.entries(states)) {
    const f = AL("H", { name: "State=" + state, w: 840, h: 36, pad: [0, 12], gap: 12, cross: "CENTER", fill: bg, r: 4 });
    const lead = sizedIcon("file", 16, "text/secondary");
    lead.name = "leading icon";
    f.appendChild(lead);
    const widths = [280, 140, 120, 120, 100];
    for (let i = 0; i < widths.length; i++) {
      f.appendChild(await cell(i === 0 ? "Primary text" : "Value", widths[i], "Body", i === 0 ? "text/primary" : "text/secondary", "col" + (i + 1)));
    }
    variants.push(toComponent(f, "State=" + state));
  }
  const set = combine(variants, "TableRow", 1320, 600, "Generic details-view row: leading icon + 5 truncating columns. Resize column layers per table.", 4);
  for (let i = 1; i <= 5; i++) textProp(set, "Col" + i, variants.map((v) => v.findOne((n) => n.name === "col" + i)));
  swapProp(set, "Leading icon", variants.map((v) => own(v, "leading icon")), iconComp("file").id);
  boolProp(set, "Show icon", variants.map((v) => own(v, "leading icon")));
  created.TableRow = set.id;
}

// ---- LootRow (market batch list) ----
{
  const states = { Rest: [null, "Unchecked"], Selected: ["subtle/selected", "Checked"], Burned: [null, "Unchecked"] };
  const variants = [];
  for (const [state, [bg, check]] of Object.entries(states)) {
    const f = AL("H", { name: "State=" + state, w: 900, h: 44, pad: [0, 12], gap: 12, cross: "CENTER", fill: bg, r: 4 });
    const cb = inst("CheckBox", { Value: check });
    cb.findOne((n) => n.type === "TEXT").visible = false;
    cb.name = "check";
    f.appendChild(cb);
    f.appendChild(sizedIcon("document", 16, state === "Burned" ? "text/disabled" : "text/secondary"));
    const nameCol = AL("V", { name: "name col", w: 260, gap: 0 });
    nameCol.appendChild(await cell("item_name.ext", 260, "Body", state === "Burned" ? "text/disabled" : "text/primary", "name"));
    nameCol.appendChild(await cell("Source placeholder", 260, "Caption", "text/tertiary", "source"));
    f.appendChild(nameCol);
    f.appendChild(await cell("0.0 MB", 80, "Body", "text/secondary", "size"));
    const rarity = inst("RarityLabel", { Rarity: "Rare" });
    rarity.name = "rarity";
    const rw = AL("H", { name: "rarity cell", w: 110 });
    rw.appendChild(rarity);
    f.appendChild(rw);
    const fresh = inst("Meter", { Level: state === "Burned" ? "Critical" : "Medium" });
    fresh.name = "freshness";
    fresh.resize(140, fresh.height);
    props(fresh, { Label: "Freshness", Value: "00%" });
    f.appendChild(fresh);
    const badge = inst("Badge", { Tone: state === "Burned" ? "Critical" : "Success" });
    badge.name = "status";
    props(badge, { Label: state === "Burned" ? "Already sold" : "Verified" });
    const bw = AL("H", { name: "status cell", w: 110 });
    bw.appendChild(badge);
    f.appendChild(bw);
    add(f, spacer(), { grow: true });
    f.appendChild(await T(state === "Burned" ? "₵ 0" : "₵ 0,000", "Body Strong", state === "Burned" ? "text/disabled" : "text/primary", { name: "value" }));
    variants.push(toComponent(f, "State=" + state));
  }
  const set = combine(variants, "LootRow", 1320, 860, "Batch upload row for the market: checkbox, item, size, rarity, freshness meter, verification badge, payout. Burned = already sold copy.", 4);
  textProp(set, "Name", variants.map((v) => own(v, "name")));
  textProp(set, "Source", variants.map((v) => own(v, "source")));
  textProp(set, "Size", variants.map((v) => own(v, "size")));
  textProp(set, "Value", variants.map((v) => own(v, "value")));
  created.LootRow = set.id;
}

// ---- HardwareSlot (rig upgrade card) ----
{
  const f = AL("V", { name: "HardwareSlot", w: 300, pad: 16, gap: 12, fill: "bg/card", stroke: "stroke/card", r: 8 });
  const head = AL("H", { name: "header", gap: 12, cross: "CENTER" });
  add(f, head, { fw: true });
  const tile = AL("H", { name: "icon tile", w: 40, h: 40, main: "CENTER", cross: "CENTER", fill: "subtle/hover", r: 4 });
  const hi = sizedIcon("cpu", 20, "accent/text");
  hi.name = "icon";
  tile.appendChild(hi);
  head.appendChild(tile);
  const titles = AL("V", { name: "titles", gap: 0 });
  titles.appendChild(await T("Component name", "Body Strong", "text/primary", { name: "title" }));
  titles.appendChild(await T("Tier 0 · Model placeholder", "Caption", "text/secondary", { name: "tier" }));
  add(head, titles, { grow: true });
  const badge = inst("Badge", { Tone: "Accent" });
  badge.name = "slot badge";
  props(badge, { Label: "Installed" });
  head.appendChild(badge);
  const kv1 = inst("KeyValue");
  props(kv1, { Label: "Stat one", Value: "0.0" });
  const kv2 = inst("KeyValue");
  props(kv2, { Label: "Stat two", Value: "0.0" });
  add(f, kv1, { fw: true });
  add(f, kv2, { fw: true });
  const meter = inst("Meter", { Level: "Medium" });
  props(meter, { Label: "Usage", Value: "00%" });
  add(f, meter, { fw: true });
  add(f, divider("H"), { fw: true });
  const foot = AL("H", { name: "footer", main: "SPACE_BETWEEN", cross: "CENTER" });
  add(f, foot, { fw: true });
  const nextT = AL("V", { name: "next", gap: 0 });
  nextT.appendChild(await T("Next tier", "Caption", "text/tertiary", { name: "next label" }));
  nextT.appendChild(await T("₵ 0,000", "Body Strong", "text/primary", { name: "price" }));
  foot.appendChild(nextT);
  const btn = inst("Button", { Style: "Accent", State: "Rest", Icon: "No" }, { label: "Upgrade" });
  btn.name = "action";
  foot.appendChild(btn);
  const c = toComponent(f, "HardwareSlot", "Rig Manager hardware card: icon, tier, two stats, usage meter, next-tier price and upgrade action.");
  textProp(c, "Title", [own(c, "title")]);
  textProp(c, "Tier", [own(c, "tier")]);
  textProp(c, "Price", [own(c, "price")]);
  swapProp(c, "Icon", [own(c, "icon")], iconComp("cpu").id);
  place(c, 2300, 80);
  created.HardwareSlot = c.id;
}

// ---- ModuleChip (equipped .dll / .mod) ----
{
  const states = { Equipped: ["bg/card", "accent/text"], Empty: [null, "text/disabled"] };
  const variants = [];
  for (const [state, [bg, color]] of Object.entries(states)) {
    const f = AL("H", { name: "State=" + state, w: 300, h: 56, pad: [0, 12], gap: 12, cross: "CENTER", fill: bg, stroke: "stroke/control", r: 8 });
    if (state === "Empty") f.dashPattern = [4, 4];
    const ic = sizedIcon(state === "Empty" ? "plus" : "puzzle", 20, color);
    ic.name = "icon";
    f.appendChild(ic);
    const col = AL("V", { name: "text", gap: 0 });
    col.appendChild(await T(state === "Empty" ? "Empty slot" : "module_name.dll", "Body", state === "Empty" ? "text/tertiary" : "text/primary", { name: "title" }));
    col.appendChild(await T(state === "Empty" ? "Drop a module here" : "+0% effect placeholder", "Caption", state === "Empty" ? "text/disabled" : "system/success", { name: "effect" }));
    add(f, col, { grow: true });
    variants.push(toComponent(f, "State=" + state));
  }
  const set = combine(variants, "ModuleChip", 2300, 520, "Passive module slot (.dll/.mod). Empty uses a dashed outline.", 8);
  textProp(set, "Title", variants.map((v) => own(v, "title")));
  textProp(set, "Effect", variants.map((v) => own(v, "effect")));
  created.ModuleChip = set.id;
}

// ---- Dropzone ----
{
  const states = { Rest: ["stroke/control-strong", null], DragOver: ["accent/default", "subtle/selected"] };
  const variants = [];
  for (const [state, [line, bg]] of Object.entries(states)) {
    const f = AL("V", { name: "State=" + state, w: 400, h: 180, gap: 8, main: "CENTER", cross: "CENTER", fill: bg, stroke: line, r: 8 });
    f.dashPattern = [6, 4];
    f.appendChild(sizedIcon("upload", 32, state === "DragOver" ? "accent/text" : "text/secondary"));
    f.appendChild(await T("Drop .js files here", "Body Strong", "text/primary", { name: "title", align: "CENTER" }));
    f.appendChild(await T("or browse from this PC", "Caption", "text/secondary", { name: "caption", align: "CENTER" }));
    variants.push(toComponent(f, "State=" + state));
  }
  const set = combine(variants, "Dropzone", 2300, 720, "File drop target with dashed border; DragOver uses accent.", 12);
  textProp(set, "Title", variants.map((v) => own(v, "title")));
  textProp(set, "Caption", variants.map((v) => own(v, "caption")));
  created.Dropzone = set.id;
}

// ---- Countdown ----
{
  const tones = { Neutral: "text/primary", Critical: "system/critical" };
  const variants = [];
  for (const [tone, color] of Object.entries(tones)) {
    const f = AL("V", { name: "Tone=" + tone, gap: 4 });
    f.appendChild(await T("Time remaining", "Caption", "text/secondary", { name: "label" }));
    f.appendChild(await T("00:00:00", "Title Large", color, { name: "value" }));
    variants.push(toComponent(f, "Tone=" + tone));
  }
  const set = combine(variants, "Countdown", 2840, 80, "Large timer readout for sentences, puzzles and lockouts.", 12);
  textProp(set, "Label", variants.map((v) => own(v, "label")));
  textProp(set, "Value", variants.map((v) => own(v, "value")));
  created.Countdown = set.id;
}

// ---- RedactionLine (document mini-game) ----
{
  const variants = [];
  for (const state of ["Clean", "Redacted", "Flagged"]) {
    const f = AL("H", { name: "State=" + state, w: 520, h: 24, gap: 6, cross: "CENTER", pad: [0, 4], r: 4, fill: state === "Flagged" ? "system/caution-bg" : null });
    const t = await T("Document line placeholder text", "Body", "text/primary", { name: "text" });
    f.appendChild(t);
    if (state === "Redacted") {
      const bar = AL("H", { name: "redaction", w: 160, h: 16, fill: "text/primary" });
      bar.cornerRadius = 2;
      fill(bar, "text/on-accent");
      f.appendChild(bar);
    }
    variants.push(toComponent(f, "State=" + state));
  }
  const set = combine(variants, "RedactionLine", 2840, 300, "Line in the document-review mini-game. Redacted shows a black bar; Flagged highlights a line needing action.", 4);
  textProp(set, "Text", variants.map((v) => own(v, "text")));
  created.RedactionLine = set.id;
}

// ---- NavItem (sidebar with vector icon) ----
{
  const states = { Rest: null, Hover: "subtle/hover", Selected: "subtle/selected" };
  const variants = [];
  for (const [state, bg] of Object.entries(states)) {
    const f = AL("H", { name: "State=" + state, w: 240, h: 36, pad: [0, 12], gap: 12, cross: "CENTER", fill: bg, r: 4 });
    const pill = AL("H", { name: "indicator", w: 3, h: 16, fill: "accent/default" });
    pill.cornerRadius = 2;
    pill.visible = state === "Selected";
    f.appendChild(pill);
    const ic = sizedIcon("grid", 16, "text/primary");
    ic.name = "icon";
    f.appendChild(ic);
    add(f, await T("Navigation item", "Body", "text/primary", { name: "label" }), { grow: true });
    const count = inst("Badge", { Tone: "Neutral" });
    count.name = "count";
    props(count, { Label: "0", Dot: false });
    count.visible = false;
    f.appendChild(count);
    variants.push(toComponent(f, "State=" + state));
  }
  const set = combine(variants, "NavItem", 2840, 520, "Sidebar item with vector icon, selection pill and optional count badge.", 4);
  textProp(set, "Label", variants.map((v) => own(v, "label")));
  swapProp(set, "Icon", variants.map((v) => own(v, "icon")), iconComp("grid").id);
  boolProp(set, "Show count", variants.map((v) => own(v, "count")), false);
  created.NavItem = set.id;
}

await flushEffects();
return created;
