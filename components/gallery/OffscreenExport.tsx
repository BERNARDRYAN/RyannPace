'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import type { PosterData } from '@/components/canvas/PosterRenderer';
import { PosterRenderer } from '@/components/canvas/PosterRenderer';
import { POSTER_DIMENSIONS } from '@/lib/poster-presets';
import { exportPosterAsPng } from '@/lib/export-engine';

interface OffscreenExportProps {
  data: PosterData;
  filename: string;
  onDone: (ok: boolean) => void;
}

/**
 * Renders a poster at native size outside the viewport, exports it as a 2x
 * PNG (the same output as the studio), then reports back. Used by the
 * gallery's Download button so posters don't need reopening in the studio.
 */
export function OffscreenExport({ data, filename, onDone }: OffscreenExportProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  useLayoutEffect(() => {
    done.current = onDone;
  });
  const { width, height } = POSTER_DIMENSIONS[data.config.aspectRatio];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await document.fonts?.ready;
        // Two frames: let layout and SVGs settle before rasterizing.
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        if (cancelled || !nodeRef.current) return;
        await exportPosterAsPng(nodeRef.current, { filename, pixelRatio: 2 });
        if (!cancelled) done.current(true);
      } catch {
        if (!cancelled) done.current(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filename]);

  return (
    <div aria-hidden="true" style={{ position: 'fixed', left: -100_000, top: 0, pointerEvents: 'none' }}>
      <div ref={nodeRef} style={{ width, height }}>
        <PosterRenderer {...data} />
      </div>
    </div>
  );
}
