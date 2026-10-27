# App windows (`app/src/apps`)

Each app is a React component registered in `apps/index.tsx`. Shared helpers are in `apps/common.tsx`, shared styles in `apps/apps.css`.
Apps not listed here still show the placeholder body (`Placeholder.tsx`).

## Shared helpers — `apps/common.tsx`

| Helper | Use |
| :-- | :-- |
| `credits(n)`, `signedCredits(n)` | `₵ 1,234`, `+₵ 12` / `-₵ 12` |
| `duration(ms)`, `date(ts)`, `dateTime(ts)`, `fileSize(mb)` | `00:01:30`, `27 Oct 2026`, `27 Oct 2026 14:32`, `3.1 MB` |
| `useNow(ms)` | Re-render every second for countdowns |
| `PART_ICON` | Icon per part kind (cpu, ram, net, disk) |
| `usePages(initial)` | Page state with back history → `{ page, go, back }` |
| `NavApp` | Settings-style frame: back TitleBar, 320px nav (header, search, items, Settings at the bottom), page |
| `NavHeader`, `Section`, `LinkButton`, `EmptyState` | Small layout pieces |

## Launch arguments

`useWindows.getState().open(appId, args)` passes string arguments to the app (`useWindow().win.args`).
Re-opening a single-instance app replaces its args (a `nonce` changes each time), so the app can react.

| App | Arg | Example |
| :-- | :-- | :-- |
| Browser | `url` | `open("browser", { url: "core://market/account/orders" })` |
| Rig Manager | `page` | `open("rigManager", { page: "deliveries" })` (delivery toast) |
| File Explorer | `path` | `open("explorer", { path: "C:/loot" })` |

Each window has an error boundary: if an app crashes, only that window shows "This app stopped working" with Restart app.

## Browser (Core html) — `apps/browser/`

- `Browser.tsx`: tab row (new tab, close), address row (back, refresh, home, editable address, Enter navigates). Single instance.
- `routes.ts`: simulated addresses and `parseUrl`. Unknown addresses show "This site can't be reached".

| Address | Page |
| :-- | :-- |
| `core://newtab` | New tab (search + shortcuts) |
| `core://market`, `core://market/c/<all\|cpu\|ram\|net\|disk>` | Product grid |
| `core://market/search?q=` | Search results |
| `core://market/pc-builder?slot=<kind>` | PC Builder |
| `core://market/account/orders` | My orders |

- `shop.tsx`: the site "Core Market". It uses the Web/Market tokens (`--web-*`) and its own buttons and inputs, never the Fluent controls (STYLE_NOTES).
  - Header (logo, search, Account → My orders, Build → PC Builder with a count) and a category bar.
  - Product grid: search, Brand / Tier / Sort filters, Reset. Cards show brand, rarity, spec, price, delivery time.
    Parts above the player's level show **Pre-order · Unlocks at level N** with Notify me (`TIER_UNLOCK_LEVEL` in `balance.ts`: T3 at level 5, T4 at level 10).
  - PC Builder: one part per slot. The build (`shopStore.ts`) is also the cart and is shared by all tabs (not saved).
    Summary shows the total, the longest delivery time and the wallet balance. Place order calls `placeOrder` and opens My orders.
  - My orders: filter All / To ship / On the way / Delivered. A stepper Ordered → Packed → On the way → Delivered with a live countdown.
    Actions: Cancel order (before On the way; refunds), Install in Rig Manager (delivered, not installed), Buy again.

## Rig Manager — `apps/RigManager.tsx`

Pages: Overview, Hardware, Deliveries, Storage.

- Overview: StatCards (processing GHz, memory, storage free, network speed), "Package delivered" InfoBar, slot cards, storage card.
- Slot card per part kind, one state at a time:
  - **Delivered**: Replace (or Install for an empty slot). The old part goes to Rig Stock.
  - **Ordered / Packed / On the way**: "Arrives in" countdown and Track (opens My orders).
  - **Installed**: the next upgrade price and Shop (opens PC Builder at that slot).
- Deliveries: every unclaimed order. Delivered ones offer To Rig Stock or Install / Replace.
- Storage: disk meter and size per top-level folder.
- Errors from the store (for example "Files do not fit on the new storage") show in an InfoBar.

## Rig Stock — `apps/RigStock.tsx`

Pages: All parts, one per kind, Sold. StatCards: in stock, total resale value, sold count.
Each card shows removed date, condition and resale price, with Install / Replace (swaps with the installed part) and Sell (confirm dialog).
Starter parts have a list price only for resale and are not sold in the shop.

## Wallet — `apps/Wallet.tsx`

Pages: Overview, Transactions. The nav search jumps to Transactions.
Overview: total balance (or debt), StatCards (income and spending in the last 24 h, value of orders in transit, mining rate and next payout),
an activity bar chart (12 buckets of one game day = 20 minutes), and recent transactions. Transactions: category filter and search.
Mining payouts within the same game day merge into one row.

## File Explorer — `apps/FileExplorer.tsx`

Multi-instance, with tabs per folder. Address row: back, forward, up, refresh, breadcrumb, search in folder.
Command bar: New folder, Cut, Copy, Paste, Rename, Delete, Sort (name / size / date), Details pane toggle.
Left nav: Desktop, Downloads, Documents, Loot, Scripts, This PC. Status bar: item count, selection size, free space and a disk bar.

| Action | Mouse | Keyboard |
| :-- | :-- | :-- |
| Open folder / file | Double-click | Enter |
| Select more | Ctrl+click | Ctrl+A |
| Copy / cut / paste | Command bar | Ctrl+C / Ctrl+X / Ctrl+V |
| Rename | Command bar | F2 (Enter saves, Esc cancels) |
| Delete | Command bar or details pane (confirm) | Delete |
| Up | Up button | Backspace |

- The clipboard is shared between Explorer windows. Pasting over an existing name makes "name - Copy.ext".
- Text files (`.txt .log .js .css`) open in a preview dialog. Other types say there is no app for them yet (Terminal and Script Editor come later).
- Every change goes through the game store, so it is saved and checked against disk capacity.
- Details pane shows type, size, modified date, location and, for loot files, tier and market value (₵ 0 once the hash is sold).
- Files and folders in `C:/Xea/System` can currently be deleted; protecting them is open.
