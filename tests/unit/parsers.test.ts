// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseGpxActivity, parseTcx } from '@/lib/activity-parsers';
import { parseGpx } from '@/lib/gpx-parser';

// The DOM test environment replaces `location`, so resolve from the project root.
const fixture = (name: string) => resolve(process.cwd(), 'tests/fixtures', name);

describe('GPX', () => {
  const xml = readFileSync(fixture('test-run.gpx'), 'utf8');

  it('reads points, name, elevation, time and heart rate', () => {
    const parsed = parseGpxActivity(xml);
    expect(parsed.points).toHaveLength(901);
    expect(parsed.name).toBe('Bishan Park Easy Run');
    expect(parsed.points[0].ele).toBeCloseTo(30, 0);
    expect(parsed.points[0].time).toMatch(/^2026-10-05T23:15:02/);
    expect(parsed.heartRateAvg).toBe(150);
  });

  it('falls back to route points for route-only files', () => {
    const routeOnly = `<gpx><rte><name>Planned</name><rtept lat="1" lon="2"/><rtept lat="1.01" lon="2.01"/></rte></gpx>`;
    const parsed = parseGpx(routeOnly);
    expect(parsed.points).toHaveLength(2);
    expect(parsed.name).toBe('Planned');
  });

  it('skips points with impossible coordinates', () => {
    const bad = `<gpx><trk><trkseg><trkpt lat="999" lon="0"/><trkpt lat="1" lon="2"/><trkpt lat="abc" lon="1"/></trkseg></trk></gpx>`;
    expect(parseGpx(bad).points).toEqual([{ lat: 1, lon: 2 }]);
  });

  it('rejects malformed XML', () => {
    expect(() => parseGpx('this is not xml')).toThrow('not valid GPX/XML');
  });
});

describe('TCX', () => {
  const xml = readFileSync(fixture('test-run.tcx'), 'utf8');

  it('reads trackpoints and prefers the lap totals', () => {
    const parsed = parseTcx(xml);
    expect(parsed.points).toHaveLength(901);
    expect(parsed.name).toBe('Bishan Park Tempo');
    expect(parsed.summary?.distanceKm).toBeCloseTo(6.95, 5);
    expect(parsed.summary?.movingSeconds).toBe(1780);
    expect(parsed.calories).toBe(412);
    expect(parsed.heartRateAvg).toBe(150);
  });
});
