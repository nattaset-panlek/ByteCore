// Basic Windows 11 controls
const sec = await getSec('comp');
for (const n of sec.children.filter((c) => c.name === 'Controls')) n.remove();
const out = al('V', { name: 'Controls', gap: 40, pad: 40, fillVar: 'bg/solid-base', radius: 'overlay' }, [txt('Controls', 'Title'), txt('WinUI 3 / Fluent 2 metrics: controls 32 px high, 4 px radius, Body 14/20 text.', 'Body', 'text/secondary')]);
const blocks = [];

// Button
const BTN = {
  Standard: { Rest: ['control/default', 'text/primary'], Hover: ['control/hover', 'text/primary'], Pressed: ['control/pressed', 'text/secondary'], Disabled: ['control/disabled', 'text/disabled'] },
  Accent: { Rest: ['accent/default', 'text/on-accent'], Hover: ['accent/hover', 'text/on-accent'], Pressed: ['accent/pressed', 'text/on-accent'], Disabled: ['accent/disabled', 'text/tertiary'] },
  Subtle: { Rest: [null, 'text/primary'], Hover: ['subtle/hover', 'text/primary'], Pressed: ['subtle/pressed', 'text/secondary'], Disabled: [null, 'text/disabled'] },
};
const button = await variantSet('Button', { Style: ['Standard', 'Accent', 'Subtle'], State: ['Rest', 'Hover', 'Pressed', 'Disabled'] }, async ({ Style, State }) => {
  const [bg, fg] = BTN[Style][State];
  const ic = await icon('add', 16, fg); ic.name = 'icon'; ic.visible = false;
  const f = al('H', { name: 'Button', gap: 8, pad: [6, 12, 6, 12], radius: 'control', cross: 'CENTER', main: 'CENTER', fillVar: bg || undefined, strokeVar: Style === 'Standard' ? 'stroke/control' : undefined }, [ic, txt('Button', 'Body', fg, { name: 'label' })]);
  f.minHeight = 32; f.minWidth = 64;
  return f;
}, [{ name: 'Label', type: 'TEXT', value: 'Button', node: 'label' }, { name: 'Show icon', type: 'BOOLEAN', value: false, node: 'icon' }, { name: 'Icon', type: 'INSTANCE_SWAP', value: 'Icon/add', node: 'icon', preferred: ICON_PREF }], { width: 560, description: 'WinUI Button. Accent for the single primary action, Standard for others, Subtle for toolbar style.' });
blocks.push(block('Button', 'Style x State. Props: Label, Show icon, Icon.', button));

// TextBox
const textbox = await variantSet('TextBox', { State: ['Rest', 'Hover', 'Focused', 'Disabled'] }, async ({ State }) => {
  const bg = { Rest: 'control/default', Hover: 'control/hover', Focused: 'control/input-active', Disabled: 'control/disabled' }[State];
  const fg = { Rest: 'text/secondary', Hover: 'text/secondary', Focused: 'text/primary', Disabled: 'text/disabled' }[State];
  const ic = await icon('search', 16, State === 'Disabled' ? 'text/disabled' : 'text/secondary'); ic.name = 'icon'; ic.visible = false;
  const f = al('H', { name: 'TextBox', gap: 8, pad: [0, 10, 0, 11], radius: 'control', cross: 'CENTER', fillVar: bg, strokeVar: 'stroke/control', w: 240, h: 32 }, [grow(txt('Placeholder text', 'Body', fg, { name: 'value' }), 'W'), ic]);
  f.children[0].layoutSizingHorizontal = 'FILL';
  if (State !== 'Disabled') {
    const line = rect(240, State === 'Focused' ? 2 : 1, State === 'Focused' ? 'accent/default' : 'control/strong');
    line.name = 'focus-line'; f.appendChild(line); line.layoutPositioning = 'ABSOLUTE'; line.x = 0; line.y = 32 - line.height; line.constraints = { horizontal: 'STRETCH', vertical: 'MAX' };
  }
  return f;
}, [{ name: 'Text', type: 'TEXT', value: 'Placeholder text', node: 'value' }, { name: 'Show icon', type: 'BOOLEAN', value: false, node: 'icon' }, { name: 'Icon', type: 'INSTANCE_SWAP', value: 'Icon/search', node: 'icon', preferred: ICON_PREF }], { width: 1120, description: 'WinUI TextBox / AutoSuggestBox. Focused state shows a 2 px accent underline.' });
blocks.push(block('TextBox', 'Resize the instance; text fills. Show icon for search boxes.', textbox));

// ComboBox
const combo = await variantSet('ComboBox', { State: ['Rest', 'Hover', 'Open', 'Disabled'] }, async ({ State }) => {
  const bg = { Rest: 'control/default', Hover: 'control/hover', Open: 'control/pressed', Disabled: 'control/disabled' }[State];
  const fg = State === 'Disabled' ? 'text/disabled' : 'text/primary';
  const ch = await icon('chevron_down', 12, State === 'Disabled' ? 'text/disabled' : 'text/secondary');
  const f = al('H', { name: 'ComboBox', gap: 8, pad: [0, 12, 0, 11], radius: 'control', cross: 'CENTER', fillVar: bg, strokeVar: 'stroke/control', w: 160, h: 32 }, [grow(txt('Dark', 'Body', fg, { name: 'value' }), 'W'), ch]);
  f.children[0].layoutSizingHorizontal = 'FILL';
  return f;
}, [{ name: 'Value', type: 'TEXT', value: 'Dark', node: 'value' }], { width: 800, description: 'WinUI ComboBox (closed). Pair with a MenuFlyout for the open list.' });
blocks.push(block('ComboBox', null, combo));

// ToggleSwitch
const toggle = await variantSet('ToggleSwitch', { Value: ['Off', 'On'], State: ['Rest', 'Disabled'] }, async ({ Value, State }) => {
  const on = Value === 'On', dis = State === 'Disabled';
  const knob = rect(12, 12, on ? (dis ? 'text/disabled' : 'text/on-accent') : (dis ? 'text/disabled' : 'text/secondary'), 'circle'); knob.name = 'knob';
  const track = al('H', { name: 'track', pad: [0, 4], cross: 'CENTER', main: on ? 'MAX' : 'MIN', radius: 'circle', w: 40, h: 20, fillVar: on ? (dis ? 'accent/disabled' : 'accent/default') : undefined, strokeVar: on ? undefined : (dis ? 'text/disabled' : 'control/strong') }, [knob]);
  return al('H', { name: 'ToggleSwitch', gap: 12, cross: 'CENTER' }, [txt(on ? 'On' : 'Off', 'Body', dis ? 'text/disabled' : 'text/primary', { name: 'label' }), track]);
}, [{ name: 'Show label', type: 'BOOLEAN', value: true, node: 'label' }], { width: 500, description: 'WinUI ToggleSwitch. Label shows On/Off to the left, as in Settings.' });
blocks.push(block('ToggleSwitch', null, toggle));

// CheckBox
const check = await variantSet('CheckBox', { Value: ['Unchecked', 'Checked', 'Indeterminate'] }, async ({ Value }) => {
  const box = al('H', { name: 'box', main: 'CENTER', cross: 'CENTER', radius: 'control', w: 20, h: 20, fillVar: Value === 'Unchecked' ? 'control/default' : 'accent/default', strokeVar: Value === 'Unchecked' ? 'control/strong' : undefined });
  if (Value === 'Checked') add(box, await icon('checkmark', 14, 'text/on-accent'));
  if (Value === 'Indeterminate') add(box, rect(8, 1.5, 'text/on-accent'));
  return al('H', { name: 'CheckBox', gap: 8, cross: 'CENTER' }, [box, txt('Label', 'Body', 'text/primary', { name: 'label' })]);
}, [{ name: 'Label', type: 'TEXT', value: 'Label', node: 'label' }], { width: 500 });
blocks.push(block('CheckBox', null, check));

// RadioButton
const radio = await variantSet('RadioButton', { Value: ['Off', 'On'] }, async ({ Value }) => {
  const on = Value === 'On';
  const c = al('H', { name: 'circle', main: 'CENTER', cross: 'CENTER', radius: 'circle', w: 20, h: 20, fillVar: on ? 'accent/default' : 'control/default', strokeVar: on ? undefined : 'control/strong' });
  if (on) add(c, rect(8, 8, 'text/on-accent', 'circle'));
  return al('H', { name: 'RadioButton', gap: 8, cross: 'CENTER' }, [c, txt('Option', 'Body', 'text/primary', { name: 'label' })]);
}, [{ name: 'Label', type: 'TEXT', value: 'Option', node: 'label' }], { width: 400 });
blocks.push(block('RadioButton', null, radio));

// Slider
const slider = await variantSet('Slider', { Value: ['0', '25', '50', '75', '100'] }, async ({ Value }) => {
  const p = Number(Value) / 100, W = 200;
  const f = frame('Slider', W, 20);
  const track = rect(W, 4, 'control/strong', 'circle'); track.y = 8; track.constraints = { horizontal: 'STRETCH', vertical: 'CENTER' }; f.appendChild(track);
  if (p > 0) { const fl = rect(Math.max(4, W * p), 4, 'accent/default', 'circle'); fl.y = 8; fl.constraints = { horizontal: 'SCALE', vertical: 'CENTER' }; f.appendChild(fl); }
  const th = rect(20, 20, 'control/default', 'circle'); stroke(th, 'stroke/control'); th.x = Math.min(W - 20, Math.max(0, W * p - 10)); th.constraints = { horizontal: 'SCALE', vertical: 'CENTER' }; f.appendChild(th);
  const dot = rect(12, 12, 'accent/default', 'circle'); dot.x = th.x + 4; dot.y = 4; dot.constraints = { horizontal: 'SCALE', vertical: 'CENTER' }; f.appendChild(dot);
  f.clipsContent = false;
  return f;
}, [], { width: 1200, description: 'WinUI Slider. Resize width freely; fill and thumb scale with it.' });
blocks.push(block('Slider', null, slider));

// ProgressBar
const PB = { Normal: 'accent/default', Paused: 'system/caution', Error: 'system/critical' };
const progress = await variantSet('ProgressBar', { Status: ['Normal', 'Paused', 'Error'], Value: ['0', '10', '25', '50', '75', '90', '100'] }, async ({ Status, Value }) => {
  const p = Number(Value) / 100, W = 240;
  const f = frame('ProgressBar', W, 4); f.clipsContent = false;
  const track = rect(W, 1, 'control/strong'); track.y = 1.5; track.constraints = { horizontal: 'STRETCH', vertical: 'CENTER' }; f.appendChild(track);
  const fl = rect(Math.max(0.01, W * p), 3, PB[Status], 'control'); fl.y = 0.5; fl.name = 'indicator'; fl.constraints = { horizontal: 'SCALE', vertical: 'CENTER' }; fl.visible = p > 0; f.appendChild(fl);
  return f;
}, [], { width: 1900, gap: 24, description: 'WinUI ProgressBar (determinate). Resize width; indicator keeps its percentage.' });
blocks.push(block('ProgressBar', 'Status x Value (percent).', progress));

// ProgressRing
const ring = await variantSet('ProgressRing', { Size: ['16', '32', '64'] }, async ({ Size }) => {
  const s = Number(Size), sw = s <= 16 ? 2 : s <= 32 ? 3 : 5, r = (s - sw) / 2, c = s / 2;
  const svg = figma.createNodeFromSvg(`<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M${c} ${c - r} A ${r} ${r} 0 1 1 ${c - r} ${c}" stroke="#60CDFF" stroke-width="${sw}" stroke-linecap="round"/></svg>`);
  const p = svg.findOne((n) => n.type === 'VECTOR'); if (p) p.strokes = [vp('accent/default')];
  svg.name = 'ProgressRing';
  return svg;
}, [], { width: 400 });
blocks.push(block('ProgressRing', 'Indeterminate.', ring));

// InfoBar
const SEV = { Informational: ['system/attention-bg', 'info', 'accent/default'], Success: ['system/success-bg', 'checkmark_circle', 'system/success'], Warning: ['system/caution-bg', 'warning', 'system/caution'], Error: ['system/critical-bg', 'error_circle', 'system/critical'] };
const infobar = await variantSet('InfoBar', { Severity: Object.keys(SEV) }, async ({ Severity }) => {
  const [bg, ic, col] = SEV[Severity];
  const action = await inst('Button', { Style: 'Standard', State: 'Rest' }, { Label: 'Action' }); action.name = 'action'; action.visible = false;
  const close = al('H', { name: 'close', w: 32, h: 32, main: 'CENTER', cross: 'CENTER', radius: 'control' }, [await icon('dismiss', 16, 'text/secondary')]);
  const body = al('H', { name: 'text', gap: 12, cross: 'CENTER' }, [txt('Title', 'Body Strong', 'text/primary', { name: 'title' }), txt('Essential app message for your users.', 'Body', 'text/primary', { name: 'message' })]);
  const f = al('H', { name: 'InfoBar', gap: 12, pad: [8, 8, 8, 16], cross: 'CENTER', radius: 'control', fillVar: bg, strokeVar: 'stroke/card', w: 640 }, [await icon(ic, 16, col), grow(body, 'W'), action, close]);
  return f;
}, [{ name: 'Title', type: 'TEXT', value: 'Title', node: 'title' }, { name: 'Message', type: 'TEXT', value: 'Essential app message for your users.', node: 'message' }, { name: 'Show action', type: 'BOOLEAN', value: false, node: 'action' }, { name: 'Show close', type: 'BOOLEAN', value: true, node: 'close' }], { width: 1340, description: 'WinUI InfoBar. Use for in-app status such as hack session warnings.' });
blocks.push(block('InfoBar', null, infobar));

// InfoBadge
const BADGE = { Attention: 'accent/default', Informational: 'system/neutral', Success: 'system/success', Caution: 'system/caution', Critical: 'system/critical' };
const badge = await variantSet('InfoBadge', { Severity: Object.keys(BADGE), Kind: ['Dot', 'Value'] }, async ({ Severity, Kind }) => {
  if (Kind === 'Dot') { const d = al('H', { name: 'InfoBadge', w: 6, h: 6, radius: 'circle', fillVar: BADGE[Severity] }); return d; }
  const f = al('H', { name: 'InfoBadge', pad: [0, 5], main: 'CENTER', cross: 'CENTER', radius: 'circle', fillVar: BADGE[Severity], h: 16 }, [txt('3', 'Caption', 'text/on-accent', { name: 'value' })]);
  f.minWidth = 16; return f;
}, [{ name: 'Value', type: 'TEXT', value: '3', node: 'value' }], { width: 600 });
blocks.push(block('InfoBadge', null, badge));

// Tooltip
const tip = await single('Tooltip', al('H', { name: 'Tooltip', pad: [6, 8, 8, 8], radius: 'control', fillVar: 'bg/flyout', strokeVar: 'stroke/surface', effect: 'Elevation/Tooltip' }, [txt('Tooltip text', 'Caption', 'text/primary', { name: 'text' })]), [{ name: 'Text', type: 'TEXT', value: 'Tooltip text', node: 'text' }]);
blocks.push(block('Tooltip', '4 px radius exception for small overlays.', tip));

const grid = al('H', { name: 'Grid', gap: 48, wrap: true }); grid.resize(2000, 100); grid.primaryAxisSizingMode = 'FIXED'; grid.counterAxisSpacing = 48;
for (const b of blocks) grid.appendChild(b);
add(out, grid);
const prev = sec.children.filter((c) => c.name === 'App Icons' || c.name === 'File Icons' || c.name === 'Icons');
const bottom = prev.length ? Math.max(...prev.map((c) => c.y + c.height)) : 0;
place(sec, out, 40, bottom + 80);
return { controls: out.id, sets: blocks.length };
