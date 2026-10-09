import { useId, useMemo } from 'react';
import type { RawGpxPoint } from '@/types/poster';
import { downsamplePoints } from '@/lib/coordinate-normalizer';

interface ElevationProfileProps {
  points: RawGpxPoint[];
  color: string;
  width: number;
  height: number;
}

const SAMPLES = 220;

/** Filled elevation silhouette. Renders nothing when the track has no elevation data. */
export function ElevationProfile({ points, color, width, height }: ElevationProfileProps) {
  const gradientId = `rp${useId().replace(/[^a-zA-Z0-9_-]/g, '')}-elev`;

  const shape = useMemo(() => {
    const withEle = points.filter((p): p is RawGpxPoint & { ele: number } => typeof p.ele === 'number');
    if (withEle.length < 2) return null;
    const samples = downsamplePoints(withEle, SAMPLES);
    let min = Infinity;
    let max = -Infinity;
    for (const p of samples) {
      if (p.ele < min) min = p.ele;
      if (p.ele > max) max = p.ele;
    }
    const range = Math.max(max - min, 10); // flat runs stay visibly flat, not amplified noise
    const top = height * 0.08;
    const usable = height - top;
    const coords = samples.map((p, i) => {
      const x = (i / (samples.length - 1)) * width;
      const y = top + usable - ((p.ele - min) / range) * usable;
      return `${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    return {
      line: `M${coords.join(' L')}`,
      area: `M0 ${height} L${coords.join(' L')} L${width} ${height} Z`,
      min: Math.round(min),
      max: Math.round(max),
    };
  }, [points, width, height]);

  if (!shape) return null;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-label="Elevation profile">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={shape.area} fill={`url(#${gradientId})`} />
      <path d={shape.line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    </svg>
  );
}
