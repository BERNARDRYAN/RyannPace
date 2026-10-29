'use client';

import { Dices, Lock } from 'lucide-react';
import { usePosterStore } from '@/store/usePosterStore';
import { TEMPLATES, TEMPLATE_PALETTES } from '@/lib/poster-presets';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TemplateId } from '@/types/poster';
import { useT } from '@/store/useLocaleStore';

/** Miniature layout sketches so each card reads at a glance. */
function TemplateGlyph({ id }: { id: TemplateId }) {
  if (id === 'bib') {
    return (
      <div className="flex h-full items-center justify-center bg-[#2B2D31] p-1.5">
        <div className="flex h-full w-full flex-col overflow-hidden rounded-[3px] bg-[#F7F5EF]">
          <div className="h-1.5 bg-[#E4572E]" />
          <div className="flex flex-1 items-center justify-center text-[15px] leading-none font-black text-ink">278</div>
          <div className="mx-1 border-t border-dashed border-stone-400" />
          <div className="py-0.5 text-center text-[6px] font-black tracking-wider text-[#E4572E]">FINISHER</div>
        </div>
      </div>
    );
  }
  if (id === 'retro') {
    return (
      <div className="relative flex h-full flex-col bg-[#F4E3C3] p-1.5">
        <div className="-skew-x-12 text-[10px] leading-none font-black text-[#E8442E]">RYANN</div>
        <div className="mt-0.5 h-px bg-[#1B1B1B]" />
        <div className="absolute top-5 left-1 size-5 rotate-12 rounded-full bg-[#F9C846]" />
        <svg viewBox="0 0 40 24" className="mt-auto h-5 w-full">
          <path d="M6 18 C12 4, 22 20, 34 6" fill="none" stroke="#1D4E89" strokeWidth="3" />
        </svg>
        <div className="text-[7px] leading-none font-black text-[#1B1B1B] italic">LONG RUN</div>
      </div>
    );
  }
  if (id === 'stats') {
    return (
      <div className="grid h-full grid-cols-2 gap-0.5 bg-[#ECECE8] p-1">
        <div className="col-span-2 flex items-end rounded-[3px] bg-white p-0.5 text-[11px] leading-none font-black text-[#2563EB]">10.0</div>
        <div className="rounded-[3px] bg-white" />
        <div className="rounded-[3px] bg-white" />
        <div className="rounded-[3px] bg-white" />
        <div className="flex items-end gap-px rounded-[3px] bg-white p-0.5">
          {[3, 5, 4, 6, 4].map((h, i) => (
            <span key={i} className="w-0.5 bg-[#2563EB]" style={{ height: h }} />
          ))}
        </div>
      </div>
    );
  }
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

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** Rolls a new template + palette combination, always different from the current one. */
export function SurpriseButton() {
  const t = useT();
  const surprise = () => {
    const { config, setTemplate, setPalette } = usePosterStore.getState();
    const others = TEMPLATES.filter((tpl) => tpl.available && tpl.id !== config.templateId);
    const templateId = pick(others).id;
    setTemplate(templateId);
    setPalette(pick(TEMPLATE_PALETTES[templateId]));
  };
  return (
    <Button variant="ghost" size="sm" onClick={surprise} className="-my-1 -mr-2">
      <Dices /> {t('Surprise me')}
    </Button>
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
              aria-hidden
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
