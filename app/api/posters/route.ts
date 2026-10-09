import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api';
import { requireUser } from '@/lib/supabase';
import { sanitizeRecipe } from '@/lib/recipe-validation';
import {
  POSTERS_TABLE,
  SUMMARY_COLUMNS,
  THUMBNAIL_BUCKET,
  signThumbnails,
  sniffImageType,
  toGalleryPoster,
  type PosterSummaryRow,
} from '@/lib/gallery-server';

/**
 * BFF for the poster gallery.
 *
 *   GET  /api/posters  -> { posters: GalleryPoster[] }   (newest first)
 *   POST /api/posters  multipart: recipe (JSON string) + thumbnail (WebP/JPEG)
 *                      -> { poster: GalleryPoster } (201)
 *
 * Authenticated by the httpOnly session cookies; Row Level Security on the
 * table and on storage.objects keeps every row and thumbnail private to its owner.
 */

export const dynamic = 'force-dynamic';

/** Keeps any one account from filling the free tier. */
const MAX_POSTERS_PER_USER = 200;
const MAX_THUMBNAIL_BYTES = 512 * 1024;
const MAX_REQUEST_BYTES = 1024 * 1024;

const authenticate = (request: Request, mutating: boolean) =>
  requireUser(request, { mutating, feature: 'The gallery' });

export async function GET(request: Request) {
  const auth = await authenticate(request, false);
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.supabase
    .from(POSTERS_TABLE)
    .select(SUMMARY_COLUMNS)
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })
    .limit(MAX_POSTERS_PER_USER);

  if (error) {
    console.error('[api/posters] list failed:', error.message);
    return errorResponse(500, 'Could not load your gallery.');
  }

  const rows = data as unknown as PosterSummaryRow[];
  const urls = await signThumbnails(auth.supabase, rows.map((r) => r.thumbnail_path));
  return NextResponse.json(
    { posters: rows.map((row) => toGalleryPoster(row, urls)) },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(request: Request) {
  const auth = await authenticate(request, true);
  if (!auth.ok) return auth.response;

  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (declaredLength > MAX_REQUEST_BYTES) return errorResponse(413, 'Upload is too large.');

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse(400, 'Expected multipart form data.');
  }

  const recipeField = form.get('recipe');
  const thumbnail = form.get('thumbnail');
  if (typeof recipeField !== 'string' || recipeField.length > 256 * 1024) {
    return errorResponse(400, 'Missing or oversized recipe.');
  }
  if (!(thumbnail instanceof Blob) || thumbnail.size === 0 || thumbnail.size > MAX_THUMBNAIL_BYTES) {
    return errorResponse(400, 'Thumbnail must be a WebP or JPEG under 512 KB.');
  }

  let recipeJson: unknown;
  try {
    recipeJson = JSON.parse(recipeField);
  } catch {
    return errorResponse(400, 'Recipe must be valid JSON.');
  }
  const recipe = sanitizeRecipe(recipeJson);
  if (!recipe) return errorResponse(400, 'Recipe is not a valid poster.');

  const bytes = new Uint8Array(await thumbnail.arrayBuffer());
  const contentType = sniffImageType(bytes);
  if (!contentType) return errorResponse(400, 'Thumbnail must be a WebP or JPEG image.');

  const { count, error: countError } = await auth.supabase
    .from(POSTERS_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', auth.userId);
  if (countError) {
    console.error('[api/posters] count failed:', countError.message);
    return errorResponse(500, 'Could not save to your gallery.');
  }
  if ((count ?? 0) >= MAX_POSTERS_PER_USER) {
    return errorResponse(409, 'Your gallery is full. Delete a few posters to save more.');
  }

  const id = crypto.randomUUID();
  const thumbnailPath = `${auth.userId}/${id}.${contentType === 'image/webp' ? 'webp' : 'jpg'}`;

  const upload = await auth.supabase.storage
    .from(THUMBNAIL_BUCKET)
    .upload(thumbnailPath, bytes, { contentType, upsert: false, cacheControl: '31536000' });
  if (upload.error) {
    console.error('[api/posters] thumbnail upload failed:', upload.error.message);
    return errorResponse(500, 'Could not save the thumbnail.');
  }

  const title = recipe.metrics.activityTitle.trim().slice(0, 120) || 'Untitled Run';
  const { data, error } = await auth.supabase
    .from(POSTERS_TABLE)
    .insert({
      id,
      user_id: auth.userId,
      title,
      activity_date: recipe.metrics.date,
      aspect_ratio: recipe.config.aspectRatio,
      template_id: recipe.config.templateId,
      recipe,
      thumbnail_path: thumbnailPath,
    })
    .select(SUMMARY_COLUMNS)
    .single();

  if (error) {
    console.error('[api/posters] insert failed:', error.message);
    await auth.supabase.storage.from(THUMBNAIL_BUCKET).remove([thumbnailPath]);
    return errorResponse(500, 'Could not save to your gallery.');
  }

  const row = data as unknown as PosterSummaryRow;
  const urls = await signThumbnails(auth.supabase, [row.thumbnail_path]);
  return NextResponse.json({ poster: toGalleryPoster(row, urls) }, { status: 201 });
}
