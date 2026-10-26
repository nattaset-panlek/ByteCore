// 02 Components: real component sets built through Talk To Figma (clone seed, then fill).
// Primitives first, then composites that nest instances of the primitives.
import { connect, close, cmd, H, V, F, T, Icon, App, File, Spacer, Div, INST, setResolver } from "./kit.mjs";
import * as U from "./ui.mjs";
import { makeSet, makeSingle, componentId, reg } from "./comp.mjs";
import { place } from "./state.mjs";
setResolver(componentId);

const cart = (axes) => Object.entries(axes).reduce((acc, [k, vals]) => acc.flatMap((o) => vals.map((v) => ({ ...o, [k]: v }))), [{}]);
const vname = (o) => Object.entries(o).map(([k, v]) => `${k}=${v}`).join(", ");
const variants = (axes, make) => cart(axes).map((v) => ({ name: vname(v), node: make(v) }));
const fi = { name: "secret_plans.docx", icon: "Document", type: "Word Document", date: "27/10/2026 14:28", size: "3.1 MB", rarity: "Epic" };
const cap = (type, state = "Rest") => INST("CaptionButton", { variant: { Type: type, State: state } });

// [name, axes | null, make, width]
const LIB = [
  ["Button", { Style: ["Standard", "Accent", "Subtle"], State: ["Rest", "Hover", "Pressed", "Disabled"], Icon: ["No", "Yes"] }, (v) => U.Button("Button", v.Style, { state: v.State, icon: v.Icon === "Yes" ? "add" : null }), 1000],
  ["IconButton", { State: ["Rest", "Hover", "Pressed"] }, (v) => U.IconButton("more_horizontal", { state: v.State }), 260],
  ["TextBox", { State: ["Rest", "Hover", "Focused", "Disabled"], Icon: ["None", "Search"] }, (v) => U.TextBox("Placeholder text", { state: v.State, icon: v.Icon === "Search" ? "search" : null }), 1100],
  ["ComboBox", { State: ["Rest", "Hover", "Open", "Disabled"] }, (v) => U.ComboBox("Dark", { state: v.State }), 760],
  ["ToggleSwitch", { Value: ["Off", "On"], State: ["Rest", "Disabled"] }, (v) => U.Toggle(v.Value === "On", { state: v.State }), 480],
  ["CheckBox", { Value: ["Unchecked", "Checked", "Indeterminate"] }, (v) => U.CheckBox("Label", v.Value), 420],
  ["RadioButton", { Value: ["Off", "On"] }, (v) => U.Radio("Option", v.Value === "On"), 300],
  ["ProgressBar", { Status: ["Normal", "Paused", "Error"], Value: ["0", "25", "50", "75", "100"] }, (v) => U.ProgressBar(Number(v.Value) / 100, 200, v.Status), 1200],
  ["InfoBar", { Severity: ["Informational", "Success", "Warning", "Error"] }, (v) => U.InfoBar(v.Severity, "Title", "Essential app message.", { w: 560 }), 1220],
  ["InfoBadge", { Severity: ["Attention", "Informational", "Success", "Caution", "Critical"], Kind: ["Dot", "Value"] }, (v) => U.InfoBadge(v.Severity, v.Kind === "Value" ? "3" : undefined), 560],
  ["Tooltip", null, () => U.Tooltip("Tooltip text")],
  ["MenuFlyoutItem", { Kind: ["Default", "Radio", "Check", "Submenu"], State: ["Rest", "Hover", "Disabled"] }, (v) => U.MenuItem("Menu item", { kind: v.Kind, state: v.State, icon: "folder", accel: v.Kind === "Default" ? "Ctrl+C" : null }), 940],
  ["MenuFlyoutSeparator", null, () => V({ w: 280, pad: [4, 0] }, Div())],
  ["NavigationViewItem", { State: ["Rest", "Hover", "Selected"] }, (v) => U.NavItem("Home", "home", { state: v.State }), 940],
  ["TreeItem", { Expander: ["None", "Collapsed", "Expanded"], State: ["Rest", "Hover", "Selected"] }, (v) => U.TreeItem("Documents", "folder", { state: v.State, expander: { None: null, Collapsed: "closed", Expanded: "open" }[v.Expander] }), 760],
  ["TabViewItem", { State: ["Selected", "Rest", "Hover"] }, (v) => U.TabItem("Home", App("FileExplorer", 16), { state: v.State }), 820],
  ["AppBarButton", { Kind: ["Icon", "IconLabel", "IconLabelChevron"], State: ["Rest", "Hover", "Disabled"] }, (v) => U.AppBarButton(v.Kind === "Icon" ? null : "Sort", "arrow_sort", { state: v.State, chevron: v.Kind === "IconLabelChevron" }), 660],
  ["AppBarSeparator", null, () => U.AppBarSeparator()],
  ["BreadcrumbItem", { Chevron: ["Yes", "No"] }, (v) => U.Crumb("This PC", v.Chevron === "Yes"), 300],
  ["ListItem", { State: ["Rest", "Hover", "Selected"] }, (v) => U.ListItem("Title", "Subtitle", "Trailing", { fillW: false, w: 420, state: v.State, icon: "document" }), 1400],
  ["StatCard", null, () => U.StatCard("Header", "Value", "Caption", { fillW: false, w: 220, icon: "wallet" })],
  ["RarityLabel", { Rarity: ["Common", "Rare", "Epic", "Legendary"] }, (v) => U.Rarity(v.Rarity), 520],
  ["CaptionButton", { Type: ["Minimize", "Maximize", "Restore", "Close"], State: ["Rest", "Hover", "Pressed"] }, (v) => {
    const icon = { Minimize: "subtract", Maximize: "maximize", Restore: "square_multiple", Close: "dismiss" }[v.Type];
    const bg = v.State === "Rest" ? null : v.Type === "Close" ? "shell/close-hover" : v.State === "Hover" ? "subtle/hover" : "subtle/pressed";
    return H({ w: 46, h: 32, main: "CENTER", fill: bg }, Icon(icon, v.Type === "Close" ? 14 : 12));
  }, 720],
  ["TaskbarButton", { State: ["Rest", "Hover", "Running", "Active"] }, (v) => U.TaskbarButton("FileExplorer", v.State), 320],
  ["StartPinnedTile", { State: ["Rest", "Hover"] }, (v) => U.PinnedTile("Terminal", "Terminal", v.State === "Hover"), 280],
  ["StartRecommendedItem", { State: ["Rest", "Hover"] }, (v) => U.RecItem(File("Document", 32), "financial_report.pdf", "12 min ago", v.State === "Hover"), 640],
  ["FileItem", { View: ["ExtraLarge", "Large", "Medium", "Small", "List", "Details", "Tiles", "Content"], State: ["Rest", "Hover", "Selected"] }, (v) => (v.View === "Content" ? V({ w: 860 }, U.FileItem(v.View, fi, v.State)) : U.FileItem(v.View, fi, v.State)), 2000],
  ["DetailsHeader", null, () => U.DetailsHeader()],
  // ---- composites with nested instances ----
  ["SettingsCard", { Trailing: ["Navigation", "ToggleOn", "ToggleOff", "ComboBox", "Button", "Text", "None"], Description: ["Yes", "No"] }, (v) => {
    const trailing = { Navigation: "nav", ToggleOn: INST("ToggleSwitch", { variant: { Value: "On", State: "Rest" } }), ToggleOff: INST("ToggleSwitch", { variant: { Value: "Off", State: "Rest" } }), ComboBox: INST("ComboBox", { variant: { State: "Rest" }, w: 200 }), Button: INST("Button", { variant: { Style: "Standard", State: "Rest", Icon: "No" }, text: { label: "Action" } }), Text: "text", None: null }[v.Trailing];
    return U.SettingsCard("Setting", v.Description === "Yes" ? "Description of the setting" : null, { fillW: false, w: 860, icon: "settings", trailing, value: v.Trailing === "Text" ? "Value" : undefined });
  }, 1820],
  ["TitleBar", { Kind: ["Default", "Back"] }, (v) => H({ name: "TitleBar", w: 960, h: 32 },
    v.Kind === "Back" && H({ name: "back", w: 40, h: 32, main: "CENTER", r: 4 }, Icon("arrow_left", 16)),
    H({ name: "title", gap: 16, pad: [0, 0, 0, v.Kind === "Back" ? 0 : 16] }, App("FileExplorer", 16), T("App title", "Caption", "text/primary", { name: "title" })),
    Spacer(), H({ name: "CaptionButtons" }, cap("Minimize"), cap("Maximize"), cap("Close"))), 2000],
  ["ContentDialog", { Buttons: ["Three", "Two", "One"] }, (v) => {
    const b = (label, style) => INST("Button", { variant: { Style: style, State: "Rest", Icon: "No" }, text: { label } });
    const btns = v.Buttons === "Three" ? [b("Primary", "Accent"), b("Secondary", "Standard"), b("Cancel", "Standard")] : v.Buttons === "Two" ? [b("Primary", "Accent"), b("Cancel", "Standard")] : [b("OK", "Accent")];
    return U.Dialog("Dialog title", "Body text that explains the decision.\nKeep it short and specific.", btns);
  }, 1500],
  ["ToastNotification", { Actions: ["No", "Yes"] }, (v) => V({ name: "Toast", w: 364, gap: 12, pad: 16, r: 8, fill: "bg/flyout", stroke: "stroke/surface" },
    H({ name: "header", fillW: true, gap: 8 }, App("Wallet", 16), T("Wallet", "Caption", "text/primary", { name: "app" }), Spacer(), Icon("more_horizontal", 16, "text/secondary"), Icon("dismiss", 16, "text/secondary")),
    V({ name: "body", gap: 2 }, T("Title", "BodyStrong", "text/primary", { name: "title" }), T("Notification body text", "Body", "text/secondary", { name: "message" }), T(" ", "Body", "text/secondary", { name: "message2" })),
    v.Actions === "Yes" && H({ name: "actions", fillW: true, gap: 8 }, INST("Button", { variant: { Style: "Standard", State: "Rest", Icon: "No" }, text: { label: "Open" }, fillW: true }), INST("Button", { variant: { Style: "Standard", State: "Rest", Icon: "No" }, text: { label: "Dismiss" }, fillW: true }))), 800],
  ["Taskbar", { Mode: ["Default", "StartOpen", "AppActive", "Notifications"] }, (v) => {
    const apps = ["FileExplorer", "Terminal", "ChimeraKit", "Contracts", "RigManager", "Wallet", "TaskManager", "Settings"];
    const st = (a) => (v.Mode === "AppActive" && a === "ChimeraKit" ? "Active" : (v.Mode === "Notifications" && (a === "ChimeraKit" || a === "Wallet")) || (v.Mode !== "Notifications" && a === "FileExplorer") ? "Running" : "Rest");
    return H({ name: "Taskbar", w: 1920, h: 48, pad: [0, 8, 0, 12], fill: "bg/taskbar", stroke: "stroke/divider", main: "SPACE_BETWEEN" },
      H({ name: "widget", w: 420 }, H({ gap: 10, pad: [0, 8], h: 40, r: 4 }, App("Wallet", 24), V({ gap: 0 }, T("₵ 12,480", "Caption", "text/primary", { name: "balance" }), T("+₵15 per hour", "Caption", "text/secondary", { name: "rate" })))),
      H({ name: "center", gap: 4 },
        V({ name: "Start", w: 40, h: 40, r: 4, main: "CENTER", cross: "CENTER", fill: v.Mode === "StartOpen" ? "subtle/hover" : null }, App("XeaLogo", 24)),
        H({ name: "search", w: 200, h: 32, gap: 10, pad: [0, 14], r: 16, fill: "control/default", stroke: "stroke/control" }, Icon("search", 16, "text/secondary"), T("Search", "Body", "text/secondary")),
        ...apps.map((a) => INST("TaskbarButton", { variant: { State: st(a) }, app: a, name: "app/" + a }))),
      H({ name: "tray", w: 420, main: "MAX", gap: 4 },
        H({ w: 32, h: 40, main: "CENTER", r: 4 }, Icon("chevron_up", 12)),
        H({ gap: 10, pad: [0, 10], h: 40, r: 4 }, Icon("wifi_1", 16), Icon("speaker_2", 16)),
        H({ pad: [0, 10], h: 40, r: 4, gap: 10 }, V({ cross: "MAX", gap: 0 }, T("14:32", "Caption", "text/primary", { name: "time" }), T("27/10/2026", "Caption", "text/primary", { name: "date" }))),
        v.Mode === "Notifications" && INST("InfoBadge", { variant: { Severity: "Attention", Kind: "Value" }, text: { value: "4" } })));
  }, 2000],
];

if (import.meta.main) {
  await connect();
  const only = process.argv[2];
  const P = place("02 Components");
  const X0 = 80, PAD = 120, MAXW = 5400, GAP = 80;
  let x = PAD, y = PAD + 40, rowH = 0, mx = 0;
  const ids = [];
  for (const [name, axes, make, width] of LIB) {
    if (only && name !== only) continue;
    let id, w, h;
    if (axes) {
      id = await makeSet(name, variants(axes, make), "4:2051", X0 + x, P.y + y, { width });
    } else {
      id = await makeSingle(name, make(), "4:2051", X0 + x, P.y + y);
    }
    const bb = (await cmd("get_node_info", { nodeId: id })).absoluteBoundingBox;
    w = bb.width; h = bb.height;
    if (x > PAD && x + w > MAXW) { // wrap: move to next row
      x = PAD; y += rowH + GAP; rowH = 0;
      await cmd("move_node", { nodeId: id, x: X0 + x, y: P.y + y });
    }
    ids.push(id);
    rowH = Math.max(rowH, h); mx = Math.max(mx, x + w);
    x += w + GAP;
  }
  if (!only) {
    if (P.old) { try { await cmd("delete_node", { nodeId: P.old }); } catch {} }
    const W = mx + PAD, Hh = y + rowH + PAD;
    const sec = await cmd("create_section", { x: X0, y: P.y, width: W, height: Hh, name: "02 Components" });
    for (const id of ids) await cmd("set_parent", { nodeId: id, parentId: sec.id });
    place("02 Components", { id: sec.id, w: W, h: Hh });
    console.log("section 02 Components", sec.id, W, Hh);
  }
  close();
}
