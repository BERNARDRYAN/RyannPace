'use client';

import type { CSSProperties } from 'react';
import { POSTER_DIMENSIONS } from '@/lib/poster-presets';
import { useHydrated } from '@/hooks/useHydrated';
import { cn } from '@/lib/utils';
import { PosterRenderer, type PosterData } from '@/components/canvas/PosterRenderer';

interface PosterPreviewProps {
  data: PosterData;
  /** Display width in CSS pixels; height follows the poster's aspect ratio. */
  width: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * A static, scaled-down poster for marketing and showcase use. Renders only
 * after hydration because poster dates are formatted in the viewer's timezone.
 */
export function PosterPreview({ data, width, className, style }: PosterPreviewProps) {
  const hydrated = useHydrated();
  const native = POSTER_DIMENSIONS[data.config.aspectRatio];
  const scale = width / native.width;
  const height = native.height * scale;

  return (
    <div
      // `relative` by default; a caller's `absolute` wins via tailwind-merge.
      className={cn('relative overflow-hidden', className)}
      style={{ width, height, ...style }}
      aria-hidden="true"
    >
      {hydrated && (
        <div
          style={{
            width: native.width,
            height: native.height,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <PosterRenderer {...data} />
        </div>
      )}
    </div>
  );
}
