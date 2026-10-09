import type { RawGpxPoint } from '@/types/poster';
import { parseGpx } from '@/lib/gpx-parser';
import { extractAverageHeartRate } from '@/lib/gpx-calculator';

/** Format-neutral result of reading a GPX, TCX or FIT activity file. */
export interface ParsedActivity {
  points: RawGpxPoint[];
  name: string | null;
  /** Activity start, when the file states it separately from track points. */
  time: string | null;
  heartRateAvg?: number;
  calories?: number;
  /**
   * The device's own totals (FIT session / TCX laps). Preferred over values
   * recomputed from the track so posters match Garmin Connect / Strava.
   */
  summary?: { distanceKm?: number; movingSeconds?: number; elevationGainMeters?: number };
}

export const SUPPORTED_EXTENSIONS = ['.gpx', '.tcx', '.fit'] as const;

const positive = (n: unknown): number | undefined =>
  typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : undefined;

/* ---------- GPX ---------- */

export function parseGpxActivity(xml: string): ParsedActivity {
  const gpx = parseGpx(xml);
  return { ...gpx, heartRateAvg: extractAverageHeartRate(xml) };
}

/* ---------- TCX (Garmin Training Center XML) ---------- */

function firstText(el: Element | Document, localName: string): string | null {
  const text = el.getElementsByTagNameNS('*', localName)[0]?.textContent?.trim();
  return text ? text : null;
}

function childText(el: Element, localName: string): string | null {
  for (const c of Array.from(el.children)) if (c.localName === localName) return c.textContent?.trim() || null;
  return null;
}

export function parseTcx(xml: string): ParsedActivity {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) throw new Error('This file is not valid TCX/XML.');

  const points: RawGpxPoint[] = [];
  let hrSum = 0;
  let hrCount = 0;
  for (const tp of Array.from(doc.getElementsByTagNameNS('*', 'Trackpoint'))) {
    const hr = Number.parseFloat(firstText(tp, 'Value') ?? '');
    if (Number.isFinite(hr) && hr > 20 && hr < 250) {
      hrSum += hr;
      hrCount++;
    }
    const position = Array.from(tp.children).find((c) => c.localName === 'Position');
    if (!position) continue; // indoor/treadmill samples have no GPS fix
    const lat = Number.parseFloat(childText(position, 'LatitudeDegrees') ?? '');
    const lon = Number.parseFloat(childText(position, 'LongitudeDegrees') ?? '');
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const point: RawGpxPoint = { lat, lon };
    const ele = Number.parseFloat(childText(tp, 'AltitudeMeters') ?? '');
    if (Number.isFinite(ele)) point.ele = ele;
    const t = Date.parse(childText(tp, 'Time') ?? '');
    if (!Number.isNaN(t)) point.time = new Date(t).toISOString();
    points.push(point);
  }

  let distanceM = 0;
  let seconds = 0;
  let calories = 0;
  for (const lap of Array.from(doc.getElementsByTagNameNS('*', 'Lap'))) {
    distanceM += Number.parseFloat(childText(lap, 'DistanceMeters') ?? '') || 0;
    seconds += Number.parseFloat(childText(lap, 'TotalTimeSeconds') ?? '') || 0;
    calories += Number.parseFloat(childText(lap, 'Calories') ?? '') || 0;
  }

  const activity = doc.getElementsByTagNameNS('*', 'Activity')[0];
  return {
    points,
    name: (activity && childText(activity, 'Notes')) || null,
    time: (activity && childText(activity, 'Id')) || null,
    heartRateAvg: hrCount > 0 ? Math.round(hrSum / hrCount) : undefined,
    calories: positive(calories) ? Math.round(calories) : undefined,
    summary: {
      distanceKm: positive(distanceM) ? distanceM / 1000 : undefined,
      movingSeconds: positive(seconds) ? Math.round(seconds) : undefined,
    },
  };
}

/* ---------- FIT (Garmin binary) ---------- */

interface FitRecord {
  timestamp?: Date | string;
  position_lat?: number;
  position_long?: number;
  altitude?: number;
  enhanced_altitude?: number;
}

interface FitSession {
  start_time?: Date | string;
  sport?: string;
  total_timer_time?: number;
  total_distance?: number;
  total_ascent?: number;
  total_calories?: number;
  avg_heart_rate?: number;
}

/** FIT files carry ".FIT" at byte offset 8 of the header. */
export function looksLikeFit(bytes: Uint8Array): boolean {
  return bytes.length > 12 && bytes[8] === 0x2e && bytes[9] === 0x46 && bytes[10] === 0x49 && bytes[11] === 0x54;
}

export async function parseFit(buffer: ArrayBuffer): Promise<ParsedActivity> {
  if (!looksLikeFit(new Uint8Array(buffer))) throw new Error('This file is not a valid FIT file.');
  // Loaded on demand: only needed when someone actually drops a .fit file.
  const { default: FitParser } = await import('fit-file-parser');
  const parser = new FitParser({ force: true, mode: 'list', lengthUnit: 'm', speedUnit: 'm/s', elapsedRecordField: false });
  const fit = (await parser.parseAsync(buffer)) as unknown as { records?: FitRecord[]; sessions?: FitSession[] };

  const points: RawGpxPoint[] = [];
  for (const r of fit.records ?? []) {
    const lat = r.position_lat;
    const lon = r.position_long;
    if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180 || (lat === 0 && lon === 0)) continue;
    const point: RawGpxPoint = { lat, lon };
    const ele = r.enhanced_altitude ?? r.altitude;
    if (typeof ele === 'number' && Number.isFinite(ele)) point.ele = ele;
    const t = r.timestamp ? new Date(r.timestamp).getTime() : NaN;
    if (!Number.isNaN(t)) point.time = new Date(t).toISOString();
    points.push(point);
  }

  const session = fit.sessions?.[0];
  const start = session?.start_time ? new Date(session.start_time) : null;
  const sport = session?.sport ? session.sport.charAt(0).toUpperCase() + session.sport.slice(1) : null;

  return {
    points,
    name: sport ? `${sport.replace(/_/g, ' ')} Activity` : null,
    time: start && !Number.isNaN(start.getTime()) ? start.toISOString() : null,
    heartRateAvg: positive(session?.avg_heart_rate) ? Math.round(session!.avg_heart_rate!) : undefined,
    calories: positive(session?.total_calories) ? Math.round(session!.total_calories!) : undefined,
    summary: {
      distanceKm: positive(session?.total_distance) ? session!.total_distance! / 1000 : undefined,
      movingSeconds: positive(session?.total_timer_time) ? Math.round(session!.total_timer_time!) : undefined,
      elevationGainMeters: positive(session?.total_ascent) ? Math.round(session!.total_ascent!) : undefined,
    },
  };
}

/* ---------- Dispatcher ---------- */

export async function parseActivityFile(file: File): Promise<ParsedActivity> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.fit')) return parseFit(await file.arrayBuffer());
  const text = await file.text();
  if (name.endsWith('.tcx')) return parseTcx(text);
  return parseGpxActivity(text);
}
