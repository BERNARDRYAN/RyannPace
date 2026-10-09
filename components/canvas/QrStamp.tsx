import { useMemo } from 'react';
import qrcode from 'qrcode-generator';

interface QrStampProps {
  value: string;
  /** Total tile size in px, quiet zone included. */
  size: number;
  /** Module (dark) color. Keep it darker than `background` so every scanner reads it. */
  foreground: string;
  background: string;
  radius?: number;
}

/** Quiet zone in modules. The spec suggests 4; 3 keeps the tile compact and still scans reliably. */
const QUIET = 3;

/** A real, scannable QR code drawn as one SVG path. */
export function QrStamp({ value, size, foreground, background, radius = 0 }: QrStampProps) {
  const { path, modules } = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(value);
    qr.make();
    const count = qr.getModuleCount();
    let d = '';
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (qr.isDark(r, c)) d += `M${c + QUIET} ${r + QUIET}h1v1h-1z`;
      }
    }
    return { path: d, modules: count + QUIET * 2 };
  }, [value]);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${modules} ${modules}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label="QR code linking to RyannPace"
    >
      <rect width={modules} height={modules} rx={(radius / size) * modules} fill={background} />
      <path d={path} fill={foreground} />
    </svg>
  );
}

/** Where poster QR codes point. NEXT_PUBLIC_SITE_URL is public by nature (it's printed on posters). */
export function posterQrUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://ryannpace.pages.dev');
  return `${base}/?ref=poster`;
}
