// 08 Apps: Rig Manager (Settings-style navigation, StatCards, HardwareSlot grid, ModuleChip slots, storage meter)
const sec = figma.currentPage.children.find((n) => n.type === "SECTION" && n.name === "08 Apps");

// HardwareSlot (07): let the title column take the free width and truncate long tier text
{
  const hs = findSet("HardwareSlot");
  const titles = hs.findOne((n) => n.name === "titles");
  titles.layoutGrow = 1;
  titles.layoutSizingVertical = "HUG";
  for (const t of titles.children) {
    t.layoutSizingHorizontal = "FILL";
    t.textAutoResize = "HEIGHT";
    t.textTruncation = "ENDING";
    t.maxLines = 1;
  }
}

const { page } = await settingsWindow(sec, "Window/Rig Manager", "Rig Manager", "app/RigManager", 120, 1960, {
  navHeader: { picture: await (async () => {
    const tile = AL("H", { name: "Rig picture", w: 64, h: 64, fill: "control/default", stroke: "stroke/control", main: "CENTER", cross: "CENTER", r: 8 });
    tile.appendChild(await imgIcon("icon/developer_board", 32));
    return tile;
  })(), title: "RIG-NAME-01", caption: "Custom rig  ·  Lv.0" },
  search: "Find a component",
  nav: [["Overview", "icon/home"], ["Hardware", "icon/developer_board"], ["Modules", "icon/square_multiple"], ["Storage", "icon/database"], ["Network", "icon/globe"], ["Power", "icon/power"], ["Security", "icon/lock_closed"]],
  selected: "Overview",
  footer: ["Settings", "icon/settings"],
  pageTitle: "Overview",
});

// Summary row
const stats = AL("H", { name: "Summary", gap: 12 });
add(page, stats, { fw: true });
for (const [h, v, c, ic] of [["Processing", "0.0 GHz", "Placeholder caption", "icon/developer_board"], ["Memory", "00 GB", "0 of 0 slots used", "icon/square_multiple"], ["Storage", "000 GB", "000 GB free", "icon/database"], ["Power draw", "000 W", "Placeholder caption", "icon/power"]]) {
  add(stats, await statCard(h, v, c, ic), { grow: true });
}

// Delivery notice: upgrades are ordered in the Browser Market, delivered after a timer, then installed here (GDD 3.7)
const notice = inst("InfoBar", { Severity: "Success" }, { title: "Package delivered", message: "Placeholder part is ready to install." });
add(page, notice, { fw: true });

// Hardware grid. Slot states: installed (shop for a newer part), delivered (Replace; old part goes to Rig Stock),
// in transit (track the order). There is no pay-to-upgrade button.
async function heading(title, action) {
  const sh = inst("SectionHeader");
  props(sh, { Title: title, Action: action || "Action", "Show action": !!action });
  const wrap = AL("H", { name: "Heading/" + title, pad: [16, 0, 4, 0] });
  add(page, wrap, { fw: true });
  add(wrap, sh, { grow: true });
  return wrap;
}
await heading("Hardware", "Open Rig Stock");
const grid = AL("H", { name: "Hardware grid", gap: 12 });
add(page, grid, { fw: true });
for (const [title, tier, ic, k1, k2, level, use, badge, tone, footLabel, footValue, action, style] of [
  ["Processor", "Tier 0 · Model", "cpu", ["Cores", "0"], ["Clock", "0.0 GHz"], "Medium", "00%", "Installed", "Accent", "Next tier", "₵ 0,000", "Shop", "Standard"],
  ["Memory", "Tier 0 · Model", "memory", ["Capacity", "00 GB"], ["Speed", "0000 MT/s"], "Low", "00%", "Delivered", "Success", "Old part", "To Rig Stock", "Replace", "Accent"],
  ["Network", "Tier 0 · Model", "network", ["Bandwidth", "0 Gbps"], ["Latency", "00 ms"], "High", "00%", "On the way", "Caution", "Arrives in", "00:00:00", "Track", "Standard"],
]) {
  const s = findSet("HardwareSlot").createInstance();
  props(s, { Title: title, Tier: tier, Price: footValue, Icon: variant("Icon", { Name: ic }).id });
  s.name = "HardwareSlot/" + title;
  const kvs = s.findAll((n) => n.type === "INSTANCE" && n.name === "KeyValue");
  for (const [i, [k, v]] of [k1, k2].entries()) setTexts(kvs[i], { key: k, value: v });
  const m = s.findOne((n) => n.type === "INSTANCE" && n.name === "Meter");
  m.swapComponent(variant("Meter", { Level: level }));
  setTexts(m, { label: "Usage", value: use });
  const b = s.findOne((n) => n.name === "slot badge");
  b.swapComponent(variant("Badge", { Tone: tone }));
  setTexts(b, { label: badge });
  setTexts(s.findOne((n) => n.name === "next"), { "next label": footLabel });
  const a = s.findOne((n) => n.name === "action");
  a.swapComponent(variant("Button", { Style: style, State: "Rest", Icon: "No" }));
  setTexts(a, { label: action });
  a.resize(Math.ceil(a.findOne((n) => n.type === "TEXT").width) + 24, a.height);
  add(grid, s, { grow: true });
}

// Module slots
await heading("Modules", "Manage");
const mods = AL("H", { name: "Module slots", gap: 12 });
add(page, mods, { fw: true });
for (const [state, title, effect] of [["Equipped", "module_name.dll", "+0% effect placeholder"], ["Equipped", "module_name.dll", "+0% effect placeholder"], ["Empty", "Empty slot", "Drop a module here"]]) {
  const c = inst("ModuleChip", { State: state });
  props(c, { Title: title, Effect: effect });
  add(mods, c, { grow: true });
}

// Storage
await heading("Storage");
const st = card("Storage card", { dir: "H", gap: 24, cross: "CENTER" });
add(page, st, { fw: true });
add(st, await imgIcon("icon/database", 20));
const meter = inst("Meter", { Level: "Medium" });
props(meter, { Label: "000 GB of 000 GB used", Value: "00%" });
add(st, meter, { grow: true });
const kvCol = AL("V", { name: "details", gap: 4, w: 220 });
st.appendChild(kvCol);
for (const [k, v] of [["Scripts", "00 GB"], ["Logs", "0.0 GB"]]) {
  const kv = inst("KeyValue");
  props(kv, { Label: k, Value: v });
  add(kvCol, kv, { fw: true });
}
st.appendChild(btn("Clean up"));
return sec.id;
