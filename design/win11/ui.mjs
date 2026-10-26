// Windows 11 (WinUI 3 / Fluent 2) elements as layout trees. Metrics follow learn.microsoft.com/windows/apps/design.
import { F, H, V, T, Icon, App, File, Spacer, Div } from "./kit.mjs";

const SUB = { Rest: null, Hover: "subtle/hover", Pressed: "subtle/pressed", Selected: "subtle/selected", Disabled: null };

// ---------- Basic controls ----------
const BTN = {
  Standard: { Rest: ["control/default", "text/primary"], Hover: ["control/hover", "text/primary"], Pressed: ["control/pressed", "text/secondary"], Disabled: ["control/disabled", "text/disabled"] },
  Accent: { Rest: ["accent/default", "text/on-accent"], Hover: ["accent/hover", "text/on-accent"], Pressed: ["accent/pressed", "text/on-accent"], Disabled: ["accent/disabled", "text/tertiary"] },
  Subtle: { Rest: [null, "text/primary"], Hover: ["subtle/hover", "text/primary"], Pressed: ["subtle/pressed", "text/secondary"], Disabled: [null, "text/disabled"] },
};
export function Button(label, style = "Standard", o = {}) {
  const [bg, fg] = BTN[style][o.state || "Rest"];
  return H({ name: `Button/${style}/${o.state || "Rest"}`, gap: 8, pad: [6, 12], r: 4, main: "CENTER", fill: bg, stroke: style === "Standard" ? "stroke/control" : null, fillW: o.fillW, w: o.w, h: 32 },
    o.icon && Icon(o.icon, 16, fg), label && T(label, "Body", fg, { name: "label" }));
}
export const IconButton = (icon, o = {}) => H({ name: "IconButton", w: o.w || 32, h: o.h || 32, r: 4, main: "CENTER", fill: SUB[o.state || "Rest"] }, Icon(icon, o.size || 16, o.color || "text/primary"));

export function TextBox(text, o = {}) {
  const st = o.state || "Rest";
  const bg = { Rest: "control/default", Hover: "control/hover", Focused: "control/input-active", Disabled: "control/disabled" }[st];
  const fg = o.value ? "text/primary" : st === "Disabled" ? "text/disabled" : "text/secondary";
  const w = o.w || 240;
  return V({ name: `TextBox/${st}`, w, h: 32, r: 4, fill: bg, stroke: "stroke/control", fillW: o.fillW },
    H({ name: "field", fillW: true, h: st === "Focused" ? 30 : 31, pad: [0, 10, 0, 11], gap: 8 },
      o.leading && Icon(o.leading, 16, "text/secondary"), T(text, "Body", fg, { name: "value" }), Spacer(), o.icon && Icon(o.icon, 16, "text/secondary")),
    st !== "Disabled" && V({ name: "underline", fillW: true, h: st === "Focused" ? 2 : 1, fill: st === "Focused" ? "accent/default" : "control/strong" }));
}
export function ComboBox(value, o = {}) {
  const st = o.state || "Rest";
  const bg = { Rest: "control/default", Hover: "control/hover", Open: "control/pressed", Disabled: "control/disabled" }[st];
  return H({ name: `ComboBox/${st}`, w: o.w || 160, h: 32, r: 4, pad: [0, 12, 0, 11], fill: bg, stroke: "stroke/control", fillW: o.fillW },
    T(value, "Body", st === "Disabled" ? "text/disabled" : "text/primary", { name: "value" }), Spacer(), Icon("chevron_down", 12, "text/secondary"));
}
export function Toggle(on, o = {}) {
  const dis = o.state === "Disabled";
  const knob = F({ name: "knob", w: 12, h: 12, r: 6, fill: on ? (dis ? "text/disabled" : "text/on-accent") : dis ? "text/disabled" : "text/secondary" });
  return H({ name: `ToggleSwitch/${on ? "On" : "Off"}${dis ? "/Disabled" : ""}`, gap: 12 },
    o.label !== false && T(on ? "On" : "Off", "Body", dis ? "text/disabled" : "text/primary"),
    H({ name: "track", w: 40, h: 20, r: 10, pad: [0, 4], main: on ? "MAX" : "MIN", fill: on ? (dis ? "accent/disabled" : "accent/default") : null, stroke: on ? null : dis ? "text/disabled" : "control/strong" }, knob));
}
export function CheckBox(label, value = "Unchecked") {
  const box = H({ name: "box", w: 20, h: 20, r: 4, main: "CENTER", fill: value === "Unchecked" ? "control/default" : "accent/default", stroke: value === "Unchecked" ? "control/strong" : null },
    value === "Checked" && Icon("checkmark", 14, "text/on-accent"), value === "Indeterminate" && F({ w: 8, h: 2, r: 1, fill: "text/on-accent" }));
  return H({ name: `CheckBox/${value}`, gap: 8 }, box, label && T(label, "Body", "text/primary", { name: "label" }));
}
export function Radio(label, on) {
  return H({ name: `RadioButton/${on ? "On" : "Off"}`, gap: 8 },
    H({ name: "circle", w: 20, h: 20, r: 10, main: "CENTER", fill: on ? "accent/default" : "control/default", stroke: on ? null : "control/strong" }, on && F({ w: 8, h: 8, r: 4, fill: "text/on-accent" })),
    label && T(label, "Body", "text/primary", { name: "label" }));
}
export function Slider(pct, w = 200) {
  const fw = Math.max(4, Math.round((w - 20) * pct));
  return H({ name: `Slider/${Math.round(pct * 100)}`, w, h: 20 },
    H({ name: "filled", w: fw, h: 4, r: 2, fill: "accent/default" }),
    H({ name: "thumb", w: 20, h: 20, r: 10, main: "CENTER", fill: "control/default", stroke: "stroke/control" }, F({ w: 12, h: 12, r: 6, fill: "accent/default" })),
    H({ name: "rest", fillW: true, h: 4, r: 2, fill: "control/strong" }));
}
export function ProgressBar(pct, w = 240, status = "Normal") {
  const col = { Normal: "accent/default", Paused: "system/caution", Error: "system/critical" }[status];
  const fw = Math.round(w * pct);
  return H({ name: `ProgressBar/${status}/${Math.round(pct * 100)}`, w, h: 3 },
    fw > 0 && H({ name: "indicator", w: fw, h: 3, r: 2, fill: col }),
    fw < w && V({ name: "track", fillW: true, h: 3, main: "CENTER" }, V({ fillW: true, h: 1, fill: "control/strong" })));
}
export function InfoBar(severity, title, message, o = {}) {
  const S = { Informational: ["system/attention-bg", "info", "accent/default"], Success: ["system/success-bg", "checkmark_circle", "system/success"], Warning: ["system/caution-bg", "warning", "system/caution"], Error: ["system/critical-bg", "error_circle", "system/critical"] }[severity];
  return H({ name: `InfoBar/${severity}`, w: o.w || 640, fillW: o.fillW, gap: 12, pad: [8, 8, 8, 16], r: 4, fill: S[0], stroke: "stroke/card" },
    Icon(S[1], 16, S[2]), T(title, "BodyStrong", "text/primary", { name: "title" }), message && T(message, "Body", "text/primary", { name: "message" }), Spacer(), o.action && Button(o.action), o.close !== false && IconButton("dismiss", { color: "text/secondary" }));
}
export function InfoBadge(sev = "Attention", value) {
  const col = { Attention: "accent/default", Informational: "system/neutral", Success: "system/success", Caution: "system/caution", Critical: "system/critical" }[sev];
  if (value === undefined) return F({ name: `InfoBadge/${sev}/Dot`, w: 6, h: 6, r: 3, fill: col });
  return H({ name: `InfoBadge/${sev}`, h: 16, pad: [0, 5], r: 8, main: "CENTER", fill: col }, T(value, "Caption", "text/on-accent", { size: 11, weight: 600, name: "value" }));
}
export const Tooltip = (text) => H({ name: "Tooltip", pad: [6, 8, 8, 8], r: 4, fill: "bg/flyout", stroke: "stroke/surface" }, T(text, "Caption", "text/primary", { name: "text" }));

// ---------- Menus ----------
export function MenuItem(label, o = {}) {
  const st = o.state || "Rest", dis = st === "Disabled";
  const fg = dis ? "text/disabled" : o.color || "text/primary";
  return H({ name: `MenuFlyoutItem/${o.kind || "Default"}/${st}`, w: o.w || 280, fillW: o.fillW, h: 32, gap: 12, pad: [0, 11, 0, 8], r: 4, fill: SUB[st] },
    H({ name: "indicator", w: 12, h: 16, main: "CENTER" }, o.kind === "Radio" && F({ w: 6, h: 6, r: 3, fill: fg }), o.kind === "Check" && Icon("checkmark", 12, fg)),
    o.icon && Icon(o.icon, 16, fg), T(label, "Body", fg, { name: "label" }), Spacer(),
    o.accel && T(o.accel, "Caption", dis ? "text/disabled" : "text/secondary", { name: "accelerator" }), o.kind === "Submenu" && Icon("chevron_right", 12, "text/secondary"));
}
export const MenuSeparator = () => V({ name: "MenuFlyoutSeparator", fillW: true, pad: [4, 0] }, Div());
export function Flyout(name, w, ...items) {
  return V({ name, w, pad: 4, gap: 0, r: 8, fill: "bg/flyout", stroke: "stroke/surface" }, ...items);
}

// ---------- Navigation ----------
export function NavItem(label, icon, o = {}) {
  const st = o.state || "Rest";
  return H({ name: `NavigationViewItem/${st}`, w: o.w || 280, fillW: o.fillW, h: 36, gap: 0, r: 4, fill: SUB[st] },
    H({ name: "pill", w: 3, h: 16, r: 2, fill: st === "Selected" ? "accent/default" : null }),
    H({ name: "content", gap: 16, pad: [0, 13] }, typeof icon === "string" ? Icon(icon, 16) : icon, T(label, "Body", "text/primary", { name: "label" })));
}
export function TreeItem(label, icon, o = {}) {
  const st = o.state || "Rest";
  return H({ name: `TreeItem/${st}`, w: o.w || 220, fillW: o.fillW, h: 32, gap: 8, pad: [0, 8, 0, 4 + (o.level || 0) * 16], r: 4, fill: SUB[st] === "subtle/selected" ? "control/hover" : SUB[st], stroke: st === "Selected" ? "stroke/surface" : null },
    H({ name: "expander", w: 16, h: 16, main: "CENTER" }, o.expander && Icon(o.expander === "open" ? "chevron_down" : "chevron_right", 12, "text/secondary")),
    typeof icon === "string" ? Icon(icon, 16) : icon, T(label, "Body", "text/primary", { name: "label" }), Spacer(), o.pin && Icon("checkmark", 12, "text/tertiary"));
}
export function TabItem(label, icon, o = {}) {
  const st = o.state || "Rest";
  return H({ name: `TabViewItem/${st}`, w: o.w || 240, h: 40, gap: 12, pad: [0, 8, 0, 12], r: 8, corners: [true, true, false, false], fill: st === "Selected" ? "bg/layer" : SUB[st] },
    icon, T(label, "Caption", "text/primary", { name: "label" }), Spacer(), IconButton("dismiss", { w: 24, h: 24, size: 12, color: "text/secondary" }));
}
export function AppBarButton(label, icon, o = {}) {
  const st = o.state || "Rest", fg = st === "Disabled" ? "text/disabled" : "text/primary";
  return H({ name: `AppBarButton/${st}`, h: 32, gap: 8, pad: label ? [0, 11] : [0, 12], r: 4, fill: SUB[st] },
    Icon(icon, 16, fg), label && T(label, "Body", fg, { name: "label" }), o.chevron && Icon("chevron_down", 12, st === "Disabled" ? "text/disabled" : "text/secondary"));
}
export const AppBarSeparator = () => H({ name: "AppBarSeparator", h: 32, pad: [0, 4] }, Div({ vertical: true, h: 20 }));
export const Crumb = (label, chevron = true) => H({ name: "BreadcrumbItem", h: 28, gap: 6, pad: [0, 6], r: 4 }, T(label, "Body", "text/primary", { name: "label" }), chevron && Icon("chevron_right", 12, "text/secondary"));

// ---------- Cards and lists ----------
export function SettingsCard(header, desc, o = {}) {
  let trail = null;
  if (o.trailing === "nav") trail = Icon("chevron_right", 16, "text/secondary");
  else if (o.trailing === "toggle") trail = Toggle(o.on !== false);
  else if (o.trailing === "combo") trail = ComboBox(o.value || "Dark", { w: o.comboW || 160 });
  else if (o.trailing === "button") trail = Button(o.value || "Action", o.buttonStyle || "Standard");
  else if (o.trailing === "text") trail = T(o.value || "", "Body", "text/secondary", { name: "value" });
  else if (o.trailing) trail = o.trailing;
  return H({ name: "SettingsCard", fillW: o.fillW !== false, w: o.w, gap: 16, pad: [desc ? 14 : 20, 16], r: 4, fill: o.fill || "bg/card", stroke: "stroke/card", corners: o.corners },
    o.icon && (typeof o.icon === "string" ? Icon(o.icon, 20) : o.icon),
    V({ name: "text", gap: 0 }, T(header, "Body", "text/primary", { name: "header" }), desc && T(desc, "Caption", "text/secondary", { name: "description" })),
    Spacer(), trail);
}
export function ListItem(title, sub, trailing, o = {}) {
  const st = o.state || "Rest";
  return H({ name: `ListItem/${st}`, fillW: o.fillW !== false, w: o.w, gap: 12, pad: [8, 12], r: 4, fill: o.fill || SUB[st], stroke: o.stroke },
    o.icon && (typeof o.icon === "string" ? Icon(o.icon, 20, o.iconColor || "text/primary") : o.icon),
    V({ name: "text", gap: 0 }, T(title, "Body", "text/primary", { name: "title" }), sub && T(sub, "Caption", "text/secondary", { name: "subtitle" })),
    Spacer(), trailing && (typeof trailing === "string" ? T(trailing, "Body", o.trailingColor || "text/secondary", { name: "trailing" }) : trailing));
}
export function StatCard(header, value, caption, o = {}) {
  return V({ name: `StatCard/${header}`, fillW: o.fillW !== false, w: o.w, gap: 4, pad: 16, r: 8, fill: "bg/card", stroke: "stroke/card" },
    H({ gap: 8 }, o.icon && Icon(o.icon, 16, "text/secondary"), T(header, "Caption", "text/secondary", { name: "header" })),
    T(value, "Subtitle", o.color || "text/primary", { name: "value" }),
    caption && T(caption, "Caption", "text/tertiary", { name: "caption" }), o.extra);
}
export function Rarity(r) {
  const v = "rarity/" + r.toLowerCase();
  return H({ name: `RarityLabel/${r}`, gap: 6 }, F({ name: "dot", w: 8, h: 8, r: 4, fill: v }), T(r, "Caption", v, { name: "rarity" }));
}
export const Card = (o, ...kids) => V({ name: o.name || "Card", fillW: o.fillW !== false, w: o.w, gap: o.gap ?? 12, pad: o.pad ?? 16, r: o.r ?? 8, fill: o.fill || "bg/card", stroke: "stroke/card" }, ...kids);
export const SectionTitle = (t, right) => H({ name: "SectionTitle", fillW: true, pad: [8, 0, 0, 0] }, T(t, "BodyStrong"), Spacer(), right);

// ---------- Window frame ----------
export function CaptionButtons(o = {}) {
  const cb = (icon, type) => {
    const st = o.hover === type ? "Hover" : "Rest";
    return H({ name: `CaptionButton/${type}/${st}`, w: 46, h: 32, main: "CENTER", fill: st === "Hover" ? (type === "Close" ? "shell/close-hover" : "subtle/hover") : null }, Icon(icon, type === "Close" ? 14 : 12));
  };
  return H({ name: "CaptionButtons" }, cb("subtract", "Minimize"), cb(o.maximized ? "square_multiple" : "maximize", "Maximize"), cb("dismiss", "Close"));
}
export function TitleBar(title, app, o = {}) {
  return H({ name: "TitleBar", fillW: true, h: o.tall ? 48 : 32 },
    o.back && H({ name: "back", w: 40, h: 32, main: "CENTER", r: 4 }, Icon("arrow_left", 16)),
    H({ name: "title", gap: 16, pad: [0, 0, 0, o.back ? 0 : 16] }, app && App(app, 16), T(title, "Caption", "text/primary", { name: "title" })),
    Spacer(), o.center, Spacer(), CaptionButtons(o));
}
// Window: Mica-like base layer with title bar; content goes in.
export function Window(title, app, w, h, kids, o = {}) {
  return V({ name: `Window/${o.name || title}`, w, h, r: 8, fill: o.fill || "bg/mica", stroke: "stroke/surface" },
    o.titlebar || TitleBar(title, app, o),
    V({ name: "Content", fillW: true, fillH: !!h, pad: o.pad ?? [0, 0, 0, 0], gap: o.gap ?? 0, fill: o.contentFill }, ...kids));
}
// Page layer used by Settings-style apps (content area on the layer surface)
export const Layer = (o, ...kids) => V({ name: o.name || "Layer", fillW: true, fillH: true, pad: o.pad ?? [24, 32], gap: o.gap ?? 8, fill: o.fill || "bg/mica" }, ...kids);

// ---------- Dialog / toast ----------
export function Dialog(title, body, buttons, o = {}) {
  const lines = Array.isArray(body) ? body : body.split("\n");
  return V({ name: `ContentDialog/${o.name || title}`, w: o.w || 448, r: 8, fill: "bg/solid-base", stroke: "stroke/surface" },
    V({ name: "content", fillW: true, gap: 12, pad: 24, fill: "bg/card" }, T(title, "Subtitle", "text/primary", { name: "title" }), V({ name: "body", gap: 2 }, ...lines.map((l, i) => T(l, "Body", "text/primary", { name: "body" + (i ? i + 1 : "") }))), o.extra),
    V({ name: "divider", fillW: true, h: 1, fill: "stroke/divider" }),
    H({ name: "footer", fillW: true, gap: 8, pad: 24 }, ...buttons.map((b) => ({ ...b, p: { ...b.p, fillW: true } }))));
}
export function Toast(app, appName, title, body, o = {}) {
  return V({ name: `Toast/${title}`, w: 364, gap: 12, pad: 16, r: 8, fill: "bg/flyout", stroke: "stroke/surface" },
    H({ name: "header", fillW: true, gap: 8 }, App(app, 16), T(appName, "Caption", "text/primary", { name: "app" }), Spacer(), Icon("more_horizontal", 16, "text/secondary"), Icon("dismiss", 16, "text/secondary")),
    V({ name: "body", gap: 2 }, T(title, "BodyStrong", "text/primary", { name: "title" }), ...String(body).split("\n").map((l, i) => T(l, "Body", "text/secondary", { name: "message" + (i ? i + 1 : "") }))),
    o.actions && H({ name: "actions", fillW: true, gap: 8 }, ...o.actions.map((b) => Button(b, "Standard", { fillW: true }))));
}

// ---------- Shell ----------
export function TaskbarButton(app, state = "Rest") {
  const ind = state === "Active" ? F({ name: "indicator", w: 16, h: 3, r: 2, fill: "accent/default" }) : state === "Running" ? F({ name: "indicator", w: 6, h: 3, r: 2, fill: "text/tertiary" }) : F({ name: "indicator", w: 6, h: 3 });
  return V({ name: `TaskbarButton/${app}/${state}`, w: 40, h: 40, r: 4, pad: [8, 0, 1, 0], gap: 4, cross: "CENTER", fill: state === "Active" || state === "Hover" ? "subtle/hover" : null }, App(app, 24), ind);
}
export function Taskbar(o = {}) {
  const run = o.running || [], act = o.active;
  const apps = ["FileExplorer", "Terminal", "ChimeraKit", "Contracts", "RigManager", "Wallet", "TaskManager", "Settings"];
  return H({ name: "Taskbar", w: 1920, h: 48, pad: [0, 8, 0, 12], fill: "bg/taskbar", stroke: "stroke/divider", main: "SPACE_BETWEEN" },
    H({ name: "widget", w: 420, gap: 10 }, H({ gap: 10, pad: [0, 8], h: 40, r: 4 }, App("Wallet", 24), V({ gap: 0 }, T("₵ 12,480", "Caption"), T("+₵15 per hour", "Caption", "text/secondary")))),
    H({ name: "center", gap: 4 },
      V({ name: "Start", w: 40, h: 40, r: 4, main: "CENTER", cross: "CENTER", fill: o.startOpen ? "subtle/hover" : null }, App("XeaLogo", 24)),
      H({ name: "search", w: 200, h: 32, gap: 10, pad: [0, 14], r: 16, fill: "control/default", stroke: "stroke/control" }, Icon("search", 16, "text/secondary"), T("Search", "Body", "text/secondary")),
      ...apps.map((a) => TaskbarButton(a, a === act ? "Active" : run.includes(a) ? "Running" : "Rest"))),
    H({ name: "tray", w: 420, main: "MAX", gap: 4 },
      H({ w: 32, h: 40, main: "CENTER", r: 4 }, Icon("chevron_up", 12)),
      H({ gap: 10, pad: [0, 10], h: 40, r: 4 }, Icon("wifi_1", 16), Icon("speaker_2", 16)),
      H({ pad: [0, 10], h: 40, r: 4, gap: 10 }, V({ cross: "MAX", gap: 0 }, T("14:32", "Caption"), T("27/10/2026", "Caption"))), o.badge && InfoBadge("Attention", o.badge)));
}
export const PinnedTile = (app, label, hover) => V({ name: `StartPinnedTile/${label}`, w: 96, h: 84, gap: 8, pad: [12, 4, 8, 4], cross: "CENTER", r: 4, fill: hover ? "subtle/hover" : null }, App(app, 32), T(label, "Caption", "text/primary", { name: "label" }));
export const RecItem = (icon, title, sub, hover) => H({ name: `StartRecommendedItem/${title}`, w: 266, gap: 12, pad: [8, 12], r: 4, fill: hover ? "subtle/hover" : null }, icon, V({ gap: 0 }, T(title, "Body", "text/primary", { name: "title" }), T(sub, "Caption", "text/secondary", { name: "subtitle" })));

// ---------- File Explorer item (all View modes) ----------
export const COLS = { name: 320, date: 170, type: 150, size: 90, value: 110 };
export function FileItem(view, f, state = "Rest") {
  const bg = state === "Hover" ? "subtle/hover" : state === "Selected" ? "control/hover" : null;
  const sk = state === "Selected" ? "stroke/surface" : null;
  const name = `FileItem/${view}/${state}`;
  if (view === "ExtraLarge" || view === "Large" || view === "Medium") {
    const s = { ExtraLarge: 128, Large: 96, Medium: 48 }[view], w = { ExtraLarge: 156, Large: 116, Medium: 92 }[view];
    const max = Math.floor((w - 8) / 6.6);
    let label = [f.name];
    if (f.name.length > max) {
      const cut = Math.max(f.name.lastIndexOf("_", max), f.name.lastIndexOf(".", max), f.name.lastIndexOf(" ", max));
      const at = cut > 3 ? cut + (f.name[cut] === " " ? 1 : 0) : max;
      label = [f.name.slice(0, at), f.name.slice(at)];
    }
    return V({ name, w, gap: 4, pad: [6, 4], cross: "CENTER", r: 4, fill: bg, stroke: sk }, File(f.icon, s), ...label.map((l, i) => T(l, "Caption", "text/primary", { name: i ? "name2" : "name" })));
  }
  if (view === "Small" || view === "List") return H({ name, w: view === "Small" ? 220 : 240, h: 24, gap: 8, pad: [0, 8, 0, 6], r: 4, fill: bg, stroke: sk }, File(f.icon, 16), T(f.name, "Caption", "text/primary", { name: "name" }));
  if (view === "Details") {
    const col = (w, ...k) => H({ name: "col", w, h: 28, gap: 8, pad: [0, 8, 0, 0] }, ...k);
    return H({ name, h: 28, pad: [0, 0, 0, 8], r: 4, fill: bg, stroke: sk },
      col(COLS.name, File(f.icon, 16), T(f.name, "Caption", "text/primary", { name: "name" })), col(COLS.date, T(f.date, "Caption", "text/secondary", { name: "date" })), col(COLS.type, T(f.type, "Caption", "text/secondary", { name: "type" })),
      H({ name: "col", w: COLS.size, h: 28, main: "MAX", pad: [0, 16, 0, 0] }, T(f.size || "", "Caption", "text/secondary", { name: "size" })),
      col(COLS.value, f.rarity ? Rarity(f.rarity) : T(f.value || "", "Caption", "text/secondary")));
  }
  if (view === "Tiles") return H({ name, w: 280, gap: 10, pad: 6, r: 4, fill: bg, stroke: sk }, File(f.icon, 48), V({ gap: 0 }, T(f.name, "Caption", "text/primary", { name: "name" }), T(f.type, "Caption", "text/secondary", { name: "type" }), T(f.size || f.items || "", "Caption", "text/secondary", { name: "size" })));
  return H({ name, fillW: true, gap: 12, pad: [8, 12, 8, 8], r: 4, fill: bg, stroke: sk },
    File(f.icon, 48), V({ gap: 2 }, T(f.name, "Body", "text/primary", { name: "name" }), T(f.type, "Caption", "text/secondary", { name: "type" })), Spacer(),
    V({ w: 240, gap: 2 }, T("Date modified: " + f.date, "Caption", "text/secondary", { name: "date" }), T("Size: " + (f.size || f.items || "-"), "Caption", "text/secondary", { name: "size" })));
}
export function DetailsHeader() {
  const h = (w, label, sorted, right) => H({ name: "col/" + label, w, h: 28, gap: 6, main: right ? "MAX" : "MIN", pad: [0, right ? 16 : 8, 0, 8] }, T(label, "Caption", "text/secondary"), sorted && Icon("chevron_up", 12, "text/secondary"));
  return H({ name: "DetailsHeader", h: 28 }, h(COLS.name + 8, "Name", true), Div({ vertical: true, h: 16 }), h(COLS.date, "Date modified"), Div({ vertical: true, h: 16 }), h(COLS.type, "Type"), Div({ vertical: true, h: 16 }), h(COLS.size, "Size", false, true), Div({ vertical: true, h: 16 }), h(COLS.value, "Rarity"));
}
