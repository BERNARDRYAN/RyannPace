import type { DistanceUnit, RawGpxPoint, WorkoutMetrics } from '@/types/poster';
import { haversineMeters } from '@/lib/gpx-calculator';
import { KM_PER_MILE } from '@/lib/units';

/** Final partial splits shorter than this fraction of a unit are dropped as noise. */
const MIN_PARTIAL = 0.3;
const MAX_SPLITS = 200;

/**
 * Seconds per unit for each full km (or mile) of the run, plus a final partial
 * split normalized to a full unit. Needs timestamps; returns [] without them.
 * Uses moving time only, so stops at lights don't create fake slow splits.
 */
export function computeSplits(points: RawGpxPoint[], unitMeters: number): number[] {
  const timed = points.filter((p) => p.time && !Number.isNaN(Date.parse(p.time)));
  if (timed.length < 2 || timed.length < points.length * 0.5) return [];

  const splits: number[] = [];
  let distInSplit = 0;
  let timeInSplit = 0;
  for (let i = 1; i < timed.length && splits.length < MAX_SPLITS; i++) {
    const d = haversineMeters(timed[i - 1], timed[i]);
    const dt = (Date.parse(timed[i].time!) - Date.parse(timed[i - 1].time!)) / 1000;
    if (dt <= 0 || d / dt < 0.5) continue; // standing still
    distInSplit += d;
    timeInSplit += dt;
    while (distInSplit >= unitMeters && splits.length < MAX_SPLITS) {
      // Attribute time proportionally to the part of this segment inside the split.
      const overflow = distInSplit - unitMeters;
      const overflowTime = d > 0 ? dt * (overflow / d) : 0;
      splits.push(Math.round(timeInSplit - overflowTime));
      distInSplit = overflow;
      timeInSplit = overflowTime;
    }
  }
  if (distInSplit >= unitMeters * MIN_PARTIAL && timeInSplit > 0) {
    splits.push(Math.round(timeInSplit * (unitMeters / distInSplit)));
  }
  return splits.filter((s) => s > 0);
}

export function computeAllSplits(points: RawGpxPoint[]): Pick<WorkoutMetrics, 'splitsKm' | 'splitsMi'> {
  const splitsKm = computeSplits(points, 1000);
  if (splitsKm.length === 0) return { splitsKm: undefined, splitsMi: undefined };
  return { splitsKm, splitsMi: computeSplits(points, KM_PER_MILE * 1000) };
}

export function splitsFor(metrics: WorkoutMetrics, units?: DistanceUnit): number[] {
  return (units === 'mi' ? metrics.splitsMi : metrics.splitsKm) ?? [];
}
