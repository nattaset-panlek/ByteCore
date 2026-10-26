// 04 File Explorer: every View option, View menu, Sort menu, context menu, details pane
import { connect, close, buildSection, H, V, F, T, Icon, App, File, Spacer, Div } from "./kit.mjs";
import * as U from "./ci.mjs";
import { place } from "./state.mjs";

export const FILES = [
  { name: "Documents", icon: "Folder", type: "File folder", date: "27/10/2026 14:02", items: "3 items" },
  { name: "Pictures", icon: "Folder", type: "File folder", date: "27/10/2026 13:48", items: "2 items" },
  { name: "System32", icon: "Folder", type: "File folder", date: "21/09/2026 09:12", items: "2 items" },
  { name: "UserData", icon: "Folder", type: "File folder", date: "26/10/2026 22:40", items: "2 items" },
  { name: "passwords.txt", icon: "Text", type: "Text Document", date: "27/10/2026 11:05", size: "2.3 MB", rarity: "Common" },
  { name: "financial_report.pdf", icon: "PDF", type: "PDF Document", date: "25/10/2026 16:20", size: "5.7 MB", rarity: "Rare" },
  { name: "secret_plans.docx", icon: "Document", type: "Word Document", date: "27/10/2026 14:28", size: "3.1 MB", rarity: "Epic" },
  { name: "blueprint.png", icon: "Image", type: "PNG File", date: "24/10/2026 08:15", size: "8.9 MB", rarity: "Legendary" },
  { name: "vacation.jpg", icon: "Image", type: "JPG File", date: "12/08/2026 19:44", size: "4.2 MB", rarity: "Common" },
  { name: "crypto_wallet.dat", icon: "Key", type: "DAT File", date: "26/10/2026 23:59", size: "15.3 MB", rarity: "Legendary" },
  { name: "email_backup.db", icon: "Database", type: "Data Base File", date: "20/10/2026 07:30", size: "7.8 MB", rarity: "Rare" },
  { name: "kernel.dll", icon: "System", type: "Application extension", date: "21/09/2026 09:12", size: "12.5 MB", rarity: "Epic" },
];
const SELECTED = "secret_plans.docx";

const VIEW_LABEL = { ExtraLarge: "Extra large icons", Large: "Large icons", Medium: "Medium icons", Small: "Small icons", List: "List", Details: "Details", Tiles: "Tiles", Content: "Content" };
const VIEW_ICON = { ExtraLarge: "desktop", Large: "desktop", Medium: "desktop", Small: "grid", List: "text_bullet_list_ltr", Details: "table", Tiles: "apps", Content: "document_text" };

export function ViewMenu(current, detailsPane = true) {
  return U.Flyout("View menu", 236,
    ...Object.keys(VIEW_LABEL).map((v) => U.MenuItem(VIEW_LABEL[v], { kind: v === current ? "Radio" : "Default", icon: VIEW_ICON[v], w: 228, state: v === "Medium" ? "Hover" : "Rest" })),
    U.MenuSeparator(),
    U.MenuItem("Details pane", { kind: detailsPane ? "Radio" : "Default", icon: "panel_right", w: 228 }),
    U.MenuItem("Preview pane", { icon: "eye", w: 228 }),
    U.MenuSeparator(),
    U.MenuItem("Show", { kind: "Submenu", w: 228 }));
}
export const SortMenu = () => U.Flyout("Sort menu", 236,
  ...["Name", "Date modified", "Type", "Size", "Rarity"].map((s, i) => U.MenuItem(s, { kind: i === 0 ? "Radio" : "Default", w: 228, state: i === 4 ? "Hover" : "Rest" })),
  U.MenuSeparator(), U.MenuItem("Ascending", { kind: "Radio", w: 228 }), U.MenuItem("Descending", { w: 228 }), U.MenuSeparator(), U.MenuItem("Group by", { kind: "Submenu", w: 228 }));
export const FileContextMenu = () => V({ name: "Context menu", w: 300, pad: 4, gap: 0, r: 8, fill: "bg/flyout", stroke: "stroke/surface" },
  H({ name: "quick actions", fillW: true, pad: [4, 4], gap: 0, main: "SPACE_BETWEEN" }, ...["cut", "copy", "rename", "share", "delete"].map((i) => H({ w: 40, h: 36, r: 4, main: "CENTER", fill: i === "copy" ? "subtle/hover" : null }, Icon(i, 16)))),
  U.MenuSeparator(),
  U.MenuItem("Open", { icon: "eye", w: 292, accel: "Enter" }), U.MenuItem("Download to This PC", { icon: "arrow_download", w: 292, state: "Hover" }), U.MenuItem("Copy as path", { icon: "copy", w: 292, accel: "Ctrl+Shift+C" }), U.MenuItem("Sell on market", { icon: "tag", w: 292 }), U.MenuSeparator(), U.MenuItem("Properties", { icon: "info", w: 292, accel: "Alt+Enter" }));

function navPane() {
  return V({ name: "Navigation pane", w: 240, fillH: true, gap: 2, pad: [8, 8] },
    U.TreeItem("Home", "home", { w: 224, expander: "closed" }),
    U.TreeItem("Gallery", "image", { w: 224 }),
    V({ fillW: true, pad: [6, 8] }, Div()),
    U.TreeItem("Desktop", "desktop", { w: 224, pin: true }), U.TreeItem("Downloads", "arrow_download", { w: 224, pin: true }), U.TreeItem("Documents", "document", { w: 224, pin: true }), U.TreeItem("Loot", "folder", { w: 224, pin: true }),
    V({ fillW: true, pad: [6, 8] }, Div()),
    U.TreeItem("This PC", "desktop", { w: 224, expander: "open" }),
    U.TreeItem("Local Disk (C:)", "hard_drive", { w: 224, expander: "closed", level: 1 }),
    U.TreeItem("Remote (Z:)", "globe", { w: 224, expander: "open", level: 1, state: "Selected" }),
    U.TreeItem("Network", "globe", { w: 224, expander: "closed" }));
}
function detailsPane() {
  return V({ name: "Details pane", w: 300, fillH: true, gap: 16, pad: 20, fill: "bg/layer" },
    H({ fillW: true, h: 200, main: "CENTER" }, File("Document", 128)),
    V({ gap: 2 }, T("secret_plans.docx", "BodyStrong"), T("Word Document  ·  3.1 MB", "Caption", "text/secondary")),
    V({ fillW: true, gap: 10, pad: 16, r: 8, fill: "bg/card", stroke: "stroke/card" },
      ...[["Rarity", U.Rarity("Epic")], ["Market value", T("₵1,500", "Caption")], ["Download time", T("9.3 s at Uplink Lv.1", "Caption")], ["Date modified", T("27/10/2026 14:28", "Caption")], ["Location", T("Z:\\Documents", "Caption")]].map(([k, v]) => H({ fillW: true }, T(k, "Caption", "text/secondary"), Spacer(), v))),
    H({ fillW: true, gap: 8 }, U.Button("Download", "Accent", { icon: "arrow_download", fillW: true }), U.Button("Sell", "Standard", { icon: "tag" })));
}
function content(view, w) {
  const items = FILES.map((f) => U.FileItem(view, f, f.name === SELECTED ? "Selected" : f.name === "blueprint.png" ? "Hover" : "Rest"));
  if (view === "Details") return V({ name: "Items", w, gap: 0, pad: [4, 12] }, U.DetailsHeader(), V({ h: 4 }), ...items);
  if (view === "Content") return V({ name: "Items", w, gap: 2, pad: [8, 12] }, ...items.map((n) => ({ ...n, p: { ...n.p, fillW: true } })));
  if (view === "List") return H({ name: "Items", w, gap: 0, pad: [8, 12] }, V({ gap: 0 }, ...items.slice(0, 6)), V({ gap: 0 }, ...items.slice(6)));
  return H({ name: "Items", w, wrap: true, gap: view === "Small" ? 0 : 4, rowGap: view === "Small" ? 0 : 8, pad: [12, 16] }, ...items);
}
export function Explorer(view, o = {}) {
  const W = o.w || 1280, Hh = o.h || 800, showPane = o.pane !== false;
  const cw = W - 240 - 1 - (showPane ? 300 : 0);
  return V({ name: `Window/File Explorer/${VIEW_LABEL[view]}${o.suffix || ""}`, w: W, h: Hh, r: 8, fill: "bg/mica", stroke: "stroke/surface" },
    H({ name: "TitleBar with tabs", fillW: true, h: 44, pad: [4, 0, 0, 8], gap: 4, cross: "MAX" },
      U.TabItem("Remote 192.168.4.21 (Z:)", File("NetworkDrive", 16), { state: "Selected", w: 260 }),
      U.TabItem("Downloads", App("FileExplorer", 16), { state: "Rest", w: 200 }),
      H({ h: 40 }, U.IconButton("add")), Spacer(), V({ h: 44 }, U.CaptionButtons())),
    V({ name: "Toolbar layer", fillW: true, gap: 0, fill: "bg/layer" },
      H({ name: "Address row", fillW: true, h: 52, gap: 4, pad: [0, 12] },
        U.IconButton("arrow_left"), U.IconButton("arrow_right", { color: "text/disabled" }), U.IconButton("arrow_up"), U.IconButton("arrow_clockwise"), H({ w: 8 }),
        H({ name: "address", fillW: true, h: 32, pad: [0, 8], gap: 2, r: 4, fill: "control/default", stroke: "stroke/control" }, File("NetworkDrive", 16), H({ w: 6 }), U.Crumb("This PC"), U.Crumb("Remote 192.168.4.21 (Z:)")),
        H({ w: 8 }), U.TextBox("Search Remote (Z:)", { w: 280, icon: "search" })),
      Div(),
      H({ name: "Command bar", fillW: true, h: 48, gap: 2, pad: [0, 12] },
        U.AppBarButton("New", "add", { chevron: true }), U.AppBarSeparator(),
        ...["cut", "copy", "clipboard_paste", "rename", "share", "delete"].map((i) => U.AppBarButton(null, i, { state: i === "clipboard_paste" ? "Disabled" : "Rest" })), U.AppBarSeparator(),
        U.AppBarButton("Sort", "arrow_sort", { chevron: true, state: o.menu === "sort" ? "Hover" : "Rest" }), U.AppBarButton("View", VIEW_ICON[view], { chevron: true, state: o.menu === "view" ? "Hover" : "Rest" }), U.AppBarSeparator(), U.AppBarButton(null, "more_horizontal"),
        Spacer(), U.AppBarButton("Details", "panel_right", { state: showPane ? "Hover" : "Rest" }))),
    Div(),
    H({ name: "Body", fillW: true, fillH: true, gap: 0, cross: "MIN" },
      navPane(), Div({ vertical: true, h: Hh - 44 - 101 - 24 }),
      V({ name: "Content area", w: cw, fillH: true, fill: "bg/solid-secondary" }, content(view, cw)),
      showPane && detailsPane()),
    H({ name: "Status bar", fillW: true, h: 24, pad: [0, 12], gap: 16 }, T("12 items", "Caption", "text/secondary"), T("1 item selected  3.1 MB", "Caption", "text/secondary"), Spacer(), Icon("table", 16, "text/secondary"), Icon("grid", 16, view === "Large" ? "text/primary" : "text/secondary")));
}

const overlay = (win, menu, mx, my) => F({ name: `${win.p.name} (menu open)`, w: win.p.w, h: win.p.h + Math.max(0, my + 500 - win.p.h) }, { ...win, p: { ...win.p, x: 0, y: 0 } }, { ...menu, p: { ...menu.p, x: mx, y: my } });

if (import.meta.main) {
  await connect();
  const P = place("04 File Explorer");
  const items = [
    { node: overlay(Explorer("Large", { menu: "view", suffix: " + View menu" }), ViewMenu("Large"), 628, 140) },
    { node: Explorer("ExtraLarge") },
    { node: overlay(Explorer("Medium", { menu: "sort", suffix: " + Sort menu" }), SortMenu(), 552, 140), br: true },
    { node: Explorer("Small") },
    { node: Explorer("List"), br: true },
    { node: overlay(Explorer("Details", { pane: false, suffix: " + Context menu" }), FileContextMenu(), 520, 330) },
    { node: Explorer("Tiles"), br: true },
    { node: Explorer("Content", { pane: false }) },
  ];
  const r = await buildSection("04 File Explorer", 80, P.y, items, { replace: P.old, maxW: 2800 });
  place("04 File Explorer", r);
  close();
}
