import { describe, expect, it } from 'vitest';
import type { RawGpxPoint } from '@/types/poster';
import { downsamplePoints, normalizeGpxCoordinates } from '@/lib/coordinate-normalizer';
import { calculatePace, computeTrackStats, haversineMeters } from '@/lib/gpx-calculator';
import { trimRouteEnds } from '@/lib/privacy';
import { computeSplits } from '@/lib/splits';

/** A straight line heading north in 10 m steps, one point every `stepSeconds`. */
function northLine(count: number, stepSeconds = 3, start = '2026-10-04T06:00:00Z'): RawGpxPoint[] {
  const t0 = Date.parse(start);
  return Array.from({ length: count }, (_, i) => ({
    lat: 1.3 + (i * 10) / 111_195,
    lon: 103.8,
    ele: 10,
    time: new Date(t0 + i * stepSeconds * 1000).toISOString(),
  }));
}

describe('haversineMeters', () => {
  it('measures one degree of latitude as ~111.2 km', () => {
    expect(haversineMeters({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).toBeCloseTo(111_195, -1);
  });
});

describe('computeTrackStats', () => {
  it('sums distance and moving time', () => {
    const stats = computeTrackStats(northLine(101));
    expect(stats.distanceKm).toBeCloseTo(1.0, 2);
    expect(stats.movingSeconds).toBe(300);
    expect(stats.startTime).toBe('2026-10-04T06:00:00.000Z');
  });

  it('excludes stops from moving time but not from elapsed time', () => {
    const pts = northLine(101);
    // Insert a 60 s pause at the same spot halfway.
    const stopAt = Date.parse(pts[50].time!) + 60_000;
    const withStop = [
      ...pts.slice(0, 51),
      { ...pts[50], time: new Date(stopAt).toISOString() },
      ...pts.slice(51).map((p) => ({ ...p, time: new Date(Date.parse(p.time!) + 60_000).toISOString() })),
    ];
    const stats = computeTrackStats(withStop);
    expect(stats.movingSeconds).toBe(300);
    expect(stats.elapsedSeconds).toBe(360);
  });

  it('ignores elevation noise below 3 m but counts real climbs', () => {
    const noisy = northLine(20).map((p, i) => ({ ...p, ele: 10 + (i % 2) })); // ±1 m jitter
    expect(computeTrackStats(noisy).elevationGainMeters).toBe(0);
    // +19 m in 1 m steps: counted in ≥3 m increments (10→13→…→28), so the final
    // +1 m wiggle is filtered like noise. That's the intended trade-off.
    const climb = northLine(20).map((p, i) => ({ ...p, ele: 10 + i }));
    expect(computeTrackStats(climb).elevationGainMeters).toBe(18);
  });
});

describe('calculatePace', () => {
  it('splits seconds per km into minutes and seconds', () => {
    expect(calculatePace(10, 2730)).toEqual({ paceMinutes: 4, paceSeconds: 33 });
  });
  it('returns zero pace for empty input', () => {
    expect(calculatePace(0, 100)).toEqual({ paceMinutes: 0, paceSeconds: 0 });
  });
});

describe('normalizeGpxCoordinates', () => {
  it('keeps every point inside the padded box and centers the route', () => {
    const pts = normalizeGpxCoordinates(northLine(50), 1000, 1000, 40);
    for (const p of pts) {
      expect(p.x).toBeGreaterThanOrEqual(40);
      expect(p.x).toBeLessThanOrEqual(960);
      expect(p.y).toBeGreaterThanOrEqual(40);
      expect(p.y).toBeLessThanOrEqual(960);
    }
    // A straight north-south line is vertical and centered horizontally.
    expect(pts[0].x).toBeCloseTo(500, 0);
    expect(pts[0].y).toBeGreaterThan(pts[pts.length - 1].y); // north is up
  });

  it('corrects longitude for latitude so shapes are not stretched', () => {
    // A square ~1 km per side at 60°N: 1 km of longitude is ~2x more degrees than latitude.
    const lat = 60;
    const dLat = 1000 / 111_195;
    const dLon = dLat / Math.cos((lat * Math.PI) / 180);
    const square = [
      { lat, lon: 10 },
      { lat: lat + dLat, lon: 10 },
      { lat: lat + dLat, lon: 10 + dLon },
      { lat, lon: 10 + dLon },
    ];
    const pts = normalizeGpxCoordinates(square, 1000, 1000, 0);
    const width = Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x));
    const height = Math.max(...pts.map((p) => p.y)) - Math.min(...pts.map((p) => p.y));
    expect(width / height).toBeCloseTo(1, 1);
  });

  it('handles empty input and single-location tracks', () => {
    expect(normalizeGpxCoordinates([], 100, 100)).toEqual([]);
    const same = normalizeGpxCoordinates([{ lat: 1, lon: 1 }, { lat: 1, lon: 1 }], 100, 100);
    expect(same.every((p) => p.x === 50 && p.y === 50)).toBe(true);
  });
});

describe('downsamplePoints', () => {
  it('keeps first and last points and respects the limit', () => {
    const src = Array.from({ length: 1000 }, (_, i) => i);
    const out = downsamplePoints(src, 100);
    expect(out).toHaveLength(100);
    expect(out[0]).toBe(0);
    expect(out[99]).toBe(999);
  });
});

describe('trimRouteEnds (privacy zone)', () => {
  it('removes about 200 m from each end of a long route', () => {
    const pts = northLine(301); // 3 km
    const trimmed = trimRouteEnds(pts);
    const removedStart = haversineMeters(pts[0], trimmed[0]);
    const removedEnd = haversineMeters(pts[pts.length - 1], trimmed[trimmed.length - 1]);
    expect(removedStart).toBeGreaterThanOrEqual(199);
    expect(removedStart).toBeLessThan(215);
    expect(removedEnd).toBeGreaterThanOrEqual(199);
    expect(removedEnd).toBeLessThan(215);
  });

  it('trims short routes proportionally instead of erasing them', () => {
    const short = northLine(31); // 300 m
    const trimmed = trimRouteEnds(short);
    expect(trimmed.length).toBeGreaterThan(2);
    expect(trimmed.length).toBeLessThan(short.length);
  });
});

describe('computeSplits', () => {
  it('produces one split per full km plus a normalized partial', () => {
    // 2.5 km at 3 s per 10 m → 300 s/km.
    const splits = computeSplits(northLine(251), 1000);
    expect(splits).toHaveLength(3);
    for (const s of splits) expect(s).toBeCloseTo(300, -1);
  });

  it('returns nothing without timestamps', () => {
    const untimed = northLine(200).map((p) => ({ lat: p.lat, lon: p.lon, ele: p.ele }));
    expect(computeSplits(untimed, 1000)).toEqual([]);
  });
});
