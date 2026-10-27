// 06 Terminal: Local shell + Remote session, built from game components
const old = figma.currentPage.children.find((n) => n.type === "FRAME" && n.name === "06 Terminal");
if (old) old.remove();
const sec = getSection("06 Terminal", 80, 16234, 2920, 1080);
for (const c of sec.children.slice()) c.remove();

async function line(level, text, prompt) {
  const i = inst("ConsoleLine", { Level: level });
  const p = { Text: text };
  if (prompt) p.Prompt = prompt;
  props(i, p);
  return i;
}
function gap(h = 8) {
  const f = figma.createFrame();
  f.name = "gap";
  f.fills = [];
  f.resize(8, h);
  return f;
}
// Shared shell: File Explorer tab row with the Terminal image icon. The selected tab takes the
// console color so it joins the console, as in Windows Terminal.
async function terminalWindow(name, x, selected) {
  const tabs = [["Local shell", selected === "Local shell"], ["Remote session", selected === "Remote session"]];
  return appWindow(sec, name, "Terminal", "app/Terminal", 1280, 800, x, 160, { tabs, selectedTabFill: "terminal/bg" });
}
// ---------- Local shell ----------
{
  const { win, body } = await terminalWindow("Window/Terminal/Local shell", 120, "Local shell");
  const con = AL("V", { name: "Console", pad: [16, 20], gap: 4, fill: "terminal/bg" });
  add(body, con, { grow: true, fh: true });
  const L = [];
  L.push(await line("Muted", 'Xea OS Terminal  [Version 1.0.0000]   Type "help" to list commands.'));
  L.push(gap());
  L.push(await line("Prompt", "command --option <value>", "C:\\Users\\ByteCore>"));
  L.push(await line("Default", "Output line placeholder"));
  L.push(await line("Info", "COLUMN A            COLUMN B      COLUMN C      LEVEL"));
  for (let i = 0; i < 3; i++) L.push(await line("Default", "Value placeholder   Value         Value         Lv.0"));
  L.push(await line("Warning", "0 results  ·  Heat +0%"));
  L.push(gap());
  L.push(await line("Prompt", "C:/tools/tool_name.exe --help", "C:\\Users\\ByteCore>"));
  L.push(await line("Default", "TOOL_NAME.EXE  v0.0   [Item type · Rarity]"));
  L.push(await line("Muted", "Short description of what this tool does."));
  L.push(gap(4));
  L.push(await line("Warning", "USAGE"));
  L.push(await line("Default", "    tool_name.exe -a <value> [--option]"));
  L.push(await line("Warning", "ARGUMENTS"));
  L.push(await line("Default", "    -a, --arg-one     Description of argument one"));
  L.push(await line("Default", "    -b, --arg-two     Description of argument two (default: value)"));
  L.push(await line("Default", "    --option          Description of the optional flag"));
  L.push(await line("Warning", "REQUIREMENTS"));
  L.push(await line("Default", "    CPU Lv.0+   RAM 0 GB   Disk 0 MB"));
  L.push(await line("Warning", "SCRIPT API"));
  L.push(await line("Info", "    await ByteCore.tools.methodName({ ... })"));
  L.push(gap());
  L.push(await line("Error", "[x] Error message placeholder"));
  L.push(await line("Prompt", "_", "C:\\Users\\ByteCore>"));
  for (const l of L) add(con, l, l.type === "INSTANCE" ? { fw: true } : {});
  await statusBar(win, [["LOCAL", "system/success", "mode"], "C:\\Users\\ByteCore", ["Proxy: Off", "text/tertiary"], await miniMeter("Heat", "00%", 0.2, "system/success"), "|", ["CPU Lv.0  ·  RAM 0 GB  ·  Disk 0 / 0 GB", "text/tertiary", "right"]]);
}

// ---------- Remote session ----------
{
  const { win, body } = await terminalWindow("Window/Terminal/Remote session", 1520, "Remote session");
  const con = AL("V", { name: "Console", pad: [16, 20], gap: 4, fill: "terminal/bg" });
  add(body, con, { grow: true, fh: true });
  const L = [];
  L.push(await line("Prompt", "connect <user>@<host> [--options]", "C:\\Users\\ByteCore>"));
  L.push(await line("Muted", "Connecting..."));
  L.push(await line("Muted", "Session opened. Status message placeholder."));
  L.push(gap());
  L.push(await line("Remote prompt", "command <directory>", "[user@host ~]#"));
  L.push(await line("Info", "ATTR    OWNER    SIZE      NAME"));
  L.push(await line("Default", "attr    owner    0.0 MB    item_name.db"));
  L.push(await line("Default", "attr    owner    0.0 MB    item_name.sql"));
  L.push(await line("Default", "attr    owner    0 KB      item_name.key"));
  L.push(await line("Default", "attr    owner    0 KB      item_name.log"));
  L.push(gap());
  L.push(await line("Remote prompt", "command <source> <destination>", "[user@host ~]#"));
  for (const l of L) add(con, l, l.type === "INSTANCE" ? { fw: true } : {});
  // transfer progress row
  const tr = AL("H", { name: "Transfer progress", gap: 12, cross: "CENTER", pad: [4, 0, 4, 32] });
  add(con, tr, { fw: true });
  tr.appendChild(await T("item_name.db", "Mono", "terminal/text"));
  const pb = inst("ProgressBar", { Status: "Normal", Value: "50" });
  pb.resize(240, pb.height);
  tr.appendChild(pb);
  tr.appendChild(await T("00%   0.0 / 0.0 MB   0.0 MB/s", "Mono", "text/tertiary"));
  add(con, await line("Warning", "[!] Warning message placeholder  ·  Heat +0%"), { fw: true });
  add(con, gap(), {});
  add(con, await line("Remote prompt", "_", "[user@host ~]#"), { fw: true });

  body.appendChild(Object.assign(divider("V"), {}));
  body.children[body.children.length - 1].layoutAlign = "STRETCH";

  const panel = AL("V", { name: "Session panel", w: 360, pad: 20, gap: 16, fill: "bg/layer" });
  add(body, panel, { fh: true });
  const head = AL("V", { name: "header", gap: 2 });
  add(panel, head, { fw: true });
  head.appendChild(await T("Session", "Subtitle", "text/primary"));
  head.appendChild(await T("host-name  ·  0.0.0.0", "Caption", "text/tertiary"));

  async function sessionCard(title, build) {
    const c = card("Card/" + title);
    add(panel, c, { fw: true });
    const h = inst("SectionHeader");
    props(h, { Title: title, "Show action": false });
    add(c, h, { fw: true });
    await build(c);
    return c;
  }
  await sessionCard("Target", async (c) => {
    for (const [k, v] of [["Address", "0.0.0.0"], ["System", "Placeholder"], ["Security level", "Lv.0"], ["Admin activity", "Low"]]) {
      const kv = inst("KeyValue");
      props(kv, { Label: k, Value: v });
      add(c, kv, { fw: true });
    }
  });
  await sessionCard("Trace", async (c) => {
    c.appendChild(await T("00%", "Title", "system/critical", { name: "trace value" }));
    const m = inst("Meter", { Level: "High" });
    props(m, { Label: "Trace level", Value: "00%" });
    add(c, m, { fw: true });
    c.appendChild(await T("Hint text about how trace rises and falls.", "Caption", "text/tertiary", { w: 288 }));
  });
  await sessionCard("Running processes", async (c) => {
    for (const [name, tone, status] of [["process_name.exe", "Success", "Running"], ["process_name.exe", "Success", "Running"], ["process_name.mod", "Neutral", "Idle"]]) {
      const r = AL("H", { name: "process", main: "SPACE_BETWEEN", cross: "CENTER" });
      add(c, r, { fw: true });
      r.appendChild(await T(name, "Caption", "text/primary"));
      const b = inst("Badge", { Tone: tone });
      props(b, { Label: status });
      r.appendChild(b);
    }
  });
  add(panel, spacer(), { grow: true });
  // Two equal buttons that fill the panel width (Button components are fixed-width, so stretch them)
  const actions = AL("H", { name: "actions", gap: 8 });
  add(panel, actions, { fw: true });
  add(actions, btn("Disconnect"), { grow: true });
  add(actions, btn("Primary action", "Accent"), { grow: true });

  await statusBar(win, [["REMOTE", "accent/default", "mode"], "user@host-name", ["Proxy: Off", "system/critical"], await miniMeter("Heat", "00%", 0.7, "system/caution"), "|", ["Session 00:00:00", "text/tertiary", "right"]]);
}

return sec.id;
