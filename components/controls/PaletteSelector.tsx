'use client';

import { Check } from 'lucide-react';
import { usePosterStore } from '@/store/usePosterStore';
import { TEMPLATE_PALETTES } from '@/lib/poster-presets';
import { cn } from '@/lib/utils';
import { useT } from '@/store/useLocaleStore';

export function PaletteSelector() {
  const activeId = usePosterStore((s) => s.config.palette.id);
  const templateId = usePosterStore((s) => s.config.templateId);
  const setPalette = usePosterStore((s) => s.setPalette);
  const t = useT();

  return (
    <div className="flex flex-wrap gap-3">
      {TEMPLATE_PALETTES[templateId].map((palette) => {
        const active = palette.id === activeId;
        return (
          <button
            key={palette.id}
            type="button"
            aria-pressed={active}
            aria-label={`${palette.name} palette`}
            title={palette.name}
            onClick={() => setPalette(palette)}
            className="group flex flex-col items-center gap-1.5"
          >
            <span
              className={cn(
                'relative flex size-11 items-center justify-center overflow-hidden rounded-full ring-offset-2 ring-offset-panel transition-all',
                active ? 'ring-2 ring-ink' : 'ring-1 ring-line-strong group-hover:ring-ink/40'
              )}
              style={{ background: palette.background }}
            >
              <span
                className="absolute right-0 bottom-0 size-5 rounded-tl-full"
                style={{ background: palette.accent }}
              />
              <span className="font-serif text-lg leading-none italic" style={{ color: palette.primaryText }}>
                {active ? <Check className="size-4" strokeWidth={3} /> : 'Aa'}
              </span>
            </span>
            <span className={cn('text-[11px]', active ? 'text-ink' : 'text-muted')}>{t(palette.name)}</span>
          </button>
        );
      })}
    </div>
  );
}
