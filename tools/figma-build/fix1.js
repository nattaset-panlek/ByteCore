const set = findSet("Icon");
let n=0;
for (const comp of set.children) for (const s of comp.findAll((x) => ["VECTOR","RECTANGLE","ELLIPSE","LINE"].includes(x.type))) {
  s.constraints = { horizontal: "SCALE", vertical: "SCALE" };
  if (s.strokes.length) s.strokes = [paint("text/primary")];
  if (s.fills.length) s.fills = [paint("text/primary")];
  n++;
}
// Widen loot rows so the payout column fits
const loot = findSet("LootRow");
for (const v of loot.children) { v.resize(980, v.height); const col=v.findOne(x=>x.name==="name col"); col.resize(240,col.height); for (const t of col.children) t.resize(240,t.height); }
const nav = findSet("NavItem");
const info = nav.children[0].findOne(x=>x.name==="icon");
return {n, iconChildren: info.children.map(c=>c.type+':'+JSON.stringify(c.fills.map(f=>f.type+(f.opacity??''))) )};
