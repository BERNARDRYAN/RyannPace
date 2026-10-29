import { BufferTarget, CanvasSource, Mp4OutputFormat, Output, QUALITY_HIGH, canEncodeVideo } from 'mediabunny';
import { renderPosterBlob } from '@/lib/export-engine';
import { ROUTE_VIEWBOX } from '@/lib/poster-presets';

/*
 * "Route draw" video: the finished poster with its route drawing itself in.
 *
 * The poster is rasterized twice, once with the route hidden and once complete.
 * Each frame paints the bare poster, then reveals the complete one through a
 * mask that follows the route up to the current progress, so every template's
 * own route styling (glow, gradients, sticker outline) carries over exactly.
 * Frames are H.264-encoded on the device with WebCodecs into an MP4.
 */

const FPS = 30;
const INTRO_S = 0.4;
const DRAW_S = 3.2;
const OUTRO_S = 1.6;
const SAMPLES_PER_ROUTE = 480;

interface RouteTrace {
  /** Evenly spaced points along the route, in poster pixels. */
  points: { x: number; y: number }[];
  /** Route stroke width in poster pixels. */
  strokeWidth: number;
  /** Reveal-mask width in poster pixels: wide enough for glow layers and the start marker. */
  maskWidth: number;
  /** The template's accent for this route (its finish-glow color). */
  accent: string;
}

/** Reads every drawn route on the poster as points in poster pixel space. */
function traceRoutes(root: HTMLElement): RouteTrace[] {
  const rootRect = root.getBoundingClientRect();
  const scale = rootRect.width / root.offsetWidth; // client px per poster px (the preview is scaled)
  const traces: RouteTrace[] = [];

  root.querySelectorAll<SVGSVGElement>('svg[aria-label="Route map"]').forEach((svg) => {
    // The core stroke is the svg's direct child path; glow layers sit inside a <g>.
    const path = svg.querySelector<SVGPathElement>(':scope > path');
    if (!path) return;
    const length = path.getTotalLength();
    if (!(length > 0)) return;

    // Map viewBox units to poster pixels (preserveAspectRatio="xMidYMid meet").
    const r = svg.getBoundingClientRect();
    const x = (r.left - rootRect.left) / scale;
    const y = (r.top - rootRect.top) / scale;
    const w = r.width / scale;
    const h = r.height / scale;
    const s = Math.min(w / ROUTE_VIEWBOX.width, h / ROUTE_VIEWBOX.height);
    const ox = x + (w - ROUTE_VIEWBOX.width * s) / 2;
    const oy = y + (h - ROUTE_VIEWBOX.height * s) / 2;

    const points = [];
    for (let i = 0; i <= SAMPLES_PER_ROUTE; i++) {
      const p = path.getPointAtLength((length * i) / SAMPLES_PER_ROUTE);
      points.push({ x: ox + p.x * s, y: oy + p.y * s });
    }
    const strokeWidth = Number(path.getAttribute('stroke-width') ?? 6);
    const widest = Math.max(
      strokeWidth * 5.5, // start markers reach ~2.6× the stroke width from the line
      ...Array.from(svg.querySelectorAll('path'), (el) => Number(el.getAttribute('stroke-width') ?? 0))
    );
    const accent = svg.querySelector('radialGradient stop')?.getAttribute('stop-color') ?? '#ffffff';
    traces.push({ points, strokeWidth: strokeWidth * s, maskWidth: widest * 1.1 * s, accent });
  });
  return traces;
}

async function renderWithoutRoutes(root: HTMLElement): Promise<Blob> {
  const routes = Array.from(root.querySelectorAll<SVGSVGElement>('svg[aria-label="Route map"]'));
  const previous = routes.map((svg) => svg.style.visibility);
  routes.forEach((svg) => (svg.style.visibility = 'hidden'));
  try {
    return await renderPosterBlob(root, 1);
  } finally {
    routes.forEach((svg, i) => (svg.style.visibility = previous[i]));
  }
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Whether this browser can make the video (WebCodecs H.264). */
export async function canMakeRouteVideo(width: number, height: number): Promise<boolean> {
  if (typeof VideoEncoder === 'undefined') return false;
  try {
    return await canEncodeVideo('avc', { width, height, quality: QUALITY_HIGH, frameRate: FPS });
  } catch {
    return false;
  }
}

/** Renders the poster as a ~5 s MP4 of its route(s) drawing themselves. */
export async function renderRouteVideo(root: HTMLElement, onProgress?: (fraction: number) => void): Promise<Blob> {
  const traces = traceRoutes(root);
  if (traces.length === 0) throw new Error('Turn on the route to make a video.');
  // Stacked layers of one route (Retro's sticker outline) share a single dot, on the thinnest line.
  const runners = traces.filter(
    (a) =>
      !traces.some(
        (b) => b !== a && b.strokeWidth < a.strokeWidth && Math.hypot(b.points[0].x - a.points[0].x, b.points[0].y - a.points[0].y) < 1
      )
  );

  // Render the complete poster first, so the route is visible when traced and restored after.
  const [fullBlob, bareBlob] = [await renderPosterBlob(root, 1), await renderWithoutRoutes(root)];
  const [full, bare] = await Promise.all([createImageBitmap(fullBlob), createImageBitmap(bareBlob)]);

  // H.264 wants even dimensions.
  const width = full.width - (full.width % 2);
  const height = full.height - (full.height % 2);
  const kx = full.width / root.offsetWidth; // poster px → image px (1 at 1x)

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const mask = document.createElement('canvas');
  mask.width = width;
  mask.height = height;
  const mctx = mask.getContext('2d')!;

  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() });
  const source = new CanvasSource(canvas, { codec: 'avc', bitrate: QUALITY_HIGH, keyFrameInterval: 2 });
  output.addVideoTrack(source, { frameRate: FPS });

  try {
    await output.start();
    const total = Math.round((INTRO_S + DRAW_S + OUTRO_S) * FPS);
    for (let i = 0; i < total; i++) {
      const t = i / FPS;
      const progress = easeInOut(Math.min(1, Math.max(0, (t - INTRO_S) / DRAW_S)));

      if (progress >= 1) {
        ctx.drawImage(full, 0, 0);
      } else {
        ctx.drawImage(bare, 0, 0);
        if (progress > 0) {
          mctx.globalCompositeOperation = 'source-over';
          mctx.clearRect(0, 0, width, height);
          mctx.lineCap = 'round';
          mctx.lineJoin = 'round';
          mctx.strokeStyle = '#000';
          for (const { points, maskWidth } of traces) {
            const end = progress * (points.length - 1);
            mctx.lineWidth = maskWidth * kx;
            mctx.beginPath();
            mctx.moveTo(points[0].x * kx, points[0].y * kx);
            for (let p = 1; p <= Math.floor(end); p++) mctx.lineTo(points[p].x * kx, points[p].y * kx);
            const head = headPoint(points, end);
            mctx.lineTo(head.x * kx, head.y * kx);
            mctx.stroke();
          }
          mctx.globalCompositeOperation = 'source-in';
          mctx.drawImage(full, 0, 0);
          ctx.drawImage(mask, 0, 0);

          // A glowing dot "running" at the head of each line.
          for (const lead of runners) {
            const head = headPoint(lead.points, progress * (lead.points.length - 1));
            ctx.save();
            ctx.fillStyle = lead.accent;
            ctx.shadowColor = lead.accent;
            ctx.shadowBlur = lead.strokeWidth * 4 * kx;
            ctx.beginPath();
            ctx.arc(head.x * kx, head.y * kx, lead.strokeWidth * 1.8 * kx, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }

      await source.add(t, 1 / FPS);
      onProgress?.((i + 1) / total);
    }
    await output.finalize();
  } catch (error) {
    await output.cancel().catch(() => undefined);
    throw error;
  } finally {
    full.close();
    bare.close();
  }

  const buffer = (output.target as BufferTarget).buffer;
  if (!buffer) throw new Error('The video could not be created.');
  return new Blob([buffer], { type: 'video/mp4' });
}

function headPoint(points: { x: number; y: number }[], at: number) {
  const i = Math.min(points.length - 2, Math.floor(at));
  const f = at - i;
  const a = points[i];
  const b = points[i + 1];
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}
