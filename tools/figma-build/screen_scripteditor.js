// 08 Apps: Script Editor + "Import script" dialog state. Built on the shared window shell (lib.js).
const sec = figma.currentPage.children.find((n) => n.type === "SECTION" && n.name === "08 Apps");
const X0 = 120, Y0 = 1040;

const CODE = [
  "// Placeholder script: short description of what it does",
  'import { tools } from "bytecore";',
  "",
  'const TARGET = "0.0.0.0";',
  "const RETRIES = 3;",
  "",
  "async function main(options) {",
  "  const session = await tools.connect(TARGET, { retries: RETRIES });",
  "  if (!session.ok) {",
  '    console.log("Status message placeholder");',
  "    return;",
  "  }",
  '  for (const item of await session.list("/data")) {',
  "    console.log(item.name, item.size);",
  "  }",
  "  await session.close();",
  "}",
  "",
  "main({ verbose: true });",
];
const ACTIVE_LINE = 9;

// Very small JS highlighter: comment, string, keyword, number, function call
const SYNTAX = [
  [/\/\/.*$/g, "text/tertiary"],
  [/"[^"]*"/g, "system/critical"],
  [/\b(import|from|const|let|async|function|await|if|return|for|of|true|false)\b/g, "rarity/epic"],
  [/\b\d+(\.\d+)?\b/g, "system/success"],
  [/\b[A-Za-z_]\w*(?=\()/g, "terminal/yellow"],
];
function highlight(t) {
  const taken = new Array(t.characters.length).fill(false);
  for (const [re, color] of SYNTAX) {
    for (const m of t.characters.matchAll(re)) {
      const s = m.index, e = m.index + m[0].length;
      if (taken.slice(s, e).some(Boolean)) continue;
      t.setRangeFills(s, e, [paint(color)]);
      for (let i = s; i < e; i++) taken[i] = true;
    }
  }
}

function treeItem(label, iconName, depth, expander, selected) {
  const t = inst("TreeItem", { Expander: expander, State: selected ? "Selected" : "Rest" }, { label });
  t.findOne((n) => n.name === "content").paddingLeft = 4 + depth * 20;
  return t;
}

async function buildEditor(name, x, y) {
  const { win, body } = await appWindow(sec, name, "Script Editor", "icon/document", 1280, 800, x, y, { bodyDir: "V" });
  // Toolbar layer: command bar on bg/layer, then a divider
  const layer = AL("V", { name: "Toolbar layer", fill: "bg/layer" });
  add(body, layer, { fw: true });
  const bar = cmdBar();
  add(layer, bar, { fw: true });
  for (const [label, ic] of [["New", "icon/add"], ["Open", "icon/folder"], ["Save", "icon/save"]]) bar.appendChild(await appBarButton(label, ic));
  bar.appendChild(appBarSeparator());
  for (const ic of ["icon/cut", "icon/copy", "icon/delete"]) bar.appendChild(await appBarButton(null, ic));
  bar.appendChild(appBarSeparator());
  bar.appendChild(await appBarButton("Import", "icon/arrow_download"));
  bar.appendChild(await appBarButton("Format", "icon/paint_brush"));
  add(bar, spacer(), { grow: true });
  const target = inst("ComboBox", { State: "Rest" }, { value: "Local shell" });
  target.resize(160, target.height);
  bar.appendChild(target);
  const gap = spacer("gap");
  gap.resize(8, 1);
  bar.appendChild(gap);
  bar.appendChild(btn("Run script", "Accent"));
  add(body, divider("H"), { fw: true });

  const main = AL("H", { name: "Main" });
  add(body, main, { fw: true, fh: true });

  // Explorer (File Explorer navigation pattern: 240px, pad 8, gap 2, TreeItem)
  const nav = AL("V", { name: "Navigation pane", w: 240, pad: 8, gap: 2 });
  add(main, nav, { fh: true });
  const head = AL("H", { name: "header", h: 32, pad: [0, 8], cross: "CENTER" });
  add(nav, head, { fw: true });
  head.appendChild(await T("Scripts", "Caption", "text/secondary"));
  const tree = [
    ["scripts", "icon/folder", 0, "Expanded"],
    ["main.js", "icon/document", 1, "None", true],
    ["utils.js", "icon/document", 1, "None"],
    ["config.json", "icon/document", 1, "None"],
    ["lib", "icon/folder", 0, "Collapsed"],
    ["logs", "icon/folder", 0, "Collapsed"],
  ];
  for (const [label, ic, depth, exp, sel] of tree) {
    const t = treeItem(label, ic, depth, exp, sel);
    await setImg(t.findOne((n) => n.type === "FRAME" && n.name.startsWith("icon/") && n.parent.name === "content"), ic);
    add(nav, t, { fw: true });
  }
  add(nav, spacer(), { grow: true });
  const usage = inst("Meter", { Level: "Low" });
  props(usage, { Label: "Script storage", Value: "00%" });
  add(nav, usage, { fw: true });
  const dv = add(main, divider("V"), {});
  dv.layoutAlign = "STRETCH";

  // Editor column: breadcrumb, code, console
  const ed = AL("V", { name: "Editor", fill: "bg/solid-secondary" });
  add(main, ed, { grow: true, fh: true });
  const crumb = AL("H", { name: "Breadcrumb", h: 32, pad: [0, 16], gap: 8, cross: "CENTER" });
  add(ed, crumb, { fw: true });
  crumb.appendChild(await T("scripts", "Caption", "text/secondary"));
  crumb.appendChild(await imgIcon("icon/chevron_right", 12));
  crumb.appendChild(await T("main.js", "Caption", "text/primary"));
  add(ed, divider("H"), { fw: true });

  const code = AL("V", { name: "Code", pad: [8, 0], gap: 0, clip: true });
  add(ed, code, { fw: true, fh: true });
  for (let i = 0; i < CODE.length; i++) {
    const l = inst("CodeLine", { State: i + 1 === ACTIVE_LINE ? "Active" : "Default" });
    props(l, { Number: String(i + 1), Code: CODE[i] || " " });
    add(code, l, { fw: true });
    highlight(l.findOne((n) => n.name === "code"));
  }
  add(ed, divider("H"), { fw: true });

  // Console panel
  const con = AL("V", { name: "Console panel", h: 196, fill: "terminal/bg" });
  add(ed, con, { fw: true });
  const tabs = AL("H", { name: "Panel tabs", h: 36, pad: [0, 16], gap: 20, cross: "CENTER" });
  add(con, tabs, { fw: true });
  for (const [label, selected] of [["Console", true], ["Problems  0", false], ["Output", false]]) {
    const t = AL("V", { name: "tab/" + label, h: 36, gap: 0, main: "CENTER" });
    tabs.appendChild(t);
    t.appendChild(await T(label, selected ? "Body Strong" : "Body", selected ? "text/primary" : "text/secondary"));
    if (selected) {
      const pill = AL("H", { name: "indicator", w: 16, h: 3, fill: "accent/default" });
      pill.cornerRadius = 2;
      t.appendChild(pill);
      pill.layoutPositioning = "ABSOLUTE";
      pill.x = 0;
      pill.y = 33;
    }
  }
  add(tabs, spacer(), { grow: true });
  tabs.appendChild(await appBarButton(null, "icon/delete"));
  const lines = AL("V", { name: "Console", pad: [4, 16, 12, 16], gap: 4 });
  add(con, lines, { fw: true, fh: true });
  for (const [level, text, prompt] of [
    ["Prompt", "run main.js --verbose", "C:\\Users\\ByteCore>"],
    ["Muted", "Connecting to 0.0.0.0 ..."],
    ["Default", "item_name.db   0.0 MB"],
    ["Default", "item_name.log  0 KB"],
    ["Success", "Script finished in 0.00 s"],
  ]) {
    const c = inst("ConsoleLine", { Level: level });
    props(c, prompt ? { Text: text, Prompt: prompt } : { Text: text });
    add(lines, c, { fw: true });
  }

  await statusBar(win, [["Ln 9, Col 5", "text/secondary"], "Spaces: 2", "UTF-8", "JavaScript", "|", ["Ready", "text/secondary"]]);
  return win;
}

// ---------- Editor ----------
await buildEditor("Window/Script Editor", X0, Y0);

// ---------- Import script dialog ----------
{
  const win = await buildEditor("Window/Script Editor/Import script", X0 + 1400, Y0);
  const smoke = AL("V", { name: "Smoke", w: 1280, h: 800, fill: "bg/smoke", main: "CENTER", cross: "CENTER" });
  win.appendChild(smoke);
  smoke.layoutPositioning = "ABSOLUTE";
  smoke.x = 0;
  smoke.y = 0;
  smoke.constraints = { horizontal: "STRETCH", vertical: "STRETCH" };

  // ContentDialog (02) detached so the body can hold a Dropzone and URL field
  const dlg = inst("ContentDialog", { Buttons: "Two" }).detachInstance();
  dlg.name = "ContentDialog/Import script";
  smoke.appendChild(dlg);
  const outer = dlg.children[0];
  const top = outer.children[0];
  dlg.resize(480, dlg.height);
  top.findOne((n) => n.name === "title").characters = "Import script";
  const bodyF = top.findOne((n) => n.name === "body");
  for (const c of bodyF.children.slice()) c.remove();
  bodyF.layoutSizingHorizontal = "FILL";
  bodyF.itemSpacing = 16;
  bodyF.appendChild(await T("Add a script file from this PC or from a URL. Placeholder description text.", "Body", "text/primary", { w: 432 }));
  const dz = inst("Dropzone", { State: "Rest" });
  props(dz, { Title: "Drop .js files here", Caption: "or browse from this PC" });
  add(bodyF, dz, { fw: true });
  const urlBlock = AL("V", { name: "URL field", gap: 8 });
  add(bodyF, urlBlock, { fw: true });
  urlBlock.appendChild(await T("Import from URL", "Body", "text/primary"));
  add(urlBlock, textBox("https://example.com/script.js", 432), { fw: true });
  urlBlock.appendChild(await T("Only .js files are supported.", "Caption", "text/secondary"));
  // Detached frames keep the instance's fixed height: let the dialog hug its new content
  dlg.primaryAxisSizingMode = "AUTO";
  for (const f of [outer, top, bodyF]) f.layoutSizingVertical = "HUG";
  outer.layoutSizingHorizontal = "FILL";
  top.layoutSizingHorizontal = "FILL";
  const footer = outer.findOne((n) => n.name === "footer");
  footer.layoutSizingHorizontal = "FILL";
  for (const b of footer.children.filter((n) => n.type === "INSTANCE")) b.layoutGrow = 1;
  const buttons = footer.children.filter((n) => n.type === "INSTANCE");
  // Two-button dialog: primary on the left (accent), Cancel on the right, as in WinUI
  setTexts(buttons[0], { label: "Import" });
  setTexts(buttons[1], { label: "Cancel" });
}

sec.resizeWithoutConstraints(2920, 3800);
return sec.id;
