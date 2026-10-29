import { readFileSync } from 'node:fs';
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

  test('the poster survives a reload', async ({ page }) => {
    await uploadActivity(page, 'test-run.gpx');
    await page.getByRole('button', { name: /Race Bib/ }).click();
    await page.locator('#metric-title').fill('Sunday Long Run');
    await page.waitForTimeout(1000); // autosave is debounced
    await page.reload();
    await expect(page.getByText('Picked up where you left off.')).toBeVisible();
    await expect(page.getByText('test-run.gpx')).toBeVisible();
    await expect(page.locator('#metric-title')).toHaveValue('Sunday Long Run');
    await expect(page.getByRole('button', { name: /Race Bib/ })).toHaveAttribute('aria-pressed', 'true');
  });

  test('Surprise me switches to another template', async ({ page }) => {
    const pressed = page.locator('button[aria-pressed=true]', { hasText: /Editorial|Cyberpunk|Minimal|Race Bib|Retro Mag|Stats Card/ });
    const before = await pressed.innerText();
    await page.getByRole('button', { name: 'Surprise me' }).click();
    await expect(pressed).not.toHaveText(before);
  });

  test('a file shared to the installed app opens on the device', async ({ page }) => {
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    const gpx = readFileSync(fixture('test-run.gpx'), 'utf8');
    // What Android's share sheet does: POST the file to the manifest's share_target.
    const landedOn = await page.evaluate(async (text) => {
      const form = new FormData();
      form.append('activity', new File([text], 'shared-run'));
      const res = await fetch('/share-target', { method: 'POST', body: form });
      return new URL(res.url).pathname + new URL(res.url).search;
    }, gpx);
    expect(landedOn).toBe('/studio?shared=1');
    await page.goto(landedOn);
    // The extension was missing, so it is sniffed from the contents.
    await expect(page.getByText('shared-run.gpx')).toBeVisible();
    await expect(page.locator('#metric-title')).toHaveValue('Bishan Park Easy Run');
    expect(new URL(page.url()).search).toBe('');
  });

  test('undo and redo design changes, by button and keyboard', async ({ page }) => {
    const bib = page.getByRole('button', { name: /Race Bib/ });
    const editorial = page.getByRole('button', { name: /Editorial/ });
    await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled();
    await bib.click();
    await expect(bib).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(editorial).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Control+Shift+Z');
    await expect(bib).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Control+Z');
    await expect(editorial).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Redo' })).toBeEnabled();
  });

  test('route video exports a playable 1080p MP4', async ({ page }) => {
    await uploadActivity(page, 'test-run.gpx');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Route video' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/\.mp4$/);
    const mp4 = readFileSync((await file.path())!);
    expect(mp4.subarray(4, 8).toString()).toBe('ftyp');
    // Decode it in a blank page: the app's CSP (rightly) has no media-src for blobs.
    const player = await page.context().newPage();
    const video = await player.evaluate(async (b64) => {
      const el = document.createElement('video');
      el.muted = true;
      el.src = URL.createObjectURL(new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type: 'video/mp4' }));
      await new Promise((resolve, reject) => {
        el.onloadedmetadata = resolve;
        el.onerror = () => reject(new Error(`video error ${el.error?.code}`));
      });
      return { width: el.videoWidth, height: el.videoHeight, duration: el.duration };
    }, mp4.toString('base64'));
    await player.close();
    expect(video.width).toBe(1080);
    expect(video.height).toBe(1920);
    expect(video.duration).toBeGreaterThan(4);
  });
});

test('fixtures exist', () => {
  // Guards against running the suite without the committed fixtures.
  expect(fixture('test-run.gpx')).toContain('test-run.gpx');
});
