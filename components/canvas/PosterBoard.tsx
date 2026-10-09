'use client';

import { useLayoutEffect, useRef, useState, type Ref } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePosterStore } from '@/store/usePosterStore';
import { POSTER_DIMENSIONS } from '@/lib/poster-presets';
import { useHydrated } from '@/hooks/useHydrated';
import { cn } from '@/lib/utils';
import { PosterRenderer } from '@/components/canvas/PosterRenderer';

interface PosterBoardProps {
  /** Attached to the native-resolution poster node — pass this to the export engine. */
  ref?: Ref<HTMLDivElement>;
  className?: string;
}

/**
 * The master exportable frame. The poster is always laid out at its native
 * export size (e.g. 1080×1920) and visually scaled to fit the preview area
 * with a CSS transform on a wrapper, so the exported node is never affected
 * by the preview scale.
 */
export function PosterBoard({ ref, className }: PosterBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const hydrated = useHydrated();

  const data = usePosterStore(
    useShallow((s) => ({
      metrics: s.metrics,
      config: s.config,
      rawPoints: s.rawPoints,
      routePoints: s.routePoints,
    }))
  );
  const { width, height } = POSTER_DIMENSIONS[data.config.aspectRatio];

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const { width: cw, height: ch } = el.getBoundingClientRect();
      if (cw <= 0 || ch <= 0) return;
      setScale(Math.min(cw / width, ch / height));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [width, height]);

  const ready = hydrated && scale > 0;

  return (
    <div ref={containerRef} className={cn('relative flex h-full w-full items-center justify-center', className)}>
      <div
        className="relative overflow-hidden shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)] transition-[width,height] duration-300 ease-out"
        style={{
          width: ready ? width * scale : 0,
          height: ready ? height * scale : 0,
          visibility: ready ? 'visible' : 'hidden',
        }}
      >
        <div
          style={{
            width,
            height,
            transform: `scale(${scale || 1})`,
            transformOrigin: 'top left',
          }}
        >
          {hydrated && (
            <div ref={ref} style={{ width, height }} data-poster-root="">
              <PosterRenderer {...data} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
