'use client';

import { create } from 'zustand';
import type {
  AspectRatio,
  ColorPalette,
  CoordinatePoint,
  PosterConfig,
  RawGpxPoint,
  TemplateId,
  WorkoutMetrics,
} from '@/types/poster';
import type { PosterRecipe } from '@/types/gallery';
import { downsamplePoints } from '@/lib/coordinate-normalizer';
import { calculatePace, computeTrackStats, extractAverageHeartRate } from '@/lib/gpx-calculator';
import { parseGpx } from '@/lib/gpx-parser';
import {
  DEFAULT_CONFIG,
  TEMPLATE_PALETTES,
  buildRoute,
  contrastModeFor,
  generateSampleRoute,
  metricsFromSample,
} from '@/lib/poster-presets';

/** Route points kept in a gallery recipe: plenty for the SVG, small enough for the DB. */
const RECIPE_ROUTE_POINTS = 600;

export const MAX_GPX_FILE_BYTES = 25 * 1024 * 1024;

export type GpxStatus = 'idle' | 'loading' | 'ready' | 'error';

interface PosterState {
  metrics: WorkoutMetrics;
  config: PosterConfig;
  /** Downsampled raw GPS points (kept for coordinates readout and elevation profile). */
  rawPoints: RawGpxPoint[];
  /** Points projected into ROUTE_VIEWBOX space, ready for an SVG polyline. */
  routePoints: CoordinatePoint[];
  isSampleData: boolean;
  gpxStatus: GpxStatus;
  gpxError: string | null;
  gpxFileName: string | null;

  updateMetrics: (patch: Partial<WorkoutMetrics>) => void;
  updateConfig: (patch: Partial<PosterConfig>) => void;
  setTemplate: (templateId: TemplateId) => void;
  setAspectRatio: (aspectRatio: AspectRatio) => void;
  setPalette: (palette: ColorPalette) => void;
  setRoute: (rawPoints: RawGpxPoint[]) => void;
  loadGpxString: (gpxContent: string, fileName?: string) => Promise<void>;
  loadGpxFile: (file: File) => Promise<void>;
  loadSample: () => void;
  clearGpxError: () => void;
  /** Restores a poster saved in the gallery. */
  loadRecipe: (recipe: PosterRecipe) => void;
}

/** Snapshot of the current poster for the gallery (no background photo, compact route). */
export function currentRecipe(): PosterRecipe {
  const { metrics, config, rawPoints } = usePosterStore.getState();
  return {
    version: 1,
    metrics,
    config: { ...config, customOverlayImage: null },
    route: downsamplePoints(rawPoints, RECIPE_ROUTE_POINTS).map((p) => ({
      lat: Number(p.lat.toFixed(6)),
      lon: Number(p.lon.toFixed(6)),
      ...(typeof p.ele === 'number' ? { ele: Number(p.ele.toFixed(1)) } : {}),
    })),
  };
}

/** Guards against an older, slower parse overwriting a newer upload. */
let latestLoadId = 0;

const sampleRoute = generateSampleRoute();

export const usePosterStore = create<PosterState>()((set, get) => ({
  metrics: metricsFromSample(sampleRoute),
  config: DEFAULT_CONFIG,
  ...buildRoute(sampleRoute),
  isSampleData: true,
  gpxStatus: 'idle',
  gpxError: null,
  gpxFileName: null,

  updateMetrics: (patch) =>
    set((state) => {
      const next = { ...state.metrics, ...patch };
      const timingChanged = 'distanceKm' in patch || 'durationSeconds' in patch;
      const paceProvided = 'paceMinutes' in patch || 'paceSeconds' in patch;
      if (timingChanged && !paceProvided) {
        Object.assign(next, calculatePace(next.distanceKm, next.durationSeconds));
      }
      return { metrics: next };
    }),

  updateConfig: (patch) =>
    set((state) => {
      const config = { ...state.config, ...patch };
      if (patch.palette && !('contrastMode' in patch)) {
        config.contrastMode = contrastModeFor(patch.palette);
      }
      return { config };
    }),

  setTemplate: (templateId) => {
    // Each template has its own palette family; keep the palette only if it belongs to the new one.
    const palettes = TEMPLATE_PALETTES[templateId];
    const current = get().config.palette;
    const palette = palettes.some((p) => p.id === current.id) ? current : palettes[0];
    get().updateConfig({ templateId, palette });
  },
  setAspectRatio: (aspectRatio) => get().updateConfig({ aspectRatio }),
  setPalette: (palette) => get().updateConfig({ palette }),

  setRoute: (rawPoints) => set(buildRoute(rawPoints)),

  loadGpxString: async (gpxContent, fileName) => {
    const loadId = ++latestLoadId;
    set({ gpxStatus: 'loading', gpxError: null });

    try {
      const gpx = parseGpx(gpxContent);
      const points = gpx.points;

      if (points.length < 2) {
        throw new Error('No GPS track found. Make sure the file contains <trkpt> or <rtept> points.');
      }

      const stats = computeTrackStats(points);
      const heartRateAvg = extractAverageHeartRate(gpxContent);
      const distanceKm = Number(stats.distanceKm.toFixed(2));
      const title = gpx.name;
      const metadataTime = gpx.time ? new Date(gpx.time) : null;

      if (loadId !== latestLoadId) return;

      const current = get().metrics;
      set({
        ...buildRoute(points),
        isSampleData: false,
        gpxStatus: 'ready',
        gpxError: null,
        gpxFileName: fileName ?? null,
        metrics: {
          ...current,
          distanceKm,
          durationSeconds: stats.movingSeconds,
          ...calculatePace(distanceKm, stats.movingSeconds),
          elevationGainMeters: stats.elevationGainMeters,
          heartRateAvg,
          date:
            stats.startTime ??
            (metadataTime && !Number.isNaN(metadataTime.getTime())
              ? metadataTime.toISOString()
              : current.date),
          activityTitle: title?.trim() || current.activityTitle,
          locationName: current.locationName,
        },
      });
    } catch (error) {
      if (loadId !== latestLoadId) return;
      set({
        gpxStatus: 'error',
        gpxError: error instanceof Error ? error.message : 'Could not read this GPX file.',
      });
    }
  },

  loadGpxFile: async (file) => {
    if (!/\.gpx$/i.test(file.name)) {
      set({ gpxStatus: 'error', gpxError: 'Please choose a .gpx file.' });
      return;
    }
    if (file.size > MAX_GPX_FILE_BYTES) {
      set({ gpxStatus: 'error', gpxError: 'GPX file is larger than 25 MB.' });
      return;
    }
    let content: string;
    try {
      content = await file.text();
    } catch {
      set({ gpxStatus: 'error', gpxError: 'The file could not be read.' });
      return;
    }
    await get().loadGpxString(content, file.name);
  },

  loadSample: () => {
    latestLoadId++;
    set({
      ...buildRoute(sampleRoute),
      metrics: metricsFromSample(sampleRoute),
      isSampleData: true,
      gpxStatus: 'idle',
      gpxError: null,
      gpxFileName: null,
    });
  },

  loadRecipe: (recipe) => {
    latestLoadId++;
    set({
      ...buildRoute(recipe.route),
      metrics: recipe.metrics,
      config: { ...recipe.config, customOverlayImage: null },
      isSampleData: false,
      gpxStatus: 'idle',
      gpxError: null,
      gpxFileName: null,
    });
  },

  clearGpxError: () =>
    set((state) => ({
      gpxError: null,
      gpxStatus: state.gpxStatus === 'error' ? 'idle' : state.gpxStatus,
    })),
}));
