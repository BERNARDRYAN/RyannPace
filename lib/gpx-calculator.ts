import type { RawGpxPoint } from '@/types/poster';

const EARTH_RADIUS_M = 6_371_008.8;
const DEG_TO_RAD = Math.PI / 180;

/** Below this speed (m/s) a segment is treated as standing still (~33 min/km). */
const MOVING_SPEED_THRESHOLD = 0.5;

/** GPS/barometric noise filter: only climbs that persist beyond this many meters count. */
const ELEVATION_HYSTERESIS_M = 3;

export interface TrackStats {
  distanceKm: number;
  elapsedSeconds: number;
  movingSeconds: number;
  elevationGainMeters: number;
  startTime: string | null;
}

/** Great-circle distance between two points in meters. */
export function haversineMeters(a: RawGpxPoint, b: RawGpxPoint): number {
  const dLat = (b.lat - a.lat) * DEG_TO_RAD;
  const dLon = (b.lon - a.lon) * DEG_TO_RAD;
  const lat1 = a.lat * DEG_TO_RAD;
  const lat2 = b.lat * DEG_TO_RAD;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

function timeOf(pt: RawGpxPoint): number | null {
  if (!pt.time) return null;
  const t = Date.parse(pt.time);
  return Number.isNaN(t) ? null : t;
}

/**
 * Computes distance, elapsed/moving time and elevation gain from raw track points.
 * Moving time excludes segments slower than a slow walk (traffic lights, photo stops),
 * which matches how Strava/Garmin derive average pace.
 */
export function computeTrackStats(points: RawGpxPoint[]): TrackStats {
  let distanceM = 0;
  let movingMs = 0;
  let gain = 0;

  let firstTime: number | null = null;
  let lastTime: number | null = null;
  let elevationAnchor: number | null = null;

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    const t = timeOf(pt);
    if (t !== null) {
      if (firstTime === null) firstTime = t;
      lastTime = t;
    }

    if (typeof pt.ele === 'number') {
      if (elevationAnchor === null) {
        elevationAnchor = pt.ele;
      } else if (pt.ele - elevationAnchor >= ELEVATION_HYSTERESIS_M) {
        gain += pt.ele - elevationAnchor;
        elevationAnchor = pt.ele;
      } else if (elevationAnchor - pt.ele >= ELEVATION_HYSTERESIS_M) {
        elevationAnchor = pt.ele;
      }
    }

    if (i === 0) continue;
    const prev = points[i - 1];
    const segment = haversineMeters(prev, pt);
    distanceM += segment;

    const prevT = timeOf(prev);
    if (t !== null && prevT !== null && t > prevT) {
      const dt = t - prevT;
      if (segment / (dt / 1000) >= MOVING_SPEED_THRESHOLD) movingMs += dt;
    }
  }

  const elapsedSeconds =
    firstTime !== null && lastTime !== null ? Math.max(0, (lastTime - firstTime) / 1000) : 0;
  const movingSeconds = movingMs > 0 ? movingMs / 1000 : elapsedSeconds;

  return {
    distanceKm: distanceM / 1000,
    elapsedSeconds: Math.round(elapsedSeconds),
    movingSeconds: Math.round(movingSeconds),
    elevationGainMeters: Math.round(gain),
    startTime: firstTime !== null ? new Date(firstTime).toISOString() : null,
  };
}

/** Average pace split into whole minutes and seconds per kilometer. */
export function calculatePace(
  distanceKm: number,
  durationSeconds: number
): { paceMinutes: number; paceSeconds: number } {
  if (!(distanceKm > 0) || !(durationSeconds > 0)) return { paceMinutes: 0, paceSeconds: 0 };
  const totalSecondsPerKm = Math.round(durationSeconds / distanceKm);
  return {
    paceMinutes: Math.floor(totalSecondsPerKm / 60),
    paceSeconds: totalSecondsPerKm % 60,
  };
}

/**
 * Averages heart-rate samples from Garmin/Strava TrackPointExtension tags
 * (`<gpxtpx:hr>`, `<ns3:hr>`, or plain `<hr>`). gpxparser ignores extensions,
 * so this reads the XML directly. Browser-only (needs DOMParser).
 */
export function extractAverageHeartRate(gpxContent: string): number | undefined {
  if (typeof DOMParser === 'undefined') return undefined;
  const doc = new DOMParser().parseFromString(gpxContent, 'application/xml');
  const nodes = doc.getElementsByTagNameNS('*', 'hr');
  let sum = 0;
  let count = 0;
  for (let i = 0; i < nodes.length; i++) {
    const value = Number.parseFloat(nodes[i].textContent ?? '');
    if (Number.isFinite(value) && value > 20 && value < 250) {
      sum += value;
      count++;
    }
  }
  return count > 0 ? Math.round(sum / count) : undefined;
}
