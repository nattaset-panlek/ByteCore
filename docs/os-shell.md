# Xea OS shell (`app/src/os`)

The desktop, windows, taskbar, Start menu and toasts. Styles are in `os/os.css`.
Visual rules follow `tools/figma-build/STYLE_NOTES.md`: windows #1F1F1F, 1px `--stroke-surface`, radius 8, no shadows.

## App registry — `os/apps.ts`, `apps/index.tsx`

`APPS` holds metadata per `AppId`: name, icon, default size, `chrome` and `multiInstance`.

- `chrome: "titlebar"`: the shell draws the TitleBar.
- `chrome: "custom"`: the app draws its own header (`TabRow`, or `TitleBar` with a back button).

`APP_COMPONENTS` in `apps/index.tsx` maps each `AppId` to its component. To add an app: add the id to `AppId`,
an entry in `APPS` and `APP_ORDER`, and a component in `APP_COMPONENTS`.

`DESKTOP_APPS` and `PINNED_APPS` set the desktop shortcut column and the pinned taskbar apps (same order as the Figma desktop).

## Window manager — `os/windowStore.ts`

zustand store `useWindows`:

| Action | Notes |
| :-- | :-- |
| `open(appId, args?)` | Single-instance apps focus their existing window (and get the new args). New windows are centered with a cascade offset. Returns the window id. See [apps.md](apps.md#launch-arguments). |
| `focus(id)` | Brings to the front (z-order) and restores if minimized |
| `setRect(id, rect)` | Move / resize |
| `minimize(id)`, `toggleMaximize(id)`, `close(id)` | |
| `activateApp(appId)` | Taskbar click: open if none, minimize if it is the active window, otherwise focus |

`activeWindow(windows)` returns the focused window (highest z that is not minimized).

## Window frame — `os/Window.tsx`

- `Window`: frame, drag, 8 resize handles (min 360x220), maximized fills the screen above the taskbar.
  Each window wraps its app in an error boundary, so a crashing app does not take down the desktop.
- `useWindow()`: `{ win, dragStart }` inside any window content.
- `TitleBar({ title?, onBack? })`: 32px, app icon 16 + title + caption buttons. Double-click maximizes.
  The height comes from the Figma audit (32px); change `.titlebar` in `os.css` if this changes.
- `TabRow({ onNewTab })` with `TabViewItem` children: 44px tab row; empty space drags the window.
- `CaptionButtons`: minimize, maximize/restore, close (red `--close-hover`).
- `SettingsLayout({ nav, title })`: 320px nav column + page with padding 12/56/24/40.

## Desktop, taskbar, Start

- `Desktop.tsx`: shortcuts in a column at the top left. Click selects, double-click or Enter opens.
- `Taskbar.tsx` (48px, `--bg-taskbar`):
  - left: wallet widget (balance and income per hour from the game store); a click opens Wallet
  - center: Start, search pill, pinned and running apps (gray dot = running, accent bar = active)
  - right: Heat meter (game store), wifi/speaker, clock and date
- `StartMenu.tsx`: search (Enter launches the first match), app grid, user (opens Profile), power menu with Restart and Shut down.
  It closes on Escape or a click outside.
- `shellStore.ts`: Start menu state and `shutDown()`. Shut down saves the game, then calls `window.host?.quit()`.
  In a plain browser it shows a black "power on" screen instead.

## Toasts — `os/toasts.ts`, `os/ToastStack.tsx`

```ts
import { notify, dismissToast } from "../os/toasts";

const id = notify({
  appId: "rigManager",           // sets icon + app name (or pass icon / app)
  title: "Package delivered",
  message: "Placeholder text.",
  actions: [{ label: "Open Rig Manager", onClick: () => open("rigManager") }, { label: "Dismiss" }],
  duration: 6000,                // ms; 0 = stays until dismissed
});
```

Bottom right above the taskbar, at most 4 visible, up to 2 action buttons, hover pauses auto dismiss.

`os/gameNotifications.ts` turns game events into toasts (`orderDelivered`, `levelUp`, `heatMax`, `interestCharged`).

## Context menus — `os/contextMenu.ts`, `os/ContextMenuHost.tsx`

Right-click works across the OS. Components call `openContextMenu(e, items)` from `onContextMenu` (items: `{ label, icon, onClick, danger, disabled }`, `separator` for a divider); `ContextMenuHost` renders the menu at the cursor, clamped to the screen, and closes on outside click or Escape.

- Desktop (Refresh, open apps, Personalize), desktop icons and Start tiles (Open)
- Taskbar buttons (open, New window, Close) and empty taskbar (Task Manager, Taskbar settings)
- Any spot inside a window falls back to a window menu (Minimize, Maximize/Restore, Close)
- App-specific menus: File Explorer (items and empty space), Terminal (New tab, Copy all output, Clear), Task Manager rows (Switch to, End task)
- The browser's own menu is suppressed everywhere except text fields, which keep native copy/paste.
