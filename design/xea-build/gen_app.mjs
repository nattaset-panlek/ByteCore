import fs from "node:fs";
const F = JSON.parse(fs.readFileSync("../fluent-filled/filled.json", "utf8"));
const grad = (id, a, b) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const glyphApp = (glyph, a, b) => `<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><defs>${grad("g", a, b)}</defs><g transform="translate(4 4) scale(1.6667)"><path d="${F[glyph]}" fill="url(#g)"/></g></svg>`;
const APPS = {
  Settings: glyphApp("settings", "#A9BCD6", "#5C7598"),
  ChimeraKit: glyphApp("shield_lock", "#4FE0CF", "#0B8C86"),
  Contracts: glyphApp("target_arrow", "#FF9C7A", "#E2462A"),
  RigManager: glyphApp("developer_board", "#7CC4FF", "#2A6CD4"),
  MiningRig: glyphApp("server", "#C2A2FF", "#6A40D2"),
  Wallet: glyphApp("wallet", "#FFD98A", "#D99A00"),
  TaskManager: glyphApp("data_histogram", "#6FE8BC", "#1B8C6C"),
  NetworkMonitor: glyphApp("globe", "#7AE3FF", "#1A8BD3"),
  EventLogs: glyphApp("clipboard_text_ltr", "#C3CFD6", "#64808F"),
  Profile: glyphApp("person_circle", "#AAB2FF", "#5860D4"),
  Terminal: `<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><defs>${grad("t", "#3A3A3A", "#121212")}</defs><rect x="4" y="7" width="40" height="34" rx="5" fill="url(#t)"/><rect x="4.5" y="7.5" width="39" height="33" rx="4.5" stroke="#FFFFFF" stroke-opacity="0.18"/><path d="M12 18l7 6-7 6" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><rect x="22" y="28" width="12" height="3" rx="1.5" fill="#60CDFF"/></svg>`,
  FileExplorer: `<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><defs>${grad("a", "#FFC940", "#EFA30A")}${grad("b", "#FFE48F", "#FFC53A")}</defs><path d="M4 12a4 4 0 0 1 4-4h10.3a3 3 0 0 1 2.1.9L23 11.5h17a4 4 0 0 1 4 4V36a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V12z" fill="url(#a)"/><path d="M4 19a3 3 0 0 1 3-3h34a3 3 0 0 1 3 3v17a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V19z" fill="url(#b)"/><rect x="10" y="30" width="28" height="4" rx="2" fill="#3A96DD"/></svg>`,
  XeaLogo: `<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><defs>${grad("x", "#7DE2FF", "#1F7FE0")}</defs><g transform="rotate(45 24 24)"><rect x="9" y="9" width="13" height="13" rx="3" fill="url(#x)"/><rect x="26" y="9" width="13" height="13" rx="3" fill="url(#x)"/><rect x="9" y="26" width="13" height="13" rx="3" fill="url(#x)"/><rect x="26" y="26" width="13" height="13" rx="3" fill="url(#x)" fill-opacity="0.55"/></g></svg>`,
};
const paper = (band, inner) => `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 4h24l14 14v38a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z" fill="#F4F4F4"/><path d="M38 4l14 14H42a4 4 0 0 1-4-4V4z" fill="#CFCFCF"/>${band ? `<path d="M10 46h42v10a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4z" fill="${band}"/>` : ""}${inner || ""}</svg>`;
const lines = `<rect x="18" y="24" width="26" height="2.5" rx="1.2" fill="#9AA6B2"/><rect x="18" y="30" width="26" height="2.5" rx="1.2" fill="#9AA6B2"/><rect x="18" y="36" width="18" height="2.5" rx="1.2" fill="#9AA6B2"/>`;
const folder = (extra = "") => `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><defs>${grad("a", "#FFC940", "#EFA30A")}${grad("b", "#FFE48F", "#FFC53A")}</defs><path d="M4 14a5 5 0 0 1 5-5h14a4 4 0 0 1 2.8 1.2L30 14.5h25a5 5 0 0 1 5 5V50a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V14z" fill="url(#a)"/><path d="M4 24a4 4 0 0 1 4-4h48a4 4 0 0 1 4 4v26a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V24z" fill="url(#b)"/>${extra}</svg>`;
const FILES = {
  Folder: folder(),
  Document: paper("#2B7CD3", lines),
  Text: paper(null, lines + `<rect x="18" y="42" width="22" height="2.5" rx="1.2" fill="#9AA6B2"/>`),
  PDF: paper("#D13438", lines),
  Image: paper(null, `<rect x="16" y="22" width="30" height="26" rx="3" fill="#62B8F5"/><path d="M16 42l9-9 7 7 4-4 10 10v1a3 3 0 0 1-3 3H19a3 3 0 0 1-3-3z" fill="#2E8B57"/><circle cx="38" cy="29" r="3" fill="#FFE07A"/>`),
  Database: paper("#7A5AF8", `<ellipse cx="31" cy="24" rx="11" ry="4" fill="#8E8EA0"/><path d="M20 24v12c0 2.2 4.9 4 11 4s11-1.8 11-4V24c0 2.2-4.9 4-11 4s-11-1.8-11-4z" fill="#B4B4C6"/>`),
  System: paper("#5C6670", `<circle cx="31" cy="30" r="8" stroke="#6B7785" stroke-width="4"/><circle cx="31" cy="30" r="2.5" fill="#6B7785"/>`),
  Key: paper("#E8A400", `<circle cx="25" cy="30" r="6" stroke="#B07D00" stroke-width="3.5"/><path d="M30 30h14v5M39 30v4" stroke="#B07D00" stroke-width="3.5" stroke-linecap="round"/>`),
  Archive: folder(`<rect x="28" y="20" width="8" height="35" fill="#7A5A14" fill-opacity="0.35"/><rect x="29.5" y="24" width="5" height="3" fill="#FFFFFF"/><rect x="29.5" y="30" width="5" height="3" fill="#FFFFFF"/><rect x="29.5" y="36" width="5" height="3" fill="#FFFFFF"/>`),
  Drive: `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><defs>${grad("d", "#E9E9E9", "#9C9C9C")}</defs><path d="M10 34l6-16a4 4 0 0 1 3.8-2.6h24.4a4 4 0 0 1 3.8 2.6l6 16z" fill="#BDBDBD"/><rect x="8" y="33" width="48" height="16" rx="4" fill="url(#d)"/><circle cx="46" cy="41" r="2.5" fill="#3FD45B"/><rect x="14" y="40" width="20" height="2" rx="1" fill="#6E6E6E"/></svg>`,
  NetworkDrive: `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><defs>${grad("d", "#E9E9E9", "#9C9C9C")}</defs><path d="M10 28l6-14a4 4 0 0 1 3.8-2.6h24.4a4 4 0 0 1 3.8 2.6l6 14z" fill="#BDBDBD"/><rect x="8" y="27" width="48" height="14" rx="4" fill="url(#d)"/><circle cx="46" cy="34" r="2.5" fill="#60CDFF"/><rect x="30" y="41" width="4" height="8" fill="#8A8A8A"/><rect x="14" y="49" width="36" height="4" rx="2" fill="#8A8A8A"/><rect x="26" y="47" width="12" height="8" rx="2" fill="#2B7CD3"/></svg>`,
};
const body = `
const sec = await getSec('comp');
for (const n of sec.children.filter((c) => c.name === 'App Icons' || c.name === 'File Icons')) n.remove();
const APPS = ${JSON.stringify(APPS)};
const FILES = ${JSON.stringify(FILES)};
function lib(title, sub, map, prefix, size) {
  const l = al('V', { name: title, gap: 16, pad: 32, fillVar: 'bg/solid-base', radius: 'overlay' }, [txt(title, 'Subtitle'), txt(sub, 'Caption', 'text/secondary')]);
  const g = al('H', { name: 'Grid', gap: 16, wrap: true }); add(l, g); g.resize(940, 40); g.primaryAxisSizingMode = 'FIXED'; g.counterAxisSpacing = 16;
  for (const [name, svg] of Object.entries(map)) {
    const cell = al('V', { name: 'cell/' + name, gap: 8, cross: 'CENTER', w: 104 });
    const c = figma.createComponent(); c.name = prefix + name; c.resize(size, size); c.fills = []; c.clipsContent = false;
    const n = figma.createNodeFromSvg(svg); n.name = 'art';
    c.appendChild(n); n.x = 0; n.y = 0; n.constraints = { horizontal: 'SCALE', vertical: 'SCALE' };
    for (const ch of n.findAll(() => true)) if ('constraints' in ch) ch.constraints = { horizontal: 'SCALE', vertical: 'SCALE' };
    c.description = prefix === 'AppIcon/' ? 'Xea OS app icon. Use at 16, 24, 32 or 48 px.' : 'File type icon for File Explorer views. Scales from 16 to 96 px.';
    cell.appendChild(c); cell.appendChild(txt(name, 'Caption', 'text/tertiary'));
    g.appendChild(cell);
  }
  return l;
}
const a = lib('App Icons', 'Fluent color style. Glyphs from Fluent UI System Icons (Filled).', APPS, 'AppIcon/', 48);
const f = lib('File Icons', 'Used by FileItem in every File Explorer view.', FILES, 'FileIcon/', 64);
const icons = sec.children.find((c) => c.name === 'Icons');
place(sec, a, icons ? icons.x + icons.width + 60 : 1100, 80);
place(sec, f, a.x, a.y + a.height + 60);
return { app: a.id, file: f.id };
`;
fs.writeFileSync("s/11_appicons.js", body);
console.log("bytes", body.length);
