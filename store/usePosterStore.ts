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
import { downsamplePoints, normalizeGpxCoordinates } from '@/lib/coordinate-normalizer';
import { calculatePace, computeTrackStats, extractAverageHeartRate } from '@/lib/gpx-calculator';
import {
  DEFAULT_CONFIG,
  MAX_ROUTE_POINTS,
  ROUTE_VIEWBOX,
  contrastModeFor,
  generateSampleRoute,
  metricsFromSample,
} from '@/lib/poster-presets';

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
}

function projectRoute(rawPoints: RawGpxPoint[]) {
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

function finiteOr(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/** Guards against an older, slower parse overwriting a newer upload. */
let latestLoadId = 0;

const sampleRoute = generateSampleRoute();

export const usePosterStore = create<PosterState>()((set, get) => ({
  metrics: metricsFromSample(sampleRoute),
  config: DEFAULT_CONFIG,
  ...projectRoute(sampleRoute),
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

  setTemplate: (templateId) => get().updateConfig({ templateId }),
  setAspectRatio: (aspectRatio) => get().updateConfig({ aspectRatio }),
  setPalette: (palette) => get().updateConfig({ palette }),

  setRoute: (rawPoints) => set(projectRoute(rawPoints)),

  loadGpxString: async (gpxContent, fileName) => {
    const loadId = ++latestLoadId;
    set({ gpxStatus: 'loading', gpxError: null });

    try {
      // Loaded on demand: gpxparser needs the browser DOMParser and is not needed for first paint.
      const { default: GpxParser } = await import('gpxparser');
      const gpx = new GpxParser();
      gpx.parse(gpxContent);

      const sourcePoints = [
        ...gpx.tracks.flatMap((track) => track.points),
        ...(gpx.tracks.length === 0 ? gpx.routes.flatMap((route) => route.points) : []),
      ];

      const points: RawGpxPoint[] = sourcePoints
        .filter((pt) => Number.isFinite(pt.lat) && Number.isFinite(pt.lon))
        .map((pt) => {
          const time = pt.time instanceof Date && !Number.isNaN(pt.time.getTime()) ? pt.time : null;
          return {
            lat: pt.lat,
            lon: pt.lon,
            ele: finiteOr(pt.ele),
            time: time ? time.toISOString() : undefined,
          };
        });

      if (points.length < 2) {
        throw new Error('No GPS track found. Make sure the file contains <trkpt> or <rtept> points.');
      }

      const stats = computeTrackStats(points);
      const heartRateAvg = extractAverageHeartRate(gpxContent);
      const distanceKm = Number(stats.distanceKm.toFixed(2));
      const title = gpx.tracks[0]?.name || gpx.routes[0]?.name || gpx.metadata?.name;
      const metadataTime = gpx.metadata?.time ? new Date(gpx.metadata.time) : null;

      if (loadId !== latestLoadId) return;

      const current = get().metrics;
      set({
        ...projectRoute(points),
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
      ...projectRoute(sampleRoute),
      metrics: metricsFromSample(sampleRoute),
      isSampleData: true,
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
