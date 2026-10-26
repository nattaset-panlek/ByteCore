// 02 Components: variant frames named Property=Value, grouped per component set, ready for
// "Create multiple components" + "Combine as variants" in Figma (Talk To Figma cannot create components).
import { connect, close, buildSection, H, V, F, T, Icon, App, File, Spacer, Div } from "./kit.mjs";
import * as U from "./ui.mjs";
import { place } from "./state.mjs";

const named = (node, name) => ({ ...node, p: { ...node.p, name } });
const cart = (axes) => Object.entries(axes).reduce((acc, [k, vals]) => acc.flatMap((o) => vals.map((v) => ({ ...o, [k]: v }))), [{}]);
const vname = (o) => Object.entries(o).map(([k, v]) => `${k}=${v}`).join(", ");

// One component set: title + hint + container (named after the set) holding only the variant frames.
function set(name, axes, make, o = {}) {
  const variants = axes ? cart(axes).map((v) => named(make(v), vname(v))) : [named(make({}), name)];
  return V({ name: `Group/${name}`, gap: 12, pad: 24, r: 8, fill: "bg/solid-base", stroke: "stroke/surface" },
    H({ gap: 12 }, T(name, "Subtitle"), T(axes ? `${variants.length} variants` : "single component", "Caption", "text/tertiary")),
    T(axes ? `Select "${name}" frame, press Enter, Create multiple components, then Combine as variants.` : `Select "${name}" and press Create component.`, "Caption", "text/secondary"),
    axes ? H({ name, wrap: true, w: o.w || 900, gap: o.gap ?? 16, rowGap: o.gap ?? 16, pad: 16, r: 4, stroke: "stroke/surface", cross: "MIN" }, ...variants)
      : V({ name: `${name} (holder)`, pad: 16, r: 4, stroke: "stroke/surface" }, variants[0]));
}
const fi = { name: "secret_plans.docx", icon: "Folder", type: "File folder", date: "27/10/2026 14:28", size: "3.1 MB", rarity: "Epic" };

const SETS = [
  set("Button", { Style: ["Standard", "Accent", "Subtle"], State: ["Rest", "Hover", "Pressed", "Disabled"], Icon: ["No", "Yes"] }, (v) => U.Button("Button", v.Style, { state: v.State, icon: v.Icon === "Yes" ? "add" : null }), { w: 1000 }),
  set("IconButton", { State: ["Rest", "Hover", "Pressed"] }, (v) => U.IconButton("more_horizontal", { state: v.State }), { w: 300 }),
  set("TextBox", { State: ["Rest", "Hover", "Focused", "Disabled"], Icon: ["None", "Search"] }, (v) => U.TextBox("Placeholder text", { state: v.State, icon: v.Icon === "Search" ? "search" : null }), { w: 1100 }),
  set("ComboBox", { State: ["Rest", "Hover", "Open", "Disabled"] }, (v) => U.ComboBox("Dark", { state: v.State }), { w: 800 }),
  set("ToggleSwitch", { Value: ["Off", "On"], State: ["Rest", "Disabled"] }, (v) => U.Toggle(v.Value === "On", { state: v.State }), { w: 500 }),
  set("CheckBox", { Value: ["Unchecked", "Checked", "Indeterminate"] }, (v) => U.CheckBox("Label", v.Value), { w: 500 }),
  set("RadioButton", { Value: ["Off", "On"] }, (v) => U.Radio("Option", v.Value === "On"), { w: 400 }),
  set("ProgressBar", { Status: ["Normal", "Paused", "Error"], Value: ["0", "25", "50", "75", "100"] }, (v) => U.ProgressBar(Number(v.Value) / 100, 200, v.Status), { w: 1200 }),
  set("InfoBar", { Severity: ["Informational", "Success", "Warning", "Error"] }, (v) => U.InfoBar(v.Severity, "Title", "Essential app message.", { w: 560 }), { w: 1200 }),
  set("InfoBadge", { Severity: ["Attention", "Informational", "Success", "Caution", "Critical"], Kind: ["Dot", "Value"] }, (v) => U.InfoBadge(v.Severity, v.Kind === "Value" ? "3" : undefined), { w: 600 }),
  set("Tooltip", null, () => U.Tooltip("Tooltip text")),
  set("MenuFlyoutItem", { Kind: ["Default", "Radio", "Check", "Submenu"], State: ["Rest", "Hover", "Disabled"] }, (v) => U.MenuItem("Menu item", { kind: v.Kind, state: v.State, icon: "folder", accel: v.Kind === "Default" ? "Ctrl+C" : null }), { w: 960 }),
  set("MenuFlyoutSeparator", null, () => V({ w: 280, pad: [4, 0] }, Div())),
  set("NavigationViewItem", { State: ["Rest", "Hover", "Selected"] }, (v) => U.NavItem("Home", "home", { state: v.State }), { w: 960 }),
  set("TreeItem", { Expander: ["None", "Collapsed", "Expanded"], State: ["Rest", "Hover", "Selected"] }, (v) => U.TreeItem("Documents", "folder", { state: v.State, expander: { None: null, Collapsed: "closed", Expanded: "open" }[v.Expander] }), { w: 760 }),
  set("TabViewItem", { State: ["Selected", "Rest", "Hover"] }, (v) => U.TabItem("Home", App("FileExplorer", 16), { state: v.State }), { w: 820 }),
  set("AppBarButton", { Kind: ["Icon", "IconLabel", "IconLabelChevron"], State: ["Rest", "Hover", "Disabled"] }, (v) => U.AppBarButton(v.Kind === "Icon" ? null : "Sort", "arrow_sort", { state: v.State, chevron: v.Kind === "IconLabelChevron" }), { w: 700 }),
  set("AppBarSeparator", null, () => U.AppBarSeparator()),
  set("BreadcrumbItem", { Chevron: ["Yes", "No"] }, (v) => U.Crumb("This PC", v.Chevron === "Yes"), { w: 300 }),
  set("SettingsCard", { Trailing: ["Navigation", "Toggle", "ComboBox", "Button", "Text", "None"] }, (v) => U.SettingsCard("Setting", "Description of the setting", { fillW: false, w: 860, icon: "settings", trailing: { Navigation: "nav", Toggle: "toggle", ComboBox: "combo", Button: "button", Text: "text", None: null }[v.Trailing], value: v.Trailing === "Text" ? "Value" : undefined }), { w: 1800 }),
  set("ListItem", { State: ["Rest", "Hover", "Selected"] }, (v) => U.ListItem("Title", "Subtitle", "Trailing", { fillW: false, w: 420, state: v.State, icon: "document" }), { w: 1400 }),
  set("StatCard", null, () => U.StatCard("Header", "Value", "Caption", { fillW: false, w: 220, icon: "wallet" })),
  set("RarityLabel", { Rarity: ["Common", "Rare", "Epic", "Legendary"] }, (v) => U.Rarity(v.Rarity), { w: 600 }),
  set("CaptionButton", { Type: ["Minimize", "Maximize", "Restore", "Close"], State: ["Rest", "Hover", "Pressed"] }, (v) => {
    const icon = { Minimize: "subtract", Maximize: "maximize", Restore: "square_multiple", Close: "dismiss" }[v.Type];
    const bg = v.State === "Rest" ? null : v.Type === "Close" ? "shell/close-hover" : v.State === "Hover" ? "subtle/hover" : "subtle/pressed";
    return H({ w: 46, h: 32, main: "CENTER", fill: bg }, Icon(icon, v.Type === "Close" ? 14 : 12));
  }, { w: 760 }),
  set("TitleBar", { Kind: ["Default", "Back"] }, (v) => V({ w: 960 }, U.TitleBar("App title", "FileExplorer", { back: v.Kind === "Back" })), { w: 2000 }),
  set("TaskbarButton", { State: ["Rest", "Hover", "Running", "Active"] }, (v) => U.TaskbarButton("FileExplorer", v.State), { w: 400 }),
  set("Taskbar", null, () => U.Taskbar({ running: ["FileExplorer"] })),
  set("StartPinnedTile", { State: ["Rest", "Hover"] }, (v) => U.PinnedTile("Terminal", "Terminal", v.State === "Hover"), { w: 300 }),
  set("StartRecommendedItem", { State: ["Rest", "Hover"] }, (v) => U.RecItem(File("Document", 32), "financial_report.pdf", "12 min ago", v.State === "Hover"), { w: 640 }),
  set("ContentDialog", { Buttons: ["Three", "Two", "One"] }, (v) => U.Dialog("Dialog title", "Body text that explains the decision.\nKeep it short and specific.",
    v.Buttons === "Three" ? [U.Button("Primary", "Accent"), U.Button("Secondary"), U.Button("Cancel")] : v.Buttons === "Two" ? [U.Button("Primary", "Accent"), U.Button("Cancel")] : [U.Button("OK", "Accent")]), { w: 1500 }),
  set("ToastNotification", { Actions: ["No", "Yes"] }, (v) => U.Toast("Wallet", "Wallet", "Title", "Notification body text", { actions: v.Actions === "Yes" ? ["Open", "Dismiss"] : null }), { w: 800 }),
  set("FileItem", { View: ["ExtraLarge", "Large", "Medium", "Small", "List", "Details", "Tiles", "Content"], State: ["Rest", "Hover", "Selected"] }, (v) => v.View === "Content" ? V({ w: 860 }, U.FileItem(v.View, fi, v.State)) : U.FileItem(v.View, fi, v.State), { w: 2000 }),
  set("DetailsHeader", null, () => U.DetailsHeader()),
];

if (import.meta.main) {
  await connect();
  const P = place("02 Components");
  const r = await buildSection("02 Components", 80, P.y, SETS.map((node) => ({ node })), { replace: P.old, maxW: 5200, gap: 80 });
  place("02 Components", r);
  close();
}
