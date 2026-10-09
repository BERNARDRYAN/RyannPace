'use client';

import type { Ref } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePosterStore } from '@/store/usePosterStore';
import { POSTER_DIMENSIONS } from '@/lib/poster-presets';
import { ScaledFrame } from '@/components/canvas/ScaledFrame';
import { PosterRenderer } from '@/components/canvas/PosterRenderer';

interface PosterBoardProps {
  /** Attached to the native-resolution poster node — pass this to the export engine. */
  ref?: Ref<HTMLDivElement>;
  className?: string;
}

/** The studio's master exportable frame, bound to the poster store. */
export function PosterBoard({ ref, className }: PosterBoardProps) {
  const data = usePosterStore(
    useShallow((s) => ({
      metrics: s.metrics,
      config: s.config,
      rawPoints: s.rawPoints,
      routePoints: s.routePoints,
    }))
  );
  const { width, height } = POSTER_DIMENSIONS[data.config.aspectRatio];

  return (
    <ScaledFrame ref={ref} width={width} height={height} className={className}>
      <PosterRenderer {...data} />
    </ScaledFrame>
  );
}
