'use client';

import { create } from 'zustand';
import type { PosterConfig, UserPreset } from '@/types/poster';

export interface AccountUser {
  id: string;
  email: string | null;
}

export type AccountStatus = 'unknown' | 'unavailable' | 'signed-out' | 'signed-in';

export interface Notice {
  kind: 'success' | 'error';
  text: string;
}

type Result = { ok: true } | { ok: false; error: string };

interface AccountState {
  status: AccountStatus;
  user: AccountUser | null;
  presets: UserPreset[];
  presetsLoading: boolean;
  signInOpen: boolean;
  notice: Notice | null;

  init: () => Promise<void>;
  openSignIn: () => void;
  closeSignIn: () => void;
  requestMagicLink: (email: string) => Promise<Result>;
  signOut: () => Promise<void>;
  loadPresets: () => Promise<void>;
  savePreset: (presetName: string, config: PosterConfig) => Promise<Result>;
  deletePreset: (id: string) => Promise<Result>;
  showNotice: (notice: Notice) => void;
  dismissNotice: () => void;
}

/** Calls one of our own BFF routes and normalizes errors into a message. */
async function callApi<T>(input: string, init?: RequestInit): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  try {
    const res = await fetch(input, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
      credentials: 'same-origin',
      cache: 'no-store',
    });
    if (res.status === 204) return { ok: true, data: undefined as T };
    const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
    if (!res.ok) {
      return { ok: false, status: res.status, error: body?.error ?? `Request failed (${res.status}).` };
    }
    return { ok: true, data: body as T };
  } catch {
    return { ok: false, status: 0, error: 'Network error. Check your connection.' };
  }
}

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  otp_expired: 'That sign-in link has expired. Request a new one.',
  pkce_code_verifier_not_found: 'Open the sign-in link in the same browser you requested it from.',
  bad_code_verifier:'Open the sign-in link in the same browser you requested it from.',
  flow_state_not_found: 'Open the sign-in link in the same browser you requested it from.',
};

/** Reads and strips ?auth=… left by /auth/callback so a refresh doesn't repeat the notice. */
function consumeAuthRedirect(): Notice | null {
  const url = new URL(window.location.href);
  const outcome = url.searchParams.get('auth');
  if (!outcome) return null;
  const reason = url.searchParams.get('reason') ?? '';
  url.searchParams.delete('auth');
  url.searchParams.delete('reason');
  window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  if (outcome === 'signed-in') return { kind: 'success', text: 'Signed in. Your presets are ready.' };
  return { kind: 'error', text: AUTH_ERROR_MESSAGES[reason] ?? 'Sign-in failed. Please request a new link.' };
}

let noticeTimer: ReturnType<typeof setTimeout> | undefined;

export const useAccountStore = create<AccountState>()((set, get) => ({
  status: 'unknown',
  user: null,
  presets: [],
  presetsLoading: false,
  signInOpen: false,
  notice: null,

  init: async () => {
    const redirectNotice = consumeAuthRedirect();
    if (redirectNotice) get().showNotice(redirectNotice);

    const res = await callApi<{ configured: boolean; user: AccountUser | null }>('/api/auth/session');
    if (!res.ok || !res.data.configured) {
      set({ status: 'unavailable', user: null, presets: [] });
      return;
    }
    if (!res.data.user) {
      set({ status: 'signed-out', user: null, presets: [] });
      return;
    }
    set({ status: 'signed-in', user: res.data.user });
    await get().loadPresets();
  },

  openSignIn: () => set({ signInOpen: true }),
  closeSignIn: () => set({ signInOpen: false }),

  requestMagicLink: async (email) => {
    const res = await callApi<{ ok: true }>('/api/auth/sign-in', {
      method: 'POST',
      body: JSON.stringify({ email, next: window.location.pathname }),
    });
    return res.ok ? { ok: true } : { ok: false, error: res.error };
  },

  signOut: async () => {
    await callApi('/api/auth/sign-out', { method: 'POST' });
    set({ status: 'signed-out', user: null, presets: [] });
    get().showNotice({ kind: 'success', text: 'Signed out.' });
  },

  loadPresets: async () => {
    set({ presetsLoading: true });
    const res = await callApi<{ presets: UserPreset[] }>('/api/presets');
    if (res.ok) {
      set({ presets: res.data.presets, presetsLoading: false });
      return;
    }
    set({ presetsLoading: false });
    if (res.status === 401) {
      set({ status: 'signed-out', user: null, presets: [] });
    } else {
      get().showNotice({ kind: 'error', text: res.error });
    }
  },

  savePreset: async (presetName, config) => {
    const res = await callApi<{ preset: UserPreset }>('/api/presets', {
      method: 'POST',
      body: JSON.stringify({ presetName, config }),
    });
    if (!res.ok) {
      if (res.status === 401) set({ status: 'signed-out', user: null, presets: [] });
      return { ok: false, error: res.error };
    }
    set((state) => ({ presets: [res.data.preset, ...state.presets] }));
    return { ok: true };
  },

  deletePreset: async (id) => {
    const previous = get().presets;
    set({ presets: previous.filter((p) => p.id !== id) });
    const res = await callApi<void>(`/api/presets?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 404) {
      set({ presets: previous });
      return { ok: false, error: res.error };
    }
    return { ok: true };
  },

  showNotice: (notice) => {
    clearTimeout(noticeTimer);
    set({ notice });
    noticeTimer = setTimeout(() => set({ notice: null }), 5000);
  },

  dismissNotice: () => {
    clearTimeout(noticeTimer);
    set({ notice: null });
  },
}));
