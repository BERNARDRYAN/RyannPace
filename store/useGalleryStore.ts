'use client';

import { create } from 'zustand';
import type { GalleryPoster, GalleryPosterDetail, PosterRecipe } from '@/types/gallery';

type Result<T = undefined> = { ok: true; data: T } | { ok: false; status: number; error: string };

async function request<T>(input: string, init?: RequestInit): Promise<Result<T>> {
  try {
    const res = await fetch(input, { ...init, credentials: 'same-origin', cache: 'no-store' });
    if (res.status === 204) return { ok: true, data: undefined as T };
    const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
    if (!res.ok) return { ok: false, status: res.status, error: body?.error ?? `Request failed (${res.status}).` };
    return { ok: true, data: body as T };
  } catch {
    return { ok: false, status: 0, error: 'Network error. Check your connection.' };
  }
}

export type GalleryStatus = 'idle' | 'loading' | 'ready' | 'error';

interface GalleryState {
  posters: GalleryPoster[];
  status: GalleryStatus;
  error: string | null;
  /** Recipe JSON of the last poster saved, so re-exporting an unchanged poster doesn't duplicate it. */
  lastSavedRecipe: string | null;

  load: () => Promise<void>;
  reset: () => void;
  /** Saves a poster unless it is identical to the last one saved. `skipped` = duplicate. */
  save: (recipe: PosterRecipe, thumbnail: Blob) => Promise<Result<{ skipped: boolean }>>;
  fetchDetail: (id: string) => Promise<Result<GalleryPosterDetail>>;
  remove: (id: string) => Promise<Result>;
}

export const useGalleryStore = create<GalleryState>()((set, get) => ({
  posters: [],
  status: 'idle',
  error: null,
  lastSavedRecipe: null,

  load: async () => {
    set({ status: 'loading', error: null });
    const res = await request<{ posters: GalleryPoster[] }>('/api/posters');
    if (res.ok) set({ posters: res.data.posters, status: 'ready' });
    else set({ status: 'error', error: res.error });
  },

  reset: () => set({ posters: [], status: 'idle', error: null, lastSavedRecipe: null }),

  save: async (recipe, thumbnail) => {
    const recipeJson = JSON.stringify(recipe);
    if (recipeJson === get().lastSavedRecipe) return { ok: true, data: { skipped: true } };

    const form = new FormData();
    form.append('recipe', recipeJson);
    form.append('thumbnail', thumbnail, thumbnail.type === 'image/webp' ? 'thumb.webp' : 'thumb.jpg');

    const res = await request<{ poster: GalleryPoster }>('/api/posters', { method: 'POST', body: form });
    if (!res.ok) return res;
    set((state) => ({
      lastSavedRecipe: recipeJson,
      // Only prepend when the gallery list is loaded; otherwise the next load picks it up.
      posters: state.status === 'ready' ? [res.data.poster, ...state.posters] : state.posters,
    }));
    return { ok: true, data: { skipped: false } };
  },

  fetchDetail: async (id) => {
    const res = await request<{ poster: GalleryPosterDetail }>(`/api/posters/${encodeURIComponent(id)}`);
    return res.ok ? { ok: true, data: res.data.poster } : res;
  },

  remove: async (id) => {
    const previous = get().posters;
    set({ posters: previous.filter((p) => p.id !== id) });
    const res = await request<undefined>(`/api/posters/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 404) {
      set({ posters: previous });
      return res;
    }
    return { ok: true, data: undefined };
  },
}));
