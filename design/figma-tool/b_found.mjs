import { connect, cmd, close } from "./client.mjs";
import { runSection, state } from "./run.mjs";
import { C, H, V, T, F, I } from "./dsl.mjs";
import { Btn, Badge, Input, Tabs, Progress, Card, Row } from "./ui.mjs";
await connect();
const s = await cmd("get_node_info", { nodeId: state["Chimera OS / 02 Screens"].ids.start });
const menu = (s.children || []).find((c) => c.name === "Start Menu");
const mi = await cmd("get_node_info", { nodeId: menu.id });
await cmd("move_node", { nodeId: menu.id, x: 780, y: 1032 - 12 - Math.round(mi.absoluteBoundingBox.height) });
close();
const sw = (n, hex) => V({ gap: 6 }, F({ w: 96, h: 56, r: 6, fill: hex, stroke: C.border }), T(n, { size: 12, w: 600 }), T(hex, { size: 11, color: C.t2 }));
const colors = V({ name: "Colors", gap: 12 }, T("Colors", { size: 18, w: 600 }),
  H({ gap: 12, cross: "MIN" }, sw("bg/desktop", C.desk), sw("surface/window", C.win), sw("surface/panel", C.panel), sw("hover", C.hover), sw("border", C.border), sw("border/strong", C.border2)),
  H({ gap: 12, cross: "MIN" }, sw("text/primary", C.t1), sw("text/secondary", C.t2), sw("text/muted", C.t3), sw("accent", C.accent), sw("success", C.ok), sw("warning", C.warn), sw("danger", C.danger)),
  H({ gap: 12, cross: "MIN" }, sw("terminal/bg", C.term), sw("terminal/text", C.termText), sw("rarity/common", C.common), sw("rarity/rare", C.rare), sw("rarity/epic", C.epic), sw("rarity/legendary", C.legendary)));
const type = V({ name: "Typography", gap: 10 }, T("Typography — Inter (use Segoe UI Variable in app)", { size: 18, w: 600 }),
  T("Display 28 / Semibold  ₵ 12,480", { size: 28, w: 600 }), T("Title 18 / Semibold", { size: 18, w: 600 }), T("Section 14 / Semibold", { size: 14, w: 600 }),
  T("Body 13 / Regular — default UI text", { size: 13 }), T("Caption 12 / Regular — labels, secondary", { size: 12, color: C.t2 }), T("Small 11 / Regular — meta, timestamps", { size: 11, color: C.t3 }),
  T("Terminal 13 — Cascadia Mono / Consolas in app", { size: 13, color: C.t1 }));
const ctrls = V({ name: "Controls", gap: 14, w: 640 }, T("Controls", { size: 18, w: 600 }),
  H({ gap: 10 }, Btn("Primary", "primary"), Btn("Secondary", "secondary"), Btn("Danger", "danger"), Btn("Ghost", "ghost"), Btn("Disabled", "primary", { disabled: true }), Btn("Small", "secondary", { size: "sm" })),
  H({ gap: 8 }, Badge("Neutral", C.t2), Badge("Info", C.accent), Badge("Success", C.ok, { icon: "dot" }), Badge("Warning", C.warn), Badge("Danger", C.danger), Badge("RARE", C.rare), Badge("EPIC", C.epic), Badge("LEGENDARY", C.legendary)),
  H({ gap: 12, fillW: true }, Input("Placeholder", { placeholder: true, icon: "search" }), Input("192.168.4.21", { focus: true, caret: true })),
  Tabs(["Device Shop", "Upgrades"], "Device Shop"),
  H({ gap: 16 }, Progress(200, 0.65, C.accent, 4), Progress(200, 0.3, C.warn, 4), Progress(200, 0.08, C.danger, 4)),
  Row(H({ gap: 10 }, I("file", 16, C.t2), T("List row", { size: 13 })), Btn("Action", "secondary", { size: "sm" })),
  H({ gap: 10 }, ...["terminal", "kit", "contract", "rig", "wallet", "tasks", "net", "logs", "user", "cpu", "ram", "shield", "storage", "uplink", "folder", "file", "coin", "lock", "power", "search"].map((n) => I(n, 20, C.t1))));
const y0 = -2000 * 2 - 1400;
await runSection({ name: "Chimera OS / 01 Foundations", x: 0, y: y0 - 1100, rowWidth: 3000, items: [
  { key: "colors", node: F({ name: "Foundations", ...{ dir: "H", gap: 80, pad: 40, fill: C.win, r: 8, stroke: C.border, cross: "MIN" } }, colors, type, ctrls) },
]});
