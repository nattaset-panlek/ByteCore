// 05 Settings: Home, Personalization > Colors, System > Save data, Accounts > Your info (player profile)
import { connect, close, buildSection, H, V, F, T, IMG, Icon, App, File, Spacer, Div } from "./kit.mjs";
import * as U from "./ci.mjs";
import { place } from "./state.mjs";

const NAV = [["Home", "home", "#FFB900"], ["System", "desktop", "#60CDFF"], ["Rig & devices", "developer_board", "#60CDFF"], ["Network & internet", "globe", "#60CDFF"], ["Personalization", "paint_brush", "#F7894A"], ["Apps", "apps", "#B4A0FF"], ["Accounts", "person", "#6CCB5F"], ["Time & language", "clock", "#60CDFF"], ["Gaming", "games", "#C5C5C5"], ["Privacy & security", "shield", "#C5C5C5"], ["Xea Update", "arrow_clockwise", "#60CDFF"]];
const avatar = (s) => H({ name: "PersonPicture", w: s, h: s, r: s / 2, main: "CENTER", fill: "control/default", stroke: "stroke/surface" }, T("GU", s > 80 ? "Title" : "Subtitle", "text/secondary"));
const WALL_COLORS = ["#16233A", "#2B1A3D", "#12302B", "#3A2214", "#202020", "#3A1630"];
const thumb = (w, h, i = 0) => F({ name: "wallpaper", w, h, r: 4, fill: WALL_COLORS[i] });

function Settings(page, kids, o = {}) {
  return U.Window("Settings", null, 1440, o.h || 900, [
    H({ name: "Body", fillW: true, fillH: true, gap: 0, cross: "MIN" },
      V({ name: "Navigation", w: 320, fillH: true, gap: 4, pad: [8, 16, 16, 16] },
        H({ gap: 16, pad: [8, 4, 16, 4] }, avatar(64), V({ gap: 0 }, T("ghost_user", "BodyStrong"), T("ghost_user@xea.local", "Caption", "text/secondary"))),
        U.TextBox("Find a setting", { w: 288, icon: "search" }), H({ h: 8 }),
        ...NAV.map(([n, i, col]) => U.NavItem(n, Icon(i, 16, col), { w: 288, state: n === page ? "Selected" : "Rest" }))),
      V({ name: "Page", fillW: true, fillH: true, gap: o.gap ?? 8, pad: [12, 56, 24, 40] }, ...kids)),
  ], { titlebar: U.TitleBar("Settings", "Settings", { back: true }) });
}
const pageTitle = (...parts) => H({ name: "Page title", gap: 16, pad: [0, 0, 20, 0] }, ...parts.flatMap((p, i) => [i > 0 && Icon("chevron_right", 16, "text/secondary"), T(p, "Title", i < parts.length - 1 ? "text/secondary" : "text/primary")]));
const cardHead = (t, s) => V({ gap: 4, pad: [20, 20, 12, 20] }, T(t, "Subtitle"), s && T(s, "Body", "text/secondary"));
const navRow = (icon, t) => H({ fillW: true, h: 68, pad: [0, 20], gap: 16 }, Icon(icon, 20), T(t, "Body"), Spacer(), Icon("chevron_right", 16, "text/secondary"));
const bigCard = (...k) => V({ name: "Card", fillW: true, gap: 0, r: 8, fill: "bg/card", stroke: "stroke/card" }, ...k);

// ---------- Home ----------
const home = Settings("Home", [
  pageTitle("Home"),
  H({ fillW: true, gap: 20, pad: [0, 0, 16, 0] },
    thumb(120, 68), V({ gap: 2 }, T("XEA-RIG-01", "BodyStrong"), T("Custom rig  ·  CPU Lv.4  ·  RAM Lv.2", "Body", "text/secondary"), T("Rename", "Body", "accent/text")), Spacer(),
    H({ gap: 12 }, Icon("wifi_1", 20, "#60CDFF"), V({ gap: 0 }, T("Darknet_5G", "BodyStrong"), T("Connected, secured", "Caption", "text/secondary"))), H({ w: 24 }),
    H({ gap: 12 }, Icon("arrow_clockwise", 20, "#60CDFF"), V({ gap: 0 }, T("Xea Update", "BodyStrong"), T("Last checked: 6 hours ago", "Caption", "text/secondary")))),
  H({ name: "Columns", fillW: true, gap: 12, cross: "MIN" },
    V({ fillW: true, gap: 12 },
      bigCard(cardHead("Recommended settings", "Recent and commonly used settings"), Div(), navRow("desktop", "Display"), Div(), navRow("save", "Save data"), Div(), navRow("lock_closed", "Lock screen")),
      bigCard(cardHead("Personalize your device"), H({ gap: 8, pad: [0, 20, 16, 20], wrap: true, w: 400, rowGap: 8 }, ...[0, 1, 2, 3, 4, 5].map((h) => thumb(112, 90, h))), Div(),
        H({ fillW: true, h: 68, pad: [0, 20], gap: 16 }, Icon("color", 20), T("Color mode", "Body"), Spacer(), U.ComboBox("Dark", { w: 130 })), Div(), navRow("paint_brush", "Browse more backgrounds, colors, and themes"))),
    V({ fillW: true, gap: 12 },
      bigCard(V({ gap: 12, pad: 20 }, Icon("arrow_download", 24, "#60CDFF"), T("Cloud saves", "Subtitle"), T("Your last backup was 2 hours ago. Turn on auto backup to keep", "Body", "text/secondary"), T("progress safe when the rig is traced.", "Body", "text/secondary"))),
      bigCard(cardHead("Rig devices", "Hardware that powers mining and hacking"), Div(),
        H({ fillW: true, h: 64, pad: [0, 20], gap: 16 }, Icon("developer_board", 20), V({ gap: 0 }, T("Advanced CPU", "Body"), H({ gap: 6 }, F({ w: 6, h: 6, r: 3, fill: "system/success" }), T("Running", "Caption", "text/secondary"))), Spacer(), T("72°C", "Body", "text/secondary")),
        Div(), H({ fillW: true, h: 64, pad: [0, 20], gap: 16 }, Icon("globe", 20), V({ gap: 0 }, T("Gigabit Network Card", "Body"), H({ gap: 6 }, F({ w: 6, h: 6, r: 3, fill: "system/success" }), T("Connected", "Caption", "text/secondary"))), Spacer(), U.Toggle(true)),
        Div(), H({ fillW: true, h: 64, pad: [0, 20], gap: 16 }, Icon("database", 20), V({ gap: 0 }, T("500GB SSD", "Body"), T("62% used", "Caption", "text/secondary")), Spacer(), U.Button("Upgrade")),
        Div(), H({ fillW: true, h: 56, pad: [0, 20], gap: 16 }, T("View all devices", "Body"), Spacer(), U.Button("Open Rig Manager"), Icon("chevron_right", 16, "text/secondary"))))),
]);

// ---------- Personalization > Colors ----------
const ACCENTS = ["#FFB900", "#FF8C00", "#F7630C", "#CA5010", "#DA3B01", "#EF6950", "#D13438", "#FF4343", "#E74856", "#E81123", "#EA005E", "#C30052", "#E3008C", "#BF0077", "#C239B3", "#9A0089", "#0078D4", "#0063B1", "#8E8CD8", "#6B69D6", "#8764B8", "#744DA9", "#B146C2", "#881798", "#0099BC", "#2D7D9A", "#00B7C3", "#038387", "#00B294", "#018574", "#00CC6A", "#10893E", "#7A7574", "#5D5A58", "#68768A", "#515C6B", "#567C73", "#486860", "#498205", "#107C10", "#767676", "#4C4A48", "#69797E", "#4A5459", "#647C64", "#525E54", "#847545", "#7E735F"];
const swatch = (c, sel) => H({ name: `swatch/${c}`, w: 48, h: 48, r: 4, fill: c, stroke: sel ? "text/primary" : null, sw: 2, main: "MAX", cross: "MIN", pad: 4 }, sel && H({ w: 16, h: 16, r: 2, main: "CENTER", fill: "#FFFFFF" }, Icon("checkmark", 12, "#000000")));
const colors = Settings("Personalization", [
  pageTitle("Personalization", "Colors"),
  F({ name: "Preview", w: 336, h: 188 }, { ...thumb(336, 188, 4), p: { ...thumb(336, 188, 4).p, x: 0, y: 0 } }, { ...V({ w: 96, h: 96, r: 4, fill: "bg/card", stroke: "stroke/surface", pad: 12, gap: 6 }, V({ w: 72, h: 3, fill: "text/tertiary" }), V({ w: 72, h: 3, fill: "text/tertiary" }), V({ w: 48, h: 3, fill: "text/tertiary" }), V({ h: 34 }), H({ fillW: true, main: "MAX" }, V({ w: 24, h: 8, r: 2, fill: "accent/default" }))), p: { name: "mini window", x: 222, y: 62, w: 96, h: 96, r: 4, fill: "bg/card", stroke: "stroke/surface", pad: 12, gap: 6, dir: "V" } }),
  H({ h: 8 }),
  U.SettingsCard("Choose your mode", "Change the colors that appear in Xea OS and your apps", { icon: "color", trailing: "combo", value: "Dark", comboW: 130 }),
  U.SettingsCard("Transparency effects", "Windows and surfaces appear translucent", { icon: "eye", trailing: U.Toggle(false) }),
  V({ name: "Accent color expander", fillW: true, gap: 0, r: 4, fill: "bg/card", stroke: "stroke/card" },
    H({ fillW: true, h: 68, pad: [0, 16], gap: 16 }, Icon("paint_brush", 20), T("Accent color", "Body"), Spacer(), U.ComboBox("Manual", { w: 130 }), U.IconButton("chevron_up")),
    Div(),
    V({ fillW: true, gap: 16, pad: [16, 56, 24, 56], fill: "bg/card-secondary" },
      T("Recent colors", "Body"), H({ gap: 4 }, ...["#0078D4", "#B146C2", "#E81123", "#00B7C3", "#4C4A48"].map((c) => swatch(c))),
      T("Xea colors", "Body"),
      ...[0, 1, 2, 3, 4, 5].map((r) => H({ gap: 4 }, ...ACCENTS.slice(r * 9, r * 9 + 9).map((c) => swatch(c, c === "#0078D4")))),
      H({ fillW: true, pad: [8, 0, 0, 0] }, T("Custom colors", "Body"), Spacer(), U.Button("View colors")))),
], { h: 1240 });

// ---------- System > Save data ----------
const save = Settings("System", [
  pageTitle("System", "Save data"),
  U.InfoBar("Informational", "Autosave is on.", "Last saved 14:32:05 to Local Disk (C:).", { fillW: true, close: false }),
  H({ h: 4 }),
  T("Saving", "BodyStrong"),
  U.SettingsCard("Autosave", "Save progress automatically while you play", { icon: "save", trailing: "toggle" }),
  U.SettingsCard("Autosave interval", null, { icon: "clock", trailing: "combo", value: "Every 60 seconds", comboW: 200 }),
  U.SettingsCard("Offline earnings cap", "Your rig keeps mining while Xea OS is closed, up to this limit", { icon: "history", trailing: "combo", value: "8 hours", comboW: 200 }),
  U.SettingsCard("Cloud backup", "Keep a copy of your save in Xea Cloud", { icon: "arrow_download", trailing: U.Toggle(false) }),
  H({ h: 4 }), T("Files", "BodyStrong"),
  U.SettingsCard("Export save", "Create a .json backup you can move to another PC", { icon: "arrow_export_ltr", trailing: "button", value: "Export" }),
  U.SettingsCard("Import save", "Replace current progress with a backup file", { icon: "document", trailing: "button", value: "Browse" }),
  U.SettingsCard("Save location", null, { icon: "folder", trailing: "text", value: "C:\\Users\\ghost_user\\Saved Games\\Xea OS" }),
  H({ h: 4 }), T("Reset", "BodyStrong"),
  U.SettingsCard("Delete save data", "Wallet, rig, level and logs are reset. This cannot be undone.", { icon: "delete", trailing: "button", value: "Delete save" }),
]);

// ---------- Accounts > Your info (player profile) ----------
const skill = (n, lv, pct) => V({ name: `Skill/${n}`, fillW: true, gap: 10, pad: 16, r: 8, fill: "bg/card", stroke: "stroke/card" }, H({ fillW: true }, T(n, "BodyStrong"), Spacer(), T(`Lv.${lv}`, "Body", "text/secondary")), U.ProgressBar(pct, 250), T(`${Math.round(pct * 100)}% to next level`, "Caption", "text/tertiary"));
const ach = (t, d, done, prog) => U.ListItem(t, d, done ? "Unlocked" : prog, { icon: done ? Icon("trophy", 20, "#FFB900") : Icon("lock_closed", 20, "#9D9D9D"), trailingColor: done ? "system/success" : "text/secondary", fill: "bg/card", stroke: "stroke/card" });
const profile = Settings("Accounts", [
  pageTitle("Accounts", "Your info"),
  H({ fillW: true, gap: 24, pad: [8, 24], r: 8, fill: "bg/card", stroke: "stroke/card", h: 156 },
    avatar(96), V({ gap: 6 }, T("ghost_user", "Subtitle"), T("Novice Hacker  ·  Joined 12 days ago", "Body", "text/secondary"), H({ gap: 12, pad: [6, 0, 0, 0] }, U.ProgressBar(214 / 299, 360), T("Level 7  ·  214 / 299 XP", "Caption", "text/secondary"))),
    Spacer(), U.Button("Change avatar")),
  H({ fillW: true, gap: 12 }, U.StatCard("Level", "7", "Next unlock at level 10", { icon: "star" }), U.StatCard("Reputation", "42", "Known Hacker at 50", { icon: "trophy" }), U.StatCard("Total XP", "1,520", "+35 XP today", { icon: "arrow_trending" }), U.StatCard("Contracts", "18", "14 success, 4 failed", { icon: "target" })),
  T("Skills", "BodyStrong"),
  H({ fillW: true, gap: 12 }, skill("Hacking", 3, 0.72), skill("Stealth", 2, 0.4), skill("Analysis", 1, 0.2)),
  H({ fillW: true }, T("Achievements", "BodyStrong"), Spacer(), T("3 of 6 unlocked", "Body", "text/secondary")),
  V({ fillW: true, gap: 4 }, ach("Novice Hacker", "Reach level 5", true), ach("Thousandaire", "Accumulate ₵1,000", true), ach("Crypto Enthusiast", "Accumulate ₵5,000", true), ach("Advanced Hacker", "Reach level 10", false, "7 / 10"), ach("Known Hacker", "Reach 50 reputation", false, "42 / 50"), ach("Elite Hacker", "Reach level 15", false, "7 / 15")),
], { h: 1080 });

if (import.meta.main) {
  await connect();
  const P = place("05 Settings");
  const r = await buildSection("05 Settings", 80, P.y, [{ node: home }, { node: colors }, { node: save, br: true }, { node: profile }], { replace: P.old, maxW: 3200 });
  place("05 Settings", r);
  close();
}
