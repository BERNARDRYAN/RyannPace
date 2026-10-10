import type { AspectRatio, RawGpxPoint, TemplateId, WorkoutMetrics } from '@/types/poster';
import type { PosterData } from '@/components/canvas/PosterRenderer';
import { calculatePace } from '@/lib/gpx-calculator';
import { DEFAULT_CONFIG, PALETTES, buildRoute, contrastModeFor } from '@/lib/poster-presets';

interface RouteShape {
  lat: number;
  lon: number;
  /** Route size in degrees of latitude. */
  size: number;
  /** Harmonic wobble that gives each demo route its own silhouette. */
  lobes: number;
  twist: number;
  /** Open (point-to-point) routes stop short of a full loop. */
  sweep?: number;
}

/** Deterministic, organic-looking demo track for marketing posters. */
function demoRoute({ lat, lon, size, lobes, twist, sweep = 1 }: RouteShape): RawGpxPoint[] {
  const lonScale = Math.cos((lat * Math.PI) / 180);
  const count = 320;
  return Array.from({ length: count + 1 }, (_, i) => {
    const t = (i / count) * Math.PI * 2 * sweep;
    const r = size * (1 + 0.24 * Math.sin(lobes * t + twist) + 0.08 * Math.cos((lobes + 2) * t));
    return {
      lat: lat + r * Math.sin(t) * 0.85,
      lon: lon + (r * Math.cos(t + twist * 0.2)) / lonScale,
      ele: 20 + 14 * Math.sin(2 * t + twist) + 6 * Math.sin(5 * t),
    };
  });
}

function makePoster(
  templateId: TemplateId,
  paletteId: string,
  aspectRatio: AspectRatio,
  route: RouteShape,
  metrics: Omit<WorkoutMetrics, 'paceMinutes' | 'paceSeconds'>
): PosterData {
  const palette = PALETTES.find((p) => p.id === paletteId) ?? PALETTES[0];
  return {
    ...buildRoute(demoRoute(route)),
    metrics: { ...metrics, ...calculatePace(metrics.distanceKm, metrics.durationSeconds) },
    config: { ...DEFAULT_CONFIG, templateId, palette, aspectRatio, contrastMode: contrastModeFor(palette) },
  };
}

export const SHOWCASE = {
  newsprint: makePoster(
    'magazine',
    'paper',
    '9:16',
    { lat: 1.2868, lon: 103.8565, size: 0.0135, lobes: 3, twist: 0.6 },
    {
      distanceKm: 10.02,
      durationSeconds: 47 * 60 + 36,
      elevationGainMeters: 42,
      heartRateAvg: 158,
      date: '2026-10-04T22:42:00.000Z',
      locationName: 'Marina Bay, Singapore',
      activityTitle: 'Sunday Long Loop',
    }
  ),
  neon: makePoster(
    'cyberpunk',
    'neon',
    '9:16',
    { lat: 35.6595, lon: 139.7005, size: 0.016, lobes: 2, twist: 1.7, sweep: 0.86 },
    {
      distanceKm: 12.4,
      durationSeconds: 54 * 60 + 10,
      elevationGainMeters: 86,
      heartRateAvg: 164,
      date: '2026-09-18T13:05:00.000Z',
      locationName: 'Shibuya, Tokyo',
      activityTitle: 'Midnight Tempo',
    }
  ),
  cobalt: makePoster(
    'magazine',
    'cobalt',
    '1:1',
    { lat: -33.8568, lon: 151.2153, size: 0.009, lobes: 4, twist: 2.4 },
    {
      distanceKm: 5.02,
      durationSeconds: 21 * 60 + 48,
      elevationGainMeters: 31,
      heartRateAvg: 171,
      date: '2026-08-30T20:15:00.000Z',
      locationName: 'Circular Quay, Sydney',
      activityTitle: 'Harbour 5K',
    }
  ),
  sakura: makePoster(
    'swiss',
    'sakura',
    '4:5',
    { lat: 22.2587, lon: 113.9196, size: 0.03, lobes: 5, twist: 0.2, sweep: 0.92 },
    {
      distanceKm: 21.1,
      durationSeconds: 2 * 3600 + 5 * 60 + 30,
      elevationGainMeters: 842,
      heartRateAvg: 149,
      date: '2026-07-12T23:30:00.000Z',
      locationName: 'Lantau, Hong Kong',
      activityTitle: 'Trail Half',
    }
  ),
  washi: makePoster(
    'swiss',
    'washi',
    '9:16',
    { lat: 48.8584, lon: 2.2945, size: 0.012, lobes: 3, twist: 3.1 },
    {
      distanceKm: 8.3,
      durationSeconds: 41 * 60 + 2,
      elevationGainMeters: 54,
      heartRateAvg: 152,
      date: '2026-06-21T05:10:00.000Z',
      locationName: 'Champ de Mars, Paris',
      activityTitle: 'Solstice Shakeout',
    }
  ),
  acid: makePoster(
    'cyberpunk',
    'acid',
    '1:1',
    { lat: 37.7694, lon: -122.4862, size: 0.011, lobes: 3, twist: 1.2 },
    {
      distanceKm: 7.5,
      durationSeconds: 33 * 60 + 20,
      elevationGainMeters: 64,
      heartRateAvg: 166,
      date: '2026-05-16T14:20:00.000Z',
      locationName: 'Golden Gate Park, SF',
      activityTitle: 'Night Shift Intervals',
    }
  ),
  bib: makePoster(
    'bib',
    'bib-classic',
    '9:16',
    { lat: 3.1579, lon: 101.7116, size: 0.02, lobes: 4, twist: 1.4, sweep: 0.95 },
    {
      distanceKm: 42.2,
      durationSeconds: 3 * 3600 + 41 * 60 + 12,
      elevationGainMeters: 210,
      heartRateAvg: 161,
      date: '2026-10-04T22:30:00.000Z',
      locationName: 'Kuala Lumpur',
      activityTitle: 'KL Marathon',
    }
  ),
  retro: makePoster(
    'retro',
    'retro-sunset',
    '4:5',
    { lat: 5.4164, lon: 100.3327, size: 0.012, lobes: 3, twist: 2.1 },
    {
      distanceKm: 15.3,
      durationSeconds: 79 * 60 + 40,
      elevationGainMeters: 96,
      heartRateAvg: 155,
      date: '2026-09-27T23:00:00.000Z',
      locationName: 'George Town, Penang',
      activityTitle: 'Sunrise Tempo',
    }
  ),
  stats: makePoster(
    'stats',
    'stats-mono',
    '1:1',
    { lat: 1.3521, lon: 103.8198, size: 0.009, lobes: 2, twist: 0.9 },
    {
      distanceKm: 10.02,
      durationSeconds: 47 * 60 + 36,
      elevationGainMeters: 42,
      heartRateAvg: 158,
      date: '2026-10-04T22:42:00.000Z',
      locationName: 'Bishan, Singapore',
      activityTitle: 'Easy Ten',
    }
  ),
} satisfies Record<string, PosterData>;
