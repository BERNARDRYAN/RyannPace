import type { RawGpxPoint } from '@/types/poster';
import type { ParsedActivity } from '@/lib/activity-parsers';
import { computeTrackStats } from '@/lib/gpx-calculator';
import { downsamplePoints } from '@/lib/coordinate-normalizer';

/** One activity in a recap; routes are thinned since each is drawn small. */
export interface RecapRun {
  id: string;
  name: string;
  /** ISO start time, or null when the file has no timestamps. */
  date: string | null;
  distanceKm: number;
  movingSeconds: number;
  elevationGainMeters: number;
  points: RawGpxPoint[];
}

export interface RecapTotals {
  runs: number;
  distanceKm: number;
  movingSeconds: number;
  elevationGainMeters: number;
  /** Average pace in seconds per km across all runs. */
  paceSecondsPerKm: number;
  longest: RecapRun | null;
}

const RECAP_ROUTE_POINTS = 400;
export const MAX_RECAP_RUNS = 60;

export function toRecapRun(parsed: ParsedActivity, fallbackName: string): RecapRun | null {
  if (parsed.points.length < 2) return null;
  const stats = computeTrackStats(parsed.points);
  const summary = parsed.summary ?? {};
  const date = stats.startTime ?? (parsed.time && !Number.isNaN(Date.parse(parsed.time)) ? new Date(parsed.time).toISOString() : null);
  return {
    id: crypto.randomUUID(),
    name: parsed.name?.trim() || fallbackName,
    date,
    distanceKm: summary.distanceKm ?? stats.distanceKm,
    movingSeconds: summary.movingSeconds ?? stats.movingSeconds,
    elevationGainMeters: summary.elevationGainMeters ?? stats.elevationGainMeters,
    points: downsamplePoints(parsed.points, RECAP_ROUTE_POINTS),
  };
}

export function summarizeRuns(runs: RecapRun[]): RecapTotals {
  const distanceKm = runs.reduce((s, r) => s + r.distanceKm, 0);
  const movingSeconds = runs.reduce((s, r) => s + r.movingSeconds, 0);
  return {
    runs: runs.length,
    distanceKm,
    movingSeconds,
    elevationGainMeters: runs.reduce((s, r) => s + r.elevationGainMeters, 0),
    paceSecondsPerKm: distanceKm > 0 ? Math.round(movingSeconds / distanceKm) : 0,
    longest: runs.reduce<RecapRun | null>((best, r) => (!best || r.distanceKm > best.distanceKm ? r : best), null),
  };
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "October 2026", "2026", or "Mar – Oct 2026" depending on the runs' span. */
export function periodLabel(runs: RecapRun[]): string {
  const dates = runs
    .map((r) => (r.date ? new Date(r.date) : null))
    .filter((d): d is Date => !!d && !Number.isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  if (dates.length === 0) return 'My Runs';
  const first = dates[0];
  const last = dates[dates.length - 1];
  if (first.getFullYear() === last.getFullYear() && first.getMonth() === last.getMonth()) {
    return `${MONTHS[first.getMonth()]} ${first.getFullYear()}`;
  }
  if (first.getFullYear() === last.getFullYear()) {
    if (first.getMonth() === 0 && last.getMonth() === 11) return String(first.getFullYear());
    return `${MONTHS[first.getMonth()].slice(0, 3)} – ${MONTHS[last.getMonth()].slice(0, 3)} ${first.getFullYear()}`;
  }
  return `${first.getFullYear()} – ${last.getFullYear()}`;
}

/** 45296 -> "12h 34m" */
export function formatHoursMinutes(totalSeconds: number): string {
  const minutes = Math.round(totalSeconds / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

/** Picks the column count that gives the largest square cells for `count` items in a w×h box. */
export function bestGrid(count: number, width: number, height: number): { cols: number; rows: number; cell: number } {
  let best = { cols: 1, rows: Math.max(count, 1), cell: 0 };
  for (let cols = 1; cols <= Math.max(count, 1); cols++) {
    const rows = Math.ceil(count / cols);
    const cell = Math.min(width / cols, height / rows);
    if (cell > best.cell) best = { cols, rows, cell };
  }
  return best;
}

/** Twelve deterministic demo runs (a month of training) for the "try it" button. */
export function sampleRecapRuns(): RecapRun[] {
  const runs: RecapRun[] = [];
  const base = Date.UTC(2026, 9, 1, 22, 30);
  for (let i = 0; i < 12; i++) {
    const lat0 = 1.3 + (i % 4) * 0.02;
    const lon0 = 103.8 + Math.floor(i / 4) * 0.03;
    const size = 0.006 + (i % 5) * 0.0025;
    const lobes = 2 + (i % 4);
    const twist = i * 0.9;
    const sweep = i % 3 === 0 ? 0.8 : 1;
    const points: RawGpxPoint[] = Array.from({ length: 161 }, (_, k) => {
      const a = (k / 160) * Math.PI * 2 * sweep;
      const r = size * (1 + 0.28 * Math.sin(lobes * a + twist) + 0.1 * Math.cos((lobes + 2) * a));
      return { lat: lat0 + r * Math.sin(a), lon: lon0 + r * 1.2 * Math.cos(a + twist * 0.15), ele: 20 + 10 * Math.sin(3 * a + i) };
    });
    const distanceKm = Number((5 + ((i * 7) % 11) + (i === 9 ? 10 : 0)).toFixed(1));
    const pace = 270 + ((i * 13) % 40);
    runs.push({
      id: `sample-${i}`,
      name: i === 9 ? 'Half Marathon' : ['Easy Run', 'Tempo', 'Intervals', 'Recovery', 'Long Run'][i % 5],
      date: new Date(base + i * 2.5 * 86_400_000).toISOString(),
      distanceKm,
      movingSeconds: Math.round(distanceKm * pace),
      elevationGainMeters: 30 + ((i * 17) % 90),
      points,
    });
  }
  return runs;
}
