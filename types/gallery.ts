import type {
  AspectRatio,
  ColorPalette,
  DistanceUnit,
  PosterConfig,
  RawGpxPoint,
  TemplateId,
  WorkoutMetrics,
} from '@/types/poster';

/**
 * Everything needed to rebuild a poster exactly: the gallery stores this
 * instead of full-size PNGs, so a past poster can be reopened and re-exported
 * at any resolution. Background photos are never stored.
 */
export interface PosterRecipe {
  version: 1;
  metrics: WorkoutMetrics;
  config: PosterConfig;
  /** Simplified track (lat/lon/ele only), enough to redraw route and elevation. */
  route: RawGpxPoint[];
}

/** A gallery card: summary fields plus a short-lived signed thumbnail URL. */
export interface GalleryPoster {
  id: string;
  title: string;
  activityDate: string | null;
  createdAt: string;
  aspectRatio: AspectRatio;
  templateId: TemplateId;
  metrics: WorkoutMetrics;
  palette: ColorPalette | null;
  units: DistanceUnit | null;
  thumbnailUrl: string | null;
}

export interface GalleryPosterDetail extends GalleryPoster {
  recipe: PosterRecipe;
}
