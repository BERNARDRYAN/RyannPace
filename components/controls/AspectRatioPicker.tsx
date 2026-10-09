'use client';

import { usePosterStore } from '@/store/usePosterStore';
import { POSTER_DIMENSIONS } from '@/lib/poster-presets';
import { cn } from '@/lib/utils';
import type { AspectRatio } from '@/types/poster';

const RATIOS: { id: AspectRatio; label: string; hint: string }[] = [
  { id: '9:16', label: '9:16', hint: 'Story' },
  { id: '4:5', label: '4:5', hint: 'Portrait' },
  { id: '1:1', label: '1:1', hint: 'Feed' },
];

export function AspectRatioPicker() {
  const aspectRatio = usePosterStore((s) => s.config.aspectRatio);
  const setAspectRatio = usePosterStore((s) => s.setAspectRatio);

  return (
    <div role="radiogroup" aria-label="Aspect ratio" className="grid grid-cols-3 gap-1 rounded-xl bg-studio p-1">
      {RATIOS.map((ratio) => {
        const active = ratio.id === aspectRatio;
        const { width, height } = POSTER_DIMENSIONS[ratio.id];
        const glyphHeight = 18;
        return (
          <button
            key={ratio.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setAspectRatio(ratio.id)}
            className={cn(
              'flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs transition-all',
              active ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'
            )}
          >
            <span
              className={cn('inline-block rounded-[3px] border-[1.5px]', active ? 'border-ink' : 'border-current')}
              style={{ height: glyphHeight, width: (glyphHeight * width) / height }}
            />
            <span className="text-left leading-tight">
              <span className="block font-semibold">{ratio.label}</span>
              <span className="block text-[10px] opacity-80">{ratio.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
