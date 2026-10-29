# App SDK: player-made apps

Players write their own Xea OS apps (games included) as one `.xjs` file, compile it in the IDE, run the Setup it
produces, and launch the app from Start. The app runs in a sandboxed iframe and talks to the OS through a small
`postMessage` API.

**Player reference.** The full API reference players read is
[`app/src/game/appsdk/guide.xpdf`](../app/src/game/appsdk/guide.xpdf) (in-game PDF markup, see `game/pdfdoc.ts`). It is copied into the game as
`C:/Users/ghost_user/Documents/Xea App SDK/app-sdk-guide.pdf`, next to `hello.xjs`. Edit that file when the API
changes. This page covers the format briefly and then how the code works.

## Flow

```
 source (.xjs)                  build                     install                    run
 ───────────────               ───────                   ─────────                  ─────
 IDE, wget/curl, Xea Soft  ──► IDE Run = compile job ──► .install_<id>.exe ──► Setup wizard ──► Start / taskbar /
 site, import from PC          (time from code + CPU)    (same folder)         (options)       desktop .lnk → window
                                                                                                  └─ sandboxed iframe
```

## `.xjs` format

```js
// ==XeaApp==
// @name        Snake            required, 1-40 chars
// @id          snake            optional, slug of @name; same id = upgrade in place
// @version     1.0.3            optional, digits and dots
// @author      pix3l
// @description Eat. Grow.
// @icon        🐍               emoji / 1-2 letters on a tile, or a built-in icon name (icon/globe)
// @color       #f5c518          tile colour
// @width       460              page size, 240..1600
// @height      520              page size, 180..1000
// ==/XeaApp==
const me = await xea.player();   // code runs inside an async function: top-level await is fine
```

Parsing, metrics, the compile formula and the package format live in
[`game/appsdk/xjs.ts`](../app/src/game/appsdk/xjs.ts).

## Pieces

| Piece | File | Notes |
| :-- | :-- | :-- |
| Format, syntax check, metrics, compile time, package encode/decode | `game/appsdk/xjs.ts` | Pure. `syntaxError` parses with the AsyncFunction constructor (no execution). |
| Download and compile jobs | `game/appsdk/jobs.ts` | `startDownload(url, dir)`, `startCompile(path, source)`. Registered with `registerJobHandler` in `game/store.ts`. |
| Installed apps (state, install, uninstall, pins, storage) | `game/appsdk/installed.ts` | `GameState.apps: InstalledApp[]`. Install dir `C:/Program Files/<name>/` with `<id>.exe` and `data/`. |
| Xea Soft catalog | `game/appsdk/catalog.ts` + `examples/*.xjs` | Free and paid items. Bought ids are in `GameState.software`. |
| SDK guide seeding | `game/appsdk/sdkFiles.ts` | Writes `Documents/Xea App SDK/` after load / New game if missing. |
| App registry bridge, icons, toasts | `os/userApps.ts` | Registers `user.<id>` into `APPS` while installed, draws emoji tile icons as SVG data URLs (letters take white or dark ink by tile luminance, emoji get a halo in that ink, the tile gets an edge), toasts finished builds and downloads. |
| Setup wizard | `apps/userApp/Installer.tsx` | AppId `installer` (multi-instance, args `{ path }`). |
| Sandbox host | `apps/userApp/UserAppHost.tsx`, `runtime.ts` | Window body for every `user.*` app (`appComponent()` in `apps/index.tsx`). |
| IDE compile UI | `apps/userApp/CompileStatus.tsx` | Run on `.xjs` calls `compileLines`; the console shows progress and the result. |
| Opening files | `apps/userApp/openFile.ts` | `.xjs` → IDE, installer `.exe` → Setup, `.lnk` → its app. Called first by File Explorer and the desktop. |
| Import from PC | `apps/userApp/importLocal.ts` | `import` command, Explorer and desktop right-click "Import from PC...". |
| Settings > Apps | `apps/userApp/AppsPage.tsx` | List, Start / taskbar toggles, open, uninstall (with confirm). `userAppMenu()` adds pin / uninstall items to Start and taskbar menus. |
| Xea Soft site | `apps/browser/soft.tsx`, `soft.css` | `core://soft`, `core://soft/c/<games|tools|dev>`. |
| Strings | `i18n/en/appsdk.ts` | `sdk.*`, `soft.*`, `terminal.help.wget`, `taskmgr.job.download/compile`, `txn.software`. |

## Jobs

Both new job kinds (`download`, `compile`) are ordinary `Job`s, so they save, show in Task Manager and in the
Terminal's progress line, and `Ctrl+C` / `kill` stop them. They carry what to write in `job.payload`.

- **Download**: in-game addresses (`core://soft/dl/<file>`) know their content up front. Real `http(s)` URLs start
  with a placeholder finish time, `fetch` the file (no credentials, CORS required, max 1 MB), store the text in the
  payload and then `retimeJob` to the real duration. If the page reloads mid-fetch the job fails with
  "could not reach the host". Duration = `max(2.5 s, jobDuration(download, size))` with the size billed as
  `max(0.4 MB, chars / 10 000)` so small files still take a moment on a slow network card.
- **Compile**: header errors fail at once. Otherwise the duration is

  ```
  base  = 2 + chars/800 + functions*0.6 + depth²*0.5      seconds
  speed = clamp(√(cpu / 1.6), 1, 4)                         cpu = GHz × cores of the installed CPU
  time  = min(290, base / speed)
  ```

  A syntax error fails the job at 35% of that time with the parser message. The examples take 6-27 s on the starter
  CPU and 1.5-7 s on a Tier 2 CPU.

## Sandbox and API

`runtime.ts` builds the iframe page (`srcdoc`): Fluent-dark base CSS, the runtime that defines `window.xea`, and the
app code wrapped in an async function. The iframe has `sandbox="allow-scripts"` only, so it has an opaque origin: no
access to the game's DOM, storage or cookies, no popups, no top navigation.

Calls are `{ __xea: 1, id, method, args }` posted to the parent; the host checks `event.source` is its own iframe and
replies `{ __xea: 1, id, result | error }`. Methods: `window.setTitle`, `window.close`, `storage.get/set/remove/keys`
(values are JSON strings, 256 KB per app, kept in `InstalledApp.storage`), `fs.list/read/write/mkdir/remove/exists`
(paths resolved under `<dir>/data`, `..` rejected, 1 MB per file, disk capacity checked by the store), `notify`
(rate-limited to one per 1.5 s), `player` (name, level, balance, heat: read-only), `log`, and `error` (uncaught
errors, shown as a strip at the bottom of the window).

The iframe swallows clicks, so the host focuses its window when the iframe takes focus (window `blur` +
`document.activeElement`). `body.dragging` disables pointer events on the iframe while a window is dragged.

## Save

`SAVE_VERSION` is 4. `GameState` gained `apps: InstalledApp[]` and `software: string[]`; older saves get both as
empty arrays from `newGame()` defaults in `migrate()`.

## Adding a Xea Soft item

1. Put the `.xjs` in `app/src/game/appsdk/examples/`.
2. Add it to `SOFT_ITEMS` in `catalog.ts` (id, file, category, price, author, `?raw` import).
3. Add `soft.item.<id>.name` and `soft.item.<id>.blurb` to `i18n/en/appsdk.ts`.
