// 01 Foundations + 02 Components (element sheet, every state)
import { connect, close, buildSection, H, V, F, T, Icon, App, File, Spacer, Div, K, TYPE } from "./kit.mjs";
import * as U from "./ui.mjs";
import { place } from "./state.mjs";

const panel = (title, desc, ...kids) => V({ name: `Sheet/${title}`, gap: 20, pad: 32, r: 8, fill: "bg/solid-base", stroke: "stroke/surface" }, T(title, "Subtitle"), desc && T(desc, "Caption", "text/secondary"), ...kids);
const row = (...k) => H({ gap: 16, cross: "CENTER" }, ...k);
const col = (...k) => V({ gap: 12 }, ...k);
const labeled = (label, node) => V({ gap: 8 }, T(label, "Caption", "text/tertiary"), node);

// ---------- Foundations ----------
const sw = (name) => V({ name: `swatch/${name}`, w: 132, gap: 6 }, F({ w: 132, h: 56, r: 4, fill: name, stroke: "stroke/surface" }), T(name, "Caption"), T(K[name][0] + (K[name][1] !== undefined ? ` ${Math.round(K[name][1] * 100)}%` : ""), "Caption", "text/tertiary"));
const groups = {};
for (const k of Object.keys(K)) (groups[k.split("/")[0]] ||= []).push(k);
const colors = panel("Color", "Windows 11 dark tokens. Same names as the ByteCore Color variables.", ...Object.entries(groups).map(([g, ks]) => V({ gap: 8 }, T(g, "BodyStrong"), H({ gap: 12, wrap: true, w: 1720, rowGap: 12 }, ...ks.map(sw)))));
const type = panel("Type ramp", "Segoe UI Variable in the app. Inter is the stand in inside Figma.", ...Object.entries(TYPE).map(([n, [s, w]]) => H({ gap: 24 }, H({ w: 160 }, T(`${n}  ${s}`, "Caption", "text/tertiary")), T(n === "Display" ? "Xea OS" : `${n} text for Xea OS`, n))));
const geo = panel("Geometry", "Corner radius and spacing from Windows 11 geometry guidance.",
  row(...[["Control 4", 4], ["Overlay 8", 8], ["None 0", 0]].map(([l, r]) => V({ gap: 8, cross: "CENTER" }, F({ w: 96, h: 64, r, fill: "bg/card", stroke: "stroke/surface" }), T(l, "Caption", "text/secondary")))),
  row(...[4, 8, 12, 16, 24, 36, 48].map((s) => V({ gap: 6, cross: "CENTER" }, F({ w: s, h: 24, fill: "accent/default" }), T(String(s), "Caption", "text/secondary")))),
  T("Title bar 32 px. Caption buttons 46 x 32. Controls 32 px high. Taskbar 48 px.", "Body", "text/secondary"));

// ---------- Components ----------
const btns = panel("Button", "Style x State. Accent for the one primary action.", ...["Standard", "Accent", "Subtle"].map((s) => row(H({ w: 90 }, T(s, "Caption", "text/tertiary")), ...["Rest", "Hover", "Pressed", "Disabled"].map((st) => U.Button("Button", s, { state: st })), U.Button("With icon", s, { icon: "add" }))));
const inputs = panel("Text input", null,
  row(...["Rest", "Hover", "Focused", "Disabled"].map((st) => labeled(st, U.TextBox(st === "Focused" ? "192.168.4.21" : "Placeholder text", { state: st, value: st === "Focused" })))),
  row(labeled("Search", U.TextBox("Search Public (D:)", { icon: "search", w: 280 })), ...["Rest", "Hover", "Open", "Disabled"].map((st) => labeled("ComboBox " + st, U.ComboBox("Dark", { state: st })))));
const toggles = panel("Selection", null,
  row(labeled("Toggle Off", U.Toggle(false)), labeled("Toggle On", U.Toggle(true)), labeled("Off disabled", U.Toggle(false, { state: "Disabled" })), labeled("On disabled", U.Toggle(true, { state: "Disabled" }))),
  row(U.CheckBox("Unchecked"), U.CheckBox("Checked", "Checked"), U.CheckBox("Indeterminate", "Indeterminate"), U.Radio("Option off", false), U.Radio("Option on", true)),
  row(labeled("Slider 25", U.Slider(0.25)), labeled("Slider 50", U.Slider(0.5)), labeled("Slider 80", U.Slider(0.8))));
const progress = panel("Progress", null,
  ...["Normal", "Paused", "Error"].map((s) => row(H({ w: 70 }, T(s, "Caption", "text/tertiary")), ...[0, 0.25, 0.5, 0.75, 1].map((p) => U.ProgressBar(p, 200, s)))),
  row(...["Attention", "Informational", "Success", "Caution", "Critical"].map((s) => H({ gap: 8 }, U.InfoBadge(s), U.InfoBadge(s, "3"), T(s, "Caption", "text/secondary")))));
const infobars = panel("InfoBar", null, ...[["Informational", "Session ready", "Target 192.168.4.21 accepted the handshake."], ["Success", "Encryption complete", "Access granted to the remote file system."], ["Warning", "30 seconds left", "Finish transfers and disconnect."], ["Error", "Connection lost", "Penalty ₵1,200 was taken from your wallet."]].map(([s, t, m]) => U.InfoBar(s, t, m, { w: 760 })), row(U.Tooltip("Upgrade CPU: +15% mining rate"), U.Tooltip("Open Terminal  Ctrl+T")));
const menus = panel("MenuFlyout", "Kind x State. Radio shows the bullet used by the View menu.",
  row(U.Flyout("Flyout", 296, U.MenuItem("Open", { icon: "eye" }), U.MenuItem("Copy", { icon: "copy", accel: "Ctrl+C", state: "Hover" }), U.MenuItem("Rename", { icon: "rename", state: "Disabled" }), U.MenuSeparator(), U.MenuItem("Large icons", { kind: "Radio", icon: "grid" }), U.MenuItem("Details pane", { kind: "Check", icon: "panel_right" }), U.MenuItem("Show", { kind: "Submenu" })),
    col(...["Default", "Radio", "Check", "Submenu"].flatMap((k) => ["Rest", "Hover", "Disabled"].map((st) => U.MenuItem(`${k} ${st}`, { kind: k, state: st, icon: "folder" }))))));
const nav = panel("Navigation", null,
  row(col(...["Rest", "Hover", "Selected"].map((st) => U.NavItem(`NavigationViewItem ${st}`, "home", { state: st }))),
    col(...["Rest", "Hover", "Selected"].map((st, i) => U.TreeItem(`TreeItem ${st}`, "folder", { state: st, expander: ["closed", "open", null][i] })))),
  row(...["Selected", "Rest", "Hover"].map((st) => U.TabItem(`Tab ${st}`, App("FileExplorer", 16), { state: st }))),
  row(U.AppBarButton("New", "add", { chevron: true }), U.AppBarSeparator(), U.AppBarButton(null, "cut"), U.AppBarButton(null, "copy", { state: "Hover" }), U.AppBarButton(null, "delete", { state: "Disabled" }), U.AppBarButton("Sort", "arrow_sort", { chevron: true }), U.AppBarButton("View", "grid", { chevron: true })),
  row(U.Crumb("This PC"), U.Crumb("Remote (Z:)"), U.Crumb("Documents", false)));
const cards = panel("Cards and lists", null,
  V({ w: 860, gap: 4 }, U.SettingsCard("Color mode", "Change the colors that appear in Xea OS", { icon: "color", trailing: "combo" }), U.SettingsCard("Autosave", "Save progress every 60 seconds", { icon: "save", trailing: "toggle" }), U.SettingsCard("Display", null, { icon: "desktop", trailing: "nav" }), U.SettingsCard("Delete save data", "This cannot be undone", { icon: "delete", trailing: "button", value: "Delete" })),
  H({ w: 860, gap: 12 }, U.StatCard("Balance", "₵ 12,480", "+₵1,240 today", { icon: "wallet" }), U.StatCard("Hash rate", "28.6 MH/s", "+2.1 vs average", { icon: "top_speed" }), U.StatCard("GPU", "72°C", "Safe below 85°C", { icon: "temperature" })),
  V({ w: 860, gap: 2 }, ...["Rest", "Hover", "Selected"].map((st) => U.ListItem(`ListItem ${st}`, "Subtitle text", "Trailing", { state: st, icon: "document" }))),
  row(...["Common", "Rare", "Epic", "Legendary"].map(U.Rarity)));
const frameP = panel("Window frame", "TitleBar 32 px. Caption buttons: rest, hover, close hover.",
  V({ w: 760, gap: 12 }, U.TitleBar("File Explorer", "FileExplorer"), U.TitleBar("Settings", "Settings", { back: true }), H({ fillW: true, main: "MAX" }, U.CaptionButtons({ hover: "Maximize" })), H({ fillW: true, main: "MAX" }, U.CaptionButtons({ hover: "Close" }))));
const shell = panel("Shell parts", null,
  row(...["Rest", "Hover", "Running", "Active"].map((st) => labeled(st, U.TaskbarButton("Terminal", st)))),
  row(U.PinnedTile("Terminal", "Terminal"), U.PinnedTile("ChimeraKit", "Chimera Kit", true), U.RecItem(File("PDF", 32), "financial_report.pdf", "12 min ago"), U.RecItem(File("Image", 32), "blueprint.png", "1 h ago", true)),
  row(U.Toast("Wallet", "Wallet", "Sold blueprint.png", "+₵2,500 added to your wallet"), U.Toast("ChimeraKit", "Chimera Kit", "30 seconds remaining", "Finish transfers and disconnect.", { actions: ["Open", "Dismiss"] })),
  row(U.Dialog("Dialog title", "Body text that explains the decision.\nKeep it short and specific.", [U.Button("Primary", "Accent"), U.Button("Secondary"), U.Button("Cancel")])));
const fi = { name: "secret_plans.docx", icon: "Document", type: "Word Document", date: "27/10/2026 14:28", size: "3.1 MB", rarity: "Epic" };
const files = panel("FileItem (every View)", "ExtraLarge, Large, Medium, Small, List, Details, Tiles, Content. Rest, Hover, Selected.",
  ...["ExtraLarge", "Large", "Medium"].map((v) => row(H({ w: 90 }, T(v, "Caption", "text/tertiary")), ...["Rest", "Hover", "Selected"].map((s) => U.FileItem(v, fi, s)))),
  ...["Small", "List", "Tiles"].map((v) => row(H({ w: 90 }, T(v, "Caption", "text/tertiary")), ...["Rest", "Hover", "Selected"].map((s) => U.FileItem(v, fi, s)))),
  V({ gap: 2 }, T("Details", "Caption", "text/tertiary"), U.DetailsHeader(), ...["Rest", "Hover", "Selected"].map((s) => U.FileItem("Details", fi, s))),
  V({ w: 860, gap: 2 }, T("Content", "Caption", "text/tertiary"), ...["Rest", "Hover", "Selected"].map((s) => U.FileItem("Content", fi, s))));
const iconNames = ["home", "folder", "document", "image", "desktop", "arrow_download", "hard_drive", "globe", "search", "settings", "add", "cut", "copy", "clipboard_paste", "rename", "share", "delete", "arrow_sort", "grid", "table", "panel_right", "info", "power", "person", "lock_closed", "shield", "wallet", "window_console", "target", "trophy", "flash", "temperature", "top_speed", "developer_board", "database", "server", "history", "clock", "warning", "error_circle", "checkmark_circle", "tag", "data_bar_vertical", "color", "games", "save", "eye", "filter", "pulse", "sign_out"];
const icons = panel("Icons", "Fluent UI System Icons 20 Regular (MIT). App icons use the Filled set with color gradients.",
  H({ w: 1180, wrap: true, gap: 8, rowGap: 8 }, ...iconNames.map((n) => V({ w: 88, gap: 6, pad: [10, 0], cross: "CENTER" }, Icon(n, 20), T(n.length > 13 ? n.slice(0, 12) + "." : n, "Caption", "text/tertiary")))),
  H({ w: 1180, wrap: true, gap: 16, rowGap: 16 }, ...["XeaLogo", "FileExplorer", "Settings", "Terminal", "ChimeraKit", "Contracts", "RigManager", "MiningRig", "Wallet", "TaskManager", "NetworkMonitor", "EventLogs", "Profile"].map((a) => V({ w: 84, gap: 8, cross: "CENTER" }, App(a, 48), T(a, "Caption", "text/tertiary")))),
  H({ w: 1180, wrap: true, gap: 16, rowGap: 16 }, ...["Folder", "Document", "Text", "PDF", "Image", "Database", "System", "Key", "Archive", "Drive", "NetworkDrive"].map((a) => V({ w: 84, gap: 8, cross: "CENTER" }, File(a, 64), T(a, "Caption", "text/tertiary")))));

await connect();
const which = process.argv[2] || "all";
if (which === "all" || which === "found") {
  const r = await buildSection("01 Foundations", 80, place("01 Foundations").y, [{ node: colors }, { node: type }, { node: geo }], { maxW: 4000, replace: place("01 Foundations").old });
  place("01 Foundations", r);
}
if (which === "all" || which === "comp") {
  const r = await buildSection("02 Components", 80, place("02 Components").y, [{ node: btns }, { node: inputs }, { node: toggles }, { node: progress }, { node: infobars, br: true }, { node: menus }, { node: nav }, { node: cards, br: true }, { node: frameP }, { node: shell }, { node: files, br: true }, { node: icons }], { maxW: 5000, replace: place("02 Components").old });
  place("02 Components", r);
}
close();
