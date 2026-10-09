import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, generateSampleRoute, metricsFromSample } from '@/lib/poster-presets';
import { sanitizePosterConfig } from '@/lib/preset-validation';
import { sanitizeRecipe } from '@/lib/recipe-validation';

describe('sanitizePosterConfig', () => {
  it('accepts the default config and never keeps a background photo', () => {
    const clean = sanitizePosterConfig({ ...DEFAULT_CONFIG, customOverlayImage: 'data:image/png;base64,AAAA' });
    expect(clean).not.toBeNull();
    expect(clean!.customOverlayImage).toBeNull();
    expect(clean!.templateId).toBe('magazine');
  });

  it('fills defaults for presets saved before newer fields existed', () => {
    const legacy: Record<string, unknown> = { ...DEFAULT_CONFIG };
    delete legacy.units;
    delete legacy.privacyZone;
    delete legacy.chart;
    delete legacy.stamp;
    const clean = sanitizePosterConfig(legacy)!;
    expect(clean.units).toBe('km');
    expect(clean.privacyZone).toBe(true);
    expect(clean.chart).toBe('elevation');
    expect(clean.stamp).toBe('qr');
  });

  it('rejects unknown templates, bad colors and wrong types', () => {
    expect(sanitizePosterConfig({ ...DEFAULT_CONFIG, templateId: 'comic-sans' })).toBeNull();
    expect(
      sanitizePosterConfig({ ...DEFAULT_CONFIG, palette: { ...DEFAULT_CONFIG.palette, accent: 'red; drop table' } })
    ).toBeNull();
    expect(sanitizePosterConfig({ ...DEFAULT_CONFIG, showRoute: 'yes' })).toBeNull();
    expect(sanitizePosterConfig({ ...DEFAULT_CONFIG, units: 'furlongs' })).toBeNull();
    expect(sanitizePosterConfig(null)).toBeNull();
    expect(sanitizePosterConfig('{}')).toBeNull();
  });

  it('drops unknown fields instead of storing them', () => {
    const clean = sanitizePosterConfig({ ...DEFAULT_CONFIG, __proto__: { admin: true }, evil: '<script>' })!;
    expect(Object.keys(clean)).not.toContain('evil');
  });
});

describe('sanitizeRecipe', () => {
  const route = generateSampleRoute().slice(0, 50).map(({ lat, lon, ele }) => ({ lat, lon, ele }));
  const recipe = { version: 1, metrics: metricsFromSample(generateSampleRoute()), config: DEFAULT_CONFIG, route };

  it('accepts a real poster recipe, splits included', () => {
    const clean = sanitizeRecipe(recipe);
    expect(clean).not.toBeNull();
    expect(clean!.route).toHaveLength(50);
    expect(clean!.metrics.splitsKm?.length).toBeGreaterThan(0);
  });

  it('rejects out-of-range coordinates, oversized routes and bad splits', () => {
    expect(sanitizeRecipe({ ...recipe, route: [{ lat: 91, lon: 0 }] })).toBeNull();
    expect(sanitizeRecipe({ ...recipe, route: Array.from({ length: 1001 }, () => ({ lat: 1, lon: 1 })) })).toBeNull();
    expect(sanitizeRecipe({ ...recipe, metrics: { ...recipe.metrics, splitsKm: [300, -5] } })).toBeNull();
    expect(sanitizeRecipe({ ...recipe, metrics: { ...recipe.metrics, distanceKm: 5000 } })).toBeNull();
    expect(sanitizeRecipe({ ...recipe, version: 2 })).toBeNull();
  });
});
