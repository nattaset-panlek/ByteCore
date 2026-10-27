# Figma style conventions (from the existing File Explorer and Settings windows)

Audited `Window/Settings` (13:27998) and `Window/File Explorer/*` (13:25657). New screens must match these.

## Window shell
- Fill `#1F1F1F` (mica). Stroke `stroke/surface` (#757575 @ 40%), 1px, INSIDE. Radius 8.
- **No drop shadow / effect style on windows or cards.** Elevation styles are not used on canvas windows.
- Vertical auto-layout, padding 0, gap 0.
- Title bar: the existing **TitleBar** component (`Kind=Default` or `Kind=Back`), 32px tall,
  16px app icon (image fill) + 12px title + CaptionButtons. Tabbed apps use a 44px row:
  `TabViewItem` instances, pad 4/0/0/8, gap 4, caption buttons in a 138x44 column at the top.
- App icons are image frames already in the file; copy their image paint, do not redraw:
  `app/Terminal` 13:25172, `app/TaskManager` 13:25187, `app/RigManager` 13:25181,
  `app/Settings` 13:25190, `app/Profile` 13:24985, `app/Wallet` I13:25211;13:19696,
  `app/FileExplorer` I13:28656;13:19478. Fluent UI icons (`icon/*`) are image frames too
  (e.g. icon/settings, icon/save, icon/database, icon/developer_board, icon/globe, icon/lock_closed).

## Layers inside a window
- Toolbar / command layer: fill `#272727` (`bg/layer`), command bar 48px, pad 0/12, gap 2,
  `AppBarButton` + `AppBarSeparator` instances. Dividers are 1px `#FFFFFF` @ 8%.
- Content area (lists): fill `#1C1C1C`. Details/side pane: fill `#272727`, pad 20, gap 16.
- Status bar: 24px, transparent, pad 0/12, gap 16, 12px `#C5C5C5` text.
- Navigation (Settings): column 320px, pad 8/16/16/16, gap 4, `NavigationViewItem` (288x36,
  selected = white 6% fill, radius 4, 3x16 accent pill, 16px image icon, gap 16).
- Navigation (File Explorer): 240px, pad 8, gap 2, `TreeItem` instances, section dividers.
- Page (Settings): pad 12/56/24/40, gap 8; page title 28px semibold.

## Cards
- Fill `#2B2B2B` (`bg/card`), stroke black 10% (`stroke/card`), radius 8, pad 16, gap 10. No shadow.

## Text
- Inter: 12 Regular (caption), 14 Regular/Semi Bold (body), 20/28 Semi Bold (subtitle/title).
- Colors: primary #FFFFFF, secondary #C5C5C5, tertiary #9D9D9D.
- Existing screens use raw fills; new work should bind to the ByteCore variables and text styles
  (same visual values), and use `ByteCore/Mono` (Cascadia Mono) only inside console views.

## Deviations found in the first new screens (to refactor)
1. `Window` effect style + `Card` effect style added shadows → remove.
2. Window fill used `bg/solid-base` (#202020) → use #1F1F1F.
3. Custom `AppTitleBar` (vector icon) instead of `TitleBar` with the app's image icon → swap.
4. Custom `NavItem` (vector icons, 240px) instead of `NavigationViewItem` sizing → match metrics or use the existing component.
5. Task Manager content layer used `stroke/card` and rounded corner; keep the rounded layer (it is
   the real Task Manager look) but drop the stroke.

## Status (refactor done)
All deviations above are fixed in `06 Terminal` and `08 Apps`. Windows bind their fill to the new
`bg/mica` variable (#1F1F1F, created by lib.js on first run). The `Window`/`Card` effect styles still
exist as foundations but nothing on canvas uses them. `AppTitleBar` / `TerminalTab` (07) are deprecated.
`NavItem` (07) now uses NavigationViewItem metrics (pill absolute at x0, icon at 16, label at 48); use it only
when no image icon exists (e.g. Task Manager's chart/clock/bolt glyphs).

## lib.js helpers that encode these rules
- `appWindow(parent, name, title, "app/X", w, h, x, y, { kind, tabs, selectedTabFill, bodyDir })`:
  shell + `TitleBar` (or File Explorer tab row when `tabs` is given). `AL` rejects `effect`.
- `settingsWindow(...)`: Back TitleBar, 320px nav (`navItem` = NavigationViewItem with image icon), page 12/56/24/40.
- `cmdBar`, `appBarButton(label, "icon/x")`, `appBarSeparator`, `statusBar(parent, items)` (24px),
  `miniMeter` (meter that fits a 24px status bar; the 32px `Meter` must not go in status bars),
  `card` (pad 16, gap 10), `settingsCard`, `statCard`, `groupTitle`, `personPicture`, `imgIcon` / `setImg`.
- Screens: `screen_terminal.js`, `screen_taskmgr.js`, `screen_scripteditor.js`, `screen_rigmanager.js`,
  `screen_wallet.js`, `screen_profile.js`, `screen_rigstock.js`, `screen_browser.js` (shop site: PC Builder + My orders),
  `screen_deliverytoast.js` (each re-runnable; it replaces its windows by name). Extra helpers: `iconButton`, `iconTile`.

## Websites inside Browser (Core html)
- Only the browser chrome (tab row, address row) follows the OS style above. The web page itself is the simulated site's own brand:
  a light, generic online-shop look (brand-color header with a large search bar, category bar, gray page, white cards, red prices).
- Site colors live in their own variable collection `Web/Market` (`web/*`: bg, surface, border, text, brand, price, success, warning...).
  Do not use these colors for OS UI, and do not use the Fluent Button/TextBox components inside web pages (the site builds its own buttons and inputs).
