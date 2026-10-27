import { useSettings } from "./settingsStore";

// Synthesized UI sounds (GDD 8) via Web Audio — no asset files. Honors the Sound setting.

let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Resume audio on a user gesture (e.g. the sign-in click) so later sounds are allowed to play. */
export function unlockAudio() {
  audio();
}

interface Note {
  f: number;
  t: number;
  d: number;
  type?: OscillatorType;
  g?: number;
}

const SOUNDS: Record<string, Note[]> = {
  click: [{ f: 520, t: 0, d: 0.03, g: 0.03 }],
  notify: [
    { f: 660, t: 0, d: 0.08 },
    { f: 880, t: 0.08, d: 0.1 },
  ],
  delivery: [
    { f: 523, t: 0, d: 0.09 },
    { f: 659, t: 0.09, d: 0.09 },
    { f: 784, t: 0.18, d: 0.14 },
  ],
  error: [{ f: 180, t: 0, d: 0.18, type: "sawtooth", g: 0.05 }],
  success: [
    { f: 784, t: 0, d: 0.1 },
    { f: 1047, t: 0.1, d: 0.16 },
  ],
  boot: [
    { f: 392, t: 0, d: 0.16 },
    { f: 523, t: 0.14, d: 0.16 },
    { f: 784, t: 0.28, d: 0.26 },
  ],
};

export type SoundName = keyof typeof SOUNDS;

export function playSound(name: SoundName) {
  if (!useSettings.getState().sound) return;
  const c = audio();
  if (!c) return;
  const now = c.currentTime;
  for (const n of SOUNDS[name]) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = n.type ?? "sine";
    osc.frequency.value = n.f;
    const peak = n.g ?? 0.04;
    gain.gain.setValueAtTime(0, now + n.t);
    gain.gain.linearRampToValueAtTime(peak, now + n.t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d);
    osc.connect(gain).connect(c.destination);
    osc.start(now + n.t);
    osc.stop(now + n.t + n.d + 0.02);
  }
}
