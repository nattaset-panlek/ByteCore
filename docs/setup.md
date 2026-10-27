# Setup, layout and packaging

Stack: Vite + React 18 + TypeScript + zustand, packaged with Electron. Everything lives in `app/`.

## Scripts (run in `app/`)

| Command | What it does |
| :-- | :-- |
| `npm run dev` | Vite dev server on http://localhost:5173 (browser) |
| `npm run electron:dev` | Vite + an Electron window that loads the dev server |
| `npm run build` | Type check and build to `app/dist/` |
| `npm run dist` | Build, then a portable Windows exe in `app/release/` |
| `npx tsc --noEmit` | Type check only |

The repo root `.claude/launch.json` has an `xea-dev` config for the Claude Browser pane.

## Folder layout (`app/src`)

| Folder | Contents |
| :-- | :-- |
| `game/` | Game state and rules. No React, no OS imports. |
| `os/` | Xea OS shell: window manager, desktop, taskbar, Start, toasts, app registry |
| `ui/` | Fluent UI components (Figma 02 Components) |
| `apps/` | App window contents (placeholders until each app's phase) |
| `screens/` | Full-screen states: desktop now; boot, sign-in, prison later |
| `styles/` | `tokens.css` (Figma variables), `base.css` |
| `assets/icons/` | 52 PNG icons exported from Figma; use `iconUrl("app/Terminal")` or `<Icon name=... />` |

Layering: `game` ← `os` / `apps` ← `screens`. The game layer talks to the UI only through events (`game/events.ts`).

## Electron

- `electron/main.cjs`: one window (1600x900, min 1280x720). Loads `VITE_DEV_SERVER_URL` in dev, `dist/index.html` when packaged.
- `electron/preload.cjs` exposes `window.host` (`quit`, `toggleFullscreen`). It is undefined in a plain browser, so always use `window.host?.`.
- Saves use IndexedDB inside Electron's user data folder (`%APPDATA%/ByteCore`).

## Packaging notes

- `npm run dist` makes `release/ByteCore <version>.exe` (portable, about 78 MB).
- `build.win.signAndEditExecutable` is `false`. electron-builder's winCodeSign archive needs symlink rights to unpack,
  which a normal Windows shell does not have. Side effect: the exe is unsigned and has the default Electron icon.
  To add the app icon and version info (Phase 8), turn it back on and build from a shell with Developer Mode enabled or as administrator.
- Fonts: Inter is bundled through `@fontsource/inter` (400, 600). Fallbacks are Segoe UI and Cascadia Mono / Consolas (`tokens.css`).
