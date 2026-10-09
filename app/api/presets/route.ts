import { NextResponse } from 'next/server';
import type { PosterConfig, UserPreset } from '@/types/poster';
import { errorResponse, readJsonObject } from '@/lib/api';
import { requireUser } from '@/lib/supabase';
import { sanitizePosterConfig } from '@/lib/preset-validation';

/**
 * BFF for user style presets.
 *
 *   GET    /api/presets          -> { presets: UserPreset[] }
 *   POST   /api/presets          body { presetName, config } -> { preset: UserPreset } (201)
 *   DELETE /api/presets?id=uuid  -> 204
 *
 * Authenticated by the httpOnly session cookies set at /auth/callback. Queries
 * run as the signed-in user, so Row Level Security restricts rows to their owner.
 */

export const dynamic = 'force-dynamic';

const TABLE = 'ryannpace_presets';
const COLUMNS = 'id, user_id, preset_name, config, created_at';
/** Keeps any one account from filling the free-tier database. */
const MAX_PRESETS_PER_USER = 50;
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

const authenticate = (request: Request, { mutating }: { mutating: boolean }) =>
  requireUser(request, { mutating, feature: 'Preset storage' });

export async function GET(request: Request) {
  const auth = await authenticate(request, { mutating: false });
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.supabase
    .from(TABLE)
    .select(COLUMNS)
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })
    .limit(MAX_PRESETS_PER_USER);

  if (error) {
    console.error('[api/presets] list failed:', error.message);
    return errorResponse(500, 'Could not load presets.');
  }
  return NextResponse.json(
    { presets: (data as PresetRow[]).map(toUserPreset) },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(request: Request) {
  const auth = await authenticate(request, { mutating: true });
  if (!auth.ok) return auth.response;

  const parsed = await readJsonObject(request, MAX_BODY_BYTES);
  if ('error' in parsed) return parsed.error;

  const { presetName, config } = parsed.body;
  const name = typeof presetName === 'string' ? presetName.trim() : '';
  if (!name || name.length > 100) {
    return errorResponse(400, 'Preset name must be 1–100 characters.');
  }
  const cleanConfig = sanitizePosterConfig(config);
  if (!cleanConfig) return errorResponse(400, 'config is not a valid PosterConfig.');

  const { count, error: countError } = await auth.supabase
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', auth.userId);
  if (countError) {
    console.error('[api/presets] count failed:', countError.message);
    return errorResponse(500, 'Could not save preset.');
  }
  if ((count ?? 0) >= MAX_PRESETS_PER_USER) {
    return errorResponse(409, `You can keep up to ${MAX_PRESETS_PER_USER} presets. Delete one first.`);
  }

  const { data, error } = await auth.supabase
    .from(TABLE)
    .insert({ user_id: auth.userId, preset_name: name, config: cleanConfig })
    .select(COLUMNS)
    .single();

  if (error) {
    console.error('[api/presets] insert failed:', error.message);
    return errorResponse(500, 'Could not save preset.');
  }
  return NextResponse.json({ preset: toUserPreset(data as PresetRow) }, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await authenticate(request, { mutating: true });
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
