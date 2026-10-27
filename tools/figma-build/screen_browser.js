// 08 Apps: Browser (Core html). The browser only renders simulated sites: here a generic online computer shop
// (PC Builder + My orders), styled like a real e-commerce site rather than the OS UI.
// Upgrades are ordered here, delivered after a timer, then installed in Rig Manager (GDD 3.7).
const sec = figma.currentPage.children.find((n) => n.type === "SECTION" && n.name === "08 Apps");

// Site palette: the web page is the shop's own light brand, so it gets its own collection (one mode).
{
  const WEB = {
    "web/bg": "F3F5F8", "web/surface": "FFFFFF", "web/surface-alt": "F7F8FA", "web/border": "E2E6EC",
    "web/text": "1B1F27", "web/text-2": "5D6573", "web/text-3": "8A93A2",
    "web/brand": "1463D8", "web/brand-dark": "0D4FB3", "web/brand-tint": "EAF2FE", "web/on-brand": "FFFFFF",
    "web/price": "E02D3C", "web/success": "1F9D55", "web/warning": "D98200",
  };
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  const col = cols.find((c) => c.name === "Web/Market") || figma.variables.createVariableCollection("Web/Market");
  const hex = (h) => ({ r: parseInt(h.slice(0, 2), 16) / 255, g: parseInt(h.slice(2, 4), 16) / 255, b: parseInt(h.slice(4, 6), 16) / 255, a: 1 });
  for (const [name, h] of Object.entries(WEB)) {
    const v = V[name] || figma.variables.createVariable(name, col, "COLOR");
    v.setValueForMode(col.modes[0].modeId, hex(h));
    V[name] = v;
  }
  COLLECTION_MODE[col.id] = col.modes[0].modeId;
}

// ---------- site primitives ----------
function webBtn(label, kind = "primary", opts = {}) {
  const k = {
    primary: { fill: "web/brand", text: "web/on-brand" },
    outline: { fill: "web/surface", stroke: "web/brand", text: "web/brand" },
    ghost: { fill: "web/surface", stroke: "web/border", text: "web/text" },
  }[kind];
  const b = AL("H", { name: "Button/" + label, h: opts.h || 36, pad: [0, opts.padX || 16], gap: 6, main: "CENTER", cross: "CENTER", fill: k.fill, stroke: k.stroke, r: opts.r || 6 });
  b.counterAxisSizingMode = "FIXED";
  return { b, k };
}
async function button(label, kind, opts = {}) {
  const { b, k } = webBtn(label, kind, opts);
  if (opts.icon) {
    const i = icon(opts.icon, k.text);
    i.resize(16, 16);
    b.appendChild(i);
  }
  b.appendChild(await T(label, "Body Strong", k.text));
  return b;
}
async function input(placeholder, w, opts = {}) {
  const f = AL("H", { name: "Input/" + placeholder, w, h: opts.h || 36, pad: [0, 12], gap: 8, cross: "CENTER", fill: "web/surface", stroke: "web/border", r: opts.r || 6 });
  const t = await T(placeholder, "Body", opts.value ? "web/text" : "web/text-3");
  add(f, t, { grow: true });
  if (opts.chevron) {
    const c = icon("chevronDown", "web/text-2");
    c.resize(16, 16);
    f.appendChild(c);
  }
  return f;
}
function panel(name, opts = {}) {
  return AL(opts.dir || "V", Object.assign({ name, pad: 16, gap: 12, fill: "web/surface", stroke: "web/border", r: 8 }, opts));
}
async function tag(text, color) {
  const t = AL("H", { name: "Tag/" + text, pad: [1, 8], stroke: color, r: 4 });
  t.appendChild(await T(text, "Caption", color));
  return t;
}
function thumb(ic, w, h) {
  const f = AL("H", { name: "image", w, h, fill: "web/surface-alt", main: "CENTER", cross: "CENTER", r: 6 });
  const i = icon(ic, "web/text-3");
  const s = Math.round(Math.min(w, h) * 0.42);
  i.resize(s, s);
  f.appendChild(i);
  return f;
}
const RARITY = { Common: "web/text-2", Rare: "rarity/rare", Epic: "rarity/epic", Legendary: "rarity/legendary" };

async function siteChrome(pageF, activeLink) {
  // Brand header: logo, big search, account + cart
  const head = AL("H", { name: "Site header", h: 64, pad: [0, 32], gap: 24, cross: "CENTER", fill: "web/brand" });
  add(pageF, head, { fw: true });
  const logo = AL("H", { name: "logo", gap: 8, cross: "CENTER" });
  head.appendChild(logo);
  const mark = AL("H", { name: "mark", w: 32, h: 32, fill: "web/on-brand", r: 8, main: "CENTER", cross: "CENTER" });
  const mi = icon("cart", "web/brand");
  mi.resize(18, 18);
  mark.appendChild(mi);
  logo.appendChild(mark);
  logo.appendChild(await T("Market name", "Subtitle", "web/on-brand"));
  const search = AL("H", { name: "Search", h: 40, pad: [0, 4, 0, 16], gap: 8, cross: "CENTER", fill: "web/surface", r: 20 });
  add(head, search, { grow: true });
  add(search, await T("Search products, brands, models", "Body", "web/text-3"), { grow: true });
  search.appendChild(await button("Search", "primary", { icon: "search", h: 32, r: 16 }));
  for (const [ic, label] of [["person", "Account"], ["cart", "Cart"]]) {
    const a = AL("H", { name: "header/" + label, gap: 8, cross: "CENTER" });
    head.appendChild(a);
    const i = icon(ic, "web/on-brand");
    i.resize(20, 20);
    a.appendChild(i);
    a.appendChild(await T(label, "Body Strong", "web/on-brand"));
    if (label === "Cart") {
      const badge = AL("H", { name: "count", h: 18, pad: [0, 6], fill: "web/price", r: 9, cross: "CENTER" });
      badge.counterAxisSizingMode = "FIXED";
      badge.appendChild(await T("0", "Caption", "web/on-brand"));
      a.appendChild(badge);
    }
  }
  // Category bar
  const nav = AL("H", { name: "Category bar", h: 44, pad: [0, 32], gap: 24, cross: "CENTER", fill: "web/surface" });
  add(pageF, nav, { fw: true });
  nav.appendChild(await button("All categories", "outline", { icon: "grid", h: 32 }));
  for (const link of ["PC Builder", "Processors", "Memory", "Network", "Storage", "Power", "Deals"]) {
    const l = AL("V", { name: "link/" + link, h: 44, main: "CENTER" });
    nav.appendChild(l);
    const on = link === activeLink;
    l.appendChild(await T(link, on ? "Body Strong" : "Body", on ? "web/brand" : link === "Deals" ? "web/price" : "web/text"));
    if (on) {
      const bar = AL("H", { name: "indicator", w: 24, h: 3, fill: "web/brand" });
      bar.cornerRadius = 2;
      l.appendChild(bar);
      bar.layoutPositioning = "ABSOLUTE";
      bar.x = 0;
      bar.y = 41;
    }
  }
  add(nav, spacer(), { grow: true });
  const track = AL("H", { name: "Track order", gap: 6, cross: "CENTER" });
  nav.appendChild(track);
  const ti = icon("clock", "web/text-2");
  ti.resize(16, 16);
  track.appendChild(ti);
  track.appendChild(await T("Track order", "Body", "web/text-2"));
  const line = divider("H");
  fill(line, "web/border");
  add(pageF, line, { fw: true });
}

async function browserWindow(name, x, y, activeTab, address, activeLink) {
  const { win, body } = await appWindow(sec, name, "Browser", "icon/globe", 1280, 800, x, y, {
    tabs: [["Market name · PC Builder", activeTab === "Market", 240], ["Market name · My orders", activeTab === "Orders", 240]],
    bodyDir: "V",
  });
  // Address row on bg/layer (File Explorer toolbar layer pattern)
  const layer = AL("V", { name: "Toolbar layer", fill: "bg/layer" });
  add(body, layer, { fw: true });
  const row = AL("H", { name: "Address row", h: 52, pad: [0, 12], gap: 4, cross: "CENTER" });
  add(layer, row, { fw: true });
  for (const ic of ["icon/arrow_left", "icon/arrow_clockwise", "icon/home"]) row.appendChild(await iconButton(ic));
  add(row, textBox(address, 600, false), { grow: true });
  row.appendChild(await iconButton("icon/more_horizontal"));
  add(body, divider("H"), { fw: true });

  const pageF = AL("V", { name: "Web page", fill: "web/bg", clip: true });
  add(body, pageF, { fw: true, fh: true });
  await siteChrome(pageF, activeLink);
  return { win, pageF };
}

// ---------- PC Builder (pick a part per slot, summary + order) ----------
{
  const { pageF } = await browserWindow("Window/Browser/Market", 120, 3800, "Market", "core://market/pc-builder", "PC Builder");
  const main = AL("V", { name: "Content", pad: [16, 32], gap: 12 });
  add(pageF, main, { fw: true, fh: true });
  const crumbs = AL("H", { name: "Breadcrumb", gap: 6, cross: "CENTER" });
  main.appendChild(crumbs);
  crumbs.appendChild(await T("Home", "Caption", "web/text-3"));
  crumbs.appendChild(await T("/", "Caption", "web/text-3"));
  crumbs.appendChild(await T("PC Builder", "Caption", "web/text-2"));
  main.appendChild(await T("PC Builder", "Title", "web/text"));

  const cols = AL("H", { name: "Columns", gap: 16 });
  add(main, cols, { fw: true, fh: true });

  // Left: summary + build list
  const left = AL("V", { name: "Build", w: 300, gap: 12 });
  add(cols, left, { fh: true });
  const sum = panel("Summary", { gap: 10 });
  add(left, sum, { fw: true });
  const sh = AL("H", { name: "header", cross: "CENTER" });
  add(sum, sh, { fw: true });
  sh.appendChild(await T("Summary", "Body Strong", "web/text"));
  add(sh, spacer(), { grow: true });
  sh.appendChild(await T("₵ 0,000", "Subtitle", "web/price"));
  sum.appendChild(await T("1 of 4 parts selected  ·  Delivery 00:00:00", "Caption", "web/text-2"));
  add(sum, await button("Place order", "primary", { icon: "cart", h: 40 }), { fw: true });

  const build = panel("Your build", { gap: 8, pad: [12, 12] });
  add(left, build, { fw: true, fh: true });
  const bh = AL("H", { name: "header", cross: "CENTER", pad: [0, 4] });
  add(build, bh, { fw: true });
  bh.appendChild(await T("Your build", "Body Strong", "web/text"));
  add(bh, spacer(), { grow: true });
  const reset = AL("H", { name: "Reset", gap: 4, cross: "CENTER" });
  bh.appendChild(reset);
  const ri = icon("refresh", "web/brand");
  ri.resize(14, 14);
  reset.appendChild(ri);
  reset.appendChild(await T("Reset", "Caption", "web/brand"));
  for (const [name, desc, ic, count, sel] of [
    ["Processor", "Placeholder model selected", "cpu", "1/1", true],
    ["Memory", "Choose a memory kit", "memory", "0/2", false],
    ["Network card", "Choose a network card", "network", "0/1", false],
    ["Storage", "Choose a drive", "disk", "0/2", false],
  ]) {
    const r = AL("H", { name: "slot/" + name, pad: [8, 10], gap: 10, cross: "CENTER", fill: sel ? "web/brand-tint" : "web/surface", stroke: sel ? "web/brand" : "web/border", r: 6 });
    add(build, r, { fw: true });
    r.appendChild(thumb(ic, 44, 44));
    const t = AL("V", { name: "text", gap: 0 });
    add(r, t, { grow: true });
    t.appendChild(await T(name, "Body Strong", sel ? "web/brand" : "web/text"));
    const d = await T(desc, "Caption", "web/text-2");
    add(t, d, { fw: true });
    d.textTruncation = "ENDING";
    d.maxLines = 1;
    r.appendChild(await T(count, "Caption", sel ? "web/brand" : "web/text-3"));
  }

  // Right: product picker for the selected slot
  const pick = panel("Choose part", { gap: 14, pad: [16, 20] });
  add(cols, pick, { grow: true, fh: true });
  const ph = AL("H", { name: "header", gap: 12, cross: "CENTER" });
  add(pick, ph, { fw: true });
  const pt = AL("V", { name: "title", gap: 0 });
  ph.appendChild(pt);
  pt.appendChild(await T("Choose Processor", "Subtitle", "web/brand"));
  pt.appendChild(await T("000 items", "Caption", "web/text-2"));
  add(ph, spacer(), { grow: true });
  const ps = await input("Search in Processor", 260);
  const psi = icon("search", "web/text-2");
  psi.resize(16, 16);
  ps.appendChild(psi);
  ph.appendChild(ps);
  // Filters
  const fl = AL("H", { name: "Filters", gap: 12, cross: "MAX", pad: 12, fill: "web/surface-alt", r: 6 });
  add(pick, fl, { fw: true });
  for (const [label, value] of [["Brand", "All brands"], ["Tier", "All tiers"], ["Sort by", "Price: low to high"]]) {
    const f = AL("V", { name: "filter/" + label, gap: 4 });
    add(fl, f, { grow: true });
    f.appendChild(await T(label, "Caption", "web/text-2"));
    add(f, await input(value, 200, { chevron: true, value: true }), { fw: true });
  }
  fl.appendChild(await button("Reset", "ghost", { icon: "refresh" }));
  // Product grid
  const grid = AL("H", { name: "Products", gap: 12 });
  add(pick, grid, { fw: true });
  for (const [brand, name, ic, rarity, price, was, eta, stock] of [
    ["Brand", "Placeholder processor 0 cores 0.0 GHz", "cpu", "Rare", "₵ 0,000", "₵ 0,000", "00:00:00", true],
    ["Brand", "Placeholder processor 0 cores", "cpu", "Common", "₵ 000", null, "00:00:00", true],
    ["Brand", "Placeholder processor 0 cores", "cpu", "Epic", "₵ 0,000", "₵ 0,000", "00:00:00", true],
    ["Brand", "Placeholder processor 0 cores", "cpu", "Legendary", "₵ 00,000", null, "00:00:00", false],
  ]) {
    const c = panel("Product/" + rarity, { pad: 12, gap: 8 });
    add(grid, c, { grow: true });
    const img = thumb(ic, 100, 96);
    add(c, img, { fw: true });
    if (was) {
      const sale = AL("H", { name: "sale", pad: [2, 6], fill: "web/price", r: 4 });
      sale.appendChild(await T("-00%", "Caption", "web/on-brand"));
      img.appendChild(sale);
      sale.layoutPositioning = "ABSOLUTE";
      sale.x = 8;
      sale.y = 8;
    }
    const br = AL("H", { name: "brand row", cross: "CENTER" });
    add(c, br, { fw: true });
    br.appendChild(await T(brand.toUpperCase(), "Caption", "web/text-3"));
    add(br, spacer(), { grow: true });
    br.appendChild(await tag(rarity, RARITY[rarity]));
    const nm = await T(name, "Body", "web/text");
    add(c, nm, { fw: true });
    nm.textTruncation = "ENDING";
    nm.maxLines = 2;
    nm.textAutoResize = "HEIGHT";
    const pr = AL("H", { name: "price", gap: 8, cross: "CENTER" });
    add(c, pr, { fw: true });
    pr.appendChild(await T(price, "Subtitle", "web/price"));
    if (was) {
      const w = await T(was, "Caption", "web/text-3");
      w.textDecoration = "STRIKETHROUGH";
      pr.appendChild(w);
    }
    const del = AL("H", { name: "delivery", gap: 6, cross: "CENTER" });
    c.appendChild(del);
    const clk = icon(stock ? "clock" : "warning", stock ? "web/success" : "web/warning");
    clk.resize(14, 14);
    del.appendChild(clk);
    del.appendChild(await T(stock ? "Delivery in " + eta : "Pre-order", "Caption", stock ? "web/success" : "web/warning"));
    add(c, await button(stock ? "Add to build" : "Notify me", stock ? "primary" : "outline", { icon: stock ? "plus" : null }), { fw: true });
  }
}

// ---------- My orders (tracking) ----------
{
  const { pageF } = await browserWindow("Window/Browser/Orders", 1520, 3800, "Orders", "core://market/account/orders", null);
  const main = AL("H", { name: "Content", pad: [16, 32], gap: 16 });
  add(pageF, main, { fw: true, fh: true });

  // Account menu
  const menu = panel("Account menu", { w: 240, pad: 8, gap: 2 });
  main.appendChild(menu);
  const who = AL("H", { name: "account", pad: [8, 8, 12, 8], gap: 10, cross: "CENTER" });
  add(menu, who, { fw: true });
  const av = AL("H", { name: "avatar", w: 36, h: 36, fill: "web/brand-tint", r: 18, main: "CENTER", cross: "CENTER" });
  av.appendChild(await T("PN", "Body Strong", "web/brand"));
  who.appendChild(av);
  const wt = AL("V", { name: "text", gap: 0 });
  who.appendChild(wt);
  wt.appendChild(await T("player_name", "Body Strong", "web/text"));
  wt.appendChild(await T("Member", "Caption", "web/text-2"));
  for (const [label, ic, on] of [["My orders", "document", true], ["Wishlist", "eye", false], ["Addresses", "folder", false], ["Payment", "wallet", false], ["Sign out", "exit", false]]) {
    const r = AL("H", { name: "menu/" + label, h: 40, pad: [0, 12], gap: 10, cross: "CENTER", fill: on ? "web/brand-tint" : null, r: 6 });
    add(menu, r, { fw: true });
    const i = icon(ic, on ? "web/brand" : "web/text-2");
    i.resize(16, 16);
    r.appendChild(i);
    r.appendChild(await T(label, on ? "Body Strong" : "Body", on ? "web/brand" : "web/text"));
  }

  const col = AL("V", { name: "Orders", gap: 12 });
  add(main, col, { grow: true, fh: true });
  const top = AL("H", { name: "header", cross: "CENTER", gap: 12 });
  add(col, top, { fw: true });
  top.appendChild(await T("My orders", "Title", "web/text"));
  add(top, spacer(), { grow: true });
  const tabs = AL("H", { name: "Status tabs", gap: 4, pad: 4, fill: "web/surface", stroke: "web/border", r: 8 });
  top.appendChild(tabs);
  for (const [label, on] of [["All", true], ["To ship", false], ["On the way", false], ["Delivered", false]]) {
    const t = AL("H", { name: "tab/" + label, h: 28, pad: [0, 12], cross: "CENTER", fill: on ? "web/brand" : null, r: 6 });
    t.counterAxisSizingMode = "FIXED";
    t.appendChild(await T(label, "Caption", on ? "web/on-brand" : "web/text-2"));
    tabs.appendChild(t);
  }

  const STEPS = ["Ordered", "Packed", "On the way", "Delivered"];
  for (const [name, ic, step, status, color, eta, primary, secondary] of [
    ["Memory placeholder 00 GB kit", "memory", 4, "Delivered", "web/success", "Delivered 00:00", "Install in Rig Manager", "Buy again"],
    ["Network card placeholder", "network", 3, "On the way", "web/warning", "Arrives in 00:00:00", "Track package", null],
    ["Processor placeholder 0-core", "cpu", 1, "Ordered", "web/brand", "Arrives in 00:00:00", null, "Cancel order"],
  ]) {
    const c = panel("Order/" + status, { pad: 0, gap: 0, clip: true });
    add(col, c, { fw: true });
    // Order header strip
    const oh = AL("H", { name: "order header", h: 40, pad: [0, 16], gap: 16, cross: "CENTER", fill: "web/surface-alt" });
    add(c, oh, { fw: true });
    oh.appendChild(await T("Order #0000-0000", "Body Strong", "web/text"));
    oh.appendChild(await T("Placed 00 Mon 0000", "Caption", "web/text-2"));
    add(oh, spacer(), { grow: true });
    oh.appendChild(await tag(status, color));
    const ln = divider("H");
    fill(ln, "web/border");
    add(c, ln, { fw: true });
    // Item + tracker + actions
    const row = AL("H", { name: "order body", pad: [14, 16], gap: 20, cross: "CENTER" });
    add(c, row, { fw: true });
    row.appendChild(thumb(ic, 64, 64));
    const it = AL("V", { name: "item", w: 220, gap: 2 });
    row.appendChild(it);
    it.appendChild(await T(name, "Body Strong", "web/text", { truncate: 220 }));
    it.appendChild(await T("Qty 1  ·  Tier 0", "Caption", "web/text-2"));
    it.appendChild(await T("₵ 0,000", "Body Strong", "web/price"));
    // Tracker
    const tr = AL("V", { name: "Tracker", gap: 6 });
    add(row, tr, { grow: true });
    const dots = AL("H", { name: "Stepper", cross: "CENTER" });
    add(tr, dots, { fw: true });
    const labels = AL("H", { name: "labels" });
    add(tr, labels, { fw: true });
    for (let i = 0; i < STEPS.length; i++) {
      const done = i < step;
      const dot = AL("H", { name: "dot", w: 16, h: 16, fill: done ? "web/brand" : "web/surface", stroke: done ? "web/brand" : "web/border", strokeWeight: 2, main: "CENTER", cross: "CENTER" });
      dot.cornerRadius = 8;
      if (done) {
        const ck = icon("check", "web/on-brand");
        ck.resize(10, 10);
        dot.appendChild(ck);
      }
      dots.appendChild(dot);
      if (i < STEPS.length - 1) {
        const bar = AL("H", { name: "line", h: 2, fill: i < step - 1 ? "web/brand" : "web/border" });
        add(dots, bar, { grow: true });
      }
      const lab = await T(STEPS[i], "Caption", done ? "web/text" : "web/text-3");
      lab.textAlignHorizontal = i === 0 ? "LEFT" : i === STEPS.length - 1 ? "RIGHT" : "CENTER";
      add(labels, lab, { grow: true });
    }
    tr.appendChild(await T(eta, "Caption", color));
    // Actions
    const act = AL("V", { name: "actions", w: 190, gap: 8 });
    row.appendChild(act);
    if (primary) add(act, await button(primary, "primary"), { fw: true });
    if (secondary) add(act, await button(secondary, "ghost"), { fw: true });
  }
}

sec.resizeWithoutConstraints(2920, 5920); // rows: TM, Script Editor, Rig/Wallet, Profile/Rig Stock, Browser, desktop toast
return sec.id;
