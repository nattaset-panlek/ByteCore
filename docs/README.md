# ByteCore technical docs

How the code in `app/` is built. Game rules live in [`GDD.md`](../GDD.md), the task checklist in [`TASKS.md`](../TASKS.md),
Figma conventions in [`tools/figma-build/STYLE_NOTES.md`](../tools/figma-build/STYLE_NOTES.md).

| Doc | Covers |
| :-- | :-- |
| [setup.md](setup.md) | Scripts, folder layout, Electron, packaging |
| [os-shell.md](os-shell.md) | Xea OS shell: windows, desktop, taskbar, Start, toasts, app registry |
| [ui-components.md](ui-components.md) | Fluent UI kit in `app/src/ui` |
| [game-systems.md](game-systems.md) | Game store, 1s loop, parts and rig, VFS, save/load |
| [apps.md](apps.md) | App windows: Browser and shop site, Rig Manager, Rig Stock, Wallet, File Explorer |
| [phase4-scope.md](phase4-scope.md) | Phase 4 plan: decisions, commands, network, trace, Chimera Kit, exchange, Contracts, localization |
| [hacking.md](hacking.md) | Phase 4 systems: network, jobs, Terminal, trace, Chimera Kit, exchange, Contracts, modules, Task Manager |
| [i18n.md](i18n.md) | Localization: t(), fmt, dictionaries, adding a language |

Keep these docs up to date when a system changes.
