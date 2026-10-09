import { describe, expect, it } from 'vitest';
import { translate } from '@/lib/i18n';
import { ZH } from '@/lib/i18n-zh';
import { bestGrid, formatHoursMinutes, periodLabel, summarizeRuns, type RecapRun } from '@/lib/recap';

const run = (id: string, km: number, seconds: number, date: string | null): RecapRun => ({
  id,
  name: id,
  date,
  distanceKm: km,
  movingSeconds: seconds,
  elevationGainMeters: 10,
  points: [],
});

describe('recap', () => {
  it('sums totals and finds the longest run', () => {
    const totals = summarizeRuns([run('a', 5, 1500, null), run('b', 21.1, 6330, null), run('c', 10, 3000, null)]);
    expect(totals.runs).toBe(3);
    expect(totals.distanceKm).toBeCloseTo(36.1, 5);
    expect(totals.longest?.id).toBe('b');
    expect(totals.paceSecondsPerKm).toBe(300);
  });

  it('labels the period by month, range or year, in both languages', () => {
    const oct = [run('a', 5, 1, '2026-10-02T06:00:00Z'), run('b', 5, 1, '2026-10-28T06:00:00Z')];
    expect(periodLabel(oct, 'en')).toBe('October 2026');
    expect(periodLabel(oct, 'zh')).toBe('2026年10月');
    const range = [run('a', 5, 1, '2026-03-02T06:00:00Z'), run('b', 5, 1, '2026-10-28T06:00:00Z')];
    expect(periodLabel(range, 'en')).toBe('Mar – Oct 2026');
    expect(periodLabel(range, 'zh')).toBe('2026年3月–10月');
    const year = [run('a', 5, 1, '2026-01-02T06:00:00Z'), run('b', 5, 1, '2026-12-28T06:00:00Z')];
    expect(periodLabel(year, 'en')).toBe('2026');
    expect(periodLabel([], 'zh')).toBe('我的跑步');
  });

  it('formats totals as hours and minutes', () => {
    expect(formatHoursMinutes(45_296)).toBe('12h 35m');
    expect(formatHoursMinutes(1_500)).toBe('25m');
  });

  it('picks the grid with the largest square cells', () => {
    // 3×4 and 4×3 tie at 225 px cells in a square; either layout is correct.
    const square = bestGrid(12, 900, 900);
    expect(square.cell).toBe(225);
    expect(square.cols * square.rows).toBeGreaterThanOrEqual(12);
    expect(bestGrid(3, 900, 300)).toMatchObject({ cols: 3, rows: 1 });
    expect(bestGrid(1, 500, 500)).toMatchObject({ cols: 1, rows: 1 });
  });
});

describe('i18n', () => {
  it('fills placeholders and falls back to English for unknown text', () => {
    expect(translate('en', 'Run № {n}', { n: 7 })).toBe('Run № 7');
    expect(translate('zh', 'Run № {n}', { n: 7 })).toBe('第 7 跑');
    expect(translate('zh', 'A sentence nobody translated')).toBe('A sentence nobody translated');
  });

  it('keeps every placeholder intact in every Chinese string', () => {
    const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
    for (const [key, value] of Object.entries(ZH)) {
      expect(placeholders(value), key).toBe(placeholders(key));
    }
  });

  it('has no empty translations', () => {
    for (const [key, value] of Object.entries(ZH)) expect(value.trim(), key).not.toBe('');
  });
});
