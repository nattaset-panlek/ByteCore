const sec = figma.currentPage.children.find((n) => n.type === "SECTION" && n.name === "07 Game Components");
const pos = {Icon:[40,80],AppTitleBar:[640,80],TerminalTab:[640,160],Badge:[640,260],Meter:[640,350],KeyValue:[640,450],SectionHeader:[640,500],
ConsoleLine:[1760,80],CodeLine:[1760,340],TableRow:[1760,470],LootRow:[1760,660],
HardwareSlot:[2780,80],ModuleChip:[2780,360],Dropzone:[2780,560],
Countdown:[3300,80],RedactionLine:[3300,300],NavItem:[3300,460]};
for (const c of sec.children) if (pos[c.name]) { c.x=pos[c.name][0]; c.y=pos[c.name][1]; }
sec.resizeWithoutConstraints(3960, 1080);
return sec.id;
