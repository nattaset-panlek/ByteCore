// 08 Apps: Wallet (balance header, StatCards, bar chart, TableRow transactions)
const sec = figma.currentPage.children.find((n) => n.type === "SECTION" && n.name === "08 Apps");

const { page } = await settingsWindow(sec, "Window/Wallet", "Wallet", "app/Wallet", 1520, 1960, {
  navHeader: { picture: await personPicture("WN"), title: "Wallet name", caption: "ID 0000-0000-0000" },
  search: "Search transactions",
  nav: [["Overview", "icon/home"], ["Transactions", "icon/table"], ["Send", "icon/share"], ["Receive", "icon/arrow_download"], ["Cards", "icon/wallet"], ["Security", "icon/lock_closed"]],
  selected: "Overview",
  footer: ["Settings", "icon/settings"],
});

// Balance header
const head = AL("H", { name: "Balance header", pad: [8, 0, 20, 0], gap: 16, cross: "MAX" });
add(page, head, { fw: true });
const bal = AL("V", { name: "balance", gap: 2 });
head.appendChild(bal);
bal.appendChild(await T("Total balance", "Body", "text/secondary"));
bal.appendChild(await T("₵ 00,000.00", "Title Large", "text/primary", { name: "balance value" }));
bal.appendChild(await T("+0.0% since last week", "Caption", "system/success"));
add(head, spacer(), { grow: true });
head.appendChild(btn("Receive"));
head.appendChild(btn("Send", "Accent"));

// StatCards
const stats = AL("H", { name: "Summary", gap: 12 });
add(page, stats, { fw: true });
for (const [h, v, c, ic] of [["Income", "₵ 0,000", "This week", "icon/arrow_download"], ["Spending", "₵ 0,000", "This week", "icon/share"], ["Pending", "₵ 000", "0 transfers", "icon/arrow_clockwise"], ["Mining payout", "₵ 000", "Next in 00:00", "icon/developer_board"]]) {
  add(stats, await statCard(h, v, c, ic), { grow: true });
}

const gap = spacer("gap");
gap.resize(10, 4);
page.appendChild(gap);

// Bar chart card (12 weeks)
const chart = card("Card/Activity", { gap: 12 });
add(page, chart, { fw: true });
const ch = AL("H", { name: "header", cross: "CENTER", gap: 16 });
add(chart, ch, { fw: true });
ch.appendChild(await T("Activity", "Body Strong", "text/primary"));
add(ch, spacer(), { grow: true });
for (const [label, color] of [["Income", "accent/default"], ["Spending", "rarity/epic"]]) {
  const lg = AL("H", { name: "legend/" + label, gap: 6, cross: "CENTER" });
  const sw = AL("H", { name: "swatch", w: 8, h: 8, fill: color });
  sw.cornerRadius = 2;
  lg.appendChild(sw);
  lg.appendChild(await T(label, "Caption", "text/secondary"));
  ch.appendChild(lg);
}
const PLOT_H = 120;
const plot = AL("H", { name: "Plot", h: PLOT_H, gap: 0, cross: "MAX" });
add(chart, plot, { fw: true });
// gridlines behind the bars
for (let i = 0; i <= 3; i++) {
  const g = figma.createRectangle();
  g.name = "gridline";
  g.resize(800, 1);
  fill(g, "stroke/divider");
  plot.appendChild(g);
  g.layoutPositioning = "ABSOLUTE";
  g.y = Math.round((PLOT_H - 1) * (i / 3));
  g.x = 0;
  g.constraints = { horizontal: "STRETCH", vertical: "MIN" };
}
const DATA = [[0.45, 0.3], [0.6, 0.35], [0.38, 0.5], [0.7, 0.42], [0.52, 0.28], [0.8, 0.55], [0.62, 0.4], [0.9, 0.48], [0.55, 0.6], [0.74, 0.36], [0.66, 0.44], [0.95, 0.5]];
for (const [i, [a, b]] of DATA.entries()) {
  const col = AL("H", { name: "W" + (i + 1), gap: 4, main: "CENTER", cross: "MAX" });
  add(plot, col, { grow: true, fh: true });
  for (const [v, color] of [[a, "accent/default"], [b, "rarity/epic"]]) {
    const bar = figma.createRectangle();
    bar.name = "bar";
    bar.resize(14, Math.round(PLOT_H * v));
    bar.topLeftRadius = bar.topRightRadius = 2;
    fill(bar, color);
    col.appendChild(bar);
  }
}
const axis = AL("H", { name: "Axis", gap: 0 });
add(chart, axis, { fw: true });
for (let i = 0; i < DATA.length; i++) {
  const c = AL("H", { name: "tick", main: "CENTER" });
  add(axis, c, { grow: true });
  c.appendChild(await T("W" + (i + 1), "Caption", "text/tertiary"));
}

// Transactions (TableRow)
const tx = AL("V", { name: "Card/Transactions", fill: "bg/card", stroke: "stroke/card", r: 8, clip: true });
add(page, tx, { fw: true, fh: true });
const th = AL("H", { name: "header", h: 48, pad: [0, 16], cross: "CENTER" });
add(tx, th, { fw: true });
th.appendChild(await T("Recent transactions", "Body Strong", "text/primary"));
add(th, spacer(), { grow: true });
th.appendChild(await T("View all", "Caption", "accent/text"));
add(tx, divider("H"), { fw: true });
const header = inst("TableRow", { State: "Rest" });
props(header, { Col1: "Description", Col2: "Date", Col3: "Category", Col4: "Status", Col5: "Amount", "Show icon": true });
header.findOne((n) => n.name === "leading icon").opacity = 0; // keeps columns aligned with the rows
for (const t of header.findAll((n) => n.type === "TEXT")) {
  await t.setTextStyleIdAsync(TS["Caption"].id);
  fill(t, "text/tertiary");
}
header.findOne((n) => n.name === "col5").textAlignHorizontal = "RIGHT";
add(tx, header, { fw: true });
for (const [d, date, cat, status, amt, dir] of [
  ["Transfer placeholder", "00 Mon 0000", "Category", "Completed", "+₵ 000.00", "arrowDown"],
  ["Purchase placeholder", "00 Mon 0000", "Category", "Completed", "-₵ 00.00", "arrowUp"],
  ["Payout placeholder", "00 Mon 0000", "Category", "Pending", "+₵ 000.00", "arrowDown"],
  ["Purchase placeholder", "00 Mon 0000", "Category", "Failed", "-₵ 0.00", "arrowUp"],
]) {
  const r = inst("TableRow", { State: "Rest" });
  props(r, { Col1: d, Col2: date, Col3: cat, Col4: status, Col5: amt, "Show icon": true, "Leading icon": variant("Icon", { Name: dir }).id });
  recolorIcon(r.findOne((n) => n.name === "leading icon"), dir === "arrowDown" ? "system/success" : "text/secondary");
  const amount = r.findOne((n) => n.name === "col5");
  amount.textAlignHorizontal = "RIGHT";
  fill(amount, amt.startsWith("+") ? "system/success" : "text/primary");
  fill(r.findOne((n) => n.name === "col4"), status === "Failed" ? "system/critical" : status === "Pending" ? "system/caution" : "text/secondary");
  add(tx, divider("H"), { fw: true });
  add(tx, r, { fw: true });
}
return sec.id;
