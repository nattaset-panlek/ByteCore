import { JOB } from "./balance";
import type { RigStats } from "./rig";
import type { Host, Job, JobKind } from "./types";

// Job durations from rig stats (GDD 3.1): CPU drives cracking, network drives scan / probe / pull.

/** A soft curve so upgrades always help but never trivialize everything. */
const ease = (x: number) => 1 / (1 + Math.log2(1 + Math.max(0, x)));

/** MB per second the rig can pull at, from its network card. */
export function pullThroughput(stats: RigStats): number {
  return Math.max(JOB.pullFloorMBs, (stats.netMbps / 8) * JOB.pullEfficiency);
}

export interface JobRequest {
  kind: JobKind;
  host?: Host;
  /** pull: size in MB */
  size?: number;
}

/** Expected duration in ms for a job, given the current rig. */
export function jobDuration(req: JobRequest, stats: RigStats): number {
  switch (req.kind) {
    case "scan":
      return Math.round(JOB.scanBaseMs * (0.5 + ease(stats.netMbps)));
    case "probe":
      return Math.round(JOB.probeBaseMs * (0.5 + ease(stats.netMbps)));
    case "crack": {
      const sec = req.host?.security ?? 1;
      const tier = req.host?.tier ?? 1;
      const cpu = Math.max(0.5, stats.cpu);
      return Math.max(JOB.crackMinMs, Math.round((sec * tier * JOB.crackK) / cpu));
    }
    case "pull":
    case "download":
      return Math.max(JOB.pullMinMs, Math.round(((req.size ?? 1) / pullThroughput(stats)) * 1000));
    case "compile":
      return JOB.pullMinMs;
  }
}

/** Rig load a job claims, for the Task Manager graphs (0..1). */
export function jobLoad(kind: JobKind): number {
  return kind === "crack" || kind === "compile" ? 0.8 : kind === "pull" || kind === "download" ? 0.5 : 0.3;
}

export function jobProgress(job: Job, now: number): number {
  const span = job.endsAt - job.startedAt;
  return span <= 0 ? 1 : Math.max(0, Math.min(1, (now - job.startedAt) / span));
}

export function jobDone(job: Job, now: number): boolean {
  return now >= job.endsAt;
}

/** Chance a crack succeeds, from CPU power vs the target's security and tier (0.6..0.97). */
export function crackChance(cpu: number, security: number, tier: number): number {
  const ratio = cpu / Math.max(1, security * tier);
  return Math.max(0.6, Math.min(0.97, 0.62 + ratio * 0.14));
}
