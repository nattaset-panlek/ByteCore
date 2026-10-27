# Progression & content (Phase 7)

How the game advances, and where the player-facing content lives.

## Character & progression data

The player's character and progression are one cohesive block in the save, so it persists and resets as a unit (`state.ts`):

```
player: {
  name, level, xp,
  stats: { cracks, pulls, dataSold, contracts, arrests, peakHeat }  // lifetime counters
}
```

Everything else in `GameState` is in-world state (rig, net, orders, files, legal…). Per-device preferences (accent, motion, sound, tutorial-seen) live in `localStorage` via `os/settingsStore.ts`, not the save — so they survive a new identity, like the language.

## Levels, tiers and unlocks

- XP comes from cracks (`CRACK_XP × tier`), selling data (`value ÷ DATA_XP_DIVISOR`), and contract rewards. Next-level cost is `xpToNext(level)`.
- `TIER_UNLOCK_LEVEL` gates both the targets a scan reveals and the parts the shop sells: Tier 1 from level 1, Tier 2 from 3, Tier 3 from 6, Tier 4 from 10. Contracts follow the same gate.
- Reaching an unlock level fires a **"New tier unlocked"** toast (`gameNotifications.ts` → `UNLOCK_AT`) pointing at Contracts.
- Titles by level (GDD 4): Script Kiddie (1–2), Net Intruder (3–5), Ghost Operator (6–9), Cyber Sovereign (10+) — shown in Profile (`Profile.tsx` → `titleKey`).

## Balance (Tier 1–4)

Numbers live in `balance.ts` (+ `LOOT_BASE`/catalog). Verified by simulation and the gate checks:

- Crack odds scale so each tier needs roughly that tier's rig: e.g. a Tier 2 rig on a Tier 3 target is ~0.7, a Tier 3 rig gets it to ~0.95.
- Loot and contract rewards per tier (`LOOT_BASE` 150 / 800 / 4200 / 26000; `CONTRACT_REWARD` 220 / 1100 / 5600 / 32000) keep each tier at roughly 1–2 hosts per part and ~4 hosts per full rig.
- Delivery times and the XP curve lengthen with tier, so higher tiers are a real investment. Fine-tuning the full curve is ongoing content work.

## Profile app — `apps/Profile.tsx`

Avatar, name, level + title, XP bar, lifetime Activity stats, a Rig summary and an Account block (balance / debt), with links to Rig Manager and Settings.

## Settings app — `apps/SettingsApp.tsx`

Real controls over the Settings layout:

- **Language** — `useI18n` (any locale in `LOCALES`).
- **Accent color** — `os/settingsStore.ts` `ACCENTS` (Ice Blue / Neon Green / Cyber Purple / Amber); `applySettings` rewrites the `--accent*` CSS variables on the root.
- **Reduce motion** — toggles a root `data-reduce-motion` attribute that near-zeroes animations (`base.css`).
- **Sound** — a persisted toggle; audio itself arrives in Phase 8.
- **New game** — wipes the save (confirm dialog).

## First-run tutorial & lore

- `os/useTutorial.ts` shows a short sequence of guiding toasts on a genuinely fresh game, once per device (`tutorialSeen` in settings; a module guard survives React StrictMode).
- The starter drive (`vfs.ts` `starterDrive`) seeds `Documents/readme.txt`, `getting-started.txt` (every command), a `message-from-chimera.txt` story hook, and `Scripts/example.js`. Targets also carry their own lore files (`network.ts` `LORE`).
