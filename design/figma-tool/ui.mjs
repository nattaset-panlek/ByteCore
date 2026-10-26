import { C, F, H, V, T, I } from "./dsl.mjs";

export const Div = (p = {}) => V({ name: "divider", h: 1, fill: p.color || C.border, fillW: true, ...p });
export const Spacer = (w, h) => F({ name: "spacer", w, h });

const BTN = {
  primary: { fill: C.accent, color: C.onAccent },
  secondary: { fill: "#FBFBFB", color: C.t1, stroke: C.border2 },
  danger: { fill: C.danger, color: "#FFFFFF" },
  ghost: { fill: null, color: C.t2 },
  gold: { fill: C.accent, color: "#FFFFFF" },
};
export function Btn(label, kind = "primary", o = {}) {
  const s = BTN[kind];
  const sm = o.size === "sm";
  return H({ name: `Button/${kind}${o.disabled ? "/disabled" : ""}`, pad: sm ? [5, 12] : [7, 16], gap: 6, r: 4, fill: s.fill, fa: o.disabled ? 0.35 : 1, stroke: s.stroke, main: "CENTER", fillW: o.fillW },
    o.icon && I(o.icon, sm ? 13 : 15, s.color),
    label && T(label, { size: sm ? 12 : 13, w: 600, color: s.color, a: o.disabled ? 0.5 : 1 }));
}

export function Badge(text, tone = C.t2, o = {}) {
  return H({ name: `Badge`, pad: [2, 7], gap: 4, r: 4, fill: C.hover, stroke: C.border }, o.icon && I(o.icon, 11, tone), T(text, { size: 11, w: 500, color: tone === C.t2 || tone === C.t3 ? C.t2 : tone }));
}
export const Dot = (color, s = 8) => F({ name: "dot", w: s, h: s, r: s / 2, fill: color });

export function Card(o, ...children) {
  return V({ name: o.name || "Card", pad: o.pad ?? 14, gap: o.gap ?? 8, r: 6, fill: o.fill || C.card, stroke: o.stroke || C.border, fillW: o.fillW ?? true, w: o.w, h: o.h, main: o.main, cross: o.cross }, ...children);
}

export function Progress(width, pct, color = C.accent, h = 6) {
  return H({ name: `Progress ${Math.round(pct * 100)}%`, w: width, h, r: h / 2, fill: C.border2, cross: "MIN" },
    F({ name: "fill", w: Math.max(2, Math.round(width * pct)), h, r: h / 2, fill: color }));
}

export const Label = (t, color = C.t2) => T(t, { size: 12, w: 400, color });

export function Stat(icon, label, value, o = {}) {
  return Card({ name: `Stat/${label}`, gap: 6 },
    Label(label),
    T(value, { size: o.size || 20, w: 600, color: C.t1 }),
    o.sub && T(o.sub, { size: 11, color: o.subColor || C.t3 }),
    o.extra);
}

export function SectionHead(title, right) {
  return H({ name: `Head/${title}`, fillW: true, main: "SPACE_BETWEEN" }, T(title, { size: 14, w: 600 }), right);
}

export function Input(text, o = {}) {
  return H({ name: "Input", h: 32, pad: [0, 10], gap: 8, r: 4, fill: C.input, stroke: o.focus ? C.accent : C.border2, fillW: o.fillW ?? true, w: o.w },
    o.icon && I(o.icon, 15, C.t3), T(text, { size: 13, color: o.placeholder ? C.t3 : C.t1 }), o.caret && F({ name: "caret", w: 2, h: 16, fill: C.accent }));
}

export function Tabs(items, active) {
  return V({ name: "Tabs", fillW: true, gap: 0 },
    H({ gap: 4 }, ...items.map((t) => V({ name: `Tab/${t}${t === active ? "/active" : ""}`, gap: 8, cross: "CENTER", pad: [8, 12, 0, 12] },
      T(t, { size: 13, w: t === active ? 600 : 500, color: t === active ? C.accent : C.t2 }),
      F({ name: "indicator", w: 24, h: 2, r: 1, fill: t === active ? C.accent : C.border, fa: t === active ? 1 : 0 })))),
    Div());
}

export function Titlebar(title, icon) {
  const ctrl = (n, danger) => H({ name: `ctrl/${n}`, w: 46, h: 32, main: "CENTER" }, I(n, 12, C.t1));
  return H({ name: "Titlebar", h: 32, fill: C.title, main: "SPACE_BETWEEN", pad: [0, 0, 0, 12], fillW: true },
    H({ gap: 8 }, I(icon, 14, C.t2), T(title, { size: 12, w: 400 })),
    H({ name: "controls" }, ctrl("min"), ctrl("max"), ctrl("close")));
}

export function Window(title, icon, w, children, o = {}) {
  return V({ name: `Window/${title}`, w, h: o.h, fill: C.win, stroke: C.border2, r: 8, x: o.x, y: o.y },
    Titlebar(title, icon),
    V({ name: "Content", fillW: true, fillH: !!o.h, pad: o.pad ?? 16, gap: o.gap ?? 16, fill: o.contentFill }, ...children));
}

export function Row(left, right, o = {}) {
  return H({ name: o.name || "Row", fillW: true, main: "SPACE_BETWEEN", pad: o.pad ?? [10, 12], r: 4, fill: o.fill ?? C.card, fa: o.fa ?? 1, stroke: o.stroke ?? C.border, gap: 12 }, left, right);
}

export function Toast(tone, icon, title, body) {
  return H({ name: `Toast/${title}`, w: 360, pad: 14, gap: 12, r: 8, fill: C.win, stroke: C.border2, cross: "MIN" },
    I(icon, 18, tone),
    V({ gap: 3 }, T(title, { size: 13, w: 600 }), T(body, { size: 12, color: C.t2 })));
}

export function Dialog(tone, icon, title, body, actions, o = {}) {
  return V({ name: `Dialog/${title}`, w: o.w || 440, fill: C.win, stroke: C.border2, r: 8 },
    V({ name: "Body", fillW: true, pad: 24, gap: 14 },
      H({ gap: 10 }, I(icon, 20, tone), T(title, { size: 18, w: 600 })),
      V({ gap: 6 }, ...body.split("\n").map((l) => T(l, { size: 13, color: C.t2 }))),
      o.extra),
    Div(),
    H({ name: "Actions", fillW: true, pad: [14, 24], gap: 10, main: "MAX", fill: C.panel }, ...actions));
}

export function MenuItem(icon, label, o = {}) {
  return H({ name: `MenuItem/${label}`, fillW: true, pad: [7, 10], gap: 10, r: 4, fill: o.hover ? C.hover : null, main: "SPACE_BETWEEN" },
    H({ gap: 10 }, I(icon, 16, o.color || C.t2), T(label, { size: 13, color: o.color || C.t1 })),
    o.hint && T(o.hint, { size: 11, color: C.t3 }));
}

export function Term(lines) {
  // lines: [text, color]
  return lines.map(([t, col, w]) => T(t, { size: 12, color: col || C.termText, w: w || 400 }));
}
