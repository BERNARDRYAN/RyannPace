import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/health -> { ok, db: 'ok' | 'unconfigured' | 'error' }
 *
 * Runs one tiny anonymous query so Supabase sees database activity; the
 * scheduled keep-alive workflow calls this to stop free-tier projects from
 * pausing after 7 idle days. Returns no data, only a status.
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  const headers = { 'Cache-Control': 'no-store' };
  if (!url || !key || key === 'your-anon-key') {
    return NextResponse.json({ ok: true, db: 'unconfigured' }, { headers });
  }
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  // Row Level Security returns no rows to an anonymous caller; the query still hits Postgres.
  const { error } = await supabase.from('ryannpace_presets').select('id', { head: true, count: 'exact' }).limit(1);
  if (error) {
    console.error('[api/health] database check failed:', error.message);
    return NextResponse.json({ ok: false, db: 'error' }, { status: 503, headers });
  }
  return NextResponse.json({ ok: true, db: 'ok' }, { headers });
}
