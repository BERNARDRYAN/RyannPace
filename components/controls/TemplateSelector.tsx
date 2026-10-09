'use client';

import { Lock } from 'lucide-react';
import { usePosterStore } from '@/store/usePosterStore';
import { TEMPLATES } from '@/lib/poster-presets';
import { cn } from '@/lib/utils';
import type { TemplateId } from '@/types/poster';
import { useT } from '@/store/useLocaleStore';

/** Miniature layout sketches so each card reads at a glance. */
function TemplateGlyph({ id }: { id: TemplateId }) {
  if (id === 'cyberpunk') {
    return (
      <div className="flex h-full flex-col justify-between bg-black p-1.5">
        <div className="h-0.5 w-6 bg-lime-300/80" />
        <svg viewBox="0 0 40 24" className="h-6 w-full">
          <path d="M3 18 L12 6 L20 14 L28 4 L37 16" fill="none" stroke="#d946ef" strokeWidth="2" />
        </svg>
        <div className="h-2 w-10 bg-cyan-300/80" />
      </div>
    );
  }
  if (id === 'swiss') {
    return (
      <div className="flex h-full gap-1 bg-[#f5f1ea] p-1.5">
        <div className="w-1 bg-[#8b5e3c]/70" />
        <div className="flex flex-1 flex-col justify-between">
          <div className="h-0.5 w-5 bg-stone-400" />
          <div className="mx-auto size-5 rounded-full border border-stone-400" />
          <div className="h-1 w-6 bg-stone-500" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col justify-between bg-[#f1ede4] p-1.5">
      <div className="h-px w-full bg-ink" />
      <div className="font-serif text-[9px] leading-none text-ink italic">Run</div>
      <svg viewBox="0 0 40 18" className="h-4 w-full">
        <path d="M4 12 C10 2, 18 16, 24 8 S34 4, 36 10" fill="none" stroke="#111" strokeWidth="1.6" />
      </svg>
      <div className="text-[11px] leading-none font-extrabold text-ink">04&apos;45</div>
    </div>
  );
}

export function TemplateSelector() {
  const templateId = usePosterStore((s) => s.config.templateId);
  const setTemplate = usePosterStore((s) => s.setTemplate);
  const t = useT();

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {TEMPLATES.map((tpl) => {
        const active = tpl.id === templateId;
        return (
          <button
            key={tpl.id}
            type="button"
            disabled={!tpl.available}
            aria-pressed={active}
            onClick={() => setTemplate(tpl.id)}
            className={cn(
              'group text-left transition-opacity disabled:cursor-not-allowed',
              !tpl.available && 'opacity-55'
            )}
          >
            <div
              className={cn(
                'relative aspect-[3/4] overflow-hidden rounded-lg border-2 transition-colors',
                active ? 'border-ink' : 'border-line group-enabled:group-hover:border-line-strong'
              )}
            >
              <TemplateGlyph id={tpl.id} />
              {!tpl.available && (
                <span className="absolute inset-x-1 bottom-1 flex items-center justify-center gap-1 rounded bg-white/90 py-0.5 font-mono text-[9px] tracking-wider text-ink uppercase">
                  <Lock className="size-2.5" /> {t('Soon')}
                </span>
              )}
            </div>
            <div className="mt-1.5 text-xs font-medium text-ink">{t(tpl.name)}</div>
            <div className="text-[11px] text-muted">{t(tpl.tagline)}</div>
          </button>
        );
      })}
    </div>
  );
}
