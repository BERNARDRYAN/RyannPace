import type { DistanceUnit, WorkoutMetrics } from '@/types/poster';
import { formatDuration } from '@/lib/format';
import { displayDistance, displayElevation, distanceLabel, elevationLabel } from '@/lib/units';

/** Font stacks backed by next/font variables set on <html> (see app/layout.tsx). */
export const MONO = 'var(--font-jetbrains-mono), ui-monospace, monospace';
export const SANS = 'var(--font-inter), ui-sans-serif, system-ui, sans-serif';
export const SERIF = 'var(--font-instrument-serif), ui-serif, Georgia, serif';

export interface MetricCell {
  /** Stable key, also used for HUD-style short labels. */
  key: 'distance' | 'time' | 'elevation' | 'heartRate' | 'energy';
  label: string;
  value: string;
  unit?: string;
  /** Relative column width in single-row layouts; durations like 1:23:45 need more room. */
  weight: number;
  /** 0–1 fill for gauge-style templates, relative to a typical upper bound. */
  ratio: number;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** The secondary stats every template shows: distance, time, elevation, then HR or energy. */
export function buildMetricCells(
  metrics: WorkoutMetrics,
  showHeartRate: boolean,
  units?: DistanceUnit
): MetricCell[] {
  const cells: MetricCell[] = [
    {
      key: 'distance',
      label: 'Distance',
      value: displayDistance(metrics.distanceKm, units).toFixed(2),
      unit: distanceLabel(units),
      weight: 1.1,
      ratio: clamp01(metrics.distanceKm / 42.195),
    },
    {
      key: 'time',
      label: 'Time',
      value: formatDuration(metrics.durationSeconds),
      weight: 1.3,
      ratio: clamp01(metrics.durationSeconds / (4 * 3600)),
    },
    {
      key: 'elevation',
      label: 'Elev. Gain',
      value: String(Math.round(displayElevation(metrics.elevationGainMeters, units))),
      unit: elevationLabel(units),
      weight: 0.9,
      ratio: clamp01(metrics.elevationGainMeters / 1000),
    },
  ];
  if (showHeartRate && metrics.heartRateAvg) {
    cells.push({
      key: 'heartRate',
      label: 'Avg HR',
      value: String(Math.round(metrics.heartRateAvg)),
      unit: 'bpm',
      weight: 0.9,
      ratio: clamp01((metrics.heartRateAvg - 60) / 140),
    });
  } else if (metrics.caloriesBurned) {
    cells.push({
      key: 'energy',
      label: 'Energy',
      value: String(Math.round(metrics.caloriesBurned)),
      unit: 'kcal',
      weight: 0.9,
      ratio: clamp01(metrics.caloriesBurned / 3000),
    });
  }
  return cells;
}

export function dayOfYear(iso: string): number {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 1;
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86_400_000);
}

/** e.g. RP-20261005-0975: date plus distance in hundredths of a km. */
export function serialFor(metrics: WorkoutMetrics): string {
  const d = new Date(metrics.date);
  const stamp = Number.isNaN(d.getTime())
    ? '00000000'
    : `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `RP-${stamp}-${String(Math.round(metrics.distanceKm * 100)).padStart(4, '0')}`;
}

/** Adds alpha to a #RRGGBB color: withAlpha('#00F0FF', 0.4) -> '#00F0FF66'. */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(clamp01(alpha) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}
