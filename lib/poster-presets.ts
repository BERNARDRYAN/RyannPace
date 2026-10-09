import type {
  AspectRatio,
  ColorPalette,
  PosterConfig,
  RawGpxPoint,
  TemplateId,
  WorkoutMetrics,
} from '@/types/poster';
import { calculatePace, computeTrackStats, haversineMeters } from '@/lib/gpx-calculator';

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

export const TEMPLATES: { id: TemplateId; name: string; tagline: string; available: boolean }[] = [
  { id: 'magazine', name: 'Editorial', tagline: 'Swiss / magazine', available: true },
  { id: 'cyberpunk', name: 'Cyberpunk', tagline: 'OLED neon HUD', available: false },
  { id: 'swiss', name: 'Minimal', tagline: 'Japanese grid', available: false },
];

export const PALETTES: ColorPalette[] = [
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
    date: stats.startTime ?? new Date().toISOString(),
    locationName: 'Marina Bay, Singapore',
    activityTitle: 'Sunday Long Loop',
  };
}
