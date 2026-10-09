import type { AspectRatio, ColorPalette, PosterConfig, TemplateId } from '@/types/poster';

const TEMPLATE_IDS: readonly TemplateId[] = ['magazine', 'cyberpunk', 'swiss'];
const ASPECT_RATIOS: readonly AspectRatio[] = ['9:16', '1:1', '4:5'];
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR.test(value);
}

function isPalette(value: unknown): value is ColorPalette {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    value.id.length <= 64 &&
    typeof value.name === 'string' &&
    value.name.length <= 64 &&
    isColor(value.background) &&
    (value.cardBackground === undefined || isColor(value.cardBackground)) &&
    isColor(value.primaryText) &&
    isColor(value.secondaryText) &&
    isColor(value.accent) &&
    isColor(value.routeColor)
  );
}

/**
 * Validates an untrusted PosterConfig and returns a clean copy containing only
 * known fields, or null if invalid. The background photo is always dropped:
 * presets store styles, and multi-MB data URLs would exhaust the free-tier DB.
 */
export function sanitizePosterConfig(value: unknown): PosterConfig | null {
  if (!isRecord(value)) return null;
  const {
    templateId,
    aspectRatio,
    palette,
    showRoute,
    showElevationProfile,
    showHeartRate,
    showWatermark,
    watermarkText,
    overlayOpacity,
    contrastMode,
  } = value;

  if (!TEMPLATE_IDS.includes(templateId as TemplateId)) return null;
  if (!ASPECT_RATIOS.includes(aspectRatio as AspectRatio)) return null;
  if (!isPalette(palette)) return null;
  for (const flag of [showRoute, showElevationProfile, showHeartRate, showWatermark]) {
    if (typeof flag !== 'boolean') return null;
  }
  if (typeof watermarkText !== 'string' || watermarkText.length > 64) return null;
  if (typeof overlayOpacity !== 'number' || overlayOpacity < 0 || overlayOpacity > 1) return null;
  if (contrastMode !== 'dark' && contrastMode !== 'light') return null;

  return {
    templateId: templateId as TemplateId,
    aspectRatio: aspectRatio as AspectRatio,
    palette: {
      id: palette.id,
      name: palette.name,
      background: palette.background,
      ...(palette.cardBackground ? { cardBackground: palette.cardBackground } : {}),
      primaryText: palette.primaryText,
      secondaryText: palette.secondaryText,
      accent: palette.accent,
      routeColor: palette.routeColor,
    },
    showRoute: showRoute as boolean,
    showElevationProfile: showElevationProfile as boolean,
    showHeartRate: showHeartRate as boolean,
    showWatermark: showWatermark as boolean,
    watermarkText,
    customOverlayImage: null,
    overlayOpacity,
    contrastMode,
  };
}
