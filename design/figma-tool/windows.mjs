import { C, F, H, V, T, I } from "./dsl.mjs";
import { Btn, Badge, Dot, Card, Progress, Label, Stat, SectionHead, Input, Tabs, Window, Row, Div } from "./ui.mjs";

// ---------- Profile ----------
export function Profile() {
  const ach = (icon, title, desc, done, prog) => Row(
    H({ gap: 12 }, I(done ? "check" : "lock", 16, done ? C.ok : C.t3),
      V({ gap: 2 }, T(title, { size: 13, w: 600, color: done ? C.t1 : C.t2 }), T(desc, { size: 11, color: C.t3 }))),
    done ? T("Unlocked", { size: 12, color: C.ok }) : T(prog, { size: 12, w: 600, color: C.t3 }));
  const skill = (n, lv, pct, col) => Card({ name: `Skill/${n}`, gap: 8 },
    H({ fillW: true, main: "SPACE_BETWEEN" }, T(n, { size: 13, w: 600 }), Badge(`Lv.${lv}`, col)),
    Progress(140, pct, col), T(`${Math.round(pct * 100)}% to next`, { size: 11, color: C.t3 }));
  return Window("Profile", "user", 560, [
    H({ name: "Identity", fillW: true, gap: 16, pad: 16, r: 6, fill: C.card, stroke: C.border },
      H({ w: 64, h: 64, r: 32, fill: C.hover, stroke: C.border, main: "CENTER" }, T("GU", { size: 20, w: 600, color: C.t2 })),
      V({ gap: 6 },
        H({ gap: 8 }, T("ghost_user", { size: 18, w: 600 }), Badge("LV 7", C.xp, { icon: "level" })),
        T("Novice Hacker  ·  Joined 12 days ago", { size: 12, color: C.t3 }),
        H({ gap: 10 }, Progress(300, 214 / 299, C.xp, 8), T("214 / 299 XP", { size: 11, w: 600, color: C.xp })))),
    H({ name: "Stats", fillW: true, gap: 12 },
      Stat("level", "Level", "7", { color: C.xp }), Stat("star", "Reputation", "42", { color: C.gold }), Stat("trophy", "Total XP", "1,520")),
    SectionHead("Skills"),
    H({ name: "Skills", fillW: true, gap: 12 }, skill("Hacking", 3, 0.72, C.accent), skill("Stealth", 2, 0.4, C.info), skill("Analysis", 1, 0.2, C.xp)),
    SectionHead("Achievements", T("3 / 6", { size: 12, color: C.t3 })),
    V({ name: "Achievements", fillW: true, gap: 8 },
      ach("level", "Novice Hacker", "Reach Level 5", true),
      ach("coin", "Thousandaire", "Accumulate ₵1,000", true),
      ach("coin", "Crypto Enthusiast", "Accumulate ₵5,000", true),
      ach("level", "Advanced Hacker", "Reach Level 10", false, "7 / 10"),
      ach("star", "Known Hacker", "Reach 50 Reputation", false, "42 / 50"),
      ach("trophy", "Elite Hacker", "Reach Level 15", false, "7 / 15")),
  ]);
}

// ---------- Mining Rig ----------
export function MiningRig() {
  const act = (t, m) => H({ gap: 10 }, T(t, { size: 11, color: C.t3 }), T(m, { size: 12, color: C.t2 }));
  return Window("Mining Rig", "rig", 560, [
    H({ fillW: true, main: "SPACE_BETWEEN" },
      H({ gap: 8 }, T("Rig Status", { size: 16, w: 600 }), Badge("Online", C.ok, { icon: "dot" })),
      Btn("Pause mining", "secondary", { icon: "pause", size: "sm" })),
    H({ name: "Stats", fillW: true, gap: 12 },
      Stat("temp", "GPU Temp", "72.4°C", { extra: Progress(140, 0.72, C.warn, 4), sub: "Safe below 85°C" }),
      Stat("gauge", "Hash Rate", "28.6 MH/s", { color: C.accent, sub: "+2.1 vs avg", subColor: C.accent }),
      Stat("bolt", "Power", "148 W", { sub: "Draw 120–170 W" })),
    Card({ name: "Earnings", pad: 16, gap: 12, fill: C.panel },
      H({ fillW: true, main: "SPACE_BETWEEN" },
        V({ gap: 4 }, Label("Uncollected"), T("₵ 86", { size: 28, w: 700, color: C.gold })),
        Btn("Collect ₵86", "gold", { icon: "download" })),
      H({ gap: 16 }, H({ gap: 6 }, I("coin", 13, C.t3), T("Rate ₵15 / hr", { size: 12, color: C.t2 })),
        H({ gap: 6 }, I("clock", 13, C.t3), T("Offline cap 8 hr", { size: 12, color: C.t2 })),
        H({ gap: 6 }, I("cpu", 13, C.t3), T("CPU Lv.4", { size: 12, color: C.t2 })))),
    SectionHead("Activity Log", T("last 15", { size: 12, color: C.t3 })),
    V({ name: "Activity", fillW: true, gap: 8, pad: 12, r: 6, fill: C.log, stroke: C.border },
      act("14:32:08", "Mining cycle OK — 28.6 MH/s"), act("14:32:04", "Mining cycle OK — 27.9 MH/s"),
      act("14:32:01", "Mining cycle OK — 30.2 MH/s"), act("14:31:57", "Mining cycle OK — 26.4 MH/s"),
      act("14:31:54", "Mining cycle OK — 29.1 MH/s")),
  ]);
}

// ---------- Wallet ----------
export function Wallet() {
  const tx = (icon, title, sub, amt, pos) => Row(
    H({ gap: 12 }, I(icon, 16, C.t2),
      V({ gap: 2 }, T(title, { size: 13, w: 500 }), T(sub, { size: 11, color: C.t3 }))),
    T(amt, { size: 13, w: 600, color: pos ? C.ok : C.danger }));
  return Window("Crypto Wallet", "wallet", 520, [
    V({ name: "Balance", fillW: true, pad: 20, gap: 6, r: 6, fill: C.card, stroke: C.border },
      Label("Balance"), T("₵ 12,480", { size: 34, w: 700, color: C.gold }),
      H({ gap: 6 }, I("uplink", 13, C.accent), T("+₵1,240 today  ·  ₵15 / hr mining", { size: 12, color: C.t2 }))),
    H({ fillW: true, gap: 12 }, Stat("coin", "Mining rate", "₵15/hr", { size: 18 }), Stat("download", "Uncollected", "₵86", { size: 18, color: C.gold }), Stat("sell", "Files value", "₵2,300", { size: 18 })),
    SectionHead("Recent Transactions", Btn("View all", "ghost", { size: "sm" })),
    V({ fillW: true, gap: 8 },
      tx("sell", "Sold financial_report.pdf", "File market · 14:28", "+₵800", true),
      tx("cpu", "Upgrade CPU → Lv.4", "Rig upgrade · 14:12", "−₵195", false),
      tx("contract", "Contract: Small Corporate Bank", "PVE reward · 13:55", "+₵220", true),
      tx("download", "Collected mining", "Idle income · 13:40", "+₵86", true),
      tx("rig", "Bought Advanced CPU", "Device shop · 12:02", "−₵250", false)),
  ]);
}

// ---------- Rig Manager ----------
function rigHeader() {
  const lvl = (icon, n, lv) => H({ fillW: true, main: "SPACE_BETWEEN" }, H({ gap: 8 }, I(icon, 14, C.t3), T(n, { size: 13, color: C.t2 })),
    H({ gap: 3 }, ...[1, 2, 3, 4, 5].map((i) => F({ w: 14, h: 6, r: 2, fill: i <= lv ? C.accent : C.border2 })), T(`  Lv.${lv}`, { size: 12, w: 600 })));
  const perf = (n, v, col) => H({ fillW: true, main: "SPACE_BETWEEN" }, T(n, { size: 13, color: C.t2 }), T(v, { size: 13, w: 600, color: col || C.t1 }));
  return H({ name: "Config", fillW: true, gap: 12 },
    Card({ name: "Current Rig", gap: 10 }, Label("Current rig"), lvl("cpu", "CPU", 3), lvl("ram", "RAM", 2), lvl("uplink", "Network", 2), lvl("storage", "Storage", 1), lvl("shield", "Firewall", 1)),
    Card({ name: "Performance", gap: 10 }, Label("Performance"), perf("Encryption speed", "150%", C.accent), perf("Hack duration", "240 s"), perf("File transfer", "140%", C.accent), perf("Task slots", "3"), perf("Defense", "68")));
}
export function RigManagerShop() {
  const item = (name, spec, price, state) => Row(
    H({ gap: 12 }, I("cpu", 18, C.t2),
      V({ gap: 3 }, T(name, { size: 14, w: 600 }), T(spec, { size: 12, color: C.t3 }))),
    H({ gap: 12 }, T(price, { size: 14, w: 700, color: C.gold }),
      state === "owned" ? Badge("Equipped", C.accent, { icon: "check" }) : state === "poor" ? Btn("Buy", "secondary", { disabled: true, size: "sm" }) : Btn("Buy", "primary", { size: "sm" })),
    { pad: [12, 14], stroke: state === "owned" ? C.accent : C.border });
  return Window("Rig Manager", "rig", 720, [
    rigHeader(),
    Tabs(["Device Shop", "Upgrades"], "Device Shop"),
    H({ gap: 8 }, Badge("CPU", C.accent), Badge("RAM", C.t2), Badge("Network", C.t2), Badge("Storage", C.t2)),
    V({ fillW: true, gap: 8 },
      item("Basic CPU", "Level 1  ·  Performance 1.0x", "₵100", "owned"),
      item("Advanced CPU", "Level 2  ·  Performance 1.5x", "₵250", "buy"),
      item("Professional CPU", "Level 3  ·  Performance 2.2x", "₵600", "buy"),
      item("Quantum Core X", "Level 4  ·  Performance 3.4x", "₵18,000", "poor")),
  ]);
}
export function RigManagerUpgrades() {
  const up = (icon, n, lv, effect, cost, ok) => Row(
    H({ gap: 12 }, I(icon, 18, C.t2),
      V({ gap: 3 }, H({ gap: 8 }, T(n, { size: 14, w: 600 }), Badge(`Lv.${lv} → ${lv + 1}`, C.info)), T(effect, { size: 12, color: C.t3 }))),
    H({ gap: 12 }, T(cost, { size: 14, w: 700, color: C.gold }), Btn("Upgrade", ok ? "primary" : "secondary", { size: "sm", icon: "uplink", disabled: !ok })),
    { pad: [12, 14] });
  return Window("Rig Manager", "rig", 720, [
    rigHeader(),
    Tabs(["Device Shop", "Upgrades"], "Upgrades"),
    V({ fillW: true, gap: 8 },
      up("cpu", "CPU", 4, "Mining ₵15 → ₵17 /hr  ·  Hack power 70 → 79", "₵195", true),
      up("ram", "RAM", 2, "Task slots 3 → 4", "₵188", true),
      up("shield", "Firewall", 1, "Defense 60 → 68", "₵120", true),
      up("storage", "Storage", 1, "File capacity +25%", "₵80", true),
      up("uplink", "Uplink", 1, "Transfer time −0.8 s per file", "₵90", true)),
    H({ gap: 8 }, I("info", 14, C.t3), T("Costs grow ×1.25 per level. Wallet: ₵12,480", { size: 12, color: C.t3 })),
  ]);
}

// ---------- Task Manager ----------
export function TaskManager() {
  const cols = [190, 80, 70, 90, 60, 70];
  const cell = (t, i, o = {}) => H({ w: cols[i], h: 20 }, typeof t === "string" ? T(t, { size: 12, color: o.color || C.t2, w: o.w || 400 }) : t);
  const st = { running: C.accent, suspended: C.warn, ended: C.t3 };
  const row = (name, type, user, status, cpu, mem, sel) => H({ name: `Proc/${name}`, fillW: true, pad: [8, 12], r: 6, fill: sel ? C.hover : null, stroke: sel ? C.accent : null, sa: 0.4, gap: 0 },
    cell(name, 0, { color: C.t1, w: 500 }), cell(type, 1), cell(user, 2), cell(H({ gap: 6 }, Dot(st[status], 6), T(status, { size: 12, color: st[status] })), 3),
    cell(cpu, 4, { color: C.t1 }), cell(mem, 5),
    H({ gap: 6 }, Btn(status === "suspended" ? "Resume" : "Suspend", "secondary", { size: "sm" }), Btn("End", "ghost", { size: "sm" })));
  return Window("Task Manager", "tasks", 760, [
    H({ fillW: true, gap: 12 },
      Stat("tasks", "Processes", "9", { size: 18 }), Stat("cpu", "CPU", "34%", { size: 18, extra: Progress(110, 0.34, C.accent, 4) }),
      Stat("ram", "Memory", "2.1 / 4 GB", { size: 18, extra: Progress(110, 0.52, C.info, 4) }), Stat("contract", "Task slots", "2 / 3", { size: 18, color: C.warn, sub: "RAM Lv.2" })),
    V({ name: "Table", fillW: true, gap: 2, pad: 6, r: 10, fill: C.panel, stroke: C.border },
      H({ name: "Header", fillW: true, pad: [8, 12] }, ...["NAME", "TYPE", "USER", "STATUS", "CPU", "MEMORY"].map((h, i) => H({ w: cols[i] }, T(h, { size: 10, w: 600, color: C.t3 }))), T("ACTIONS", { size: 10, w: 600, color: C.t3 })),
      row("Chimera Kit", "user", "Player", "running", "5.2%", "25 MB", true),
      row("Terminal", "user", "Player", "running", "2.1%", "15 MB"),
      row("Crypto Miner", "mining", "SYSTEM", "running", "15.7%", "32 MB"),
      row("Security Manager", "security", "SYSTEM", "running", "2.5%", "15 MB"),
      row("Network Service", "network", "SYSTEM", "running", "1.2%", "8 MB"),
      row("Data Analysis", "user", "Player", "suspended", "0.0%", "45 MB"),
      row("File System Monitor", "system", "SYSTEM", "running", "0.8%", "12 MB"),
      row("Memory Compressor", "system", "SYSTEM", "running", "1.5%", "5 MB"),
      row("System Idle Process", "system", "SYSTEM", "ended", "0.1%", "1 MB")),
    H({ fillW: true, main: "SPACE_BETWEEN" }, Btn("Add random task", "secondary", { icon: "plus" }), Btn("End task", "danger", { icon: "x" })),
  ]);
}

// ---------- Network Monitor ----------
export function Network() {
  const bars = [40, 55, 48, 62, 70, 58, 66, 80, 74, 69, 85, 90, 72, 64, 78, 88, 92, 76, 70, 82, 95, 84, 79, 86, 91, 73, 68, 77, 83, 84];
  const host = (ip, tag, col) => Row(H({ gap: 10 }, I("target", 15, col), T(ip, { size: 13, w: 600, color: C.info }), Badge(tag, col)), Btn("Hack", "secondary", { size: "sm", icon: "kit" }), { pad: [8, 12] });
  return Window("Network Monitor", "net", 560, [
    H({ fillW: true, gap: 12 },
      Stat("download", "Download", "84.2 Mbps", { size: 18, color: C.accent }), Stat("upload", "Upload", "21.7 Mbps", { size: 18, color: C.info }), Stat("ping", "Latency", "38 ms", { size: 18 })),
    Card({ name: "Throughput", gap: 10, fill: C.panel },
      H({ fillW: true, main: "SPACE_BETWEEN" }, Label("Throughput · last 60 s"), H({ gap: 10 }, H({ gap: 4 }, Dot(C.accent), T("down", { size: 11, color: C.t3 })), H({ gap: 4 }, Dot(C.info), T("up", { size: 11, color: C.t3 })))),
      H({ name: "Chart", h: 90, gap: 6, cross: "MAX" }, ...bars.map((b, i) => V({ gap: 2, cross: "CENTER" }, F({ w: 9, h: Math.round(b * 0.7), r: 2, fill: C.accent, fa: 0.85 }), F({ w: 9, h: Math.round(b * 0.18), r: 2, fill: C.info }))))),
    SectionHead("Discovered Hosts", Btn("Scan network", "secondary", { size: "sm", icon: "search" })),
    V({ fillW: true, gap: 6 }, host("192.168.4.21", "new", C.accent), host("10.0.12.77", "scanned", C.t2), host("172.16.88.3", "hacked", C.xp)),
    SectionHead("History"),
    V({ fillW: true, gap: 6, pad: 12, r: 6, fill: C.log, stroke: C.border },
      ...["14:32:08   ↓ 84.2 Mbps   ↑ 21.7 Mbps   Ping 38 ms", "14:32:05   ↓ 79.6 Mbps   ↑ 19.2 Mbps   Ping 41 ms", "14:32:02   ↓ 88.1 Mbps   ↑ 23.4 Mbps   Ping 35 ms", "14:31:59   ↓ 72.4 Mbps   ↑ 18.0 Mbps   Ping 47 ms"].map((l) => T(l, { size: 12, color: C.t2 }))),
  ]);
}

// ---------- System Logs ----------
export function Logs() {
  const tag = { START: C.info, SUCCESS: C.accent, UPGRADE: C.xp, COLLECT: C.gold, "LEVEL UP": C.xp, DISCOVER: C.info, FAIL: C.warn, CANCEL: C.t2, ERROR: C.danger, SOLD: C.gold };
  const ln = (t, k, m) => H({ name: `Log/${k}`, fillW: true, gap: 10, pad: [7, 10], r: 6, fill: C.card }, T(t, { size: 11, color: C.t3 }), H({ w: 74 }, Badge(k, tag[k])), T(m, { size: 12, color: C.t1 }));
  return Window("System Logs", "logs", 640, [
    H({ fillW: true, main: "SPACE_BETWEEN" },
      H({ gap: 6 }, Badge("All", C.accent), Badge("Hacking", C.t2), Badge("Wallet", C.t2), Badge("Rig", C.t2), Badge("System", C.t2)),
      Input("Filter logs…", { placeholder: true, icon: "search", fillW: false, w: 200 })),
    V({ fillW: true, gap: 6 },
      ln("14:32:10", "SUCCESS", "Small Corporate Bank  +₵220  +35 XP  +2 Rep"),
      ln("14:31:30", "START", "Small Corporate Bank (pve)"),
      ln("14:28:44", "SOLD", "financial_report.pdf for ₵800"),
      ln("14:25:02", "DISCOVER", "New target available: Corporate Data Center"),
      ln("14:12:19", "UPGRADE", "CPU -> Lv.4 (-₵195)"),
      ln("14:10:00", "LEVEL UP", "Now level 7"),
      ln("13:58:31", "FAIL", "Local Shop Network (got 5 XP from experience)"),
      ln("13:40:12", "COLLECT", "+₵86"),
      ln("13:22:47", "ERROR", "HACK FAILED - Connection lost! Penalty: ₵1,200"),
      ln("13:20:05", "CANCEL", "Government Server")),
    H({ gap: 8 }, I("info", 14, C.t3), T("Showing 10 of 250 entries (oldest are dropped)", { size: 12, color: C.t3 })),
  ]);
}

// ---------- Terminal ----------
export function Terminal() {
  const L = (t, col, w) => T(t, { size: 13, color: col || C.termText, w: w || 400 });
  const P = (c) => H({ gap: 8 }, L("C:\\User>", C.prompt, 600), L(c, "#F2F2F2"));
  return Window("Terminal", "terminal", 720, [
    L("ChimeraOS v1.0 — Interactive Shell", "#9E9E9E"),
    L('Type "help" for available commands', "#767676"),
    P("status"),
    V({ gap: 3 }, L("System Status:", C.prompt), L("Level: 7   XP: 214/299"), L("CPU: Lv.4 | RAM: Lv.2 | Firewall: Lv.1"), L("Mining Rate: 15/hour   Hacking Power: 70   Defense Points: 60")),
    P("scan 3"),
    V({ gap: 3 }, L("Network scan completed. Found 3 active devices:", C.prompt),
      H({ gap: 8 }, L("1."), L("192.168.4.21", "#3B78FF", 600)), H({ gap: 8 }, L("2."), L("10.0.12.77", "#3B78FF", 600)), H({ gap: 8 }, L("3."), L("172.16.88.3", "#3B78FF", 600)),
      L("Use 'hack <IP>' to initiate intrusion. Click on IP to auto-fill.", "#767676")),
    P("hax 192.168.4.21"),
    L("Command not found: hax. Type 'help' for available commands.", "#E74856"),
    P("hack 192.168.4.21"),
    V({ gap: 3 }, L("Initiating intrusion sequence on 192.168.4.21...", C.prompt), L("Opening Chimera Kit interface...", C.prompt), L("Warning: Session time: 240 seconds", "#F9F1A5")),
    H({ gap: 8 }, L("C:\\User>", C.prompt, 600), F({ name: "caret", w: 9, h: 18, fill: C.termText })),
  ], { contentFill: C.term, gap: 10 });
}

// ---------- Contracts (PVE targets from game.js) ----------
export function Contracts() {
  const card = (name, sec, diff, chance, cr, xp, rep, o = {}) => Card({ name: `Contract/${name}`, gap: 10, stroke: o.locked ? C.border : C.border2, fill: o.locked ? C.panel : C.card },
    H({ fillW: true, main: "SPACE_BETWEEN" },
      H({ gap: 10 }, I(o.locked ? "lock" : "target", 18, C.t2),
        V({ gap: 2 }, T(name, { size: 14, w: 600, color: o.locked ? C.t3 : C.t1 }), T(o.locked ? o.locked : `Difficulty ${diff}`, { size: 11, color: C.t3 }))),
      o.locked ? Badge("Locked", C.t3, { icon: "lock" }) : Badge(`${chance}% success`, chance > 60 ? C.accent : chance > 30 ? C.warn : C.danger)),
    !o.locked && H({ gap: 6 }, Badge(`${sec} s`, C.t2), Badge(`+₵${cr}`, C.gold), Badge(`+${xp} XP`, C.xp), Badge(`+${rep} Rep`, C.info)),
    !o.locked && Btn(o.running ? "Running…" : "Start hack", o.running ? "secondary" : "primary", { fillW: true, icon: o.running ? "clock" : "play", disabled: o.running }));
  const op = (name, left, pct) => Row(V({ gap: 6 }, H({ gap: 8 }, T(name, { size: 13, w: 600 }), Badge("PVE", C.info)), H({ gap: 10 }, Progress(260, pct, C.info), T(`${left} left`, { size: 12, color: C.t2 }))),
    Btn("Cancel", "danger", { size: "sm" }));
  return Window("Contracts", "contract", 720, [
    H({ fillW: true, main: "SPACE_BETWEEN" }, V({ gap: 2 }, T("Available contracts", { size: 16, w: 600 }), T("Hack targets to earn crypto, XP and reputation", { size: 12, color: C.t3 })),
      H({ gap: 8 }, Badge("Task slots 2 / 3", C.warn, { icon: "ram" }), Badge("Hack power 70", C.accent, { icon: "bolt" }))),
    H({ fillW: true, gap: 12 }, card("Small Corporate Bank", 40, "1,000", 62, 220, 35, 2, { running: true }), card("Local Shop Network", 20, "500", 95, 110, 18, 1)),
    H({ fillW: true, gap: 12 }, card("Corporate Data Center", 75, "2,000", 31, 500, 70, 5), card("Government Server", 120, "5,000", 0, 1200, 150, 12, { locked: "Unlocks at Level 10" })),
    H({ fillW: true, gap: 12 }, card("Mega Corporation HQ", 180, "10,000", 0, 2500, 300, 25, { locked: "Unlocks at Level 15" }), V({ fillW: true })),
    SectionHead("Active operations", T("2 running", { size: 12, color: C.t3 })),
    V({ fillW: true, gap: 8 }, op("Small Corporate Bank", "0:24", 0.4), op("Local Shop Network", "0:07", 0.65)),
  ]);
}
