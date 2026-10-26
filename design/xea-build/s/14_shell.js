// Shell components: caption buttons, title bar, taskbar, start menu parts, dialog, toast
const sec = await getSec('comp');
for (const n of sec.children.filter((c) => c.name === 'Shell')) n.remove();
const out = al('V', { name: 'Shell', gap: 40, pad: 40, fillVar: 'bg/solid-base', radius: 'overlay' }, [txt('Shell', 'Title'), txt('Window frame, taskbar, Start, dialogs and notifications for Xea OS.', 'Body', 'text/secondary')]);
const blocks = [];

// CaptionButton
const CAP = { Minimize: 'subtract', Maximize: 'maximize', Restore: 'square_multiple', Close: 'dismiss' };
const cap = await variantSet('CaptionButton', { Type: Object.keys(CAP), State: ['Rest', 'Hover', 'Pressed'] }, async ({ Type, State }) => {
  const bg = State === 'Rest' ? undefined : Type === 'Close' ? 'shell/close-hover' : State === 'Hover' ? 'subtle/hover' : 'subtle/pressed';
  return al('H', { name: 'CaptionButton', w: 46, h: 32, main: 'CENTER', cross: 'CENTER', fillVar: bg }, [await icon(CAP[Type], Type === 'Close' ? 14 : 12, State === 'Pressed' && Type !== 'Close' ? 'text/secondary' : 'text/primary')]);
}, [], { width: 760, description: 'Title bar caption buttons, 46 x 32, full bleed backplate. Close hover is #C42B1C.' });
blocks.push(block('CaptionButton', 'Type x State.', cap));

// TitleBar
const title = await variantSet('TitleBar', { Kind: ['Default', 'Back'] }, async ({ Kind }) => {
  const kids = [];
  if (Kind === 'Back') kids.push(al('H', { name: 'back', w: 40, h: 32, main: 'CENTER', cross: 'CENTER', radius: 'control' }, [await icon('arrow_left', 16)]));
  const ic = await appIcon('FileExplorer', 16); ic.name = 'icon';
  const left = al('H', { name: 'left', gap: 16, pad: [0, 0, 0, Kind === 'Back' ? 0 : 16], cross: 'CENTER' }, [...kids, ic, txt('App title', 'Caption', 'text/primary', { name: 'title' })]);
  const caps = al('H', { name: 'caption-buttons' }, [await inst('CaptionButton', { Type: 'Minimize', State: 'Rest' }), await inst('CaptionButton', { Type: 'Maximize', State: 'Rest' }), await inst('CaptionButton', { Type: 'Close', State: 'Rest' })]);
  return al('H', { name: 'TitleBar', cross: 'CENTER', w: 960, h: 32 }, [left, spacer(), caps]);
}, [{ name: 'Title', type: 'TEXT', value: 'App title', node: 'title' }, { name: 'Icon', type: 'INSTANCE_SWAP', value: 'AppIcon/FileExplorer', node: 'icon' }], { width: 2040, description: 'Standard title bar: 32 px high, 16 px icon 16 px from the left edge, Caption title 16 px from the icon. Set instance width to Fill.' });
blocks.push(block('TitleBar', null, title));

// TaskbarButton
const tb = await variantSet('TaskbarButton', { State: ['Rest', 'Hover', 'Running', 'Active'] }, async ({ State }) => {
  const f = frame('TaskbarButton', 40, 40, State === 'Hover' || State === 'Active' ? 'subtle/hover' : undefined); rad(f, 'control');
  const ic = await appIcon('FileExplorer', 24); ic.name = 'icon'; ic.x = 8; ic.y = 8; f.appendChild(ic);
  if (State === 'Running' || State === 'Active') {
    const w = State === 'Active' ? 16 : 6; const pill = rect(w, 3, State === 'Active' ? 'accent/default' : 'text/tertiary', 'circle');
    pill.name = 'indicator'; pill.x = (40 - w) / 2; pill.y = 36; pill.constraints = { horizontal: 'CENTER', vertical: 'MAX' }; f.appendChild(pill);
  }
  return f;
}, [{ name: 'Icon', type: 'INSTANCE_SWAP', value: 'AppIcon/FileExplorer', node: 'icon' }], { width: 500, description: 'Taskbar app button. Running shows a short gray pill, Active a 16 px accent pill.' });
blocks.push(block('TaskbarButton', null, tb));

// SystemTray
const trayNode = al('H', { name: 'SystemTray', gap: 4, cross: 'CENTER', h: 40 }, [
  al('H', { name: 'overflow', w: 32, h: 40, main: 'CENTER', cross: 'CENTER', radius: 'control' }, [await icon('chevron_up', 12)]),
  al('H', { name: 'status', gap: 10, pad: [0, 10], h: 40, cross: 'CENTER', radius: 'control' }, [await icon('wifi_1', 16), await icon('speaker_2', 16)]),
  al('V', { name: 'clock', pad: [0, 10], h: 40, main: 'CENTER', cross: 'MAX', radius: 'control' }, [txt('14:32', 'Caption', 'text/primary', { name: 'time' }), txt('27/10/2026', 'Caption', 'text/primary', { name: 'date' })]),
]);
const tray = await single('SystemTray', trayNode, [{ name: 'Time', type: 'TEXT', value: '14:32', node: 'time' }, { name: 'Date', type: 'TEXT', value: '27/10/2026', node: 'date' }]);
blocks.push(block('SystemTray', null, tray));

// Taskbar
const bar = frame('Taskbar', 1920, 48, 'bg/taskbar');
bar.strokes = [vp('stroke/divider')]; bar.strokeTopWeight = 1; bar.strokeBottomWeight = 0; bar.strokeLeftWeight = 0; bar.strokeRightWeight = 0; bar.clipsContent = false;
const widget = al('H', { name: 'widget', gap: 10, pad: [0, 12], h: 40, cross: 'CENTER', radius: 'control' }, [await appIcon('Wallet', 24), al('V', { gap: 0 }, [txt('₵ 12,480', 'Caption', 'text/primary', { name: 'balance' }), txt('+₵15 per hour', 'Caption', 'text/secondary', { name: 'rate' })])]);
bar.appendChild(widget); widget.x = 12; widget.y = 4;
const search = al('H', { name: 'search', gap: 10, pad: [0, 14], h: 32, w: 220, cross: 'CENTER', radius: 'circle', fillVar: 'control/default', strokeVar: 'stroke/control' }, [await icon('search', 16, 'text/secondary'), txt('Search', 'Body', 'text/secondary')]);
const PINNED = ['FileExplorer', 'Terminal', 'ChimeraKit', 'Contracts', 'RigManager', 'Wallet', 'TaskManager', 'Settings'];
const center = al('H', { name: 'center', gap: 4, cross: 'CENTER', h: 40 });
const start = await inst('TaskbarButton', { State: 'Rest' }, { Icon: await C('AppIcon/XeaLogo') }); start.name = 'Start'; center.appendChild(start);
center.appendChild(search);
for (const a of PINNED) { const b = await inst('TaskbarButton', { State: a === 'FileExplorer' ? 'Running' : 'Rest' }, { Icon: await C('AppIcon/' + a) }); b.name = 'app/' + a; center.appendChild(b); }
bar.appendChild(center); center.x = Math.round((1920 - center.width) / 2); center.y = 4; center.constraints = { horizontal: 'CENTER', vertical: 'CENTER' };
const trayI = (await C('SystemTray')).createInstance(); bar.appendChild(trayI); trayI.x = 1920 - trayI.width - 8; trayI.y = 4; trayI.constraints = { horizontal: 'MAX', vertical: 'CENTER' };
const taskbar = await single('Taskbar', bar, [{ name: 'Balance', type: 'TEXT', value: '₵ 12,480', node: 'balance' }, { name: 'Rate', type: 'TEXT', value: '+₵15 per hour', node: 'rate' }], { description: 'Xea OS taskbar, 48 px. Centered Start, search and pinned apps; wallet widget left; tray right. Change each app button State to show running / active apps.' });
blocks.push(block('Taskbar', null, taskbar));

// Start menu parts
const pinned = await variantSet('StartPinnedTile', { State: ['Rest', 'Hover'] }, async ({ State }) => {
  const ic = await appIcon('Terminal', 32); ic.name = 'icon';
  return al('V', { name: 'StartPinnedTile', gap: 8, pad: [12, 4, 8, 4], cross: 'CENTER', radius: 'control', fillVar: State === 'Hover' ? 'subtle/hover' : undefined, w: 96, h: 84 }, [ic, txt('Terminal', 'Caption', 'text/primary', { name: 'label', width: 88, align: 'CENTER', truncate: 2 })]);
}, [{ name: 'Label', type: 'TEXT', value: 'Terminal', node: 'label' }, { name: 'Icon', type: 'INSTANCE_SWAP', value: 'AppIcon/Terminal', node: 'icon' }], { width: 300 });
blocks.push(block('StartPinnedTile', null, pinned));
const rec = await variantSet('StartRecommendedItem', { State: ['Rest', 'Hover'] }, async ({ State }) => {
  const ic = await fileIcon('Document', 32); ic.name = 'icon';
  return al('H', { name: 'StartRecommendedItem', gap: 12, pad: [8, 12], cross: 'CENTER', radius: 'control', fillVar: State === 'Hover' ? 'subtle/hover' : undefined, w: 260 }, [ic, al('V', { gap: 0 }, [txt('financial_report.pdf', 'Body', 'text/primary', { name: 'title' }), txt('12 min ago', 'Caption', 'text/secondary', { name: 'subtitle' })])]);
}, [{ name: 'Title', type: 'TEXT', value: 'financial_report.pdf', node: 'title' }, { name: 'Subtitle', type: 'TEXT', value: '12 min ago', node: 'subtitle' }, { name: 'Icon', type: 'INSTANCE_SWAP', value: 'FileIcon/Document', node: 'icon' }], { width: 640 });
blocks.push(block('StartRecommendedItem', null, rec));

// ContentDialog
const dialog = await variantSet('ContentDialog', { Buttons: ['Three', 'Two', 'One'] }, async ({ Buttons }) => {
  const content = al('V', { name: 'content', gap: 12, pad: 24, fillVar: 'bg/card' }, [txt('Dialog title', 'Subtitle', 'text/primary', { name: 'title' }), txt('Body text that explains the decision. Keep it short and specific.', 'Body', 'text/primary', { name: 'body', width: 400 })]);
  const btns = [];
  if (Buttons !== 'One') btns.push(Object.assign(await inst('Button', { Style: 'Accent', State: 'Rest' }, { Label: 'Primary' }), { name: 'primary' }));
  if (Buttons === 'Three') btns.push(Object.assign(await inst('Button', { Style: 'Standard', State: 'Rest' }, { Label: 'Secondary' }), { name: 'secondary' }));
  btns.push(Object.assign(await inst('Button', { Style: Buttons === 'One' ? 'Accent' : 'Standard', State: 'Rest' }, { Label: Buttons === 'One' ? 'OK' : 'Cancel' }), { name: 'close' }));
  const foot = al('H', { name: 'footer', gap: 8, pad: 24, fillVar: 'bg/solid-base' }, btns.map((b) => grow(b, 'W')));
  foot.strokes = [vp('stroke/divider')]; foot.strokeTopWeight = 1; foot.strokeBottomWeight = 0; foot.strokeLeftWeight = 0; foot.strokeRightWeight = 0;
  const d = al('V', { name: 'ContentDialog', radius: 'overlay', strokeVar: 'stroke/surface', effect: 'Elevation/Dialog', clip: true, w: 448 }, [grow(content, 'W'), grow(foot, 'W')]);
  return d;
}, [{ name: 'Title', type: 'TEXT', value: 'Dialog title', node: 'title' }, { name: 'Body', type: 'TEXT', value: 'Body text that explains the decision. Keep it short and specific.', node: 'body' }], { width: 1500, description: 'WinUI ContentDialog, 448 px. Accent primary, Standard secondary and close. Edit button labels on the nested buttons.' });
blocks.push(block('ContentDialog', 'Use with a Smoke scrim (bg/smoke) behind it.', dialog));

// Toast
const toast = await single('ToastNotification', al('V', { name: 'ToastNotification', gap: 12, pad: 16, radius: 'overlay', fillVar: 'bg/flyout', strokeVar: 'stroke/surface', effect: 'Elevation/Flyout', w: 364 }, [
  al('H', { name: 'header', gap: 8, cross: 'CENTER' }, [Object.assign(await appIcon('Wallet', 16), { name: 'appicon' }), grow(txt('Wallet', 'Caption', 'text/primary', { name: 'app' }), 'W'), await icon('more_horizontal', 16, 'text/secondary'), await icon('dismiss', 16, 'text/secondary')]),
  al('V', { name: 'body', gap: 2 }, [txt('Title', 'Body Strong', 'text/primary', { name: 'title' }), txt('Notification body text', 'Body', 'text/secondary', { name: 'message', width: 330 })]),
  Object.assign(al('H', { name: 'actions', gap: 8 }, [grow(await inst('Button', { Style: 'Standard', State: 'Rest' }, { Label: 'Open' }), 'W'), grow(await inst('Button', { Style: 'Standard', State: 'Rest' }, { Label: 'Dismiss' }), 'W')]), { visible: false }),
]), [{ name: 'App', type: 'TEXT', value: 'Wallet', node: 'app' }, { name: 'Title', type: 'TEXT', value: 'Title', node: 'title' }, { name: 'Message', type: 'TEXT', value: 'Notification body text', node: 'message' }, { name: 'Show actions', type: 'BOOLEAN', value: false, node: 'actions' }, { name: 'App icon', type: 'INSTANCE_SWAP', value: 'AppIcon/Wallet', node: 'appicon' }], { description: 'Windows toast notification, bottom right above the taskbar.' });
for (const n of toast.findAll((x) => x.name === 'header' || x.name === 'body' || x.name === 'actions')) n.layoutSizingHorizontal = 'FILL';
blocks.push(block('ToastNotification', null, toast));

const grid = al('H', { name: 'Grid', gap: 48, wrap: true }); grid.resize(2100, 100); grid.primaryAxisSizingMode = 'FIXED'; grid.counterAxisSpacing = 48;
for (const b of blocks) grid.appendChild(b);
add(out, grid);
const bottom = Math.max(0, ...sec.children.filter((c) => c !== out).map((c) => c.y + c.height));
place(sec, out, 40, bottom + 80);
return { id: out.id, sets: blocks.length };
