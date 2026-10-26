import { connect, cmd, close } from "./client.mjs";
import { build, C, F, H, V, T, I } from "./dsl.mjs";
import { Progress, Toast } from "./ui.mjs";
import { state, save } from "./run.mjs";
import * as M from "./modals.mjs";

const WALL = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs>
<radialGradient id="a" cx="0.72" cy="0.38" r="0.75"><stop offset="0" stop-color="#C9DCF2"/><stop offset="1" stop-color="#E9EEF4"/></radialGradient>
<radialGradient id="b" cx="0.2" cy="0.9" r="0.6"><stop offset="0" stop-color="#D8E2EE" stop-opacity="0.9"/><stop offset="1" stop-color="#D8E2EE" stop-opacity="0"/></radialGradient></defs>
<rect width="1920" height="1080" fill="url(#a)"/><rect width="1920" height="1080" fill="url(#b)"/></svg>`;

const APPS = [["terminal", "Terminal"], ["kit", "Chimera Kit"], ["contract", "Contracts"], ["rig", "Rig Manager"], ["wallet", "Wallet"], ["tasks", "Task Manager"], ["net", "Network"], ["logs", "Logs"], ["user", "Profile"]];

function Taskbar(open = [], active) {
  const tb = (icon, name) => V({ name: `TaskButton/${name}`, w: 40, h: 40, r: 4, fill: name === active ? "#FFFFFF" : null, fa: name === active ? 0.7 : 1, main: "CENTER", cross: "CENTER", gap: 3 },
    I(icon, 20, C.t1), F({ name: "indicator", w: name === active ? 16 : 6, h: 3, r: 1.5, fill: name === active ? C.accent : C.t3, fa: open.includes(name) ? 1 : 0.001 }));
  return H({ name: "Taskbar", w: 1920, h: 48, y: 1032, pad: [0, 12], fill: "#F3F3F3", fa: 0.92, stroke: C.border2, main: "SPACE_BETWEEN" },
    H({ name: "Left", w: 300 }, H({ gap: 8 }, I("coin", 16, C.t2), T("₵ 12,480", { size: 12, w: 600 }), T("·  Lv 7", { size: 12, color: C.t2 }))),
    H({ name: "Center", gap: 4 }, V({ name: "Start", w: 40, h: 40, r: 4, main: "CENTER", cross: "CENTER" }, I("win", 20, C.accent)),
      V({ name: "Search", w: 40, h: 40, main: "CENTER", cross: "CENTER" }, I("search", 18, C.t1)),
      ...APPS.slice(0, 8).map(([i, n]) => tb(i, n))),
    H({ name: "Tray", w: 300, main: "MAX", gap: 12 }, I("wifi", 16, C.t1), I("volume", 16, C.t1),
      V({ gap: 1, cross: "MAX" }, T("14:32", { size: 12 }), T("27/10/2026", { size: 12 }))));
}

function DesktopIcons() {
  return V({ name: "Desktop Icons", x: 16, y: 16, gap: 10 }, ...APPS.map(([i, n]) => V({ name: `DesktopIcon/${n}`, w: 76, pad: [8, 4], gap: 6, cross: "CENTER", r: 4 },
    V({ w: 40, h: 40, r: 6, fill: "#FFFFFF", fa: 0.75, stroke: C.border, main: "CENTER", cross: "CENTER" }, I(i, 22, C.accent)), T(n, { size: 12, color: C.t1 }))));
}

const Desktop = (name, extra = [], open = [], active) => F({ name, w: 1920, h: 1080, fill: C.desk, image: WALL, imageW: 1920 }, DesktopIcons(), ...extra, Taskbar(open, active));

const Boot = () => F({ name: "Screen/Boot", w: 1920, h: 1080, fill: "#000000" },
  V({ name: "Center", x: 760, y: 400, w: 400, gap: 28, cross: "CENTER" },
    I("logo", 64, "#FFFFFF"),
    V({ gap: 6, cross: "CENTER" }, T("Chimera OS", { size: 24, w: 600, color: "#FFFFFF" }), T("Loading save data…", { size: 13, color: "#9E9E9E" })),
    Progress(240, 0.72, "#FFFFFF", 3)),
  V({ name: "Boot log", x: 32, y: 980, gap: 4 }, ...["[ OK ] Mounting wallet ledger", "[ OK ] Starting Crypto Miner (CPU Lv.4)", "[ .. ] Restoring 3 discovered hosts"].map((t) => T(t, { size: 12, color: "#6E6E6E" }))));

const Shutdown = () => F({ name: "Screen/Shutdown", w: 1920, h: 1080, fill: "#0067C0" },
  V({ x: 810, y: 480, w: 300, gap: 18, cross: "CENTER" }, F({ name: "spinner", w: 32, h: 32, r: 16, stroke: "#FFFFFF", sw: 3 }), T("Shutting down", { size: 20, w: 400, color: "#FFFFFF" })));

const Scrim = () => F({ name: "Scrim", w: 1920, h: 1080, fill: "#000000", fa: 0.3 });

await connect();
const name = "Chimera OS / 02 Screens";
if (state[name]?.section) try { await cmd("delete_node", { nodeId: state[name].section }); } catch {}
const top = -1080 * 2 - 600;
const W = state["Chimera OS / 03 Windows"].ids, K = state["Chimera OS / 04 Chimera Kit states"].ids;
const items = [
  ["boot", Boot()],
  ["desktop", Desktop("Screen/Desktop")],
  ["start", Desktop("Screen/Desktop + Start menu", [{ ...M.StartMenu(), p: { ...M.StartMenu().p, x: 780, y: 1032 - 12 - 640 } }])],
  ["firstLoad", Desktop("Screen/First load (Profile + Mining Rig)", [], ["Profile", "Rig Manager"], "Profile"), [[W.profile, 420, 70], [W.mining, 1040, 150]]],
  ["hacking", Desktop("Screen/Hacking session", [{ ...Toast(C.ok, "sell", "Sold blueprint.png", "+₵2,500 added to wallet"), p: { ...Toast(C.ok, "sell", "x", "y").p, x: 1540, y: 940 } }], ["Terminal", "Chimera Kit"], "Chimera Kit"), [[W.terminal, 140, 300], [K.connected, 900, 40]]],
  ["modal", Desktop("Screen/Shutdown confirm", [Scrim(), { ...M.ShutdownDialog(), p: { ...M.ShutdownDialog().p, x: 740, y: 400 } }])],
  ["shutdown", Shutdown()],
];
const ids = {};
let x = 100, y = top + 100;
for (const [k, node, wins] of items) {
  const id = await build({ ...node, p: { ...node.p, x, y } });
  ids[k] = id;
  for (const [src, wx, wy] of wins || []) {
    const cl = await cmd("clone_node", { nodeId: src });
    await cmd("set_parent", { nodeId: cl.id, parentId: id, index: 1 });
    await cmd("move_node", { nodeId: cl.id, x: wx, y: wy });
  }
  console.log("built", k, id);
  x += 2020; if (x > 6200) { x = 100; y += 1180; }
}
const sec = await cmd("create_section", { x: 0, y: top, width: 4 * 2020 + 100, height: 2 * 1180 + 120, name });
for (const id of Object.values(ids)) await cmd("set_parent", { nodeId: id, parentId: sec.id });
state[name] = { section: sec.id, ids };
save();
console.log("section", sec.id);
close();
