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

export function downloadBlob(blob: Blob, filename: string, extension: 'png' | 'mp4' = 'png'): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `${sanitizeFilename(filename)}.${extension}`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Renders and downloads the poster; resolves with the PNG so callers can reuse it. */
export async function exportPosterAsPng(
  node: HTMLElement,
  { filename = 'ryannpace-workout', pixelRatio = 2 }: ExportOptions = {}
): Promise<Blob> {
  try {
    const blob = await renderPosterBlob(node, pixelRatio);
    downloadBlob(blob, filename);
    return blob;
  } catch (error) {
    console.error('RyannPace export failed:', error);
    throw error;
  }
}

/** True when the Web Share API can share image (or video) files (mostly mobile browsers). */
export function canShareFiles(type: 'image/png' | 'video/mp4' = 'image/png'): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function') return false;
  try {
    const probe = new File([new Blob()], type === 'video/mp4' ? 'probe.mp4' : 'probe.png', { type });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/**
 * Opens the native share sheet (Instagram, WhatsApp, Photos…).
 * `shared` is false if the user dismissed the sheet.
 */
export async function sharePoster(
  node: HTMLElement,
  { filename = 'ryannpace-workout', pixelRatio = 2 }: ExportOptions = {}
): Promise<{ shared: boolean; blob: Blob }> {
  const blob = await renderPosterBlob(node, pixelRatio);
  const file = new File([blob], `${sanitizeFilename(filename)}.png`, { type: 'image/png' });
  try {
    await navigator.share({ files: [file], title: 'RyannPace' });
    return { shared: true, blob };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return { shared: false, blob };
    throw error;
  }
}

/**
 * Shares the route video, or downloads it where sharing isn't available.
 * Resolves with how it was delivered ('cancelled' if the share sheet was dismissed).
 */
export async function deliverVideo(blob: Blob, filename: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  // Phones go straight to the share sheet (Stories); desktops (Windows also has a share sheet) get a file.
  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
  if (isTouchDevice && canShareFiles('video/mp4')) {
    const file = new File([blob], `${sanitizeFilename(filename)}.mp4`, { type: 'video/mp4' });
    try {
      await navigator.share({ files: [file], title: 'RyannPace' });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      // NotAllowedError: the render outlived the tap's permission window; download instead.
      if (!(error instanceof DOMException && error.name === 'NotAllowedError')) throw error;
    }
  }
  downloadBlob(blob, filename, 'mp4');
  return 'downloaded';
}

export const THUMBNAIL_WIDTH = 480;

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Downscales an exported PNG into a small gallery thumbnail (~30–80 KB).
 * Prefers WebP; browsers that cannot encode it (older Safari) get JPEG.
 */
export async function createThumbnail(png: Blob, width: number = THUMBNAIL_WIDTH): Promise<Blob> {
  const bitmap = await createImageBitmap(png);
  try {
    const scale = width / bitmap.width;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is unavailable.');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const webp = await canvasToBlob(canvas, 'image/webp', 0.82);
    if (webp && webp.type === 'image/webp') return webp;
    const jpeg = await canvasToBlob(canvas, 'image/jpeg', 0.85);
    if (!jpeg) throw new Error('Could not encode the thumbnail.');
    return jpeg;
  } finally {
    bitmap.close();
  }
}
