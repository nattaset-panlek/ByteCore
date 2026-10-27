# Risk and consequences (Phase 5)

Heat → warrant → bail/debt → prison (GDD 3.6). State lives in `GameState.legal` (`free | warrant | prison`); constants in `balance.ts`.

## Heat

Gained from risky play (Phase 4): failed cracks, being traced, each pull (`HEAT` in `balance.ts`). Reduced by:

- **Decay** — `HEAT_DECAY_PER_MIN` while free (passive, careful play).
- **Disconnecting before the trace completes** — avoids the `traced` spike.
- **Scrub logs** — `scrubHeat()` removes `SCRUB_CHUNK` (20) Heat for `SCRUB_CHUNK × SCRUB_COST_PER_POINT` credits. In the UI it's the Heat meter on the taskbar: click it for the scrub flyout.

## Warrant (`legal.state === "warrant"`)

When Heat reaches 100 while free, the game enters a warrant: any session and jobs are dropped and the desktop is replaced by `screens/WarrantScreen.tsx`. Bail = `bailAmount(g)` = `BAIL.base + level × BAIL.perLevel + soldHashes.length × BAIL.perHash`.

Choices:

- **Pay bail (cash)** — `payBail(false)`; needs the balance. Clears the record, Heat → 0.
- **Take a loan** — `payBail(true)`; adds bail to `wallet.debt` if it stays under `DEBT_LIMIT`. Daily interest (`DEBT_DAILY_INTEREST`) already runs in the loop.
- **Surrender** — `surrender()` → prison. The only option left when neither cash nor a loan can cover bail (insolvency, GDD 3.6.2).

## Prison (`legal.state === "prison"`)

`screens/PrisonScreen.tsx` is the inmate workstation: a sentence countdown (`until`, `PRISON_BASE_MS`) and four options (GDD 3.6.3):

1. **Process paperwork** — a records-review mini-game. Each correct sheet (`paperwork(true)`) cuts `PAPERWORK_REDUCTION_MS` (30 s); a wrong one adds `PAPERWORK_PENALTY_MS`.
2. **Serve your time** — wait out the countdown; the loop releases at `now ≥ until` (`released` event → `free`, Heat 0).
3. **Jailbreak hack** — a one-shot memory puzzle under `JAILBREAK_TIME_MS`. Success (`attemptJailbreak(true)`) frees you with a reputation XP bonus; failure doubles the remaining sentence and locks the workstation (`jailbreakUsed` + `jailbreakLocked`). Once per sentence.
4. **New identity** — `newIdentity()` wipes the save and starts a fresh game from level 1.

The game loop keeps running under both screens (it's a `setInterval`, independent of the mounted components), so the sentence counts down and debt interest accrues while locked.
