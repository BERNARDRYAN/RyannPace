import { ZH } from '@/lib/i18n-zh';

export type Locale = 'en' | 'zh';
export const LOCALES: Locale[] = ['en', 'zh'];

export type Vars = Record<string, string | number>;

/**
 * English text doubles as the translation key, so components read naturally
 * and anything missing from a dictionary falls back to English instead of
 * breaking. `{name}` placeholders are filled from `vars` in every language.
 */
export function translate(locale: Locale, text: string, vars?: Vars): string {
  const template = locale === 'zh' ? (ZH[text] ?? text) : text;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}

export function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return 'en';
  return navigator.languages?.some((l) => l.toLowerCase().startsWith('zh')) ? 'zh' : 'en';
}

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "09 OCT 2026" / "2026年10月9日" */
export function formatDateLong(iso: string, locale: Locale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  if (locale === 'zh') return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS_EN[d.getMonth()].slice(0, 3).toUpperCase()} ${d.getFullYear()}`;
}

/** "October 2026" / "2026年10月" */
export function formatMonthYear(year: number, month: number, locale: Locale): string {
  return locale === 'zh' ? `${year}年${month + 1}月` : `${MONTHS_EN[month]} ${year}`;
}

/** "Mar – Oct 2026" / "2026年3月–10月" */
export function formatMonthRange(year: number, from: number, to: number, locale: Locale): string {
  return locale === 'zh'
    ? `${year}年${from + 1}月–${to + 1}月`
    : `${MONTHS_EN[from].slice(0, 3)} – ${MONTHS_EN[to].slice(0, 3)} ${year}`;
}
