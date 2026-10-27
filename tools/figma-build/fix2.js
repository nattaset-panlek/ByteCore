// Re-apply every bound color paint in the game components so raw values match the variables
const sec = figma.currentPage.children.find((n) => n.type === "SECTION" && n.name === "07 Game Components");
const byId = {}; for (const [k, v] of Object.entries(V)) byId[v.id] = k;
let n = 0;
for (const node of sec.findAll((x) => "fills" in x)) {
  for (const field of ["fills", "strokes"]) {
    const paints = node[field];
    if (paints === figma.mixed || !paints.length) continue;
    let changed = false;
    const next = paints.map((p) => {
      const id = p.boundVariables && p.boundVariables.color && p.boundVariables.color.id;
      if (!id || !byId[id]) return p;
      changed = true;
      return Object.assign({}, paint(byId[id]), { opacity: p.opacity === 1 ? paint(byId[id]).opacity : p.opacity, visible: p.visible });
    });
    if (changed) { node[field] = next; n++; }
  }
}
return n;
