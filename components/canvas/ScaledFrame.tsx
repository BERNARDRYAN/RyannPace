'use client';

import { useLayoutEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { useHydrated } from '@/hooks/useHydrated';
import { cn } from '@/lib/utils';

interface ScaledFrameProps {
  /** Native (export) size of the content. */
  width: number;
  height: number;
  /** Attached to the native-size node; hand it to the export engine. */
  ref?: Ref<HTMLDivElement>;
  className?: string;
  children: ReactNode;
}

/**
 * Lays content out at its native export size and visually scales it to fit
 * the available space with a transform on a wrapper, so the exported node is
 * never affected by the preview scale. Renders after hydration only (posters
 * format dates in the viewer's timezone).
 */
export function ScaledFrame({ width, height, ref, className, children }: ScaledFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const hydrated = useHydrated();

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
        <div style={{ width, height, transform: `scale(${scale || 1})`, transformOrigin: 'top left' }}>
          {hydrated && (
            <div ref={ref} style={{ width, height }} data-poster-root="">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
