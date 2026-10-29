'use client';

import { currentRecipe, usePosterStore } from '@/store/usePosterStore';
import { sanitizeRecipe } from '@/lib/recipe-validation';
import { sanitizePosterConfig } from '@/lib/preset-validation';

const STORAGE_KEY = 'rp-studio-draft';
const SAVE_DELAY_MS = 600;

interface StoredDraft {
  recipe: unknown;
  isSample: boolean;
  fileName: string | null;
}

/**
 * Restores the poster the visitor was last working on in this browser.
 * A sample-route draft only brings back the style; a real run brings back
 * route and metrics too. Background photos are never stored.
 */
export function restoreDraft(): 'route' | 'style' | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const draft = JSON.parse(raw) as StoredDraft;
    const store = usePosterStore.getState();
    if (draft.isSample) {
      const recipe = draft.recipe as { config?: unknown } | null;
      const config = sanitizePosterConfig(recipe?.config);
      if (!config) return null;
      store.updateConfig({ ...config, customOverlayImage: null });
      return 'style';
    }
    const recipe = sanitizeRecipe(draft.recipe);
    if (!recipe) return null;
    store.loadRecipe(recipe);
    const fileName = typeof draft.fileName === 'string' ? draft.fileName.slice(0, 120) : null;
    usePosterStore.setState({ gpxFileName: fileName });
    return 'route';
  } catch {
    return null;
  }
}

/** Saves the poster (debounced) whenever it changes. Returns an unsubscribe function. */
export function autosaveDraft(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const save = () => {
    const { isSampleData, gpxFileName } = usePosterStore.getState();
    const draft: StoredDraft = { recipe: currentRecipe(), isSample: isSampleData, fileName: gpxFileName };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Private mode or full storage: the draft just won't survive a reload.
    }
  };

  const unsubscribe = usePosterStore.subscribe((state, prev) => {
    if (
      state.config === prev.config &&
      state.metrics === prev.metrics &&
      state.rawPoints === prev.rawPoints &&
      state.isSampleData === prev.isSampleData
    ) {
      return;
    }
    clearTimeout(timer);
    timer = setTimeout(save, SAVE_DELAY_MS);
  });

  // Flush a pending save when the tab is hidden (phones often kill background tabs).
  const onHide = () => {
    if (document.visibilityState === 'hidden' && timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
      save();
    }
  };
  document.addEventListener('visibilitychange', onHide);

  return () => {
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', onHide);
    unsubscribe();
  };
}
