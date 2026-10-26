// Menus, navigation, command bar, list and settings rows
const sec = await getSec('comp');
for (const n of sec.children.filter((c) => c.name === 'Menus and Navigation')) n.remove();
const out = al('V', { name: 'Menus and Navigation', gap: 40, pad: 40, fillVar: 'bg/solid-base', radius: 'overlay' }, [txt('Menus and Navigation', 'Title'), txt('MenuFlyout, NavigationView, TreeView, TabView, CommandBar, BreadcrumbBar, SettingsCard, ListView.', 'Body', 'text/secondary')]);
const blocks = [];
const st = (State) => ({ Rest: undefined, Hover: 'subtle/hover', Selected: 'subtle/selected', Disabled: undefined }[State]);

// MenuFlyoutItem
const menuItem = await variantSet('MenuFlyoutItem', { Kind: ['Default', 'Radio', 'Check', 'Submenu'], State: ['Rest', 'Hover', 'Disabled'] }, async ({ Kind, State }) => {
  const fg = State === 'Disabled' ? 'text/disabled' : 'text/primary';
  const ind = al('H', { name: 'indicator', w: 12, h: 16, main: 'CENTER', cross: 'CENTER' });
  if (Kind === 'Radio') add(ind, rect(6, 6, fg, 'circle'));
  if (Kind === 'Check') add(ind, await icon('checkmark', 12, fg));
  const ic = await icon('folder', 16, fg); ic.name = 'icon';
  const acc = txt('Ctrl+C', 'Caption', State === 'Disabled' ? 'text/disabled' : 'text/secondary', { name: 'accelerator' }); acc.visible = false;
  const kids = [ind, ic, grow(txt('Menu item', 'Body', fg, { name: 'label' }), 'W'), acc];
  if (Kind === 'Submenu') kids.push(await icon('chevron_right', 12, 'text/secondary'));
  const f = al('H', { name: 'MenuFlyoutItem', gap: 12, pad: [0, 11, 0, 8], cross: 'CENTER', radius: 'control', fillVar: st(State), w: 280, h: 32 }, kids);
  return f;
}, [{ name: 'Label', type: 'TEXT', value: 'Menu item', node: 'label' }, { name: 'Show icon', type: 'BOOLEAN', value: true, node: 'icon' }, { name: 'Icon', type: 'INSTANCE_SWAP', value: 'Icon/folder', node: 'icon', preferred: ICON_PREF }, { name: 'Show accelerator', type: 'BOOLEAN', value: false, node: 'accelerator' }, { name: 'Accelerator', type: 'TEXT', value: 'Ctrl+C', node: 'accelerator' }], { width: 960, description: 'WinUI MenuFlyoutItem. Radio shows the bullet used by the View menu, Check shows a checkmark.' });
blocks.push(block('MenuFlyoutItem', 'Kind x State. Set the instance to Fill inside a flyout.', menuItem));

const sep = await single('MenuFlyoutSeparator', al('V', { name: 'MenuFlyoutSeparator', pad: [4, 0], w: 280 }, [grow(rect(280, 1, 'stroke/divider'), 'W')]));
sep.children[0].layoutSizingHorizontal = 'FILL';
blocks.push(block('MenuFlyoutSeparator', null, sep));

// NavigationViewItem
const nav = await variantSet('NavigationViewItem', { State: ['Rest', 'Hover', 'Selected'] }, async ({ State }) => {
  const ic = await icon('home', 16); ic.name = 'icon';
  const f = al('H', { name: 'NavigationViewItem', gap: 16, pad: [0, 16, 0, 16], cross: 'CENTER', radius: 'control', fillVar: st(State), w: 280, h: 36 }, [ic, grow(txt('Home', 'Body', 'text/primary', { name: 'label' }), 'W')]);
  if (State === 'Selected') { const pill = rect(3, 16, 'accent/default', 'circle'); pill.name = 'selection'; f.appendChild(pill); pill.layoutPositioning = 'ABSOLUTE'; pill.x = 0; pill.y = 10; pill.constraints = { horizontal: 'MIN', vertical: 'CENTER' }; }
  return f;
}, [{ name: 'Label', type: 'TEXT', value: 'Home', node: 'label' }, { name: 'Icon', type: 'INSTANCE_SWAP', value: 'Icon/home', node: 'icon', preferred: ICON_PREF }], { width: 960, description: 'WinUI NavigationViewItem (left pane). Selected shows the 3 px accent pill.' });
blocks.push(block('NavigationViewItem', null, nav));

// TreeItem (File Explorer navigation pane)
const tree = await variantSet('TreeItem', { Expander: ['None', 'Collapsed', 'Expanded'], State: ['Rest', 'Hover', 'Selected'] }, async ({ Expander, State }) => {
  const ex = al('H', { name: 'expander', w: 16, h: 16, main: 'CENTER', cross: 'CENTER' });
  if (Expander !== 'None') add(ex, await icon(Expander === 'Expanded' ? 'chevron_down' : 'chevron_right', 12, 'text/secondary'));
  const ic = await icon('folder', 16); ic.name = 'icon';
  const pin = await icon('checkmark', 12, 'text/tertiary'); pin.name = 'trailing'; pin.visible = false;
  const f = al('H', { name: 'TreeItem', gap: 8, pad: [0, 8, 0, 4], cross: 'CENTER', radius: 'control', fillVar: st(State), strokeVar: State === 'Selected' ? 'stroke/surface' : undefined, w: 220, h: 32 }, [ex, ic, grow(txt('Documents', 'Body', 'text/primary', { name: 'label' }), 'W'), pin]);
  return f;
}, [{ name: 'Label', type: 'TEXT', value: 'Documents', node: 'label' }, { name: 'Icon', type: 'INSTANCE_SWAP', value: 'Icon/folder', node: 'icon', preferred: ['Icon/folder', 'Icon/home', 'Icon/desktop', 'Icon/arrow_download', 'Icon/document', 'Icon/image', 'Icon/hard_drive', 'Icon/globe'] }, { name: 'Show trailing', type: 'BOOLEAN', value: false, node: 'trailing' }], { width: 760, description: 'WinUI TreeViewItem used in the File Explorer navigation pane.' });
blocks.push(block('TreeItem', 'Expander x State.', tree));

// TabViewItem
const tab = await variantSet('TabViewItem', { State: ['Selected', 'Rest', 'Hover'] }, async ({ State }) => {
  const ic = await appIcon('FileExplorer', 16); ic.name = 'icon';
  const close = al('H', { name: 'close', w: 24, h: 24, main: 'CENTER', cross: 'CENTER', radius: 'control' }, [await icon('dismiss', 12, 'text/secondary')]);
  const f = al('H', { name: 'TabViewItem', gap: 12, pad: [0, 8, 0, 12], cross: 'CENTER', fillVar: State === 'Selected' ? 'bg/layer' : State === 'Hover' ? 'subtle/hover' : undefined, w: 240, h: 40 }, [ic, grow(txt('Home', 'Caption', 'text/primary', { name: 'label' }), 'W'), close]);
  f.topLeftRadius = 8; f.topRightRadius = 8;
  return f;
}, [{ name: 'Label', type: 'TEXT', value: 'Home', node: 'label' }, { name: 'Icon', type: 'INSTANCE_SWAP', value: 'AppIcon/FileExplorer', node: 'icon' }, { name: 'Show close', type: 'BOOLEAN', value: true, node: 'close' }], { width: 900, description: 'WinUI TabViewItem in the title bar (File Explorer, Terminal).' });
blocks.push(block('TabViewItem', null, tab));

// AppBarButton
const appbar = await variantSet('AppBarButton', { Kind: ['Icon', 'IconLabel', 'IconLabelChevron'], State: ['Rest', 'Hover', 'Disabled'] }, async ({ Kind, State }) => {
  const fg = State === 'Disabled' ? 'text/disabled' : 'text/primary';
  const ic = await icon('arrow_sort', 16, fg); ic.name = 'icon';
  const kids = [ic];
  if (Kind !== 'Icon') kids.push(txt('Sort', 'Body', fg, { name: 'label' }));
  if (Kind === 'IconLabelChevron') kids.push(await icon('chevron_down', 12, State === 'Disabled' ? 'text/disabled' : 'text/secondary'));
  const f = al('H', { name: 'AppBarButton', gap: 8, pad: Kind === 'Icon' ? [0, 8] : [0, 11], cross: 'CENTER', main: 'CENTER', radius: 'control', fillVar: st(State), h: 32 }, kids);
  if (Kind === 'Icon') { f.resize(40, 32); f.layoutSizingHorizontal = 'FIXED'; }
  return f;
}, [{ name: 'Label', type: 'TEXT', value: 'Sort', node: 'label' }, { name: 'Icon', type: 'INSTANCE_SWAP', value: 'Icon/arrow_sort', node: 'icon', preferred: ICON_PREF }], { width: 760, description: 'WinUI AppBarButton for CommandBar toolbars.' });
blocks.push(block('AppBarButton', null, appbar));
const appsep = await single('AppBarSeparator', al('H', { name: 'AppBarSeparator', pad: [0, 4], cross: 'CENTER', h: 32 }, [rect(1, 20, 'stroke/divider')]));
blocks.push(block('AppBarSeparator', null, appsep));

// BreadcrumbItem
const crumb = await single('BreadcrumbItem', al('H', { name: 'BreadcrumbItem', gap: 6, pad: [0, 6], cross: 'CENTER', radius: 'control', h: 28 }, [txt('This PC', 'Body', 'text/primary', { name: 'label' }), Object.assign(await icon('chevron_right', 12, 'text/secondary'), { name: 'chevron' })]),
  [{ name: 'Label', type: 'TEXT', value: 'This PC', node: 'label' }, { name: 'Show chevron', type: 'BOOLEAN', value: true, node: 'chevron' }], { description: 'BreadcrumbBar segment for the File Explorer address bar.' });
blocks.push(block('BreadcrumbItem', null, crumb));

// SettingsCard
const settings = await variantSet('SettingsCard', { Trailing: ['Navigation', 'Toggle', 'ComboBox', 'Button', 'Text', 'None'] }, async ({ Trailing }) => {
  const ic = await icon('settings', 20); ic.name = 'icon';
  const textCol = al('V', { name: 'text', gap: 0 }, [txt('Setting', 'Body', 'text/primary', { name: 'header' }), txt('Description of the setting', 'Caption', 'text/secondary', { name: 'description' })]);
  let trail = null;
  if (Trailing === 'Navigation') trail = await icon('chevron_right', 16, 'text/secondary');
  if (Trailing === 'Toggle') trail = await inst('ToggleSwitch', { Value: 'On', State: 'Rest' });
  if (Trailing === 'ComboBox') trail = await inst('ComboBox', { State: 'Rest' });
  if (Trailing === 'Button') trail = await inst('Button', { Style: 'Standard', State: 'Rest' }, { Label: 'Action' });
  if (Trailing === 'Text') trail = txt('Value', 'Body', 'text/secondary', { name: 'value' });
  if (trail) trail.name = trail.name === 'value' ? 'value' : 'trailing';
  const f = al('H', { name: 'SettingsCard', gap: 16, pad: [16, 16, 16, 16], cross: 'CENTER', radius: 'control', fillVar: 'bg/card', strokeVar: 'stroke/card', w: 860 }, [ic, grow(textCol, 'W'), trail]);
  f.minHeight = 68;
  return f;
}, [{ name: 'Header', type: 'TEXT', value: 'Setting', node: 'header' }, { name: 'Description', type: 'TEXT', value: 'Description of the setting', node: 'description' }, { name: 'Show description', type: 'BOOLEAN', value: true, node: 'description' }, { name: 'Show icon', type: 'BOOLEAN', value: true, node: 'icon' }, { name: 'Icon', type: 'INSTANCE_SWAP', value: 'Icon/settings', node: 'icon', preferred: ICON_PREF }, { name: 'Value', type: 'TEXT', value: 'Value', node: 'value' }], { width: 1820, description: 'Settings card (Windows Community Toolkit SettingsCard). Set instance to Fill width.' });
blocks.push(block('SettingsCard', 'Trailing content variants. Nested Toggle / ComboBox / Button stay editable.', settings));

// ListItem
const list = await variantSet('ListItem', { State: ['Rest', 'Hover', 'Selected'] }, async ({ State }) => {
  const ic = await icon('document', 20); ic.name = 'icon';
  const col = al('V', { name: 'text', gap: 0 }, [txt('Title', 'Body', 'text/primary', { name: 'title' }), txt('Subtitle', 'Caption', 'text/secondary', { name: 'subtitle' })]);
  const f = al('H', { name: 'ListItem', gap: 12, pad: [8, 12, 8, 12], cross: 'CENTER', radius: 'control', fillVar: st(State), w: 420 }, [ic, grow(col, 'W'), txt('Trailing', 'Body', 'text/secondary', { name: 'trailing' })]);
  if (State === 'Selected') { const pill = rect(3, 16, 'accent/default', 'circle'); f.appendChild(pill); pill.layoutPositioning = 'ABSOLUTE'; pill.x = 0; pill.y = 18; pill.constraints = { horizontal: 'MIN', vertical: 'CENTER' }; }
  return f;
}, [{ name: 'Title', type: 'TEXT', value: 'Title', node: 'title' }, { name: 'Subtitle', type: 'TEXT', value: 'Subtitle', node: 'subtitle' }, { name: 'Show subtitle', type: 'BOOLEAN', value: true, node: 'subtitle' }, { name: 'Trailing', type: 'TEXT', value: 'Trailing', node: 'trailing' }, { name: 'Show trailing', type: 'BOOLEAN', value: true, node: 'trailing' }, { name: 'Icon', type: 'INSTANCE_SWAP', value: 'Icon/document', node: 'icon', preferred: ICON_PREF }], { width: 1400, description: 'Two-line ListView item for logs, transactions and lists.' });
blocks.push(block('ListItem', null, list));

const grid = al('H', { name: 'Grid', gap: 48, wrap: true }); grid.resize(2000, 100); grid.primaryAxisSizingMode = 'FIXED'; grid.counterAxisSpacing = 48;
for (const b of blocks) grid.appendChild(b);
add(out, grid);
const bottom = Math.max(0, ...sec.children.filter((c) => c !== out).map((c) => c.y + c.height));
place(sec, out, 40, bottom + 80);
return { id: out.id, sets: blocks.length };
