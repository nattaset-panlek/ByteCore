# Hacking loop (Phase 4)

The mission → sell → upgrade loop. Abstract and fictional: the game's own commands and timed jobs, no real tools or techniques (`docs/phase4-scope.md`).

```
Contracts (accept) → Terminal: scan → probe → crack → connect → pull (before the trace runs out)
→ Core Exchange: sell the data → credits + XP → level up → higher tiers → better parts → faster jobs
```

## Network — `game/network.ts`

Targets are generated per tier from a seed (`makeHost(seed, tier)`), deterministic for a given seed. A `Host` has tier, security (1–10), ports, an admin level (Low / Medium / High = trace speed), and a small file system with lore `.txt/.log` and loot files under `/var/data`. Org names and addresses are fictional (`192.168.x.x` … `10.10.x.x` by tier). `scanTiers(level)` limits which tiers a scan can reveal (same unlock table as parts). `TRACE_PER_SEC` maps admin level to trace % per second.

## Jobs — `game/jobs.ts`, run in the loop

`scan / probe / crack / pull` are `Job`s that finish in the game loop, so they keep running while apps are closed and show in Task Manager. Durations come from rig stats:

| Job | Time |
| :-- | :-- |
| scan / probe | base, eased by network speed |
| crack | `security × tier × crackK ÷ cpu` (min 4 s). Success chance = `crackChance(cpu, security, tier)` (0.55–0.97); a fail adds Heat. |
| pull | `size ÷ throughput`, throughput from the network card (floor 0.8 MB/s). Fails if the disk is full. |

Constants are in `balance.ts` (`JOB`, `SCAN_COUNT`, `HEAT`, `CRACK_XP`). Module bonuses (below) fold into the stats used here.

## Session and trace — `game/loop.ts`

`connect` opens one `Session` (requires a cracked target). While connected, trace rises at the host's rate; at 100 the session is force-dropped and Heat spikes (`traced`). A `traceWarning` fires once at ~30 s left. `pull` works only in a session; `disconnect` closes it and cancels its transfers. Warrant / bail / prison are Phase 5.

## Terminal — `apps/terminal/`

Local shell and, while connected, a Remote session tab. `commands.ts` is the engine: instant commands (`help clear ls cd cat pwd jobs kill connect disconnect`) run synchronously; job commands (`scan probe crack pull`) start a job and the result prints when it finishes (via `jobComplete` events). Command names are English in every language; output uses the console colors and `ByteCore/Mono`.

## Chimera Kit — `apps/ChimeraKit.tsx`

The active session: target info, trace bar with the seconds-left countdown, transfer queue, the target's files with Pull, and Disconnect. Empty state when not connected. The 30 s warning shows a toast with Open Chimera Kit / Disconnect.

## Reward files and the exchange — `apps/browser/exchange.tsx`

`pull` saves loot files to `C:/loot` with their hash. `core://exchange` (Core Exchange, its own dark brand) lists loot on the drive and sells it: `sellData(paths)` gives credits + XP, records the hash in `soldHashes`, and every copy then shows ₵ 0 (GDD 3.4.1). Sold files stay readable. Tier 3+ data needs the matching level.

## Contracts — `game/contracts.ts`, `apps/Contracts.tsx`

Missions with a goal (`crack` / `pull` / `sell` N of Tier T+), a reward (credits + XP), and a status (available → active → completed → claimed). Accept one, and matching hacking actions advance it (`bumpContracts` in the store); claim it when complete. The available pool refills to `CONTRACT_POOL`, rolling higher tiers as the player levels up.

## Passive modules — `game/modules.ts`

`.dll` modules (GDD 3.2) drop occasionally from Tier 2+ cracks into `C:/tools`. Install up to `MODULE_SLOTS` (3) in Rig Manager → Modules for a flat bonus: crack speed, Heat reduction, or network speed. Bonuses fold into the job stats and `addHeat`.

## Task Manager — `apps/TaskManager.tsx`

Processes: running jobs (with CPU share, progress, End task) plus static background entries. Performance: CPU / Memory / Network / Disk graphs sampled each second, with the rig's capacity as the baseline.

## Balance (Tier 1–2)

Numbers live in `balance.ts` (and `LOOT_BASE` in `network.ts`). Current Tier 1–2 tuning, verified by simulation:

- **Unlock gates** (`TIER_UNLOCK_LEVEL`): Tier 1 from level 1, Tier 2 from level 3, Tier 3 from 6, Tier 4 from 10 — this gates both the targets a scan reveals and the parts the shop sells, so early game is Tier 1 only.
- **Crack odds** (`crackChance`): starter rig ~0.73 on a Tier 1 target, ~0.96 after the cheap `cpu-t1-b` (240), ~0.84 for a fresh Tier 2 rig on a Tier 2 target.
- **Loot**: ~273 credits per Tier 1 host after selling; a host gives ~66 XP (`CRACK_XP` 20 + data XP, `DATA_XP_DIVISOR` 6).
- **Arc**: ~6 Tier 1 host cycles (~15–20 min) reach level 3; by then the player can afford a full cheap Tier 2 rig (~2,700) and crack Tier 2 reliably.
- Contract rewards (`CONTRACT_REWARD`) and delivery times are set so contracts are a meaningful bonus without replacing the loot economy. Re-tune these constants in Phase 7 for the full Tier 1–4 curve.
