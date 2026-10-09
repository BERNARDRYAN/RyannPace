import { useMemo } from 'react';

interface BarcodeProps {
  /** Any string; the same seed always draws the same bars. */
  seed: string;
  color: string;
  width: number;
  height: number;
  bars?: number;
}

/** FNV-1a hash -> mulberry32 PRNG, so each run gets a stable, unique-looking code. */
function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Decorative barcode stamp. Not a scannable symbology. */
export function Barcode({ seed, color, width, height, bars = 46 }: BarcodeProps) {
  const rects = useMemo(() => {
    const rand = seededRandom(seed);
    const weights = Array.from({ length: bars }, () => 1 + Math.floor(rand() * 4));
    const gaps = Array.from({ length: bars }, () => 1 + Math.floor(rand() * 3));
    const total = weights.reduce((s, w, i) => s + w + gaps[i], 0);
    const unit = width / total;
    let x = 0;
    return weights.map((w, i) => {
      const rect = { x, w: w * unit, tall: i === 0 || i === bars - 1 || i === Math.floor(bars / 2) };
      x += (w + gaps[i]) * unit;
      return rect;
    });
  }, [seed, width, bars]);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={0} width={r.w} height={r.tall ? height : height * 0.86} fill={color} />
      ))}
    </svg>
  );
}
