import type { CoordinatePoint, RawGpxPoint } from '@/types/poster';

const DEG_TO_RAD = Math.PI / 180;

/**
 * Projects raw GPS points into an SVG viewBox of `targetWidth` x `targetHeight`.
 *
 * - Uses an equirectangular projection: longitude spans are scaled by
 *   cos(mid-latitude) so a route keeps its real-world shape at any latitude
 *   (1° of longitude is much shorter than 1° of latitude away from the equator).
 * - Applies one uniform scale to both axes so the geographic aspect ratio is preserved.
 * - Flips the Y axis, since SVG y grows downward while latitude grows northward.
 * - Centers the route inside the padded viewBox.
 */
export function normalizeGpxCoordinates(
  rawPoints: RawGpxPoint[],
  targetWidth: number,
  targetHeight: number,
  padding: number = 40
): CoordinatePoint[] {
  if (!rawPoints || rawPoints.length === 0) return [];

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;

  for (const pt of rawPoints) {
    if (pt.lat < minLat) minLat = pt.lat;
    if (pt.lat > maxLat) maxLat = pt.lat;
    if (pt.lon < minLon) minLon = pt.lon;
    if (pt.lon > maxLon) maxLon = pt.lon;
  }

  const lonScale = Math.cos(((minLat + maxLat) / 2) * DEG_TO_RAD);
  const rawWidth = (maxLon - minLon) * lonScale;
  const rawHeight = maxLat - minLat;

  // Every point is identical (e.g. a treadmill file): collapse to the center.
  if (rawWidth === 0 && rawHeight === 0) {
    return rawPoints.map((pt) => ({
      x: targetWidth / 2,
      y: targetHeight / 2,
      elevation: pt.ele,
    }));
  }

  const availableWidth = Math.max(targetWidth - padding * 2, 1);
  const availableHeight = Math.max(targetHeight - padding * 2, 1);

  // A perfectly straight N–S or E–W route has one zero span; scale by the other.
  const scale = Math.min(
    rawWidth > 0 ? availableWidth / rawWidth : Infinity,
    rawHeight > 0 ? availableHeight / rawHeight : Infinity
  );

  const routeRenderWidth = rawWidth * scale;
  const routeRenderHeight = rawHeight * scale;

  const offsetX = (targetWidth - routeRenderWidth) / 2;
  const offsetY = (targetHeight - routeRenderHeight) / 2;

  return rawPoints.map((pt) => {
    const x = offsetX + (pt.lon - minLon) * lonScale * scale;
    const y = offsetY + (maxLat - pt.lat) * scale;
    return {
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      elevation: pt.ele,
    };
  });
}

/**
 * Evenly thins a point list to at most `maxPoints`, always keeping the first
 * and last point. Keeps SVG polylines light for 10k+ point GPX files.
 */
export function downsamplePoints<T>(points: T[], maxPoints: number): T[] {
  if (points.length <= maxPoints || maxPoints < 2) return points;
  const step = (points.length - 1) / (maxPoints - 1);
  const result: T[] = [];
  for (let i = 0; i < maxPoints; i++) {
    result.push(points[Math.round(i * step)]);
  }
  return result;
}
