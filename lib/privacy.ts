import type { RawGpxPoint } from '@/types/poster';
import { haversineMeters } from '@/lib/gpx-calculator';

export const PRIVACY_ZONE_METERS = 200;

/**
 * Drops the first and last `meters` of a track so a run that starts or ends
 * at home doesn't reveal the address (like Strava's privacy zones). Short
 * routes are trimmed proportionally so something is always left to draw.
 */
export function trimRouteEnds(points: RawGpxPoint[], meters: number = PRIVACY_ZONE_METERS): RawGpxPoint[] {
  if (points.length < 4) return points;
  const cumulative = [0];
  for (let i = 1; i < points.length; i++) {
    cumulative.push(cumulative[i - 1] + haversineMeters(points[i - 1], points[i]));
  }
  const total = cumulative[cumulative.length - 1];
  if (total <= 0) return points;
  const cut = Math.min(meters, total * 0.15);
  const kept = points.filter((_, i) => cumulative[i] >= cut && cumulative[i] <= total - cut);
  return kept.length >= 2 ? kept : points;
}
