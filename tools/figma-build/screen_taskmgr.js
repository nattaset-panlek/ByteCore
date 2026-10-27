// 08 Apps: Task Manager (Processes + Performance), modeled on Windows 11 Task Manager
const sec = getSection("08 Apps", 80, 18794, 2920, 3800);

const W = 1120, H = 760;

async function tmWindow(name, x, y, selectedNav) {
  // TitleBar component (48px tall like Windows 11 Task Manager) with the search box after the title
  const { win, body } = await appWindow(sec, name, "Task Manager", "app/TaskManager", W, H, x, y);
  const tb = win.children[0];
  const wrap = AL("V", { name: "Title bar", h: 48 });
  win.insertChild(0, wrap);
  wrap.layoutSizingHorizontal = "FILL";
  add(wrap, tb, { fw: true, fh: true });
  const search = textBox("Type a name, publisher, or PID to search", 320, true);
  wrap.appendChild(search);
  search.layoutPositioning = "ABSOLUTE";
  search.x = 260; // after the 200px title column, as before
  search.y = 8;

  // Navigation rail
  const nav = AL("V", { name: "Navigation", w: 240, pad: [8, 4, 8, 4], gap: 4 });
  add(body, nav, { fh: true });
  const menu = AL("H", { name: "menu", w: 40, h: 36, main: "CENTER", cross: "CENTER" });
  menu.appendChild(icon("filter", "text/primary"));
  nav.appendChild(menu);
  const items = [["Processes", "grid"], ["Performance", "chart"], ["App history", "clock"], ["Startup apps", "bolt"], ["Users", "person"], ["Details", "document"], ["Services", "puzzle"]];
  for (const [label, ic] of items) {
    const n = inst("NavItem", { State: label === selectedNav ? "Selected" : "Rest" });
    props(n, { Label: label, Icon: variant("Icon", { Name: ic }).id });
    add(nav, n, { fw: true });
  }
  add(nav, spacer(), { grow: true });
  const settings = inst("NavItem", { State: "Rest" });
  props(settings, { Label: "Settings", Icon: variant("Icon", { Name: "settings" }).id });
  add(nav, settings, { fw: true });

  // Content layer (rounded top-left like Windows 11)
  const layer = AL("V", { name: "Content layer", fill: "bg/layer" });
  layer.topLeftRadius = 8;
  add(body, layer, { grow: true, fh: true });
  return { win, layer };
}
async function commandBar(layer, title, buttons) {
  const bar = AL("H", { name: "Command bar", h: 52, pad: [0, 12, 0, 16], gap: 4, cross: "CENTER" });
  add(layer, bar, { fw: true });
  bar.appendChild(await T(title, "Body Strong", "text/primary"));
  add(bar, spacer(), { grow: true });
  for (const [label, disabled] of buttons) {
    const b = inst("Button", { Style: "Subtle", State: disabled ? "Disabled" : "Rest", Icon: "No" }, { label });
    b.resize(Math.ceil(b.findOne((n) => n.type === "TEXT").width) + 24, b.height);
    bar.appendChild(b);
  }
  const more = AL("H", { name: "more", w: 32, h: 32, main: "CENTER", cross: "CENTER" });
  more.appendChild(icon("more", "text/primary"));
  bar.appendChild(more);
  add(layer, divider("H"), { fw: true });
}

// ---------- ProcessRow component ----------
let rowSet = figma.currentPage.findOne((n) => n.type === "COMPONENT_SET" && n.name === "ProcessRow");
if (!rowSet) {
  const gameSec = figma.currentPage.children.find((n) => n.type === "SECTION" && n.name === "07 Game Components");
  const variants = [];
  for (const kind of ["App", "Background"]) {
    const f = AL("H", { name: "Kind=" + kind, w: 860, h: 28, cross: "CENTER" });
    const nameCell = AL("H", { name: "name cell", w: 300, h: 28, pad: [0, 8, 0, 12], gap: 8, cross: "CENTER" });
    const chev = icon("chevronRight", "text/secondary");
    chev.resize(12, 12);
    chev.name = "expander";
    chev.visible = kind === "App";
    nameCell.appendChild(chev);
    const tile = AL("H", { name: "app icon", w: 16, h: 16, fill: "accent/default", r: 4 });
    nameCell.appendChild(tile);
    const nm = await T("App name (0)", "Body", "text/primary", { name: "name" });
    nm.textAutoResize = "NONE";
    nm.resize(230, nm.height);
    nm.textTruncation = "ENDING";
    nameCell.appendChild(nm);
    f.appendChild(nameCell);
    const status = AL("H", { name: "status cell", w: 120, h: 28, pad: [0, 8], cross: "CENTER", main: "MAX" });
    const leaf = icon("check", "system/success");
    leaf.resize(14, 14);
    leaf.name = "status icon";
    leaf.visible = kind === "App";
    status.appendChild(leaf);
    f.appendChild(status);
    for (const col of ["cpu", "memory", "disk", "network"]) {
      const c = AL("H", { name: col + " cell", w: 110, h: 28, pad: [0, 8], cross: "CENTER", main: "MAX", fill: "accent/default", fillOpacity: 0.08 });
      c.appendChild(await T(col === "disk" ? "0 MB/s" : col === "network" ? "0 Mbps" : "0%", "Caption", "text/primary", { name: col }));
      f.appendChild(c);
    }
    const comp = figma.createComponentFromNode(f);
    comp.name = "Kind=" + kind;
    variants.push(comp);
  }
  rowSet = figma.combineAsVariants(variants, gameSec);
  rowSet.name = "ProcessRow";
  rowSet.description = "Task Manager row. Tint metric cells by setting their fill opacity (heat map).";
  rowSet.layoutMode = "VERTICAL";
  rowSet.itemSpacing = 8;
  rowSet.paddingTop = rowSet.paddingBottom = rowSet.paddingLeft = rowSet.paddingRight = 16;
  rowSet.primaryAxisSizingMode = "AUTO";
  rowSet.counterAxisSizingMode = "AUTO";
  fill(rowSet, "bg/solid-base");
  rowSet.cornerRadius = 8;
  rowSet.x = 3300;
  rowSet.y = 640;
  for (const key of ["name", "cpu", "memory", "disk", "network"]) {
    const layers = variants.map((v) => v.findOne((n) => n.name === key && n.type === "TEXT"));
    const k = rowSet.addComponentProperty(key === "name" ? "Name" : key.toUpperCase() === "CPU" ? "CPU" : key[0].toUpperCase() + key.slice(1), "TEXT", layers[0].characters);
    for (const l of layers) l.componentPropertyReferences = { characters: k };
  }
}

// ---------- Processes ----------
{
  const { layer } = await tmWindow("Window/Task Manager/Processes", 120, 160, "Processes");
  await commandBar(layer, "Processes", [["Run new task"], ["End task", true], ["Efficiency mode", true]]);

  // Column headers
  const head = AL("H", { name: "Column headers", h: 56, cross: "MAX" });
  add(layer, head, { fw: true });
  async function headCell(w, top, label, alignRight) {
    const c = AL("V", { name: label + " header", w, h: 56, pad: [8, 8, 6, 12], gap: 0, main: "MAX", cross: alignRight ? "MAX" : "MIN" });
    if (top) c.appendChild(await T(top, "Subtitle", "text/primary"));
    c.appendChild(await T(label, "Caption", "text/secondary"));
    head.appendChild(c);
  }
  await headCell(300, null, "Name");
  await headCell(120, null, "Status");
  await headCell(110, "00%", "CPU", true);
  await headCell(110, "00%", "Memory", true);
  await headCell(110, "0%", "Disk", true);
  await headCell(110, "0%", "Network", true);
  add(layer, divider("H"), { fw: true });

  const list = AL("V", { name: "Process list", pad: [4, 0], gap: 0, clip: true });
  add(layer, list, { fw: true, fh: true });
  const heat = [0.06, 0.1, 0.18, 0.28, 0.38];
  async function group(label) {
    const g = AL("H", { name: "group header", h: 40, pad: [0, 12], cross: "CENTER" });
    add(list, g, { fw: true });
    g.appendChild(await T(label, "Body Large", "text/primary"));
  }
  async function row(kind, name, cpu, mem, disk, net, h) {
    const r = rowSet.children.find((c) => c.name === "Kind=" + kind).createInstance();
    props(r, { Name: name, CPU: cpu, Memory: mem, Disk: disk, Network: net });
    for (const [cell, level] of [["cpu cell", h[0]], ["memory cell", h[1]], ["disk cell", h[2]], ["network cell", h[3]]]) {
      const c = r.findOne((n) => n.name === cell);
      c.fills = [paint("accent/default", heat[level])];
    }
    add(list, r, { fw: true });
  }
  await group("Apps (0)");
  const apps = [
    ["App name (0)", "0%", "0.0%", "0 MB/s", "0 Mbps", [0, 2, 0, 0]],
    ["App name (0)", "0.0%", "00.0%", "0.1 MB/s", "0 Mbps", [1, 3, 0, 0]],
    ["App name (0)", "0%", "00.0%", "0 MB/s", "0 Mbps", [0, 4, 0, 0]],
    ["App name (0)", "0.0%", "00.0%", "0.1 MB/s", "0 Mbps", [1, 4, 0, 0]],
    ["App name", "0%", "0.1%", "0 MB/s", "0 Mbps", [0, 0, 0, 0]],
    ["Task Manager", "0.0%", "0.0%", "0.1 MB/s", "0 Mbps", [0, 0, 0, 0]],
  ];
  for (const a of apps) await row("App", ...a);
  await group("Background processes (000)");
  for (let i = 0; i < 6; i++) await row("Background", "Background process name", "0%", "0.1%", "0 MB/s", "0 Mbps", [0, 0, 0, 0]);
}

// ---------- Performance (Memory) ----------
{
  const { layer } = await tmWindow("Window/Task Manager/Performance", 1340, 160, "Performance");
  await commandBar(layer, "Performance", [["Run new task"]]);
  const split = AL("H", { name: "Split" });
  add(layer, split, { fw: true, fh: true });

  // Resource list with sparkline thumbnails
  const res = AL("V", { name: "Resources", w: 230, pad: 4, gap: 2 });
  add(split, res, { fh: true });
  const SPARKS = {
    teal: "M0 38 L10 36 L18 30 L24 34 L30 20 L36 28 L42 12 L48 30 L56 26 L64 32",
    flat: "M0 30 L40 30 L44 6 L48 6 L64 6",
    spike: "M0 38 L30 38 L34 18 L38 36 L64 38",
    none: "M0 39 L64 39",
  };
  const resources = [
    ["CPU", "00% 0.00 GHz", "teal", "accent/default"],
    ["Memory", "0.0/0.0 GB (00%)", "flat", "rarity/epic"],
    ["Disk 0", "SSD (NVMe)\n0%", "spike", "system/success"],
    ["Disk 1", "USB\n0%", "none", "system/success"],
    ["Network", "S: 0 R: 0 Kbps", "spike", "rarity/epic"],
    ["GPU 0", "GPU model placeholder\n0% (00 °C)", "spike", "rarity/epic"],
  ];
  for (const [name, sub, spark, color] of resources) {
    const item = AL("H", { name: "resource/" + name, pad: [8, 8], gap: 12, r: 4, fill: name === "Memory" ? "subtle/selected" : null });
    add(res, item, { fw: true });
    const thumb = AL("H", { name: "thumbnail", w: 64, h: 40, stroke: "stroke/divider" });
    const v = figma.createNodeFromSvg(`<svg width="64" height="40" viewBox="0 0 64 40" xmlns="http://www.w3.org/2000/svg"><path d="${SPARKS[spark]}" fill="none" stroke="#FFFFFF" stroke-width="1"/></svg>`);
    v.name = "sparkline";
    for (const p of v.findAll((n) => n.type === "VECTOR")) p.strokes = [paint(color)];
    thumb.appendChild(v);
    item.appendChild(thumb);
    const col = AL("V", { name: "text", gap: 0 });
    col.appendChild(await T(name, "Body Large", "text/primary"));
    col.appendChild(await T(sub, "Caption", "text/secondary"));
    item.appendChild(col);
  }

  // Detail pane
  const det = AL("V", { name: "Memory detail", pad: [12, 24, 16, 24], gap: 8 });
  add(split, det, { grow: true, fh: true });
  const titleRow = AL("H", { name: "title row", main: "SPACE_BETWEEN", cross: "CENTER" });
  add(det, titleRow, { fw: true });
  titleRow.appendChild(await T("Memory", "Title", "text/primary"));
  titleRow.appendChild(await T("00.0 GB", "Subtitle", "text/primary"));
  const capRow = AL("H", { name: "graph caption", main: "SPACE_BETWEEN" });
  add(det, capRow, { fw: true });
  capRow.appendChild(await T("Memory usage", "Caption", "text/secondary"));
  capRow.appendChild(await T("00.0 GB", "Caption", "text/secondary"));

  // Usage graph: 10x5 grid + area
  const GW = 560, GH = 200;
  const graph = figma.createFrame();
  graph.name = "usage graph";
  graph.resize(GW, GH);
  graph.fills = [];
  stroke(graph, "rarity/epic");
  graph.clipsContent = true;
  for (let i = 1; i < 10; i++) {
    const l = figma.createRectangle();
    l.resize(1, GH);
    l.x = (GW / 10) * i;
    fill(l, "stroke/divider");
    graph.appendChild(l);
  }
  for (let j = 1; j < 5; j++) {
    const l = figma.createRectangle();
    l.resize(GW, 1);
    l.y = (GH / 5) * j;
    fill(l, "stroke/divider");
    graph.appendChild(l);
  }
  const area = figma.createNodeFromSvg(
    `<svg width="${GW}" height="${GH}" viewBox="0 0 ${GW} ${GH}" xmlns="http://www.w3.org/2000/svg"><path d="M0 ${GH} L250 ${GH} L262 26 L380 28 L420 24 L440 30 L${GW} 28 L${GW} ${GH} Z" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="1.5"/></svg>`
  );
  area.name = "area";
  for (const p of area.findAll((n) => n.type === "VECTOR")) {
    p.fills = [paint("rarity/epic", 0.45)];
    p.opacity = 0.55;
    p.strokes = [paint("rarity/epic")];
  }
  graph.appendChild(area);
  det.appendChild(graph);
  const axis = AL("H", { name: "axis", main: "SPACE_BETWEEN", w: GW });
  det.appendChild(axis);
  axis.appendChild(await T("60 seconds", "Caption", "text/secondary"));
  axis.appendChild(await T("0", "Caption", "text/secondary"));

  det.appendChild(await T("Memory composition", "Caption", "text/secondary"));
  const comp = AL("H", { name: "composition", w: GW, h: 48, stroke: "rarity/epic" });
  const used = AL("H", { name: "in use", w: Math.round(GW * 0.86), h: 48, fill: "rarity/epic", fillOpacity: 0.35 });
  stroke(used, "rarity/epic");
  used.opacity = 0.6;
  comp.appendChild(used);
  det.appendChild(comp);

  // Stats
  const stats = AL("H", { name: "stats", gap: 32 });
  add(det, stats, { fw: true });
  const left = AL("H", { name: "values", gap: 32, wrap: true, w: 340 });
  stats.appendChild(left);
  for (const [label, value] of [["In use (Compressed)", "00.0 GB (00 MB)"], ["Available", "0.0 GB"], ["Committed", "00.0/00.0 GB"], ["Cached", "0.0 GB"], ["Paged pool", "000 MB"], ["Non-paged pool", "000 MB"]]) {
    const s = AL("V", { name: label, gap: 0, w: 150 });
    s.appendChild(await T(label, "Caption", "text/secondary"));
    s.appendChild(await T(value, "Body Large", "text/primary"));
    left.appendChild(s);
  }
  left.counterAxisSpacing = 12;
  const right = AL("V", { name: "hardware", gap: 4, w: 220 });
  stats.appendChild(right);
  for (const [k, v] of [["Speed", "0000 MT/s"], ["Slots used", "0 of 0"], ["Form factor", "Placeholder"], ["Hardware reserved", "000 MB"]]) {
    const kv = inst("KeyValue");
    props(kv, { Label: k, Value: v });
    add(right, kv, { fw: true });
  }
}

return sec.id;
