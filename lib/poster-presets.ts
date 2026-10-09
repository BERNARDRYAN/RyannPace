import type {
  AspectRatio,
  ColorPalette,
  CoordinatePoint,
  PosterConfig,
  RawGpxPoint,
  TemplateId,
  WorkoutMetrics,
} from '@/types/poster';
import { calculatePace, computeTrackStats, haversineMeters } from '@/lib/gpx-calculator';
import { downsamplePoints, normalizeGpxCoordinates } from '@/lib/coordinate-normalizer';
import { computeAllSplits } from '@/lib/splits';

/** Native (1x) canvas size per ratio. Exports multiply this by the pixel ratio. */
export const POSTER_DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
};

/** Route points are normalized once into this square box; templates scale it with `meet`. */
export const ROUTE_VIEWBOX = { width: 1000, height: 1000, padding: 24 } as const;

/** Upper bound on rendered route vertices; keeps the SVG fast on 10k+ point files. */
export const MAX_ROUTE_POINTS = 1500;

/** Thins raw points and projects them into ROUTE_VIEWBOX space for the route SVG. */
export function buildRoute(rawPoints: RawGpxPoint[]): {
  rawPoints: RawGpxPoint[];
  routePoints: CoordinatePoint[];
} {
  const thinned = downsamplePoints(rawPoints, MAX_ROUTE_POINTS);
  return {
    rawPoints: thinned,
    routePoints: normalizeGpxCoordinates(
      thinned,
      ROUTE_VIEWBOX.width,
      ROUTE_VIEWBOX.height,
      ROUTE_VIEWBOX.padding
    ),
  };
}

export const TEMPLATES: { id: TemplateId; name: string; tagline: string; available: boolean }[] = [
  { id: 'magazine', name: 'Editorial', tagline: 'Swiss / magazine', available: true },
  { id: 'cyberpunk', name: 'Cyberpunk', tagline: 'OLED neon HUD', available: true },
  { id: 'swiss', name: 'Minimal', tagline: 'Japanese calm', available: true },
];

/** Editorial / magazine palettes. */
export const MAGAZINE_PALETTES: ColorPalette[] = [
  {
    id: 'paper',
    name: 'Newsprint',
    background: '#F1EDE4',
    cardBackground: '#E6E0D3',
    primaryText: '#111111',
    secondaryText: '#6B655B',
    accent: '#E4572E',
    routeColor: '#111111',
  },
  {
    id: 'ink',
    name: 'Ink',
    background: '#0F0F0F',
    cardBackground: '#1B1B1B',
    primaryText: '#F3F0E8',
    secondaryText: '#8A857B',
    accent: '#D7FF3A',
    routeColor: '#F3F0E8',
  },
  {
    id: 'sage',
    name: 'Sage',
    background: '#DCE3D5',
    cardBackground: '#CDD6C5',
    primaryText: '#1B2A1F',
    secondaryText: '#5C6B5E',
    accent: '#C2410C',
    routeColor: '#1B2A1F',
  },
  {
    id: 'cobalt',
    name: 'Cobalt',
    background: '#1C3FAA',
    cardBackground: '#18388F',
    primaryText: '#F5F2EA',
    secondaryText: '#AFC0F0',
    accent: '#FFB000',
    routeColor: '#F5F2EA',
  },
  {
    id: 'blush',
    name: 'Blush',
    background: '#F4DCD6',
    cardBackground: '#EBCCC4',
    primaryText: '#2A1614',
    secondaryText: '#8C625B',
    accent: '#B4231B',
    routeColor: '#2A1614',
  },
];

/** WCAG relative luminance of a #RRGGBB color. */
function relativeLuminance(hex: string): number {
  const value = hex.replace('#', '');
  const channels = [0, 2, 4].map((i) => {
    const c = Number.parseInt(value.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** Pure-black OLED bases with neon route and accent pairs. */
export const CYBERPUNK_PALETTES: ColorPalette[] = [
  {
    id: 'neon',
    name: 'Neon',
    background: '#000000',
    cardBackground: '#05070B',
    primaryText: '#E8FFFB',
    secondaryText: '#5E7385',
    accent: '#FF2BD6',
    routeColor: '#00F0FF',
  },
  {
    id: 'acid',
    name: 'Acid',
    background: '#000000',
    cardBackground: '#060804',
    primaryText: '#F4FFE6',
    secondaryText: '#66745A',
    accent: '#FF6A00',
    routeColor: '#C6FF00',
  },
  {
    id: 'ultraviolet',
    name: 'Ultraviolet',
    background: '#04000C',
    cardBackground: '#0A0418',
    primaryText: '#F3ECFF',
    secondaryText: '#6F5E92',
    accent: '#FFD400',
    routeColor: '#A64DFF',
  },
  {
    id: 'ember',
    name: 'Ember',
    background: '#050000',
    cardBackground: '#0D0303',
    primaryText: '#FFEDE6',
    secondaryText: '#7E4D40',
    accent: '#FFC400',
    routeColor: '#FF3B1F',
  },
];

/** Quiet, earthy Japanese-minimal palettes. */
export const MINIMAL_PALETTES: ColorPalette[] = [
  {
    id: 'washi',
    name: 'Washi',
    background: '#F5F1EA',
    cardBackground: '#ECE5D8',
    primaryText: '#2B2620',
    secondaryText: '#8E8273',
    accent: '#B5532E',
    routeColor: '#2B2620',
  },
  {
    id: 'matcha',
    name: 'Matcha',
    background: '#EDF0E4',
    cardBackground: '#E1E6D4',
    primaryText: '#2D3526',
    secondaryText: '#7F8972',
    accent: '#5F7F2A',
    routeColor: '#2D3526',
  },
  {
    id: 'sakura',
    name: 'Sakura',
    background: '#F8EDEB',
    cardBackground: '#F0DFDB',
    primaryText: '#3A2A2A',
    secondaryText: '#9D8582',
    accent: '#D0606E',
    routeColor: '#3A2A2A',
  },
  {
    id: 'aizome',
    name: 'Aizome',
    background: '#E8ECF2',
    cardBackground: '#DCE2EB',
    primaryText: '#1E2A45',
    secondaryText: '#76829B',
    accent: '#C4462E',
    routeColor: '#1E2A45',
  },
  {
    id: 'sumi',
    name: 'Sumi',
    background: '#1C1B19',
    cardBackground: '#262421',
    primaryText: '#EDE8DF',
    secondaryText: '#8A847A',
    accent: '#C9A45C',
    routeColor: '#EDE8DF',
  },
];

export const TEMPLATE_PALETTES: Record<TemplateId, ColorPalette[]> = {
  magazine: MAGAZINE_PALETTES,
  cyberpunk: CYBERPUNK_PALETTES,
  swiss: MINIMAL_PALETTES,
};

/** Every palette across templates (for lookups by id). */
export const PALETTES: ColorPalette[] = [...MAGAZINE_PALETTES, ...CYBERPUNK_PALETTES, ...MINIMAL_PALETTES];

export function contrastModeFor(palette: ColorPalette): 'dark' | 'light' {
  return relativeLuminance(palette.background) < 0.35 ? 'dark' : 'light';
}

export const DEFAULT_CONFIG: PosterConfig = {
  templateId: 'magazine',
  aspectRatio: '9:16',
  palette: PALETTES[0],
  showRoute: true,
  showElevationProfile: true,
  showHeartRate: true,
  showWatermark: true,
  watermarkText: 'RyannPace',
  customOverlayImage: null,
  overlayOpacity: 0.25,
  contrastMode: contrastModeFor(PALETTES[0]),
  units: 'km',
  privacyZone: true,
  chart: 'elevation',
  stamp: 'qr',
};

/**
 * A deterministic ~10 km loop around Marina Bay, Singapore, used as demo data
 * until the user drops in their own GPX.
 */
export function generateSampleRoute(): RawGpxPoint[] {
  const centerLat = 1.2868;
  const centerLon = 103.8565;
  const radiusDeg = 0.0135;
  const lonScale = Math.cos(centerLat * (Math.PI / 180));
  const count = 420;
  const start = Date.UTC(2026, 9, 4, 22, 42, 0); // 06:42 SGT
  const points: RawGpxPoint[] = [];

  let elapsedMs = 0;
  for (let i = 0; i <= count; i++) {
    const t = (i / count) * Math.PI * 2;
    const r = radiusDeg * (1 + 0.22 * Math.sin(3 * t) + 0.09 * Math.cos(5 * t + 0.6));
    const lat = centerLat + r * Math.sin(t) * 0.82;
    const lon = centerLon + (r * Math.cos(t)) / lonScale;
    const ele = 12 + 9 * Math.sin(2 * t + 1.1) + 4 * Math.sin(7 * t);

    if (i > 0) {
      const prev = points[i - 1];
      const speed = 3.55 + 0.25 * Math.sin(4 * t); // ~4'30"–4'55" /km
      elapsedMs += (haversineMeters(prev, { lat, lon }) / speed) * 1000;
    }

    points.push({
      lat: Number(lat.toFixed(6)),
      lon: Number(lon.toFixed(6)),
      ele: Number(ele.toFixed(1)),
      time: new Date(start + elapsedMs).toISOString(),
    });
  }
  return points;
}

export function metricsFromSample(points: RawGpxPoint[]): WorkoutMetrics {
  const stats = computeTrackStats(points);
  const distanceKm = Number(stats.distanceKm.toFixed(2));
  return {
    distanceKm,
    durationSeconds: stats.movingSeconds,
    ...calculatePace(distanceKm, stats.movingSeconds),
    elevationGainMeters: stats.elevationGainMeters,
    heartRateAvg: 158,
    ...computeAllSplits(points),
    date: stats.startTime ?? new Date().toISOString(),
    locationName: 'Marina Bay, Singapore',
    activityTitle: 'Sunday Long Loop',
  };
}
