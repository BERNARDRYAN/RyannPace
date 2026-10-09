// FIT is binary and needs no DOM, so this runs in plain Node. (Under a DOM test
// environment, ArrayBuffer comes from a different realm and fit-file-parser
// misreads it; real browsers are covered by the end-to-end tests.)
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseFit } from '@/lib/activity-parsers';

const fixture = (name: string) => resolve(process.cwd(), 'tests/fixtures', name);

describe('FIT', () => {
  const bytes = readFileSync(fixture('test-run.fit'));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

  it('decodes GPS records in degrees and the session summary', async () => {
    const parsed = await parseFit(buffer);
    expect(parsed.points).toHaveLength(901);
    expect(parsed.points[0].lat).toBeCloseTo(1.3521, 3);
    expect(parsed.points[0].lon).toBeCloseTo(103.8303, 3);
    expect(parsed.points[0].ele).toBeCloseTo(30, 0);
    expect(parsed.summary).toMatchObject({ movingSeconds: 1780, elevationGainMeters: 61 });
    expect(parsed.summary?.distanceKm).toBeCloseTo(6.95, 5);
    expect(parsed.heartRateAvg).toBe(151);
    expect(parsed.calories).toBe(412);
  });

  it('rejects files that are not FIT', async () => {
    await expect(parseFit(new TextEncoder().encode('<gpx></gpx> not a fit file').buffer)).rejects.toThrow(
      'not a valid FIT file'
    );
  });
});
