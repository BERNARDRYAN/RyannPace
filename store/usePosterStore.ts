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
import { calculatePace, computeTrackStats } from '@/lib/gpx-calculator';
import { computeAllSplits } from '@/lib/splits';
import {
  SUPPORTED_EXTENSIONS,
  parseActivityFile,
  parseGpxActivity,
  type ParsedActivity,
} from '@/lib/activity-parsers';
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
  /** Applies an already-parsed activity (GPX, TCX or FIT) to the poster. */
  loadActivity: (parsed: ParsedActivity, fileName?: string) => void;
  loadGpxString: (gpxContent: string, fileName?: string) => Promise<void>;
  /** Reads a .gpx, .tcx or .fit file and loads it. */
  loadActivityFile: (file: File) => Promise<void>;
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

  loadActivity: (parsed, fileName) => {
    latestLoadId++;
    const { points } = parsed;
    if (points.length < 2) {
      set({
        gpxStatus: 'error',
        gpxError: 'No GPS track found in this file. Indoor or treadmill activities have no route to draw.',
      });
      return;
    }

    const stats = computeTrackStats(points);
    const summary = parsed.summary ?? {};
    // Prefer the device's own totals (FIT/TCX) so posters match Garmin Connect / Strava.
    const distanceKm = Number((summary.distanceKm ?? stats.distanceKm).toFixed(2));
    const movingSeconds = summary.movingSeconds ?? stats.movingSeconds;
    const startTime = stats.startTime ?? (parsed.time && !Number.isNaN(Date.parse(parsed.time)) ? new Date(parsed.time).toISOString() : null);

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
        durationSeconds: movingSeconds,
        ...calculatePace(distanceKm, movingSeconds),
        elevationGainMeters: summary.elevationGainMeters ?? stats.elevationGainMeters,
        heartRateAvg: parsed.heartRateAvg,
        caloriesBurned: parsed.calories ?? current.caloriesBurned,
        ...computeAllSplits(points),
        date: startTime ?? current.date,
        activityTitle: parsed.name?.trim() || current.activityTitle,
        locationName: current.locationName,
      },
    });
  },

  loadGpxString: async (gpxContent, fileName) => {
    try {
      get().loadActivity(parseGpxActivity(gpxContent), fileName);
    } catch (error) {
      set({
        gpxStatus: 'error',
        gpxError: error instanceof Error ? error.message : 'Could not read this GPX file.',
      });
    }
  },

  loadActivityFile: async (file) => {
    const lower = file.name.toLowerCase();
    if (!SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
      set({ gpxStatus: 'error', gpxError: 'Please choose a .gpx, .fit or .tcx file.' });
      return;
    }
    if (file.size > MAX_GPX_FILE_BYTES) {
      set({ gpxStatus: 'error', gpxError: 'Activity file is larger than 25 MB.' });
      return;
    }
    const loadId = ++latestLoadId;
    set({ gpxStatus: 'loading', gpxError: null });
    try {
      const parsed = await parseActivityFile(file);
      // A newer upload started while this one was parsing; drop the stale result.
      if (loadId !== latestLoadId) return;
      get().loadActivity(parsed, file.name);
    } catch (error) {
      if (loadId !== latestLoadId) return;
      set({
        gpxStatus: 'error',
        gpxError: error instanceof Error ? error.message : 'Could not read this file.',
      });
    }
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
