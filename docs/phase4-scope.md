# Phase 4 scope: core gameplay

Decided on 27 Oct 2026. This doc is the plan; once a part is built, its details move to `game-systems.md` / `apps.md`.

## Decisions

| Topic | Decision |
| :-- | :-- |
| How hacking works | The game's own fictional commands plus timed jobs. Job speed comes from rig stats (CPU, network, disk). No real-world tool syntax or techniques. |
| Chimera Kit | Remote session toolkit: the GUI for the active connection (target info, transfers, trace countdown, Disconnect). |
| Contracts / Chimera Kit screens | Coded directly from the UI kit and STYLE_NOTES. Figma is updated to match afterwards. |
| Language | English only for now, but every string goes through a localization layer so Thai (or others) can be added later without touching screens. |

## The loop

```
Contracts (pick a job) → Terminal: scan → probe → crack (timer) → connect
→ pull files (timer, uses disk space) → disconnect before the trace runs out
→ Browser: sell the files on the data exchange → credits + XP
→ level up → higher tiers unlock → order better parts → faster jobs
```

## 1. Localization layer (first, so all new text uses it)

- `app/src/i18n/`: `t(key, vars?)`, a `useT()` hook, `en.ts` dictionary, locale setting saved in `GameState` (or app settings).
- Keys grouped by area: `shell.*`, `apps.wallet.*`, `terminal.*`...; variables like `t("rig.arrivesIn", { time })`.
- Numbers, dates and currency through one formatter (`Intl`) that follows the locale.
- Phase 4 screens use it from the start. Existing screens (Phase 1–3) are migrated as one task in this phase.
- Terminal command names stay English in every language (they are the game's syntax); their help text is translated.

## 2. Simulated network (`game/network.ts`)

- Targets are generated per tier from a seed (fictional org names, private-range style addresses like `10.0.x.x`), using the existing `Host` type.
- Each host: tier, security 1–10, ports, admin level (Low / Medium / High = trace speed), a small file system with lore `.txt/.log` and loot files.
- Loot files carry `loot { hash, value, tier, source }`. Copies keep the hash (already supported by the VFS).
- New targets appear over time and after contracts; tiers above the player's unlock level are hidden.

## 3. Terminal app (Local shell / Remote session tabs)

Commands (fictional, game-only):

| Command | Effect |
| :-- | :-- |
| `help [cmd]` | List commands / show usage |
| `clear`, `ls`, `cd`, `cat`, `pwd` | Local VFS (and the remote file system when connected) |
| `scan` | Job: finds targets of unlocked tiers. Time from network speed. |
| `probe <addr>` | Job: reveals security level, ports, admin level |
| `crack <addr>` | Job: time = security × tier factor ÷ CPU power. Must finish before connecting. |
| `connect <addr>` / `disconnect` | Opens / closes the remote session (prompt changes, Chimera Kit shows it) |
| `pull <remote path> [local dir]` | Job: time = size ÷ network speed. Fails without free disk space. Default destination `C:/loot`. |
| `jobs`, `kill <id>` | List / stop running jobs |

- Jobs run in the game loop (`Proc` type), so they continue while the Terminal is closed and appear in Task Manager.
- Output styling uses the console colors in `tokens.css` and `ByteCore/Mono`.

## 4. Trace and Heat (minimal in Phase 4)

- While connected, a trace countdown runs (speed from the host's admin level). Disconnect before 0 to stay clean.
- Trace reaching 0: forced disconnect and Heat gain. Failed or cancelled cracks add a little Heat.
- Warrant, bail, debt and prison stay in Phase 5.

## 5. Chimera Kit app

- Shows the current session: target, tier, admin level, trace countdown bar, transfer queue with progress, Disconnect.
- Toast at 30 seconds left: "Finish transfers and disconnect" with Open Chimera Kit (as in the Figma desktop screen).
- No session: a short empty state that points to the Terminal.

## 6. Data exchange site (Browser)

- New site `core://exchange`, its own brand (separate web tokens, like Core Market).
- Lists loot files found on the player's drive, with value by tier. Batch sell.
- On sale: credits + XP, the hash goes to `soldHashes`, and every copy shows ₵ 0 (GDD 3.4.1). Sold files stay readable.
- Tier 3+ data needs the matching level (same unlock table as parts).

## 7. Contracts app

- List of available contracts with clear goals, for example "Pull 2 database files from a Tier 1 retail target" or "Stay connected 60 s without being traced".
- Each shows tier, reward (credits + XP), time limit if any. Accept → tracked progress → Claim.
- New contracts refresh over time; higher tiers appear with level.

## 8. Task Manager

- Processes: running jobs with CPU share, progress, stop button.
- Performance: CPU / RAM / Network / Disk graphs from the last 60 s of jobs (rig stats set the 100% line).

## Order of work

1. Localization layer + migrate existing screens
2. Network generation + job system in the game loop
3. Terminal app
4. Chimera Kit + trace
5. Data exchange site
6. Contracts app
7. Task Manager
8. Balance pass for Tier 1–2 so the full loop is playable

**Done when:** mission → sell → upgrade → harder mission works end to end.
