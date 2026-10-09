'use client';

import { useLayoutEffect, useRef, useState, type ComponentType, type Ref } from 'react';
import type { TemplateId } from '@/types/poster';
import { usePosterStore } from '@/store/usePosterStore';
import { POSTER_DIMENSIONS } from '@/lib/poster-presets';
import { useHydrated } from '@/hooks/useHydrated';
import { cn } from '@/lib/utils';
import { MagazineTemplate } from '@/components/canvas/templates/MagazineTemplate';

/**
 * Template registry. Cyberpunk and Swiss/Minimal are not built yet; the
 * TemplateSelector marks them unavailable, and they fall back to Magazine.
 */
const TEMPLATE_COMPONENTS: Partial<Record<TemplateId, ComponentType>> = {
  magazine: MagazineTemplate,
};

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

  const aspectRatio = usePosterStore((s) => s.config.aspectRatio);
  const templateId = usePosterStore((s) => s.config.templateId);
  const { width, height } = POSTER_DIMENSIONS[aspectRatio];
  const Template = TEMPLATE_COMPONENTS[templateId] ?? MagazineTemplate;

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
              <Template />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
