import { describe, expect, it } from 'vitest';
import type { WorkoutMetrics } from '@/types/poster';
import { formatCoordinate, formatDuration, formatPace, parseDuration } from '@/lib/format';
import { displayDistance, displayElevation, paceParts, toKm, toMeters } from '@/lib/units';

const metrics = (paceMinutes: number, paceSeconds: number): WorkoutMetrics => ({
  distanceKm: 10,
  paceMinutes,
  paceSeconds,
  durationSeconds: 0,
  elevationGainMeters: 0,
  date: '2026-10-04T06:00:00Z',
  locationName: '',
  activityTitle: '',
});

describe('units', () => {
  it('converts distance both ways', () => {
    expect(displayDistance(10, 'mi')).toBeCloseTo(6.2137, 3);
    expect(toKm(displayDistance(10, 'mi'), 'mi')).toBeCloseTo(10, 6);
    expect(displayDistance(10, 'km')).toBe(10);
    expect(displayDistance(10, undefined)).toBe(10);
  });

  it('converts elevation to feet for miles', () => {
    expect(displayElevation(100, 'mi')).toBeCloseTo(328.08, 1);
    expect(toMeters(displayElevation(100, 'mi'), 'mi')).toBeCloseTo(100, 6);
  });

  it('converts pace per km to pace per mile', () => {
    // 5:00 /km = 8:03 /mi (300 × 1.609344 = 482.8 s).
    expect(paceParts(metrics(5, 0), 'mi')).toEqual({ minutes: 8, seconds: 3 });
    expect(paceParts(metrics(5, 0), 'km')).toEqual({ minutes: 5, seconds: 0 });
  });
});

describe('format', () => {
  it('formats durations with and without hours', () => {
    expect(formatDuration(2730)).toBe('45:30');
    expect(formatDuration(5025)).toBe('1:23:45');
  });

  it('parses the formats people type', () => {
    expect(parseDuration('1:23:45')).toBe(5025);
    expect(parseDuration('45:30')).toBe(2730);
    expect(parseDuration('45')).toBe(2700);
    expect(parseDuration('abc')).toBeNull();
    expect(parseDuration('')).toBeNull();
  });

  it('pads pace notation', () => {
    expect(formatPace(4, 5)).toBe(`04'05"`);
  });

  it('prints coordinates coarsely so a home address is never revealed', () => {
    expect(formatCoordinate(1.2903, 'lat')).toBe(`N 1°17'`);
    expect(formatCoordinate(-33.8568, 'lat')).toBe(`S 33°51'`);
    expect(formatCoordinate(103.8519, 'lon')).toBe(`E 103°51'`);
    expect(formatCoordinate(-122.4194, 'lon')).toBe(`W 122°25'`);
  });
});
