# Polish & release (Phase 8)

## Sound — `os/sound.ts`

UI sounds are synthesized with the Web Audio API (no asset files): `click`, `notify`, `delivery`, `error`, `success`, `boot`. `playSound(name)` honors the Sound setting and is a no-op when off. The AudioContext is unlocked on the sign-in click (`unlockAudio`) so later sounds are allowed to play.

- A global click listener in `App.tsx` plays `click` for buttons and interactive rows.
- `notify()` plays `notify` by default (`sound: null` for silent, `sound: "delivery"` for deliveries).

## Animations

- Windows scale/fade in on open (`.window` `win-open` keyframes; maximized windows skip it). Toasts slide in. Reduce motion (Settings → Personalization) near-zeroes all of these via `base.css`.

## Boot & sign-in — `screens/BootScreen.tsx`, `SignInScreen.tsx`

`App.tsx` runs a three-phase flow each launch: **boot** (Xea logo + progress, ~2 s, click to skip) → **sign-in** (click or Enter) → **desktop**. The sign-in click also unlocks audio.

## Packaging — `app/package.json` `build`

- Version **1.0.0**.
- App icon: `app/build/icon.ico` (256→16 multi-size), generated from the Xea logo on a rounded dark tile. `app/build/icon-256.png` is the source.
- Targets: **portable** (`ByteCore-1.0.0-portable.exe`) and **NSIS installer** (`ByteCore-Setup-1.0.0.exe`, lets the user choose the install folder). Build both with `npm run dist` (output in `app/release/`, gitignored).
- `signAndEditExecutable` stays `false`: electron-builder's winCodeSign step needs symlink privileges that an ordinary Windows shell lacks. The builds are therefore unsigned. To sign, build from a shell with Developer Mode on (or elevated) and supply a certificate.

## Playtest

Smoke-tested each phase and the full loop end to end (contract → scan → crack → pull → sell → upgrade; Heat → warrant → bail/prison; scripts; progression stats). The packaged `.exe` boots to the desktop. Pacing tuning for the full Tier 1–4 curve remains open content work.

## Not done (optional)

- Steam / itch.io page and build (marked optional in `TASKS.md`).
