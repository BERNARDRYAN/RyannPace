import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, type Page } from '@playwright/test';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';

export const fixture = (name: string) => resolve(process.cwd(), 'tests/fixtures', name);

/** Collects uncaught errors and Content-Security-Policy violations for the whole test. */
export function watchProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    const text = msg.text();
    if (/Content Security Policy|Refused to/i.test(text)) problems.push(`csp: ${text}`);
    // React hydration mismatches are real bugs even when the page still renders.
    if (msg.type() === 'error' && /hydrat/i.test(text)) problems.push(`hydration: ${text}`);
  });
  return problems;
}

export async function openStudio(page: Page) {
  await page.goto('/studio');
  await expect(page.locator('[data-poster-root] svg path').first()).toBeVisible();
}

export async function uploadActivity(page: Page, name: string) {
  await page.locator('input[type=file][accept*=gpx]').setInputFiles(fixture(name));
  await expect(page.getByText(name)).toBeVisible();
}

export async function exportPng(page: Page): Promise<Buffer> {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export PNG|导出 PNG/ }).click();
  const file = await download;
  return readFileSync((await file.path())!);
}

export function pngSize(png: Buffer) {
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

export function decodeQr(png: Buffer): string | null {
  const img = PNG.sync.read(png);
  return jsQR(new Uint8ClampedArray(img.data), img.width, img.height)?.data ?? null;
}

export async function posterText(page: Page): Promise<string> {
  return page.locator('[data-poster-root]').innerText();
}
