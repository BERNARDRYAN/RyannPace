'use client';

import { create } from 'zustand';
import { usePosterStore } from '@/store/usePosterStore';

/*
 * Undo/redo for the studio poster. Watches the poster store and records the
 * previous state whenever the design, metrics or route change. Rapid edits
 * (typing a title, dragging a slider) collapse into one step.
 */

const LIMIT = 50;
const COALESCE_MS = 700;

type PosterState = ReturnType<typeof usePosterStore.getState>;
type Snapshot = Pick<PosterState, 'config' | 'metrics' | 'rawPoints' | 'routePoints' | 'isSampleData' | 'gpxFileName'>;

const snapshot = (s: PosterState): Snapshot => ({
  config: s.config,
  metrics: s.metrics,
  rawPoints: s.rawPoints,
  routePoints: s.routePoints,
  isSampleData: s.isSampleData,
  gpxFileName: s.gpxFileName,
});

let past: Snapshot[] = [];
let future: Snapshot[] = [];
let lastPushAt = 0;
let applying = false;

export const useHistoryStore = create<{ canUndo: boolean; canRedo: boolean }>()(() => ({
  canUndo: false,
  canRedo: false,
}));

const publish = () => useHistoryStore.setState({ canUndo: past.length > 0, canRedo: future.length > 0 });

function apply(target: Snapshot) {
  applying = true;
  usePosterStore.setState({ ...target, gpxStatus: 'idle', gpxError: null });
  applying = false;
  lastPushAt = 0;
  publish();
}

export function undo() {
  const previous = past.pop();
  if (!previous) return;
  future.push(snapshot(usePosterStore.getState()));
  apply(previous);
}

export function redo() {
  const next = future.pop();
  if (!next) return;
  past.push(snapshot(usePosterStore.getState()));
  apply(next);
}

/** Forgets all history, e.g. after restoring a saved draft. */
export function clearHistory() {
  past = [];
  future = [];
  lastPushAt = 0;
  publish();
}

/** Starts recording changes. Returns a function that stops recording. */
export function trackHistory(): () => void {
  return usePosterStore.subscribe((state, prev) => {
    if (applying) return;
    if (
      state.config === prev.config &&
      state.metrics === prev.metrics &&
      state.rawPoints === prev.rawPoints &&
      state.isSampleData === prev.isSampleData
    ) {
      return;
    }
    const now = Date.now();
    // Within a burst of edits, keep the state from before the burst as the undo point.
    if (now - lastPushAt > COALESCE_MS) {
      past.push(snapshot(prev));
      if (past.length > LIMIT) past.shift();
    }
    lastPushAt = now;
    future = [];
    publish();
  });
}
