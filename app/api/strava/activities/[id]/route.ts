import { NextResponse } from 'next/server';
import type { RawGpxPoint } from '@/types/poster';
import type { ParsedActivity } from '@/lib/activity-parsers';
import { errorResponse } from '@/lib/api';
import { StravaError, getSession, isStravaConfigured, stravaGet } from '@/lib/strava';

/**
 * GET /api/strava/activities/:id -> { activity: ParsedActivity }
 * The same shape the GPX/FIT/TCX parsers produce, so the studio treats a
 * Strava import exactly like a dropped file. Nothing is stored server-side.
 */

export const dynamic = 'force-dynamic';

interface StravaDetailedActivity {
  name: string;
  start_date: string;
  distance: number;
  moving_time: number;
  total_elevation_gain: number;
  average_heartrate?: number;
  calories?: number;
}

type Streams = Partial<Record<'latlng' | 'altitude' | 'time', { data: unknown[] }>>;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  if (!isStravaConfigured()) return errorResponse(503, 'Strava import is not configured on this server.');
  const session = await getSession();
  if (!session) return errorResponse(401, 'Connect your Strava account first.');

  const { id } = await params;
  if (!/^\d{1,20}$/.test(id)) return errorResponse(400, 'Invalid activity id.');

  try {
    const [detail, streams] = await Promise.all([
      stravaGet<StravaDetailedActivity>(session, `/activities/${id}`),
      stravaGet<Streams>(session, `/activities/${id}/streams?keys=latlng,altitude,time&key_by_type=true`),
    ]);

    const latlng = (streams.latlng?.data ?? []) as [number, number][];
    const altitude = (streams.altitude?.data ?? []) as number[];
    const seconds = (streams.time?.data ?? []) as number[];
    const start = Date.parse(detail.start_date);

    const points: RawGpxPoint[] = latlng.map(([lat, lon], i) => {
      const point: RawGpxPoint = { lat, lon };
      if (Number.isFinite(altitude[i])) point.ele = altitude[i];
      if (Number.isFinite(seconds[i]) && !Number.isNaN(start)) point.time = new Date(start + seconds[i] * 1000).toISOString();
      return point;
    });

    const activity: ParsedActivity = {
      points,
      name: detail.name,
      time: Number.isNaN(start) ? null : new Date(start).toISOString(),
      heartRateAvg: detail.average_heartrate ? Math.round(detail.average_heartrate) : undefined,
      calories: detail.calories ? Math.round(detail.calories) : undefined,
      summary: {
        distanceKm: detail.distance > 0 ? detail.distance / 1000 : undefined,
        movingSeconds: detail.moving_time > 0 ? detail.moving_time : undefined,
        elevationGainMeters: detail.total_elevation_gain > 0 ? Math.round(detail.total_elevation_gain) : undefined,
      },
    };
    return NextResponse.json({ activity }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof StravaError) return errorResponse(error.status, error.message);
    console.error('[api/strava/activities/:id] failed:', error instanceof Error ? error.message : error);
    return errorResponse(502, 'Strava did not respond. Try again shortly.');
  }
}
