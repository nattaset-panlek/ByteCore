// Overclock (docs/gameplay-ideas.md §5): CPU and network clocks past stock make jobs faster but heat
// the rig (Temp, separate from legal Heat). The cooler part sets the safe ceiling.

export const OC_STEPS = [0, 0.1, 0.2, 0.35] as const;
export type OcStep = 0 | 1 | 2 | 3;
export type TuneProfile = "quiet" | "balanced" | "burst";
export const PROFILES: Record<TuneProfile, { cpu: OcStep; net: OcStep }> = {
  quiet: { cpu: 0, net: 0 },
  balanced: { cpu: 1, net: 1 },
  burst: { cpu: 3, net: 2 },
};

export interface Tuning {
  cpu: OcStep;
  net: OcStep;
  /** °C */
  temp: number;
  /** One sample per tick, newest last (Task Manager graph, Tuning page) */
  history: number[];
  /** The CPU is off after a Critical event until this time */
  shutdownUntil?: number;
  /** Currently throttled (Hot zone) */
  throttled?: boolean;
}

export const AMBIENT = 34;
const HISTORY = 60;
/** Throttle slows jobs by this share in the Hot zone. */
export const THROTTLE = 0.3;
export const SHUTDOWN_MS = 60_000;
export const SHUTDOWN_WEAR = 3;
/** Condition lost per minute while overclocked in the Warm zone or hotter. */
export const WEAR_PER_MIN = 0.5;

export const newTuning = (): Tuning => ({ cpu: 0, net: 0, temp: AMBIENT, history: [] });

export type Zone = "cool" | "warm" | "hot" | "critical";
/** Zones relative to the safe ceiling (80 °C on an air cooler: Cool < 60 · Warm 60–80 · Hot 80–95 · Critical 95+). */
export function zone(temp: number, ceiling: number): Zone {
  return temp >= ceiling + 15 ? "critical" : temp >= ceiling ? "hot" : temp >= ceiling - 20 ? "warm" : "cool";
}

export const profileOf = (t: Tuning): TuneProfile | null =>
  (Object.keys(PROFILES) as TuneProfile[]).find((p) => PROFILES[p].cpu === t.cpu && PROFILES[p].net === t.net) ?? null;

/** Temperature the rig settles at for a job load (0..1) and the clocks. */
export function targetTemp(load: number, t: Pick<Tuning, "cpu" | "net">): number {
  const oc = Math.max(OC_STEPS[t.cpu], OC_STEPS[t.net] * 0.7);
  return AMBIENT + Math.min(1, load) * (30 + 110 * oc);
}

/** Temp after dt ms, easing toward the target (about 20 s to get most of the way). */
export function stepTemp(temp: number, target: number, dt: number): number {
  return temp + (target - temp) * (1 - Math.exp(-dt / 20_000));
}

export function pushHistory(h: number[], temp: number): number[] {
  const next = [...h, Math.round(temp * 10) / 10];
  return next.length > HISTORY ? next.slice(next.length - HISTORY) : next;
}

/** Job speed factor from the clocks (applied when a job starts). */
export const cpuBoost = (t: Tuning | undefined) => 1 + OC_STEPS[t?.cpu ?? 0];
export const netBoost = (t: Tuning | undefined) => 1 + OC_STEPS[t?.net ?? 0];
