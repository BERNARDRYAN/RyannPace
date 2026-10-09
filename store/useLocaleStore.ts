'use client';

import { useCallback } from 'react';
import { create } from 'zustand';
import { detectLocale, translate, type Locale, type Vars } from '@/lib/i18n';

const STORAGE_KEY = 'rp-locale';

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Reads the saved choice or the browser language. Called once on mount. */
  init: () => void;
}

function applyToDocument(locale: Locale) {
  document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
}

export const useLocaleStore = create<LocaleState>()((set) => ({
  // English on the server and during hydration; the saved/browser choice applies right after.
  locale: 'en',
  setLocale: (locale) => {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // Private mode / blocked storage: the choice just won't persist.
    }
    applyToDocument(locale);
    set({ locale });
  },
  init: () => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {}
    const locale: Locale = saved === 'zh' || saved === 'en' ? saved : detectLocale();
    applyToDocument(locale);
    set({ locale });
  },
}));

/** Reactive translator for components: `const t = useT(); t('Export PNG')`. */
export function useT() {
  const locale = useLocaleStore((s) => s.locale);
  return useCallback((text: string, vars?: Vars) => translate(locale, text, vars), [locale]);
}

/** Non-reactive translator for stores and one-off messages (toasts, errors). */
export function tr(text: string, vars?: Vars): string {
  return translate(useLocaleStore.getState().locale, text, vars);
}
