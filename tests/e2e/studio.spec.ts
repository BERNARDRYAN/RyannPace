import { expect, test } from '@playwright/test';
import { decodeQr, exportPng, fixture, openStudio, pngSize, posterText, uploadActivity, watchProblems } from './helpers';

test.describe('Studio', () => {
  let problems: string[];
  test.beforeEach(async ({ page }) => {
    problems = watchProblems(page);
    await openStudio(page);
  });
  test.afterEach(() => expect(problems, problems.join('\n')).toEqual([]));

  test('GPX upload fills metrics, excluding stops from moving time', async ({ page }) => {
    await uploadActivity(page, 'test-run.gpx');
    await expect(page.locator('#metric-title')).toHaveValue('Bishan Park Easy Run');
    await expect(page.locator('#metric-distance')).toHaveValue('6.89');
    // 899 × 2 s moving; the 60 s stop is excluded (elapsed would be 30:58).
    await expect(page.locator('#metric-duration')).toHaveValue('29:58');
    await expect(page.locator('#metric-hr')).toHaveValue('150');
    await expect(page.locator('[data-poster-root] h1')).toHaveText('Bishan Park Easy Run');
  });

  test('FIT and TCX use the watch’s own totals', async ({ page }) => {
    await uploadActivity(page, 'test-run.fit');
    await expect(page.locator('#metric-distance')).toHaveValue('6.95');
    await expect(page.locator('#metric-duration')).toHaveValue('29:40');
    await expect(page.locator('#metric-elevation')).toHaveValue('61');
    await expect(page.locator('#metric-kcal')).toHaveValue('412');

    await uploadActivity(page, 'test-run.tcx');
    await expect(page.locator('#metric-title')).toHaveValue('Bishan Park Tempo');
    await expect(page.locator('#metric-duration')).toHaveValue('29:40');
  });

  test('miles convert distance, pace and elevation', async ({ page }) => {
    await uploadActivity(page, 'test-run.fit');
    await page.getByRole('radio', { name: 'Miles' }).click();
    await expect(page.locator('#metric-distance')).toHaveValue('4.32');
    await expect(page.locator('#metric-elevation')).toHaveValue('200');
    const text = await posterText(page);
    expect(text).toMatch(/MIN \/ MI/i);
    expect(text).toMatch(/\d+ft/);
  });

  test('splits chart shows one bar per km', async ({ page }) => {
    await uploadActivity(page, 'test-run.gpx');
    await page.getByRole('radio', { name: 'Splits' }).click();
    await expect(page.locator('[data-poster-root] svg[aria-label="Splits"] rect')).toHaveCount(7);
  });

  test('privacy zone is on by default and trims the drawn route', async ({ page }) => {
    await uploadActivity(page, 'test-run.gpx');
    const route = page.locator('[data-poster-root] svg[aria-label="Route map"] path').last();
    const trimmed = (await route.getAttribute('d'))!.split('L').length;
    await page.getByRole('switch', { name: /Privacy zone/ }).click();
    const full = (await route.getAttribute('d'))!.split('L').length;
    expect(trimmed).toBeLessThan(full);
  });

  test('invalid files show a friendly error', async ({ page }) => {
    await page.locator('input[type=file][accept*=gpx]').setInputFiles({
      name: 'broken.gpx',
      mimeType: 'application/gpx+xml',
      buffer: Buffer.from('this is not xml'),
    });
    // Next.js adds its own empty role=alert route announcer, so match by text.
    await expect(page.getByRole('alert').filter({ hasText: 'not valid GPX/XML' })).toBeVisible();
  });

  test('exports a 2x 9:16 PNG with a scannable QR code', async ({ page }) => {
    const png = await exportPng(page);
    expect(pngSize(png)).toEqual({ width: 2160, height: 3840 });
    expect(decodeQr(png)).toMatch(/\/\?ref=poster$/);
  });

  for (const template of ['Cyberpunk', 'Minimal', 'Race Bib', 'Retro Mag', 'Stats Card'] as const) {
    test(`${template} exports at 1x and its QR scans`, async ({ page }) => {
      await page.getByRole('radio', { name: /^1x/ }).click();
      await page.getByRole('button', { name: new RegExp(template) }).click();
      await page.getByRole('radio', { name: /1:1/ }).first().click();
      const png = await exportPng(page);
      expect(pngSize(png)).toEqual({ width: 1080, height: 1080 });
      expect(decodeQr(png)).toMatch(/\/\?ref=poster$/);
    });
  }

  test('background photo still exports', async ({ page }) => {
    await page.getByRole('radio', { name: /^1x/ }).click();
    const first = await exportPng(page);
    await page.locator('input[type=file][accept="image/*"]').setInputFiles({
      name: 'photo.png',
      mimeType: 'image/png',
      buffer: first,
    });
    await expect(page.locator('[data-poster-root] img[src^="data:image"]')).toBeVisible();
    const withPhoto = await exportPng(page);
    expect(pngSize(withPhoto)).toEqual({ width: 1080, height: 1920 });
  });
});

test('fixtures exist', () => {
  // Guards against running the suite without the committed fixtures.
  expect(fixture('test-run.gpx')).toContain('test-run.gpx');
});
