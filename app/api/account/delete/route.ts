import { NextResponse } from 'next/server';
import { errorResponse, readJsonObject } from '@/lib/api';
import { requireUser } from '@/lib/supabase';
import { THUMBNAIL_BUCKET } from '@/lib/gallery-server';
import { clearSession as clearStravaSession } from '@/lib/strava';

/**
 * POST /api/account/delete  body { confirm: "DELETE" }
 * Permanently deletes the signed-in user's account: thumbnails in storage,
 * then the auth user (presets and gallery rows cascade). Uses the
 * delete_my_account() database function, which can only delete the caller.
 */

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await requireUser(request, { mutating: true, feature: 'Accounts' });
  if (!auth.ok) return auth.response;

  const parsed = await readJsonObject(request, 1024);
  if ('error' in parsed) return parsed.error;
  if (parsed.body.confirm !== 'DELETE') return errorResponse(400, 'Type DELETE to confirm.');

  // 1. Thumbnails live in storage (no cascade there), under "<user id>/…".
  const bucket = auth.supabase.storage.from(THUMBNAIL_BUCKET);
  for (let round = 0; round < 50; round++) {
    const { data: files, error } = await bucket.list(auth.userId, { limit: 100 });
    if (error) {
      console.error('[api/account/delete] listing thumbnails failed:', error.message);
      return errorResponse(500, 'Could not delete your account. Please try again.');
    }
    if (!files || files.length === 0) break;
    const { error: removeError } = await bucket.remove(files.map((f) => `${auth.userId}/${f.name}`));
    if (removeError) {
      console.error('[api/account/delete] removing thumbnails failed:', removeError.message);
      return errorResponse(500, 'Could not delete your account. Please try again.');
    }
  }

  // 2. The account itself; presets and posters cascade.
  const { error } = await auth.supabase.rpc('delete_my_account');
  if (error) {
    console.error('[api/account/delete] delete_my_account failed:', error.message);
    const missing = /delete_my_account|function .* does not exist|PGRST202/i.test(`${error.message} ${error.code}`);
    return errorResponse(
      missing ? 503 : 500,
      missing ? 'Account deletion is not set up on this server yet.' : 'Could not delete your account. Please try again.'
    );
  }

  // 3. Clear the (now invalid) session and any Strava connection cookie.
  await auth.supabase.auth.signOut().catch(() => undefined);
  await clearStravaSession().catch(() => undefined);
  return NextResponse.json({ ok: true });
}
