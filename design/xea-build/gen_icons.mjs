import fs from "node:fs";
const o = JSON.parse(fs.readFileSync("../fluent-icons/icons.min.json", "utf8"));
for (const k of ["router", "arrow_sync", "grid_dots", "board", "apps_list"]) delete o[k];
const body = `
const sec = await getSec('comp');
for (const n of sec.children.filter((c) => c.name === 'Icons')) n.remove();
const ICONS = ${JSON.stringify(o)};
const lib = al('V', { name: 'Icons', gap: 16, pad: 32, fillVar: 'bg/solid-base', radius: 'overlay' }, [txt('Icons', 'Subtitle'), txt('Fluent UI System Icons, 20 Regular (MIT). Swap with the Icon property on any component.', 'Caption', 'text/secondary')]);
const grid = al('H', { name: 'Grid', gap: 8, wrap: true });
add(lib, grid); grid.resize(940, 40); grid.primaryAxisSizingMode = 'FIXED'; grid.counterAxisSpacing = 8;
for (const [name, d] of Object.entries(ICONS)) {
  const cell = al('V', { name: 'cell/' + name, gap: 6, pad: [10, 4], cross: 'CENTER', w: 88 });
  const c = figma.createComponent(); c.name = 'Icon/' + name; c.resize(20, 20); c.fills = [];
  const svg = figma.createNodeFromSvg('<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="' + d + '" fill="#FFFFFF"/></svg>');
  const vec = svg.children[0]; c.appendChild(vec); vec.x = 0; vec.y = 0; vec.name = 'glyph'; svg.remove();
  vec.fills = [vp('text/primary')]; vec.constraints = { horizontal: 'SCALE', vertical: 'SCALE' };
  c.description = 'Fluent UI System Icon ' + name + ' (20 Regular).';
  cell.appendChild(c); cell.appendChild(txt(name, 'Caption', 'text/tertiary', { width: 80, align: 'CENTER', truncate: 1 }));
  grid.appendChild(cell);
}
place(sec, lib, 40, 80);
return { icons: Object.keys(ICONS).length, lib: lib.id };
`;
fs.writeFileSync("s/10_icons.js", body);
console.log("bytes", body.length);
