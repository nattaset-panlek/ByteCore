# ByteCore: Development Tasks

Stack: Vite + React + TypeScript + Electron (`app/`). Design reference: Figma (sections 06 Terminal, 08 Apps) and `tools/figma-build/STYLE_NOTES.md`. Game rules: `GDD.md`. Technical docs: `docs/`.

Estimate: about 9–12 weeks. First playable build after Phase 3. Full GDD loop after Phase 5.

## Decisions before Phase 4 (decided, see `docs/phase4-scope.md`)
- [x] Phase 4 gameplay scope: the game's own fictional commands + timed jobs based on rig stats, no real-world commands or techniques
- [x] In-game language: English for now, with a localization layer so other languages (Thai) can be added later
- [x] Chimera Kit and Contracts: code directly from the UI kit and STYLE_NOTES, update Figma afterwards
- [x] Chimera Kit = remote session toolkit (target, transfers, trace countdown, Disconnect)

---

## Phase 0: Project setup (1–2 days)
- [x] Create `app/` project with Vite + React + TS
- [x] Install dependencies (react, zustand, electron, electron-builder)
- [x] Electron entry `electron/main.cjs` + `preload.cjs`
- [x] Export 52 icons from Figma to `app/src/assets/icons/`
- [x] Design tokens from Figma variables in `app/src/styles/tokens.css`
- [x] Base game types `app/src/game/types.ts`
- [x] Remove old prototype (`index.html`, `js/`, `style.css`)
- [x] `npm run dev` runs in the browser
- [x] `npm run electron:dev` runs as a desktop app
- [x] `npm run dist` builds a portable .exe (test packaging early)
- [x] Bundle fonts (Inter, fallback Segoe UI / Cascadia Mono)
- [x] Folder layout: `game/`, `os/`, `ui/`, `apps/`, `screens/`
- [ ] Review `npm audit` warnings in dev dependencies
- **Done when:** the .exe opens and shows the empty desktop background

## Phase 1: Xea OS shell (1 week)
- [x] UI components from Figma 02 Components
  - [x] Button (Standard / Accent / Subtle)
  - [x] TextBox and ComboBox
  - [x] CheckBox and ToggleSwitch
  - [x] Card, StatCard, SettingsCard
  - [x] Meter, Badge, RarityLabel, KeyValue
  - [x] InfoBar, ContentDialog
  - [x] NavigationViewItem, TabViewItem
  - [x] ToastNotification
- [x] Desktop with app shortcut icons (double-click to open)
- [x] Window manager
  - [x] Drag, focus and z-order
  - [x] Minimize, maximize, close
  - [x] Resize
  - [x] TitleBar variant and tab row variant (#1F1F1F, radius 8, no shadow)
  - [x] Settings-style layout (320px nav + page)
- [x] Taskbar
  - [x] Wallet widget (left)
  - [x] Start button, search box, pinned/running apps
  - [x] Tray: Heat indicator, network, sound, clock/date
- [x] Start menu: app list, Shut down
- [x] Toast stack (bottom right, auto dismiss, action buttons)
- **Done when:** the desktop works like a real OS with empty app windows

## Phase 2: Core game systems (1 week)
- [x] Game store (zustand): player, wallet, level/XP, rig, Rig Stock, orders, transactions, Heat
- [x] Game loop (1s tick): delivery timers, passive income, Heat decay, debt interest
- [x] Virtual File System as inventory (GDD 3.2)
  - [x] File types: .exe, .dll, .js, .db/.sql/.dat, .txt/.log, .css
  - [x] Disk capacity from the installed storage part
- [x] Parts catalog (Tier 1–4, rarity, price, delivery time)
- [x] Rig stats derived from installed parts
- [x] Save/load with IndexedDB, autosave
- [x] New game / reset save
- **Done when:** closing and reopening the game keeps all progress

## Phase 3: Economy and upgrade apps (1–1.5 weeks)
- [x] Browser (Core html)
  - [x] Browser chrome: tabs, address bar, back/refresh/home
  - [x] Shop site: PC Builder (pick part per slot, summary, Place order)
  - [x] Shop site: product grid, filters, sort, pre-order state
  - [x] Shop site: My orders (Ordered → Packed → On the way → Delivered, cancel)
- [x] Delivery flow: timer → "Package delivered" toast → open Rig Manager
- [x] Rig Manager
  - [x] Overview: StatCards, hardware slots, storage
  - [x] Install (empty slot) and Replace (old part goes to Rig Stock)
  - [x] "On the way" slot state with Track
- [x] Rig Stock: list removed parts, Install back, Sell second-hand (price by condition)
- [x] Wallet: balance, income per hour, chart, transactions
- [x] File Explorer: browse, open, delete, copy/paste, rename, disk usage bar
- **Done when:** money → order → wait → install → stronger rig works end to end

## Phase 4: Core gameplay (2 weeks), plan in `docs/phase4-scope.md`
- [x] Localization layer (`t()`, English dictionary, locale formatting) and migrate Phase 1–3 screens to it
- [x] Simulated network of generated targets with Tier difficulty (GDD 4)
- [x] Job system in the game loop: progress based on time and rig stats (CPU speed, network speed, disk space)
- [x] Terminal app (Local shell / Remote session tabs) with the game's own command set and `help`
- [x] Trace countdown while connected; Heat gain when traced or on failed cracks
- [x] Chimera Kit app: active session, transfers, trace bar, Disconnect, 30 s warning toast
- [x] Reward files ("data") saved to the VFS
- [x] Data exchange site: sell reward files; sold files and their copies lose value (GDD 3.4.1)
- [x] Contracts app: mission list with clear goals and rewards
- [x] Task Manager: running jobs, CPU/RAM/Network/Disk graphs
- [x] Rig Manager Modules section (.dll modules)
- [x] Balance Tier 1–2 so the loop is playable
- **Done when:** mission → sell → upgrade → harder mission loop is playable

## Phase 5: Risk and consequences (1 week)
- [ ] Heat gain from risky play, Heat reduction from careful play
- [ ] Heat 100% → warrant screen → pay bail or take debt
- [ ] Debt limit and daily interest
- [ ] Prison workstation
  - [ ] Paperwork mini-game (reduces sentence)
  - [ ] Wait out the timer
  - [ ] New identity (reset)
  - [ ] One-shot escape puzzle (once per sentence, fail doubles the time)
- **Done when:** mistakes have real consequences and the player can recover

## Phase 6: Script Editor (1–1.5 weeks)
- [ ] Editor: line numbers, syntax colors, tabs, console panel, status bar
- [ ] Save scripts to `C:/Scripts/*.js` in the VFS
- [ ] Game API for player scripts (GDD 3.3.2)
- [ ] Run scripts in a Web Worker with Stop (infinite loops must not freeze the game)
- [ ] Import script dialog (paste or drop a .js file)
- **Done when:** a player script can automate repetitive tasks

## Phase 7: Progression and content (1–2 weeks)
- [ ] Balance prices, delivery times, rewards and difficulty for Tier 1–4
- [ ] Unlocks by level: new markets, parts, tools
- [ ] Story through .txt / .log files (lore, puzzles)
- [ ] Tutorial: first-run toasts and a readme file
- [ ] Profile app: level, XP, stats, account settings
- [ ] Settings app: theme, sound, language

## Phase 8: Polish and release (1 week)
- [ ] Sounds: click, notification, delivery
- [ ] Window open/close and toast animations
- [ ] Boot screen and sign-in screen
- [ ] Full playtest, bug fixing, pacing
- [ ] App icon, version number, portable .exe and installer
- [ ] Optional: Steam / itch.io page and build
