# Game systems (`app/src/game`)

Plain TypeScript, no React. The UI reads state with `useGame(selector)` and calls store actions.

| File | Role |
| :-- | :-- |
| `types.ts` | Shared types: `Part`, `PartModel`, `Order`, `Txn`, `FileNode`, `DirNode`, `Legal`, `Host`... |
| `balance.ts` | Every tuning number (prices aside): tick, income, Heat, debt, resell, order stages, XP curve |
| `catalog.ts` | Parts catalog (`PARTS`, `getModel`, `SHOP_PARTS`, `STARTER_RIG`) |
| `rig.ts` | `Rig`, `SLOTS`, `rigStats`, `diskCapacityMB`, `resellPrice` |
| `vfs.ts` | Virtual File System (pure functions) |
| `state.ts` | `GameState` (everything that is saved), `newGame()`, `incomePerHour()` |
| `loop.ts` | `tick(state, now)` (pure), `orderStage`, `STAGE_LABELS`, `addTxn` |
| `store.ts` | zustand `useGame`: state + actions |
| `events.ts` | `onGameEvent` / `emit`: game → UI events |
| `save.ts` | IndexedDB save/load, autosave, `startGame()`, `resetGame()` |

## GameState

```
player   { name, level, xp }
wallet   { balance, debt, incomeSources[], pending, lastPayoutAt, lastInterestAt }
rig      { cpu, ram, net, disk }  -> Part | null
stock    Part[]          Rig Stock
orders   Order[]         newest first
txns     Txn[]           newest first, max 300
heat     0..100
legal    free | warrant | prison   (used from Phase 5)
fs       DirNode         the C: drive
soldHashes string[]      sold loot hashes (GDD 3.4.1, used from Phase 4)
```

Currency is credits, shown as `₵`.

## Game loop (`loop.ts`, run by `save.ts`)

`useGame.getState().tick()` runs every second. `tick` advances from `lastTick` to now, so the first tick after loading
applies offline progress (capped at 8 hours, `MAX_OFFLINE_MS`).

| Step | Rule |
| :-- | :-- |
| Deliveries | An order with `now >= arrivesAt` gets `notified = true` and emits `orderDelivered` (toast) |
| Passive income | Sum of `incomeSources[].perHour` accrues into `pending`; whole credits are paid every 60 s. Payouts in the same game day merge into one "Mining payout" txn. A new game has one 15/h source. |
| Heat decay | `HEAT_DECAY_PER_MIN` (2/min) |
| Debt interest | With debt > 0, every game day (`GAME_DAY_MS` = 20 real minutes) adds 5% and emits `interestCharged` |

Order stages come from time, not stored state: `orderStage(order, now)` → 0 Ordered, 1 Packed (after 10%), 2 On the way (after 35%), 3 Delivered.

## Store actions (`useGame.getState()`)

Actions that can fail return `Result` = `{ ok: true } | { ok: false, error }`.

| Action | Rule |
| :-- | :-- |
| `earn(amount, label, kind)` / `spend(...)` | Adds a txn. `spend` fails without enough balance. |
| `addXp(xp)` | Levels up with `xpToNext(level) = 100 * level^1.5`, emits `levelUp` |
| `addHeat(n)` | Clamped 0..100, emits `heatMax` when it reaches 100 |
| `placeOrder(modelIds)` | Pays the total, one order per part, ETA = model `eta` seconds |
| `cancelOrder(id)` | Only before delivery; refunds the price |
| `claimOrder(id, "rig" \| "stock")` | After delivery. `"rig"` installs (Install or Replace); `"stock"` keeps it in Rig Stock |
| `installFromStock(uid)` | Swaps a stock part into its slot |
| `sellFromStock(uid)` | Second-hand sale for `resellPrice` |
| `writeFile`, `mkdir`, `remove`, `copy`, `move` | VFS changes, rejected with "Not enough disk space" when they would overflow the disk |

Replace: the old part goes to Rig Stock with `condition - 15` (`REPLACE_WEAR`) and `removedAt`.
A new storage part is refused if the current files do not fit on it.

## Parts and rig

32 parts: 4 kinds (cpu, ram, net, disk) × Tier 1–4 × 2 models. Starter parts are not sold in the shop; their price (40–80) only sets the resale value.
Tier 3 parts unlock at level 5 and Tier 4 at level 10 (`TIER_UNLOCK_LEVEL`); locked parts show as pre-order.
`value` is GHz × cores for CPU, GB for RAM, Mbps for network, GB for storage. `eta` is in seconds.

| Tier | Price range | Delivery | Rarity |
| :-- | :-- | :-- | :-- |
| 1 | 120–240 | 1–1.5 min | Common |
| 2 | 500–1,600 | 3–4 min | Common, Rare |
| 3 | 3,800–8,800 | 10–14 min | Rare, Epic |
| 4 | 24,000–58,000 | 30–50 min | Epic, Legendary |

`rigStats(rig)` → `{ cpu, ramGB, netMbps, diskGB, tier, levels }`. `tier` is the lowest part tier (the rig is as good as its weakest part).
`resellPrice(part)` = price × 0.5 × condition%.

## Virtual File System (`vfs.ts`)

Immutable tree of `DirNode` / `FileNode`. Paths are `C:/folder/file.ext` (backslashes and a missing `C:` are accepted).
Sizes are in MB; capacity is the installed storage's GB × 1024.

Functions: `getNode`, `list` (folders first), `sizeOf`, `mkdir` (creates parents), `writeFile` (parent must exist),
`remove`, `copy`, `move`, `copyName` ("x - Copy.ext"), `fileKind(name)`, `starterDrive()`.

File types (GDD 3.2): `.exe` tools, `.dll` passive modules, `.js` scripts, `.db/.sql/.dat` loot, `.txt/.log` lore, `.css` themes, `.key` keys.
Copies keep the loot hash, so once a hash is sold every copy is worth 0 (GDD 3.4.1).

The starter drive has `Users/ghost_user/{Desktop,Documents,Downloads}`, `Scripts`, `tools`, `loot` and `Xea/System`.

## Save / load (`save.ts`)

- IndexedDB database `bytecore`, store `saves`, key `slot1`. The value is the whole `GameState`.
- `startGame()` (called once by `App`): load or create a game, run the offline tick, start the 1 s loop and autosave.
- Autosave: at most every 5 s while the state changes, and immediately when the window is hidden or closed. Shut down saves first.
- `resetGame()`: new game and save over the slot (Settings → System → New game).
- `SAVE_VERSION` + `migrate()`: older saves get missing fields from `newGame()` defaults. Bump the version when the shape changes.
