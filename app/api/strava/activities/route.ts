import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api';
import { StravaError, getSession, isStravaConfigured, stravaGet } from '@/lib/strava';

/**
 * GET /api/strava/activities?page=1
 * -> { activities: StravaActivitySummary[] }  (30 most recent, newest first)
 */

export const dynamic = 'force-dynamic';

interface StravaSummaryActivity {
  id: number;
  name: string;
  sport_type?: string;
  type?: string;
  start_date: string;
  distance: number;
  moving_time: number;
  total_elevation_gain: number;
  map?: { summary_polyline?: string | null };
}

export interface StravaActivitySummary {
  id: string;
  name: string;
  sport: string;
  startDate: string;
  distanceKm: number;
  movingSeconds: number;
  hasRoute: boolean;
}

export async function GET(request: Request) {
  if (!isStravaConfigured()) return errorResponse(503, 'Strava import is not configured on this server.');
  const session = await getSession();
  if (!session) return errorResponse(401, 'Connect your Strava account first.');

  const page = Math.min(Math.max(Number(new URL(request.url).searchParams.get('page')) || 1, 1), 20);
  try {
    const list = await stravaGet<StravaSummaryActivity[]>(session, `/athlete/activities?per_page=30&page=${page}`);
    const activities: StravaActivitySummary[] = list.map((a) => ({
      id: String(a.id),
      name: a.name,
      sport: a.sport_type ?? a.type ?? 'Workout',
      startDate: a.start_date,
      distanceKm: a.distance / 1000,
      movingSeconds: a.moving_time,
      hasRoute: !!a.map?.summary_polyline,
    }));
    return NextResponse.json({ activities }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof StravaError) return errorResponse(error.status, error.message);
    console.error('[api/strava/activities] failed:', error instanceof Error ? error.message : error);
    return errorResponse(502, 'Strava did not respond. Try again shortly.');
  }
}
