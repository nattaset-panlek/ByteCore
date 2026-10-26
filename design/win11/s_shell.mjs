// 03 Shell: boot, lock, sign in, desktop, Start, power menu, notifications, shutdown
import { connect, close, buildSection, H, V, F, T, IMG, Icon, App, File, Spacer, Div } from "./kit.mjs";
import * as U from "./ci.mjs";
import { place } from "./state.mjs";

const ring = (s, col = "#60CDFF") => IMG(`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}"><path d="M${s / 2} ${s * 0.1} A ${s * 0.4} ${s * 0.4} 0 1 1 ${s * 0.1} ${s / 2}" stroke="${col}" stroke-width="${Math.max(2, s / 12)}" fill="none" stroke-linecap="round"/></svg>`, s, s, { name: "ProgressRing" });
const avatar = (s, initials = "GU") => H({ name: "PersonPicture", w: s, h: s, r: s / 2, main: "CENTER", fill: "control/default", stroke: "stroke/surface" }, T(initials, s > 100 ? "TitleLarge" : s > 40 ? "Subtitle" : "Caption", "text/secondary"));
export const DESKTOP_COLOR = "#16233A";
const screen = (name, kids, o = {}) => F({ name: `Screen/${name}`, w: 1920, h: 1080, fill: o.fill || DESKTOP_COLOR }, ...kids);
const at = (node, x, y) => ({ ...node, p: { ...node.p, x, y } });

export const DESK = ["FileExplorer", "Terminal", "ChimeraKit", "Contracts", "RigManager", "Wallet", "TaskManager", "Settings"];
const LABEL = { FileExplorer: "File Explorer", Terminal: "Terminal", ChimeraKit: "Chimera Kit", Contracts: "Contracts", RigManager: "Rig Manager", MiningRig: "Mining Rig", Wallet: "Wallet", TaskManager: "Task Manager", NetworkMonitor: "Network", EventLogs: "Event Logs", Settings: "Settings", Profile: "Profile" };
export const desktopIcons = () => at(V({ name: "Desktop icons", gap: 2 }, ...DESK.map((a) => V({ name: `DesktopIcon/${LABEL[a]}`, w: 80, gap: 4, pad: [6, 2], cross: "CENTER", r: 4 }, App(a, 48), T(LABEL[a], "Caption")))), 8, 8);
export const taskbar = (o) => at(U.Taskbar(o), 0, 1032);

// Start menu (matches the Windows 11 Start layout)
const PINNED = ["Terminal", "ChimeraKit", "Contracts", "RigManager", "MiningRig", "Wallet", "TaskManager", "NetworkMonitor", "EventLogs", "FileExplorer", "Settings", "Profile"];
export function StartMenu(o = {}) {
  const rows = [PINNED.slice(0, 6), PINNED.slice(6, 12)];
  const rec = [[File("PDF", 32), "financial_report.pdf", "12 min ago"], [File("Image", 32), "blueprint.png", "34 min ago"], [File("Text", 32), "passwords.txt", "1 h ago"], [File("Key", 32), "crypto_wallet.dat", "2 h ago"], [App("Contracts", 32), "Small Corporate Bank", "Contract completed"], [File("Archive", 32), "save_backup_1027.zip", "Yesterday"]];
  return V({ name: "Start menu", w: 642, h: 726, r: 8, fill: "bg/flyout", stroke: "stroke/surface" },
    V({ name: "body", fillW: true, fillH: true, gap: 20, pad: [32, 32, 16, 32] },
      H({ name: "search", fillW: true, h: 36, gap: 12, pad: [0, 16], r: 18, fill: "control/input-active", stroke: "stroke/control" }, Icon("search", 16, "text/secondary"), T("Search for apps, settings, and documents", "Body", "text/secondary")),
      H({ fillW: true, pad: [8, 0, 0, 0] }, T("Pinned", "BodyStrong"), Spacer(), H({ h: 24, gap: 6, pad: [0, 8], r: 4, fill: "control/default", stroke: "stroke/control" }, T("All", "Caption"), Icon("chevron_right", 12))),
      V({ name: "Pinned", gap: 0 }, ...rows.map((r) => H({ gap: 0 }, ...r.map((a, i) => U.PinnedTile(a, LABEL[a], o.hover === a))))),
      H({ fillW: true, pad: [12, 0, 0, 0] }, T("Recommended", "BodyStrong"), Spacer(), H({ h: 24, gap: 6, pad: [0, 8], r: 4, fill: "control/default", stroke: "stroke/control" }, T("More", "Caption"), Icon("chevron_right", 12))),
      H({ name: "Recommended", gap: 12 }, V({ gap: 4 }, ...rec.filter((_, i) => i % 2 === 0).map((r) => U.RecItem(...r))), V({ gap: 4 }, ...rec.filter((_, i) => i % 2 === 1).map((r) => U.RecItem(...r))))),
    H({ name: "footer", fillW: true, h: 64, pad: [0, 52, 0, 52], fill: "bg/solid-secondary" },
      H({ gap: 12, pad: [6, 12], r: 4 }, avatar(32), T("ghost_user", "Caption")), Spacer(),
      H({ name: "power", w: 40, h: 40, r: 4, main: "CENTER", fill: o.power ? "subtle/hover" : null }, Icon("power", 16))));
}
const PowerMenu = () => U.Flyout("Power menu", 200, U.MenuItem("Lock", { icon: "lock_closed", w: 192 }), U.MenuItem("Save and sign out", { icon: "sign_out", w: 192 }), U.MenuItem("Restart", { icon: "arrow_clockwise", w: 192, state: "Hover" }), U.MenuItem("Shut down", { icon: "power", w: 192 }));

function Calendar() {
  const days = []; let d = new Date(2026, 8, 27);
  for (let i = 0; i < 42; i++) { days.push(new Date(d)); d.setDate(d.getDate() + 1); }
  const cell = (dt) => { const cur = dt.getMonth() === 9, today = cur && dt.getDate() === 27; return H({ w: 40, h: 40, r: 20, main: "CENTER", fill: today ? "accent/default" : null }, T(dt.getDate(), "Body", today ? "text/on-accent" : cur ? "text/primary" : "text/disabled")); };
  return V({ name: "Calendar", w: 360, gap: 8, pad: 16, r: 8, fill: "bg/flyout", stroke: "stroke/surface" },
    H({ fillW: true }, T("Tuesday, 27 October", "BodyStrong"), Spacer(), Icon("chevron_up", 16, "text/secondary")),
    H({ fillW: true }, T("October 2026", "Body"), Spacer(), Icon("chevron_up", 16, "text/secondary"), H({ w: 16 }), Icon("chevron_down", 16, "text/secondary")),
    H({ gap: 0 }, ...["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((n) => H({ w: 40, h: 32, main: "CENTER" }, T(n, "Caption", "text/secondary")))),
    ...[0, 1, 2, 3, 4, 5].map((r) => H({ gap: 0 }, ...days.slice(r * 7, r * 7 + 7).map(cell))));
}
const Notifications = () => V({ name: "Notification center", w: 360, gap: 12, pad: 16, r: 8, fill: "bg/flyout", stroke: "stroke/surface" },
  H({ fillW: true }, T("Notifications", "BodyStrong"), Spacer(), T("Clear all", "Caption", "accent/text")),
  ...[["Wallet", "Wallet", "Sold blueprint.png", "+₵2,500 added to your wallet"], ["Contracts", "Contracts", "Contract complete", "Small Corporate Bank  +₵220  +35 XP"], ["ChimeraKit", "Chimera Kit", "New target discovered", "Corporate Data Center is now available"], ["Profile", "Profile", "Level up", "You reached level 7"]].map(([a, n, t, b]) =>
    V({ fillW: true, gap: 6, pad: 12, r: 4, fill: "bg/card", stroke: "stroke/card" }, H({ fillW: true, gap: 8 }, App(a, 16), T(n, "Caption", "text/secondary"), Spacer(), T("14:3" + n.length % 10, "Caption", "text/tertiary")), T(t, "BodyStrong"), T(b, "Body", "text/secondary"))));

const BOOT_LOG = [
  ["[  OK  ]", "Started Xea kernel 6.2.0-xea"],
  ["[  OK  ]", "Mounted Local Disk (C:)"],
  ["[  OK  ]", "Loaded wallet ledger  ₵ 12,480"],
  ["[  OK  ]", "Started Crypto Miner service (CPU Lv.4)"],
  ["[  OK  ]", "Restored 3 discovered hosts"],
  ["[  OK  ]", "Started Network Service on Darknet_5G"],
  ["[ .... ]", "Starting Chimera Kit runtime"],
];
const boot = screen("Boot", [
  at(V({ name: "logo", w: 1920, cross: "CENTER", gap: 20 }, App("XeaLogo", 112), T("Xea OS", "Title", "text/primary", { size: 32 })), 0, 360),
  at(V({ w: 1920, cross: "CENTER" }, ring(40, "#FFFFFF")), 0, 660),
  at(V({ name: "boot log", gap: 4 }, ...BOOT_LOG.map(([tag, msg], i) => H({ gap: 10 }, T(tag, "Caption", i === BOOT_LOG.length - 1 ? "system/caution" : "system/success"), T(msg, "Caption", i === BOOT_LOG.length - 1 ? "text/primary" : "text/secondary")))), 32, 892),
  at(T("Xea OS 1.0  build 2610.27", "Caption", "text/tertiary"), 1700, 1040),
], { fill: "#000000" });
const lock = screen("Lock screen", [
  at(V({ name: "clock", w: 1920, cross: "CENTER", gap: 0 }, T("14:32", "Display", "text/primary", { size: 112, weight: 600 }), T("Tuesday, 27 October", "BodyLarge", "text/primary", { size: 24 })), 0, 140),
  at(H({ gap: 16 }, Icon("wifi_1", 20), Icon("speaker_2", 20)), 1840, 1030),
  at(V({ w: 1920, cross: "CENTER" }, T("Press any key or click to continue", "Body", "text/secondary")), 0, 1000),
]);
const signin = screen("Sign in", [
  at(F({ name: "dim", w: 1920, h: 1080, fill: "#000000", fa: 0.35 }), 0, 0),
  at(V({ name: "account", w: 1920, cross: "CENTER", gap: 16 }, avatar(192), T("ghost_user", "Title"), T("Level 7 hacker  ·  ₵ 12,480  ·  Last played 2 h ago", "Body", "text/secondary"), H({ h: 8 }),
    U.Button("Continue", "Accent", { w: 296 }), U.Button("New game", "Standard", { w: 296 }), T("Load save file", "Body", "accent/text")), 0, 300),
  at(V({ name: "profiles", gap: 4 }, ...[["GU", "ghost_user", true], ["NX", "nyx_rider", false], ["+", "New profile", false]].map(([i, n, sel]) => H({ w: 260, gap: 12, pad: [8, 12], r: 4, fill: sel ? "subtle/selected" : null }, avatar(40, i), T(n, "Body")))), 24, 860),
  at(H({ gap: 8 }, ...["wifi_1", "speaker_2", "power"].map((i) => H({ w: 40, h: 40, r: 4, main: "CENTER" }, Icon(i, 20)))), 1780, 1016),
]);
const desktop = screen("Desktop", [desktopIcons(), taskbar({ running: ["FileExplorer"] })]);
const start = screen("Desktop + Start", [desktopIcons(), at(StartMenu({ hover: "ChimeraKit" }), 639, 294), taskbar({ startOpen: true, running: ["FileExplorer"] })]);
const power = screen("Start + Power menu", [desktopIcons(), at(StartMenu({ power: true }), 639, 294), at(PowerMenu(), 1072, 866), taskbar({ startOpen: true })]);
const notif = screen("Notification center", [desktopIcons(), at(Notifications(), 1548, 240), at(Calendar(), 1548, 612), taskbar({ running: ["ChimeraKit", "Wallet"], badge: "4" })]);
const toast = screen("Desktop + Toast", [desktopIcons(), at(U.Toast("ChimeraKit", "Chimera Kit", "30 seconds remaining", "Finish transfers and disconnect from\n192.168.4.21.", { actions: ["Open Chimera Kit", "Dismiss"] }), 1544, 790), taskbar({ running: ["ChimeraKit"], active: "ChimeraKit" })]);
const shut = screen("Shutting down", [at(V({ w: 1920, cross: "CENTER", gap: 24 }, ring(40, "#FFFFFF"), T("Shutting down", "Subtitle", "text/primary", { weight: 400 })), 0, 500)], { fill: "#000000" });

if (import.meta.main) {
  await connect();
  const P = place("03 Shell");
  const r = await buildSection("03 Shell", 80, P.y, [boot, lock, signin, desktop, start, power, notif, toast, shut].map((node, i) => ({ node, br: i % 3 === 0 && i > 0 })), { replace: P.old, maxW: 7000 });
  place("03 Shell", r);
  close();
}
