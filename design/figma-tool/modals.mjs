import { C, F, H, V, T, I } from "./dsl.mjs";
import { Btn, Badge, Card, Label, Input, Row, Div, Dialog, Toast, MenuItem, Progress } from "./ui.mjs";

export const ShutdownDialog = () => Dialog(C.danger, "power", "Shut down Chimera OS?", "Your progress is saved automatically.\nActive hacking sessions will be terminated.",
  [Btn("Cancel", "secondary"), Btn("Shut down", "danger", { icon: "power" })]);
export const ResetDialog = () => Dialog(C.danger, "trash", "Delete all save data?", "Wallet, rig, level and logs will be reset.\nThis cannot be undone.",
  [Btn("Cancel", "secondary"), Btn("Delete save", "danger", { icon: "trash" })]);
export const FundsAlert = () => Dialog(C.warn, "coin", "Not enough funds", "Professional CPU costs ₵600.\nYour wallet has ₵420.",
  [Btn("Open Wallet", "secondary", { icon: "wallet" }), Btn("OK", "primary")],
  { extra: H({ gap: 10 }, Progress(260, 0.7, C.gold, 6), T("₵420 / ₵600", { size: 12, w: 600, color: C.gold })) });
export const RamAlert = () => Dialog(C.warn, "ram", "All task slots are busy", "RAM Lv.2 allows 3 tasks at once (3 / 3 used).\nUpgrade RAM or wait for a task to finish.",
  [Btn("Upgrade RAM", "secondary", { icon: "uplink" }), Btn("OK", "primary")]);
export const IpAlert = () => Dialog(C.info, "target", "Target IP required", "Please enter a target IP address.\nRun 'scan' in Terminal to discover hosts.",
  [Btn("Open Terminal", "secondary", { icon: "terminal" }), Btn("OK", "primary")]);

export const HackSuccess = () => Dialog(C.accent, "check", "Contract complete", "Small Corporate Bank was breached successfully.",
  [Btn("View logs", "secondary"), Btn("Collect", "primary", { icon: "download" })],
  { extra: V({ fillW: true, gap: 8 },
    H({ fillW: true, gap: 8 }, ...[["₵", "+₵220", C.gold, "coin"], ["XP", "+35 XP", C.xp, "level"], ["Rep", "+2 Rep", C.info, "star"]].map(([, v, col, ic]) =>
      V({ fillW: true, pad: 12, gap: 4, r: 10, fill: C.panel, stroke: C.border, cross: "CENTER" }, I(ic, 18, col), T(v, { size: 15, w: 700, color: col })))),
    H({ gap: 8, pad: [8, 10], r: 4, fill: C.panel }, I("target", 14, C.info), T("New target discovered: Corporate Data Center", { size: 12, color: C.info }))) });
export const HackFailed = () => Dialog(C.danger, "x", "Connection lost", "The session timer ran out before you disconnected.\nThe target traced your rig.",
  [Btn("Close", "secondary"), Btn("Try again", "primary", { icon: "refresh" })],
  { extra: V({ fillW: true, gap: 6, pad: 12, r: 6, fill: C.panel, stroke: C.border },
    H({ fillW: true, main: "SPACE_BETWEEN" }, T("Penalty", { size: 13, color: C.t2 }), T("−₵1,200", { size: 14, w: 700, color: C.danger })),
    H({ fillW: true, main: "SPACE_BETWEEN" }, T("Files lost", { size: 13, color: C.t2 }), T("0 (already sold)", { size: 13, color: C.t1 }))) });
export const LevelUp = () => Dialog(C.xp, "level", "Level 10 reached!", "Your skills are getting noticed in the underground.",
  [Btn("Open Contracts", "primary", { icon: "contract" })],
  { extra: V({ fillW: true, gap: 8 },
    H({ gap: 10 }, T("9", { size: 28, w: 700, color: C.t3 }), I("chevron", 20, C.t3), T("10", { size: 28, w: 700, color: C.xp })),
    Row(H({ gap: 10 }, I("unlock", 16, C.accent), T("Unlocked target: Government Server", { size: 13, w: 600 })), Badge("NEW", C.accent), { pad: [10, 12] }),
    Row(H({ gap: 10 }, I("trophy", 16, C.gold), T("Achievement: Advanced Hacker", { size: 13, w: 600 })), Badge("+1", C.gold), { pad: [10, 12] })) });
export const OfflineEarnings = () => Dialog(C.gold, "clock", "Welcome back, ghost_user", "While you were away (5 h 12 m), your rig kept mining.",
  [Btn("Later", "secondary"), Btn("Collect ₵78", "gold", { icon: "download" })],
  { extra: V({ fillW: true, gap: 8, pad: 14, r: 10, fill: C.panel, stroke: C.border },
    H({ fillW: true, main: "SPACE_BETWEEN" }, T("Mined offline", { size: 13, color: C.t2 }), T("₵78", { size: 20, w: 700, color: C.gold })),
    H({ fillW: true, main: "SPACE_BETWEEN" }, T("Rate", { size: 12, color: C.t3 }), T("₵15 / hr", { size: 12, color: C.t2 })),
    H({ fillW: true, main: "SPACE_BETWEEN" }, T("Offline cap", { size: 12, color: C.t3 }), T("8 hr max", { size: 12, color: C.t2 }))) });

export const StartMenu = () => V({ name: "Start Menu", w: 360, pad: 12, gap: 10, r: 8, fill: C.win, stroke: C.border2 },
  H({ fillW: true, gap: 12, pad: 10, r: 6, fill: C.panel },
    H({ w: 40, h: 40, r: 20, fill: C.hover, stroke: C.border, main: "CENTER" }, T("GU", { size: 14, w: 600, color: C.t2 })),
    V({ gap: 2 }, T("ghost_user", { size: 14, w: 600 }), T("Lv 7  ·  42 Rep  ·  ₵12,480", { size: 11, color: C.t3 }))),
  Input("Search apps…", { placeholder: true, icon: "search" }),
  Label("Apps"),
  V({ fillW: true, gap: 0 },
    MenuItem("terminal", "Terminal", { hint: "Ctrl+T", hover: true }), MenuItem("kit", "Chimera Kit", { hint: "Ctrl+K" }),
    MenuItem("contract", "Contracts"), MenuItem("rig", "Rig Manager", { hint: "Ctrl+M" }), MenuItem("rig", "Mining Rig"),
    MenuItem("wallet", "Crypto Wallet"), MenuItem("tasks", "Task Manager"), MenuItem("net", "Network Monitor"),
    MenuItem("logs", "System Logs", { hint: "Ctrl+L" }), MenuItem("user", "Profile")),
  Div(),
  H({ fillW: true, main: "SPACE_BETWEEN" }, MenuItem("settings", "Settings"), MenuItem("power", "Shutdown", { color: C.danger })));

export const ContextMenu = () => V({ name: "Context Menu", w: 200, pad: 4, gap: 0, r: 8, fill: C.win, stroke: C.border2 },
  MenuItem("eye", "Open", { hint: "3 s" }), MenuItem("copy", "Copy", { hint: "+30%" }), MenuItem("cut", "Cut", { hint: "+50%" }),
  MenuItem("download", "Download", { hint: "+100%", hover: true }), Div(), MenuItem("trash", "Remove", { hint: "+120%", color: C.danger }));

export const Toasts = () => V({ name: "Toasts", gap: 12 },
  Toast(C.accent, "sell", "Sold blueprint.png", "+₵2,500 added to wallet"),
  Toast(C.info, "target", "New target discovered", "Corporate Data Center is now available"),
  Toast(C.xp, "level", "Level up!", "You are now level 7"),
  Toast(C.gold, "trophy", "Achievement unlocked", "Thousandaire — Accumulate ₵1,000"),
  Toast(C.warn, "clock", "30 seconds remaining", "Finish transfers and disconnect soon"),
  Toast(C.danger, "x", "HACK FAILED", "Connection lost! Penalty: ₵1,200"));

export const Tooltip = () => V({ name: "Tooltips", gap: 16 },
  H({ name: "Tooltip", pad: [6, 10], r: 6, fill: C.t1 }, T("Upgrade CPU: +15% mining rate", { size: 12, w: 500, color: C.desk })),
  H({ name: "Tooltip/shortcut", pad: [6, 10], gap: 8, r: 6, fill: C.t1 }, T("Open Terminal", { size: 12, w: 500, color: C.desk }), T("Ctrl+T", { size: 11, w: 600, color: C.t3 })));
