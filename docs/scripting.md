# Script Editor & scripting runtime (Phase 6)

Players write JavaScript that automates the game (GDD 3.3). Scripts run in a **Web Worker**, so an infinite loop can't freeze the game — Stop just terminates the worker.

## How it runs

```
ScriptEditor (UI) → host.runScript(code) → Web Worker (player code + ByteCore SDK)
     ↑ console / done                           │ RPC: { method, args }
     └──────────── host bridge ◄────────────────┘ → safe store action → reply
```

- `game/scripting/worker.ts` — the worker. It builds the player code with `new Function` inside an async wrapper and exposes a `ByteCore` SDK whose every method just posts an RPC message to the main thread and awaits the reply. `console.*` and `ByteCore.logger.*` post log lines.
- `game/scripting/host.ts` — the main-thread bridge. `runScript(code, { onLog, onDone })` spins up the worker (imported inline via `./worker.ts?worker&inline`, so it bundles into one blob that works under `file://` in Electron), maps each RPC to a store action, and returns a `{ stop }` handle. Job-based calls (`scan/probe/crack/pull`) resolve when the matching `jobComplete` event fires in the game loop.
- `game/scripting/protocol.ts` — the message types and the API method list.

The SDK can only do what the store already exposes, so scripts can't reach past the game's own rules (disk limits, crack odds, Heat, etc. all still apply).

## The ByteCore API (all async)

| Call | Returns |
| :-- | :-- |
| `ByteCore.player()` | `{ level, xp, balance, heat, stats: { cpu, ramGB, netMbps, diskGB } }` |
| `ByteCore.net.scan()` | `[{ ip, name, org, tier }]` (resolves when the scan finishes) |
| `ByteCore.net.targets()` | known hosts so far |
| `ByteCore.net.probe(ip)` | host info |
| `ByteCore.net.crack(ip)` | `{ ok }` when the crack job finishes |
| `ByteCore.connect(ip)` / `ByteCore.disconnect()` | open / close the remote session |
| `ByteCore.pull(remotePath, destDir?)` | `{ dest, size }` when the transfer finishes |
| `ByteCore.fs.ls(path)` / `read(path)` / `write(path, content)` | list / read / write the VFS |
| `ByteCore.loot()` | loot files on the drive with value + sold status |
| `ByteCore.sellData(paths)` | sell loot on Core Exchange |
| `ByteCore.scrubHeat()` | spend credits to lower Heat |
| `ByteCore.sleep(ms)` | pause (max 60 s) |
| `ByteCore.logger.info/warn/error(...)` | print to the console panel |

A failing action rejects the promise with the game's own error message, so `try/catch` works. The default buffer (`apps/scriptEditor/sample.ts`) is a full scan → crack → loot automation.

## The editor — `apps/scriptEditor/ScriptEditor.tsx`

- Syntax colors via a small tokenizer (`highlight.ts`): a transparent `<textarea>` over a highlighted `<pre>`, with a synced line-number gutter.
- Tabs for multiple open files, a file list of `C:/Scripts/*.js`, a console panel and a status bar (line/col, char count, run state).
- **Run** (Ctrl+Enter) / **Stop**, **Save** (Ctrl+S, to `C:/Scripts/*.js` in the VFS), **Import** (paste or drop a `.js` file), **New**.
- Scripts are stored in the VFS like any other file, so they count against disk capacity and are saved with the game.

Launch arg `path` opens that script (e.g. from File Explorer later).
