// 08 Apps: Rig Stock. Parts replaced in Rig Manager land here: install them again or resell them second-hand (GDD 3.7).
const sec = figma.currentPage.children.find((n) => n.type === "SECTION" && n.name === "08 Apps");

const { page } = await settingsWindow(sec, "Window/Rig Stock", "Rig Stock", "icon/square_multiple", 1520, 2880, {
  search: "Find a part",
  nav: [["All parts", "icon/grid"], ["Processors", "icon/developer_board"], ["Memory", "icon/square_multiple"], ["Network", "icon/globe"], ["Storage", "icon/database"], ["Sold", "icon/wallet"]],
  selected: "All parts",
  footer: ["Settings", "icon/settings"],
  pageTitle: "All parts",
});

const stats = AL("H", { name: "Summary", gap: 12 });
add(page, stats, { fw: true });
for (const [h, v, c, ic] of [["In stock", "00 parts", "Placeholder caption", "icon/square_multiple"], ["Resale value", "₵ 0,000", "Estimated, used condition", "icon/wallet"], ["Sold", "00", "This week", "icon/arrow_clockwise"]]) {
  add(stats, await statCard(h, v, c, ic), { grow: true });
}
add(page, inst("InfoBar", { Severity: "Informational" }, { title: "Replaced parts", message: "Parts you replace in Rig Manager are moved here." }), { fw: true });

const PARTS = [
  ["Processor", "Tier 0 · Model", "cpu", "Rare", "00 Mon 0000", "00%", "₵ 000"],
  ["Memory", "Tier 0 · Model", "memory", "Common", "00 Mon 0000", "00%", "₵ 00"],
  ["Network card", "Tier 0 · Model", "network", "Common", "00 Mon 0000", "00%", "₵ 00"],
  ["Storage", "Tier 0 · Model", "disk", "Epic", "00 Mon 0000", "00%", "₵ 000"],
  ["Power supply", "Tier 0 · Model", "bolt", "Common", "00 Mon 0000", "00%", "₵ 00"],
  ["Memory", "Tier 0 · Model", "memory", "Rare", "00 Mon 0000", "00%", "₵ 000"],
];
for (let r = 0; r < 2; r++) {
  const row = AL("H", { name: "row", gap: 12 });
  add(page, row, { fw: true });
  for (const [name, tier, ic, rarity, removed, cond, resale] of PARTS.slice(r * 3, r * 3 + 3)) {
    const c = card("Part/" + name);
    add(row, c, { grow: true });
    const head = AL("H", { name: "header", gap: 12, cross: "CENTER" });
    add(c, head, { fw: true });
    head.appendChild(iconTile(ic));
    const t = AL("V", { name: "titles", gap: 0 });
    add(head, t, { grow: true });
    const nm = await T(name, "Body Strong", "text/primary");
    add(t, nm, { fw: true });
    nm.textTruncation = "ENDING";
    nm.maxLines = 1;
    t.appendChild(await T(tier, "Caption", "text/secondary"));
    head.appendChild(inst("RarityLabel", { Rarity: rarity }));
    for (const [k, v] of [["Removed", removed], ["Condition", "Used · " + cond], ["Resale price", resale]]) {
      const kv = inst("KeyValue");
      props(kv, { Label: k, Value: v });
      add(c, kv, { fw: true });
    }
    add(c, divider("H"), { fw: true });
    const actions = AL("H", { name: "actions", gap: 8 });
    add(c, actions, { fw: true });
    add(actions, btn("Install"), { grow: true });
    add(actions, btn("Sell"), { grow: true });
  }
}
return sec.id;
