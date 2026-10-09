import { NextResponse } from 'next/server';
import { getSession, isStravaConfigured } from '@/lib/strava';

/** GET /api/strava/status -> { configured, connected, athlete } (no tokens). */

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isStravaConfigured()) return NextResponse.json({ configured: false, connected: false, athlete: null });
  const session = await getSession();
  return NextResponse.json(
    {
      configured: true,
      connected: !!session,
      athlete: session ? { firstname: session.athlete.firstname } : null,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
