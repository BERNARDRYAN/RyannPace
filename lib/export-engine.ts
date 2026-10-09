import { toBlob } from 'html-to-image';

export type ExportPixelRatio = 1 | 2;

export interface ExportOptions {
  filename?: string;
  /** 1 = native 1080px wide, 2 = Retina 2160px wide. 3x exceeds iOS Safari's canvas limit. */
  pixelRatio?: ExportPixelRatio;
}

async function renderOnce(node: HTMLElement, pixelRatio: number): Promise<Blob> {
  const blob = await toBlob(node, {
    pixelRatio,
    width: node.offsetWidth,
    height: node.offsetHeight,
    cacheBust: true,
    skipFonts: false,
  });
  if (!blob) throw new Error('The browser returned an empty image.');
  return blob;
}

/**
 * Rasterizes the poster node to a PNG blob.
 *
 * WebKit sometimes paints web fonts and <img> sources only on the second
 * foreignObject render, so a tiny throwaway pass runs first to warm its caches.
 */
export async function renderPosterBlob(
  node: HTMLElement,
  pixelRatio: ExportPixelRatio = 2
): Promise<Blob> {
  await document.fonts?.ready;
  await renderOnce(node, 0.1).catch(() => undefined);
  return renderOnce(node, pixelRatio);
}

function sanitizeFilename(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'ryannpace-workout';
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `${sanitizeFilename(filename)}.png`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function exportPosterAsPng(
  node: HTMLElement,
  { filename = 'ryannpace-workout', pixelRatio = 2 }: ExportOptions = {}
): Promise<void> {
  try {
    const blob = await renderPosterBlob(node, pixelRatio);
    downloadBlob(blob, filename);
  } catch (error) {
    console.error('RyannPace export failed:', error);
    throw error;
  }
}

/** True when the Web Share API can share image files (mostly mobile browsers). */
export function canShareFiles(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function') return false;
  try {
    const probe = new File([new Blob()], 'probe.png', { type: 'image/png' });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/**
 * Opens the native share sheet (Instagram, WhatsApp, Photos…).
 * Returns false if the user dismissed the sheet.
 */
export async function sharePoster(
  node: HTMLElement,
  { filename = 'ryannpace-workout', pixelRatio = 2 }: ExportOptions = {}
): Promise<boolean> {
  const blob = await renderPosterBlob(node, pixelRatio);
  const file = new File([blob], `${sanitizeFilename(filename)}.png`, { type: 'image/png' });
  try {
    await navigator.share({ files: [file], title: 'RyannPace' });
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return false;
    throw error;
  }
}
