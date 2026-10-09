import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AspectRatio, ColorPalette, DistanceUnit, TemplateId, WorkoutMetrics } from '@/types/poster';
import type { GalleryPoster, GalleryPosterDetail, PosterRecipe } from '@/types/gallery';

export const POSTERS_TABLE = 'ryannpace_posters';
export const THUMBNAIL_BUCKET = 'poster-thumbnails';
/** Signed thumbnail links expire after an hour; the gallery refetches on load. */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export const SUMMARY_COLUMNS =
  'id, title, activity_date, aspect_ratio, template_id, thumbnail_path, created_at, metrics:recipe->metrics, palette:recipe->config->palette, units:recipe->config->>units';
export const DETAIL_COLUMNS =
  'id, title, activity_date, aspect_ratio, template_id, thumbnail_path, created_at, recipe';

export interface PosterSummaryRow {
  id: string;
  title: string;
  activity_date: string | null;
  aspect_ratio: AspectRatio;
  template_id: TemplateId;
  thumbnail_path: string | null;
  created_at: string;
  metrics: WorkoutMetrics;
  palette: ColorPalette | null;
  units: DistanceUnit | null;
}

export interface PosterDetailRow extends Omit<PosterSummaryRow, 'metrics' | 'palette' | 'units'> {
  recipe: PosterRecipe;
}

/** Maps thumbnail paths to short-lived signed URLs (the bucket is private). */
export async function signThumbnails(
  supabase: SupabaseClient,
  paths: (string | null)[]
): Promise<Map<string, string>> {
  const wanted = paths.filter((p): p is string => !!p);
  const urls = new Map<string, string>();
  if (wanted.length === 0) return urls;
  const { data, error } = await supabase.storage
    .from(THUMBNAIL_BUCKET)
    .createSignedUrls(wanted, SIGNED_URL_TTL_SECONDS);
  if (error) {
    console.error('[gallery] signing thumbnails failed:', error.message);
    return urls;
  }
  for (const item of data) {
    if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  }
  return urls;
}

export function toGalleryPoster(row: PosterSummaryRow, urls: Map<string, string>): GalleryPoster {
  return {
    id: row.id,
    title: row.title,
    activityDate: row.activity_date,
    createdAt: row.created_at,
    aspectRatio: row.aspect_ratio,
    templateId: row.template_id,
    metrics: row.metrics,
    palette: row.palette,
    units: row.units === 'mi' ? 'mi' : row.units === 'km' ? 'km' : null,
    thumbnailUrl: row.thumbnail_path ? urls.get(row.thumbnail_path) ?? null : null,
  };
}

export function toGalleryPosterDetail(row: PosterDetailRow, urls: Map<string, string>): GalleryPosterDetail {
  return {
    ...toGalleryPoster(
      {
        ...row,
        metrics: row.recipe.metrics,
        palette: row.recipe.config.palette,
        units: row.recipe.config.units ?? null,
      },
      urls
    ),
    recipe: row.recipe,
  };
}

/** Checks file signatures so only real WebP/JPEG bytes reach storage. */
export function sniffImageType(bytes: Uint8Array): 'image/webp' | 'image/jpeg' | null {
  if (
    bytes.length > 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && // RIFF
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50 // WEBP
  ) {
    return 'image/webp';
  }
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  return null;
}
