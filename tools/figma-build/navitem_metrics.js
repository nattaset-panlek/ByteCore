// Align the NavItem component (07, vector icons) with NavigationViewItem metrics:
// 36px, radius 4, 16px icon 13px after the pill, 16px icon-label gap, 3x16 accent pill at the left edge.
const set = findSet("NavItem");
for (const v of set.children) {
  v.paddingLeft = 16; // 3px pill + 13px
  v.paddingRight = 13;
  v.itemSpacing = 16;
  const ind = v.findOne((n) => n.name === "indicator");
  ind.layoutPositioning = "ABSOLUTE";
  ind.x = 0;
  ind.y = 10;
  ind.visible = v.name === "State=Selected";
  const ic = v.findOne((n) => n.name === "icon");
  ic.resize(16, 16);
  const lbl = v.findOne((n) => n.name === "label");
  lbl.layoutGrow = 1;
}
set.description = "Sidebar item with vector icon. Same metrics as NavigationViewItem (02); use that one when an image icon exists.";
return set.children.map((v) => v.name + " " + v.children.map((c) => c.name + "@" + Math.round(c.x) + "," + Math.round(c.y) + (c.visible ? "" : "(hidden)")).join(" "));
