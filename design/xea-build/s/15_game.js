// Game specific components: FileItem (all Explorer views), DetailsHeader, RarityLabel, StatCard
const sec = await getSec('comp');
for (const n of sec.children.filter((c) => c.name === 'Game')) n.remove();
const out = al('V', { name: 'Game', gap: 40, pad: 40, fillVar: 'bg/solid-base', radius: 'overlay' }, [txt('Game', 'Title'), txt('ByteCore specific parts built on the same tokens.', 'Body', 'text/secondary')]);
const blocks = [];

// RarityLabel
const rarity = await variantSet('RarityLabel', { Rarity: ['Common', 'Rare', 'Epic', 'Legendary'] }, async ({ Rarity }) => {
  const v = 'rarity/' + Rarity.toLowerCase();
  return al('H', { name: 'RarityLabel', gap: 6, cross: 'CENTER' }, [rect(8, 8, v, 'circle'), txt(Rarity, 'Caption', v)]);
}, [], { width: 600, description: 'File rarity. Colors from rarity/* variables.' });
blocks.push(block('RarityLabel', null, rarity));

// StatCard
const stat = await single('StatCard', al('V', { name: 'StatCard', gap: 4, pad: [16, 16], radius: 'overlay', fillVar: 'bg/card', strokeVar: 'stroke/card', w: 220 }, [
  al('H', { name: 'head', gap: 8, cross: 'CENTER' }, [Object.assign(await icon('wallet', 16, 'text/secondary'), { name: 'icon' }), txt('Header', 'Caption', 'text/secondary', { name: 'header' })]),
  txt('Value', 'Subtitle', 'text/primary', { name: 'value' }),
  txt('Caption', 'Caption', 'text/tertiary', { name: 'caption' }),
]), [{ name: 'Header', type: 'TEXT', value: 'Header', node: 'header' }, { name: 'Value', type: 'TEXT', value: 'Value', node: 'value' }, { name: 'Caption', type: 'TEXT', value: 'Caption', node: 'caption' }, { name: 'Show caption', type: 'BOOLEAN', value: true, node: 'caption' }, { name: 'Show icon', type: 'BOOLEAN', value: true, node: 'icon' }, { name: 'Icon', type: 'INSTANCE_SWAP', value: 'Icon/wallet', node: 'icon', preferred: ['Icon/wallet', 'Icon/flash', 'Icon/temperature', 'Icon/top_speed', 'Icon/arrow_download', 'Icon/arrow_up', 'Icon/pulse', 'Icon/trophy', 'Icon/star', 'Icon/developer_board', 'Icon/database'] }], { description: 'Metric card. Set width to Fill inside rows.' });
blocks.push(block('StatCard', null, stat));

// FileItem: every File Explorer view
const VIEWS = ['ExtraLarge', 'Large', 'Medium', 'Small', 'List', 'Details', 'Tiles', 'Content'];
const COLS = { name: 320, date: 170, type: 140, size: 90, value: 110 };
const fileItem = await variantSet('FileItem', { View: VIEWS, State: ['Rest', 'Hover', 'Selected'] }, async ({ View, State }) => {
  const bg = State === 'Hover' ? 'subtle/hover' : State === 'Selected' ? 'control/hover' : undefined;
  const sk = State === 'Selected' ? 'stroke/surface' : undefined;
  const ico = async (s) => { const i = await fileIcon('Folder', s); i.name = 'icon'; return i; };
  const T = (s, style = 'Caption', color = 'text/primary', o = {}) => txt(s, style, color, o);
  if (View === 'ExtraLarge' || View === 'Large' || View === 'Medium') {
    const s = { ExtraLarge: 128, Large: 96, Medium: 48 }[View], w = { ExtraLarge: 156, Large: 116, Medium: 92 }[View];
    return al('V', { name: 'FileItem', gap: 4, pad: [6, 4, 6, 4], cross: 'CENTER', radius: 'control', fillVar: bg, strokeVar: sk, w }, [await ico(s), T('secret_plans.docx', 'Caption', 'text/primary', { name: 'name', width: w - 8, align: 'CENTER', truncate: 2 })]);
  }
  if (View === 'Small' || View === 'List') {
    return al('H', { name: 'FileItem', gap: 8, pad: [0, 8, 0, 6], cross: 'CENTER', radius: 'control', fillVar: bg, strokeVar: sk, w: View === 'Small' ? 220 : 240, h: 24 }, [await ico(16), grow(T('secret_plans.docx', 'Caption', 'text/primary', { name: 'name' }), 'W')]);
  }
  if (View === 'Details') {
    const col = (w, node) => al('H', { name: 'col', w, h: 28, cross: 'CENTER', gap: 8, pad: [0, 8, 0, 0] }, node);
    return al('H', { name: 'FileItem', pad: [0, 0, 0, 8], cross: 'CENTER', radius: 'control', fillVar: bg, strokeVar: sk, h: 28 }, [
      col(COLS.name, [await ico(16), T('secret_plans.docx', 'Caption', 'text/primary', { name: 'name' })]),
      col(COLS.date, [T('27/10/2026 14:28', 'Caption', 'text/secondary', { name: 'date' })]),
      col(COLS.type, [T('Word Document', 'Caption', 'text/secondary', { name: 'type' })]),
      al('H', { name: 'col', w: COLS.size, h: 28, cross: 'CENTER', main: 'MAX', pad: [0, 16, 0, 0] }, [T('3.1 MB', 'Caption', 'text/secondary', { name: 'size' })]),
      col(COLS.value, [T('₵1,500', 'Caption', 'text/primary', { name: 'value' })]),
    ]);
  }
  if (View === 'Tiles') {
    return al('H', { name: 'FileItem', gap: 10, pad: 6, cross: 'CENTER', radius: 'control', fillVar: bg, strokeVar: sk, w: 280 }, [await ico(48), al('V', { gap: 0 }, [T('secret_plans.docx', 'Caption', 'text/primary', { name: 'name' }), T('Word Document', 'Caption', 'text/secondary', { name: 'type' }), T('3.1 MB', 'Caption', 'text/secondary', { name: 'size' })])]);
  }
  // Content
  const row = al('H', { name: 'FileItem', gap: 12, pad: [8, 12, 8, 8], cross: 'CENTER', radius: 'control', fillVar: bg, strokeVar: sk, w: 860 }, [
    await ico(48),
    grow(al('V', { gap: 2 }, [T('secret_plans.docx', 'Body', 'text/primary', { name: 'name' }), T('Word Document', 'Caption', 'text/secondary', { name: 'type' })]), 'W'),
    al('V', { gap: 2, w: 220 }, [T('Date modified: 27/10/2026 14:28', 'Caption', 'text/secondary', { name: 'date' }), T('Size: 3.1 MB', 'Caption', 'text/secondary', { name: 'size' })]),
  ]);
  return row;
}, [{ name: 'Name', type: 'TEXT', value: 'secret_plans.docx', node: 'name' }, { name: 'Type', type: 'TEXT', value: 'Word Document', node: 'type' }, { name: 'Date', type: 'TEXT', value: '27/10/2026 14:28', node: 'date' }, { name: 'Size', type: 'TEXT', value: '3.1 MB', node: 'size' }, { name: 'Value', type: 'TEXT', value: '₵1,500', node: 'value' }, { name: 'Icon', type: 'INSTANCE_SWAP', value: 'FileIcon/Folder', node: 'icon', preferred: ['FileIcon/Folder', 'FileIcon/Document', 'FileIcon/Text', 'FileIcon/PDF', 'FileIcon/Image', 'FileIcon/Database', 'FileIcon/System', 'FileIcon/Key', 'FileIcon/Archive', 'FileIcon/Drive', 'FileIcon/NetworkDrive'] }], { width: 2000, description: 'One item in File Explorer. Switch View to match the View menu: Extra large, Large, Medium, Small icons, List, Details, Tiles, Content.' });
blocks.push(block('FileItem', 'View x State. Props: Name, Type, Date, Size, Value, Icon.', fileItem));

// DetailsHeader
const hcol = async (w, label, sorted, right) => {
  const kids = [txt(label, 'Caption', 'text/secondary')];
  if (sorted) kids.push(await icon('chevron_up', 12, 'text/secondary'));
  const c = al('H', { name: 'col/' + label, w, h: 28, gap: 6, cross: 'CENTER', main: right ? 'MAX' : 'MIN', pad: [0, right ? 16 : 8, 0, 8] }, kids);
  c.strokes = [vp('stroke/divider')]; c.strokeRightWeight = 1; c.strokeTopWeight = 0; c.strokeBottomWeight = 0; c.strokeLeftWeight = 0;
  return c;
};
const header = await single('DetailsHeader', al('H', { name: 'DetailsHeader', h: 28 }, [await hcol(COLS.name + 8, 'Name', true), await hcol(COLS.date, 'Date modified'), await hcol(COLS.type, 'Type'), await hcol(COLS.size, 'Size', false, true), await hcol(COLS.value, 'Value')]), [], { description: 'Column header for Details view. Widths match FileItem View=Details.' });
blocks.push(block('DetailsHeader', null, header));

const grid = al('H', { name: 'Grid', gap: 48, wrap: true }); grid.resize(2100, 100); grid.primaryAxisSizingMode = 'FIXED'; grid.counterAxisSpacing = 48;
for (const b of blocks) grid.appendChild(b);
add(out, grid);
const bottom = Math.max(0, ...sec.children.filter((c) => c !== out).map((c) => c.y + c.height));
place(sec, out, 40, bottom + 80);
fitSection(sec);
return { id: out.id, sets: blocks.length };
