// Remove stray leftovers from failed runs: components not in a set and not the known singles
const sec = figma.currentPage.children.find((n) => n.type === "SECTION" && n.name === "07 Game Components");
const keep = new Set(["Icon","AppTitleBar","TerminalTab","Badge","Meter","KeyValue","SectionHeader","ConsoleLine","CodeLine","TableRow","LootRow","HardwareSlot","ModuleChip","Dropzone","Countdown","RedactionLine","NavItem"]);
const removed=[];
for (const c of sec.children.slice()) if (!keep.has(c.name)) { removed.push(c.name); c.remove(); }
// count duplicates
const counts={}; for (const c of sec.children) counts[c.name]=(counts[c.name]||0)+1;
return {removed, dup:Object.entries(counts).filter(([k,v])=>v>1), bounds: sec.children.map(c=>[c.name,Math.round(c.x),Math.round(c.y),Math.round(c.width),Math.round(c.height)])};
