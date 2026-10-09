import { expect, test } from '@playwright/test';
import { fixture, posterText, watchProblems } from './helpers';

test('landing page renders real posters without errors', async ({ page }) => {
  const problems = watchProblems(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('magazine cover');
  await expect(page.getByRole('link', { name: /Open the studio/ }).first()).toBeVisible();
  await page.getByRole('link', { name: /Open the studio/ }).first().click();
  await expect(page).toHaveURL(/\/studio$/);
  expect(problems, problems.join('\n')).toEqual([]);
});

test('phone layout: no sideways scrolling and the bottom sheet works', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  for (const path of ['/', '/studio', '/recap', '/gallery']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${path} scrolls sideways`).toBeLessThanOrEqual(0);
  }
  await page.goto('/studio');
  await page.getByRole('button', { name: 'Style' }).click();
  await expect(page.getByRole('heading', { name: /Template/ })).toBeVisible();
  await page.getByRole('button', { name: 'Export' }).click();
  await expect(page.getByRole('button', { name: /Export PNG/ })).toBeVisible();
  await context.close();
});

test('recap combines several runs', async ({ page }) => {
  const problems = watchProblems(page);
  await page.goto('/recap');
  await page.getByRole('button', { name: 'Try with sample runs' }).click();
  await expect(page.locator('#recap-title')).toHaveValue('October 2026');
  await page.getByRole('button', { name: 'Clear all' }).click();

  await page
    .locator('input[type=file][multiple]')
    .setInputFiles(['test-run.gpx', 'test-run.fit', 'test-run.tcx'].map(fixture));
  await expect(page.locator('aside ul li')).toHaveCount(3);
  const text = await posterText(page);
  expect(text).toContain('20.8');
  expect(text).toContain('1h 29m');
  expect(text).toContain('171');
  expect(problems, problems.join('\n')).toEqual([]);
});

test('Chinese language switch translates the UI and posters, and persists', async ({ page }) => {
  await page.goto('/studio');
  await page.getByRole('button', { name: '切换到中文' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.getByRole('link', { name: '工作室' })).toBeVisible();
  expect(await posterText(page)).toContain('平均配速');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.getByRole('link', { name: '作品集' })).toBeVisible();
});

test('404 page', async ({ page }) => {
  const res = await page.goto('/this-page-does-not-exist');
  expect(res?.status()).toBe(404);
  await expect(page.getByText('off route')).toBeVisible();
});

test('security headers are sent', async ({ request }) => {
  const res = await request.get('/studio');
  const h = res.headers();
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(h['x-frame-options']).toBe('DENY');
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(h['x-powered-by']).toBeUndefined();
});

test.describe('API without a session', () => {
  test('user data requires sign-in (or is unavailable when unconfigured)', async ({ request }) => {
    for (const path of ['/api/presets', '/api/posters']) {
      const res = await request.get(path);
      expect([401, 503], path).toContain(res.status());
    }
  });

  test('cross-site writes are rejected', async ({ request }) => {
    const res = await request.post('/api/posters', { headers: { Origin: 'https://evil.example' } });
    expect([403, 503]).toContain(res.status());
  });

  test('sign-in validates input', async ({ request }) => {
    const res = await request.post('/api/auth/sign-in', { data: { email: 'not-an-email' } });
    expect([400, 503]).toContain(res.status());
  });

  test('Strava stays hidden and inert without credentials', async ({ request }) => {
    const status = await (await request.get('/api/strava/status')).json();
    if (status.configured) test.skip(true, 'Strava is configured on this server');
    expect(status).toEqual({ configured: false, connected: false, athlete: null });
    expect((await request.get('/api/strava/activities')).status()).toBe(503);
    const connect = await request.get('/api/strava/connect', { maxRedirects: 0 });
    expect(connect.headers()['location']).toMatch(/\/studio\?strava=unavailable$/);
  });

  test('health check reports database status without data', async ({ request }) => {
    const body = await (await request.get('/api/health')).json();
    expect(Object.keys(body).sort()).toEqual(['db', 'ok']);
    expect(['ok', 'unconfigured', 'error']).toContain(body.db);
  });

  test('magic-link callback without a code fails safely', async ({ request }) => {
    const res = await request.get('/auth/callback', { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    expect(res.headers()['location']).toMatch(/\?auth=error/);
  });
});
