import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api';
import { requireUser } from '@/lib/supabase';
import {
  DETAIL_COLUMNS,
  POSTERS_TABLE,
  THUMBNAIL_BUCKET,
  signThumbnails,
  toGalleryPosterDetail,
  type PosterDetailRow,
} from '@/lib/gallery-server';

/**
 *   GET    /api/posters/:id  -> { poster: GalleryPosterDetail }  (includes the recipe)
 *   DELETE /api/posters/:id  -> 204  (also removes the thumbnail)
 */

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteContext) {
  const auth = await requireUser(request, { mutating: false, feature: 'The gallery' });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!UUID.test(id)) return errorResponse(400, 'Invalid poster id.');

  const { data, error } = await auth.supabase
    .from(POSTERS_TABLE)
    .select(DETAIL_COLUMNS)
    .eq('id', id)
    .eq('user_id', auth.userId)
    .maybeSingle();

  if (error) {
    console.error('[api/posters/:id] read failed:', error.message);
    return errorResponse(500, 'Could not load this poster.');
  }
  if (!data) return errorResponse(404, 'Poster not found.');

  const row = data as unknown as PosterDetailRow;
  const urls = await signThumbnails(auth.supabase, [row.thumbnail_path]);
  return NextResponse.json(
    { poster: toGalleryPosterDetail(row, urls) },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await requireUser(request, { mutating: true, feature: 'The gallery' });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!UUID.test(id)) return errorResponse(400, 'Invalid poster id.');

  const { data, error } = await auth.supabase
    .from(POSTERS_TABLE)
    .delete()
    .eq('id', id)
    .eq('user_id', auth.userId)
    .select('thumbnail_path');

  if (error) {
    console.error('[api/posters/:id] delete failed:', error.message);
    return errorResponse(500, 'Could not delete this poster.');
  }
  if (!data || data.length === 0) return errorResponse(404, 'Poster not found.');

  const path = (data[0] as { thumbnail_path: string | null }).thumbnail_path;
  if (path) {
    const { error: removeError } = await auth.supabase.storage.from(THUMBNAIL_BUCKET).remove([path]);
    if (removeError) console.error('[api/posters/:id] thumbnail cleanup failed:', removeError.message);
  }
  return new NextResponse(null, { status: 204 });
}
