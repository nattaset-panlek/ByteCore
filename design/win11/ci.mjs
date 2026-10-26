// Same API as ui.mjs, but every reusable element is an INSTANCE of the 02 Components library.
// Unique layouts (screens, one-off panels, exact progress values) still come from ui.mjs frames.
import { H, V, F, T, Icon, App, File, Spacer, Div, INST, setResolver } from "./kit.mjs";
import { componentId } from "./comp.mjs";
import * as UI from "./ui.mjs";
export * from "./ui.mjs";
setResolver(componentId);

// accepts "name" or an Icon(...) node; returns the fluent icon name
const iconName = (x) => (typeof x === "string" ? x : x && x.p && x.p.name && x.p.name.startsWith("icon/") ? x.p.name.slice(5) : null);
const iconColor = (x) => (x && x.svg ? (x.svg.match(/fill="(#[0-9A-Fa-f]{6})"/) || [])[1] : undefined);

export function Button(label, style = "Standard", o = {}) {
  return INST("Button", { variant: { Style: style, State: o.state || "Rest", Icon: o.icon ? "Yes" : "No" }, text: { label }, icon: o.icon, iconColor: style === "Accent" ? "text/on-accent" : o.state === "Disabled" ? "text/disabled" : "text/primary", w: o.w, fillW: o.fillW, name: `Button/${label}` });
}
export const IconButton = (icon, o = {}) => INST("IconButton", { variant: { State: o.state || "Rest" }, icon, iconColor: o.color, w: o.w, h: o.h });
export const TextBox = (text, o = {}) => INST("TextBox", { variant: { State: o.state || "Rest", Icon: o.icon ? "Search" : "None" }, text: { value: text }, colors: o.value ? { value: "text/primary" } : undefined, w: o.w, fillW: o.fillW });
export const ComboBox = (value, o = {}) => INST("ComboBox", { variant: { State: o.state || "Rest" }, text: { value }, w: o.w, fillW: o.fillW });
export const Toggle = (on, o = {}) => INST("ToggleSwitch", { variant: { Value: on ? "On" : "Off", State: o.state || "Rest" } });
export const CheckBox = (label, value = "Unchecked") => INST("CheckBox", { variant: { Value: value }, text: { label } });
export const Radio = (label, on) => INST("RadioButton", { variant: { Value: on ? "On" : "Off" }, text: { label } });
export const InfoBar = (sev, title, message, o = {}) => INST("InfoBar", { variant: { Severity: sev }, text: { title, message: message || " " }, w: o.w, fillW: o.fillW });
export const InfoBadge = (sev = "Attention", value) => INST("InfoBadge", { variant: { Severity: sev, Kind: value === undefined ? "Dot" : "Value" }, text: value === undefined ? undefined : { value } });
export const Tooltip = (text) => INST("Tooltip", { text: { text } });

export function MenuItem(label, o = {}) {
  const kind = o.kind || "Default";
  const text = { label };
  if (kind === "Default") text.accelerator = o.accel || " ";
  return INST("MenuFlyoutItem", { variant: { Kind: kind, State: o.state || "Rest" }, text, icon: o.icon || "folder", iconColor: o.state === "Disabled" ? "text/disabled" : o.color, colors: o.color ? { label: o.color } : undefined, w: o.w, fillW: o.fillW, name: `MenuItem/${label}` });
}
export const MenuSeparator = () => INST("MenuFlyoutSeparator", { fillW: true });
export const AppBarSeparator = () => INST("AppBarSeparator");

export function NavItem(label, icon, o = {}) {
  return INST("NavigationViewItem", { variant: { State: o.state || "Rest" }, text: { label }, icon: iconName(icon) || o.iconName || "home", iconColor: o.iconColor || iconColor(icon), w: o.w, fillW: o.fillW, name: `Nav/${label}` });
}
export function TreeItem(label, icon, o = {}) {
  const inst = INST("TreeItem", { variant: { Expander: { open: "Expanded", closed: "Collapsed" }[o.expander] || "None", State: o.state || "Rest" }, text: { label }, icon: iconName(icon) || "folder", w: o.level ? (o.w || 220) - 16 * o.level : o.w, name: `Tree/${label}` });
  return o.level ? H({ name: "indent", pad: [0, 0, 0, 16 * o.level] }, inst) : inst;
}
export function TabItem(label, icon, o = {}) {
  // icon: App(...) or File(...) node from ui; map back to a name for the image override
  const nm = icon && icon.p && icon.p.name ? icon.p.name : "app/FileExplorer";
  const spec = nm.startsWith("file/") ? "file:" + nm.slice(5) : nm.slice(4);
  return INST("TabViewItem", { variant: { State: o.state || "Rest" }, text: { label }, app: spec, w: o.w });
}
export function AppBarButton(label, icon, o = {}) {
  const kind = label ? (o.chevron ? "IconLabelChevron" : "IconLabel") : "Icon";
  return INST("AppBarButton", { variant: { Kind: kind, State: o.state || "Rest" }, text: label ? { label } : undefined, icon, iconColor: o.state === "Disabled" ? "text/disabled" : undefined, name: `AppBar/${label || icon}` });
}
export const Crumb = (label, chevron = true) => INST("BreadcrumbItem", { variant: { Chevron: chevron ? "Yes" : "No" }, text: { label } });

export function SettingsCard(header, desc, o = {}) {
  let tr = o.trailing;
  if (tr && tr.t === "INST" && tr.name === "ToggleSwitch") tr = tr.o.variant.Value === "On" ? "toggle" : "toggleOff";
  const kind = tr === "nav" ? "Navigation" : tr === "toggle" ? (o.on === false ? "ToggleOff" : "ToggleOn") : tr === "toggleOff" ? "ToggleOff" : tr === "combo" ? "ComboBox" : tr === "button" ? "Button" : tr === "text" ? "Text" : "None";
  const text = { header };
  if (desc) text.description = desc;
  if (kind === "ComboBox" || kind === "Text") text.value = o.value || "";
  if (kind === "Button") text.label = o.value || "Action";
  return INST("SettingsCard", { variant: { Trailing: kind, Description: desc ? "Yes" : "No" }, text, icon: iconName(o.icon) || "settings", iconColor: o.iconColor, fillW: o.fillW !== false, w: o.w, name: `SettingsCard/${header}` });
}
export function ListItem(title, sub, trailing, o = {}) {
  const text = { title, subtitle: sub || " ", trailing: typeof trailing === "string" ? trailing : " " };
  return INST("ListItem", { variant: { State: o.state || "Rest" }, text, icon: o.iconName || iconName(o.icon) || "document", iconColor: o.iconColor || iconColor(o.icon), colors: o.trailingColor ? { trailing: o.trailingColor } : undefined, bg: o.fill, stroke: o.stroke, fillW: o.fillW !== false, w: o.w, name: `ListItem/${title}` });
}
export const StatCard = (header, value, caption, o = {}) => INST("StatCard", { text: { header, value, caption: caption || " " }, icon: o.icon || "wallet", iconColor: "text/secondary", colors: o.color ? { value: o.color } : undefined, fillW: o.fillW !== false, w: o.w, name: `StatCard/${header}` });
export const Rarity = (r) => INST("RarityLabel", { variant: { Rarity: r } });

export const CaptionButtons = (o = {}) => H({ name: "CaptionButtons" }, ...["Minimize", "Maximize", "Close"].map((t) => INST("CaptionButton", { variant: { Type: t === "Maximize" && o.maximized ? "Restore" : t, State: o.hover === t ? "Hover" : "Rest" } })));
export const TitleBar = (title, app, o = {}) => INST("TitleBar", { variant: { Kind: o.back ? "Back" : "Default" }, text: { title }, app: app || undefined, fillW: true, name: "TitleBar" });
export function Window(title, app, w, h, kids, o = {}) {
  return V({ name: `Window/${o.name || title}`, w, h, r: 8, fill: o.fill || "bg/mica", stroke: "stroke/surface" },
    o.titlebar || TitleBar(title, app, o),
    V({ name: "Content", fillW: true, fillH: !!h, pad: o.pad ?? [0, 0, 0, 0], gap: o.gap ?? 0, fill: o.contentFill }, ...kids));
}

// ContentDialog instance when it is plain text + buttons; composed frame (with instances) when it needs extra content.
export function Dialog(title, body, buttons, o = {}) {
  const lines = Array.isArray(body) ? body : body.split("\n");
  if (o.extra || lines.length > 2) return UI.Dialog(title, lines, buttons, o);
  const variant = buttons.length >= 3 ? "Three" : buttons.length === 2 ? "Two" : "One";
  const labels = buttons.map((b) => b.o.text.label);
  return INST("ContentDialog", { variant: { Buttons: variant }, text: { title, body: lines[0], body2: lines[1] || " ", label: labels }, name: `Dialog/${o.name || title}` });
}
export function Toast(app, appName, title, body, o = {}) {
  const lines = String(body).split("\n");
  const text = { app: appName, title, message: lines[0], message2: lines[1] || " " };
  if (o.actions) text.label = o.actions;
  return INST("ToastNotification", { variant: { Actions: o.actions ? "Yes" : "No" }, text, app, name: `Toast/${title}` });
}
export const TaskbarButton = (app, state = "Rest") => INST("TaskbarButton", { variant: { State: state }, app });
export function Taskbar(o = {}) {
  const mode = o.startOpen ? "StartOpen" : o.badge ? "Notifications" : o.active ? "AppActive" : "Default";
  return INST("Taskbar", { variant: { Mode: mode }, name: "Taskbar" });
}
export const PinnedTile = (app, label, hover) => INST("StartPinnedTile", { variant: { State: hover ? "Hover" : "Rest" }, text: { label }, app, name: `Pinned/${label}` });
export function RecItem(icon, title, sub, hover) {
  const nm = icon.p.name; // "file/PDF" or "app/Contracts"
  return INST("StartRecommendedItem", { variant: { State: hover ? "Hover" : "Rest" }, text: { title, subtitle: sub }, file: nm.startsWith("app/") ? "app:" + nm.slice(4) : nm.slice(5), name: `Recommended/${title}` });
}

// File Explorer item: icon views split long names on two lines like the component does
export function FileItem(view, f, state = "Rest") {
  const text = { name: f.name };
  if (view === "ExtraLarge" || view === "Large" || view === "Medium") {
    const w = { ExtraLarge: 156, Large: 116, Medium: 92 }[view], max = Math.floor((w - 8) / 6.6);
    let a = f.name, b = " ";
    if (f.name.length > max) { const cut = Math.max(f.name.lastIndexOf("_", max), f.name.lastIndexOf(".", max), f.name.lastIndexOf(" ", max)); const at = cut > 3 ? cut : max; a = f.name.slice(0, at); b = f.name.slice(at); }
    text.name = a;
    if ("secret_plans.docx".length > max) text.name2 = b; // the component only has a second line where its sample name wraps
  }
  if (view === "Details") Object.assign(text, { date: f.date, type: f.type, size: f.size || " ", rarity: f.rarity || " " });
  if (view === "Tiles") Object.assign(text, { type: f.type, size: f.size || f.items || " " });
  if (view === "Content") Object.assign(text, { type: f.type, date: "Date modified: " + f.date, size: "Size: " + (f.size || f.items || "-") });
  const colors = {};
  if (view === "Details" && f.rarity) { const v = "rarity/" + f.rarity.toLowerCase(); colors.rarity = v; colors.dot = v; }
  if (view === "Details" && !f.rarity) colors.dot = "transparent";
  return INST("FileItem", { variant: { View: view, State: state }, text, colors, file: f.icon, fillW: view === "Content", name: `FileItem/${f.name}` });
}
export const DetailsHeader = () => INST("DetailsHeader");
