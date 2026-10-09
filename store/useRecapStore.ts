'use client';

import { create } from 'zustand';
import type { AspectRatio, ColorPalette, DistanceUnit } from '@/types/poster';
import { parseActivityFile, SUPPORTED_EXTENSIONS } from '@/lib/activity-parsers';
import { MAX_RECAP_RUNS, periodLabel, sampleRecapRuns, toRecapRun, type RecapRun } from '@/lib/recap';
import { MAGAZINE_PALETTES, contrastModeFor } from '@/lib/poster-presets';
import { tr } from '@/store/useLocaleStore';

const MAX_FILE_BYTES = 25 * 1024 * 1024;

export interface RecapConfig {
  title: string;
  /** False until the user types a title; until then it follows the runs' dates. */
  titleEdited: boolean;
  palette: ColorPalette;
  contrastMode: 'dark' | 'light';
  aspectRatio: AspectRatio;
  units: DistanceUnit;
  privacyZone: boolean;
  watermarkText: string;
}

interface RecapState {
  runs: RecapRun[];
  config: RecapConfig;
  loading: boolean;
  errors: string[];
  addFiles: (files: File[]) => Promise<void>;
  removeRun: (id: string) => void;
  clear: () => void;
  updateConfig: (patch: Partial<RecapConfig>) => void;
  dismissErrors: () => void;
  loadSample: () => void;
}

const byDate = (a: RecapRun, b: RecapRun) => (a.date ?? '').localeCompare(b.date ?? '');

export const useRecapStore = create<RecapState>()((set, get) => ({
  runs: [],
  config: {
    title: 'My Runs',
    titleEdited: false,
    palette: MAGAZINE_PALETTES[0],
    contrastMode: contrastModeFor(MAGAZINE_PALETTES[0]),
    aspectRatio: '9:16',
    units: 'km',
    privacyZone: true,
    watermarkText: 'RyannPace',
  },
  loading: false,
  errors: [],

  addFiles: async (files) => {
    set({ loading: true, errors: [] });
    const errors: string[] = [];
    const added: RecapRun[] = [];
    const room = MAX_RECAP_RUNS - get().runs.length;

    for (const file of files.slice(0, Math.max(0, room))) {
      const lower = file.name.toLowerCase();
      if (!SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
        errors.push(tr('{file}: not a GPX, FIT or TCX file.', { file: file.name }));
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        errors.push(tr('{file}: larger than 25 MB.', { file: file.name }));
        continue;
      }
      try {
        const run = toRecapRun(await parseActivityFile(file), file.name.replace(/\.[^.]+$/, ''));
        if (run) added.push(run);
        else errors.push(tr('{file}: no GPS track (indoor activity?).', { file: file.name }));
      } catch (error) {
        errors.push(`${file.name}: ${tr(error instanceof Error ? error.message : 'could not be read.')}`);
      }
    }
    if (files.length > room) errors.push(tr('Only {max} runs fit on one recap; extra files were skipped.', { max: MAX_RECAP_RUNS }));

    const runs = [...get().runs, ...added].sort(byDate);
    const { config } = get();
    set({
      runs,
      loading: false,
      errors,
      config: config.titleEdited ? config : { ...config, title: periodLabel(runs) },
    });
  },

  removeRun: (id) => {
    const runs = get().runs.filter((r) => r.id !== id);
    const { config } = get();
    set({ runs, config: config.titleEdited ? config : { ...config, title: periodLabel(runs) } });
  },

  clear: () => set((s) => ({ runs: [], errors: [], config: { ...s.config, title: 'My Runs', titleEdited: false } })),

  updateConfig: (patch) =>
    set((s) => {
      const config = { ...s.config, ...patch };
      if (patch.palette) config.contrastMode = contrastModeFor(patch.palette);
      return { config };
    }),

  dismissErrors: () => set({ errors: [] }),

  loadSample: () => {
    const runs = sampleRecapRuns();
    set((s) => ({ runs, errors: [], config: { ...s.config, title: periodLabel(runs), titleEdited: false } }));
  },
}));
