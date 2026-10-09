import type { RawGpxPoint, WorkoutMetrics } from '@/types/poster';
import type { PosterRecipe } from '@/types/gallery';
import { sanitizePosterConfig } from '@/lib/preset-validation';

export const MAX_RECIPE_POINTS = 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function num(value: unknown, min: number, max: number): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : null;
}

function optionalNum(value: unknown, min: number, max: number): number | undefined | null {
  if (value === undefined || value === null) return undefined;
  return num(value, min, max);
}

function str(value: unknown, maxLength: number): string | null {
  return typeof value === 'string' && value.length <= maxLength ? value : null;
}

/** Optional list of split times (seconds); null means present but malformed. */
function splitList(value: unknown): number[] | undefined | null {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || value.length > 200) return null;
  return value.every((n) => typeof n === 'number' && Number.isFinite(n) && n > 0 && n < 24 * 3600) ? value : null;
}

function sanitizeMetrics(value: unknown): WorkoutMetrics | null {
  if (!isRecord(value)) return null;
  const distanceKm = num(value.distanceKm, 0, 1000);
  const durationSeconds = num(value.durationSeconds, 0, 7 * 24 * 3600);
  const paceMinutes = num(value.paceMinutes, 0, 999);
  const paceSeconds = num(value.paceSeconds, 0, 59);
  const elevationGainMeters = num(value.elevationGainMeters, 0, 20000);
  const heartRateAvg = optionalNum(value.heartRateAvg, 20, 250);
  const caloriesBurned = optionalNum(value.caloriesBurned, 0, 20000);
  const date = str(value.date, 40);
  const locationName = str(value.locationName, 64);
  const activityTitle = str(value.activityTitle, 80);
  const gearBrand = value.gearBrand === undefined ? undefined : str(value.gearBrand, 60);
  const splitsKm = splitList(value.splitsKm);
  const splitsMi = splitList(value.splitsMi);

  if (
    distanceKm === null ||
    durationSeconds === null ||
    paceMinutes === null ||
    paceSeconds === null ||
    elevationGainMeters === null ||
    heartRateAvg === null ||
    caloriesBurned === null ||
    date === null ||
    Number.isNaN(Date.parse(date)) ||
    locationName === null ||
    activityTitle === null ||
    gearBrand === null ||
    splitsKm === null ||
    splitsMi === null
  ) {
    return null;
  }

  return {
    distanceKm,
    durationSeconds,
    paceMinutes,
    paceSeconds,
    elevationGainMeters,
    ...(heartRateAvg !== undefined ? { heartRateAvg } : {}),
    ...(caloriesBurned !== undefined ? { caloriesBurned } : {}),
    date,
    locationName,
    activityTitle,
    ...(gearBrand ? { gearBrand } : {}),
    ...(splitsKm ? { splitsKm } : {}),
    ...(splitsMi ? { splitsMi } : {}),
  };
}

function sanitizeRoute(value: unknown): RawGpxPoint[] | null {
  if (!Array.isArray(value) || value.length > MAX_RECIPE_POINTS) return null;
  const points: RawGpxPoint[] = [];
  for (const raw of value) {
    if (!isRecord(raw)) return null;
    const lat = num(raw.lat, -90, 90);
    const lon = num(raw.lon, -180, 180);
    const ele = optionalNum(raw.ele, -500, 9000);
    if (lat === null || lon === null || ele === null) return null;
    points.push(ele === undefined ? { lat, lon } : { lat, lon, ele });
  }
  return points;
}

/**
 * Validates an untrusted gallery recipe and returns a clean copy containing
 * only known fields, or null if anything is malformed.
 */
export function sanitizeRecipe(value: unknown): PosterRecipe | null {
  if (!isRecord(value) || value.version !== 1) return null;
  const metrics = sanitizeMetrics(value.metrics);
  const config = sanitizePosterConfig(value.config);
  const route = sanitizeRoute(value.route);
  if (!metrics || !config || !route) return null;
  return { version: 1, metrics, config, route };
}
