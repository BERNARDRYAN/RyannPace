import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PosterConfig, UserPreset } from '@/types/poster';
import { bearerToken, createSupabaseForUser, isSupabaseConfigured } from '@/lib/supabase';
import { sanitizePosterConfig } from '@/lib/preset-validation';

/**
 * BFF for user style presets.
 *
 *   GET    /api/presets          -> { presets: UserPreset[] }
 *   POST   /api/presets          body { presetName, config } -> { preset: UserPreset } (201)
 *   DELETE /api/presets?id=uuid  -> 204
 *
 * Every request needs `Authorization: Bearer <supabase access token>`. The
 * token is verified with Supabase Auth and forwarded to Postgres, where Row
 * Level Security restricts rows to their owner.
 */

export const dynamic = 'force-dynamic';

const TABLE = 'ryannpace_presets';
const MAX_PRESETS_RETURNED = 100;
const MAX_BODY_BYTES = 16 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PresetRow {
  id: string;
  user_id: string;
  preset_name: string;
  config: PosterConfig;
  created_at: string;
}

function toUserPreset(row: PresetRow): UserPreset {
  return {
    id: row.id,
    userId: row.user_id,
    presetName: row.preset_name,
    config: row.config,
    createdAt: row.created_at,
  };
}

function errorResponse(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

type AuthResult =
  | { ok: true; supabase: SupabaseClient; userId: string }
  | { ok: false; response: NextResponse };

async function authenticate(request: Request): Promise<AuthResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, response: errorResponse(503, 'Preset storage is not configured on this server.') };
  }
  const token = bearerToken(request);
  if (!token) {
    return { ok: false, response: errorResponse(401, 'Missing bearer token.') };
  }
  const supabase = createSupabaseForUser(token);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { ok: false, response: errorResponse(401, 'Invalid or expired session.') };
  }
  return { ok: true, supabase, userId: data.user.id };
}

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.supabase
    .from(TABLE)
    .select('id, user_id, preset_name, config, created_at')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })
    .limit(MAX_PRESETS_RETURNED);

  if (error) {
    console.error('[api/presets] list failed:', error.message);
    return errorResponse(500, 'Could not load presets.');
  }
  return NextResponse.json({ presets: (data as PresetRow[]).map(toUserPreset) });
}

export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth.ok) return auth.response;

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return errorResponse(413, 'Preset payload is too large.');

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return errorResponse(400, 'Body must be valid JSON.');
  }
  if (typeof body !== 'object' || body === null) return errorResponse(400, 'Body must be an object.');

  const { presetName, config } = body as { presetName?: unknown; config?: unknown };
  const name = typeof presetName === 'string' ? presetName.trim() : '';
  if (!name || name.length > 100) {
    return errorResponse(400, 'presetName must be 1–100 characters.');
  }
  const cleanConfig = sanitizePosterConfig(config);
  if (!cleanConfig) return errorResponse(400, 'config is not a valid PosterConfig.');

  const { data, error } = await auth.supabase
    .from(TABLE)
    .insert({ user_id: auth.userId, preset_name: name, config: cleanConfig })
    .select('id, user_id, preset_name, config, created_at')
    .single();

  if (error) {
    console.error('[api/presets] insert failed:', error.message);
    return errorResponse(500, 'Could not save preset.');
  }
  return NextResponse.json({ preset: toUserPreset(data as PresetRow) }, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await authenticate(request);
  if (!auth.ok) return auth.response;

  const id = new URL(request.url).searchParams.get('id');
  if (!id || !UUID.test(id)) return errorResponse(400, 'A valid preset id is required.');

  const { data, error } = await auth.supabase
    .from(TABLE)
    .delete()
    .eq('id', id)
    .eq('user_id', auth.userId)
    .select('id');

  if (error) {
    console.error('[api/presets] delete failed:', error.message);
    return errorResponse(500, 'Could not delete preset.');
  }
  if (!data || data.length === 0) return errorResponse(404, 'Preset not found.');
  return new NextResponse(null, { status: 204 });
}
