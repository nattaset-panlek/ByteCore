import { C, F, H, V, T, I } from "./dsl.mjs";
import { Btn, Badge, Dot, Card, Progress, Label, SectionHead, Input, Window, Row, MenuItem } from "./ui.mjs";

const RAR = { common: C.common, rare: C.rare, epic: C.epic, legendary: C.legendary };

function logBox(lines) {
  const col = { info: C.t2, success: C.ok, warning: C.warn, error: C.danger };
  return V({ name: "Action Log", fillW: true, gap: 4, pad: 12, r: 6, fill: C.log, stroke: C.border },
    ...lines.map(([t, k, m]) => H({ gap: 8 }, T(`[${t}]`, { size: 12, color: C.t3 }), T(m, { size: 12, color: col[k] }))));
}

function targetCard(s) {
  const disabled = s !== "idle";
  return Card({ name: "Target", gap: 10 },
    Label("Target IP"),
    Input(s === "idle" ? "192.168.4.21" : "192.168.4.21", { focus: s === "idle", caret: s === "idle", icon: "target" }),
    H({ gap: 6 }, T("Discovered:", { size: 11, color: C.t3 }), Badge("192.168.4.21", C.info), Badge("10.0.12.77", C.info), Badge("172.16.88.3", C.info)),
    Btn(s === "encrypting" ? "Encrypting…" : "Start Encryption", s === "idle" ? "primary" : "secondary", { fillW: true, icon: "lock", disabled }));
}

function sessionCard(s) {
  const enc = s === "encrypting";
  const timer = { idle: "05:00", encrypting: "04:00", connected: "03:12", critical: "00:09" }[s];
  const pct = { idle: 1, encrypting: 1, connected: 0.64, critical: 0.04 }[s];
  const tcol = s === "critical" ? C.danger : s === "connected" ? C.accent : C.t3;
  return Card({ name: "Session", gap: 10, stroke: s === "critical" ? C.danger : C.border },
    enc && V({ gap: 8, fillW: true },
      H({ fillW: true, main: "SPACE_BETWEEN" }, Label("Encryption progress"), T("00:17 / 00:28", { size: 12, w: 600, color: C.info })),
      Progress(300, 0.4, C.info, 8)),
    H({ fillW: true, main: "SPACE_BETWEEN" }, Label("Session timer"),
      s === "connected" ? Badge("Connected", C.ok, { icon: "dot" }) : s === "critical" ? Badge("Critical", C.danger, { icon: "alert" }) : enc ? Badge("Encrypting…", C.info, { icon: "dot" }) : Badge("Idle", C.t3)),
    T(timer, { size: 30, w: 700, color: tcol }),
    Progress(300, pct, s === "critical" ? C.danger : s === "connected" ? C.accent : C.t3, 8),
    Btn("Emergency Disconnect", "danger", { fillW: true, icon: "power", disabled: s === "idle" || enc }));
}

function acquired(files) {
  const total = files.reduce((a, f) => a + f[3], 0);
  return V({ name: "Acquired Files", fillW: true, gap: 10 },
    SectionHead("Acquired Files", H({ gap: 12 }, T(`Total ₵${total.toLocaleString("en-US")}`, { size: 13, w: 600, color: C.gold }), Btn("Sell All", "gold", { size: "sm", icon: "sell", disabled: !files.length }))),
    files.length
      ? V({ fillW: true, gap: 6 }, ...files.map(([n, r, sz, v, act]) => Row(
        H({ gap: 10 }, I("file", 16, RAR[r]), V({ gap: 2 }, T(n, { size: 13, w: 600 }), T(`${sz} MB  ·  via ${act}`, { size: 11, color: C.t3 })), Badge(r.toUpperCase(), RAR[r])),
        H({ gap: 10 }, T(`₵${v.toLocaleString("en-US")}`, { size: 13, w: 600, color: C.gold }), Btn("Sell", "secondary", { size: "sm" })), { pad: [8, 12] })))
      : H({ fillW: true, pad: 18, r: 6, fill: C.panel, stroke: C.border, main: "CENTER", gap: 8 }, I("folder", 16, C.t3), T("No files acquired yet", { size: 13, color: C.t3 })));
}

function explorer(withMenu) {
  const item = (type, name, r, sz, hl) => H({ name: `${type}/${name}`, fillW: true, gap: 10, pad: [7, 10], r: 6, fill: hl ? C.hover : null, main: "SPACE_BETWEEN" },
    H({ gap: 10 }, I(type === "folder" ? "folder" : "file", 16, type === "folder" ? C.info : RAR[r]), T(name, { size: 13, w: 500, color: type === "folder" ? C.info : RAR[r] })),
    type === "file" ? T(`${sz} MB`, { size: 12, color: C.t3 }) : I("chevron", 14, C.t3));
  const menu = V({ name: "Context Menu", w: 190, pad: 4, gap: 0, r: 8, fill: C.win, stroke: C.border2 },
    MenuItem("eye", "Open", { hint: "3 s" }), MenuItem("copy", "Copy", { hint: "+30%" }), MenuItem("cut", "Cut", { hint: "+50%" }),
    MenuItem("download", "Download", { hint: "+100%", hover: true }), MenuItem("trash", "Remove", { hint: "+120%", color: C.danger }));
  return V({ name: "Remote File System", fillW: true, gap: 10 },
    SectionHead("Remote File System", T("/Documents", { size: 13, w: 600, color: C.info })),
    H({ name: "Toolbar", fillW: true, gap: 8 }, Btn("Back", "secondary", { size: "sm", icon: "back" }), Btn("Refresh", "secondary", { size: "sm", icon: "refresh" }),
      H({ fillW: true, main: "MAX" }, Badge("Connected", C.ok, { icon: "dot" }))),
    H({ name: "Explorer", fillW: true, gap: 12, cross: "MIN" },
      V({ name: "File List", fillW: true, gap: 2, pad: 8, r: 6, fill: C.card, stroke: C.border },
        item("folder", "..", null, null),
        item("file", "passwords.txt", "common", 2.3),
        item("file", "financial_report.pdf", "rare", 5.7),
        item("file", "secret_plans.docx", "epic", 3.1, withMenu),
        H({ name: "Loading", fillW: true, gap: 10, pad: [7, 10], r: 6, fill: C.warn, fa: 0.08 },
          I("clock", 15, C.warn), T("Performing download… blueprint.png (12 s)", { size: 12, color: C.warn }))),
      withMenu && menu));
}

export function Kit(s) {
  const top = H({ fillW: true, gap: 12, cross: "MIN" }, targetCard(s), sessionCard(s));
  const head = H({ fillW: true, main: "SPACE_BETWEEN" },
    V({ gap: 2 }, T("Network Intrusion", { size: 16, w: 600 }), T(s === "idle" ? "Enter a target to begin" : "Target 192.168.4.21", { size: 12, color: C.t3 })),
    H({ gap: 8 }, Badge("CPU Lv.4", C.t2, { icon: "cpu" }), Badge("Uplink Lv.1", C.t2, { icon: "uplink" })));
  const children = [head, top];
  if (s === "critical") children.push(H({ name: "Critical Banner", fillW: true, gap: 10, pad: [10, 14], r: 6, fill: C.card, stroke: C.danger },
    I("alert", 18, C.danger), T("Critical: 10 seconds remaining! Disconnect now or lose ₵1,200.", { size: 13, w: 600, color: C.danger })));
  if (s === "connected" || s === "critical") children.push(explorer(s === "connected"));
  children.push(acquired(s === "idle" || s === "encrypting" ? [] : [["financial_report.pdf", "rare", 5.7, 800, "download"], ["vacation.jpg", "common", 4.2, 30, "copy"], ["blueprint.png", "legendary", 8.9, 2500, "download"]]));
  const logs = {
    idle: [["14:30:01", "info", "Chimera Kit initialized. Ready for network intrusion."]],
    encrypting: [["14:30:01", "info", "Chimera Kit initialized. Ready for network intrusion."], ["14:30:12", "info", "Starting encryption on 192.168.4.21..."], ["14:30:12", "info", "Encryption time: 28s (CPU Level 4)"]],
    connected: [["14:30:40", "success", "Encryption complete! Access granted to file system."], ["14:30:44", "info", "Opened folder: Documents"], ["14:31:02", "success", "Successfully downloaded financial_report.pdf (+₵800)"], ["14:31:30", "warning", "Removed kernel.dll (Value increased)"]],
    critical: [["14:33:52", "warning", "Warning: 30 seconds remaining!"], ["14:34:12", "error", "Critical: 10 seconds remaining! Disconnect soon!"]],
  }[s];
  children.push(V({ fillW: true, gap: 8 }, SectionHead("Action Log"), logBox(logs)));
  return Window(`Chimera Kit — ${s[0].toUpperCase() + s.slice(1)}`, "kit", 780, children);
}
