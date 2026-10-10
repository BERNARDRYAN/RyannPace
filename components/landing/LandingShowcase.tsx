'use client';

import { PosterPreview } from '@/components/canvas/PosterPreview';
import { SHOWCASE } from '@/components/landing/showcase-data';
import { useT } from '@/store/useLocaleStore';

const SHADOW = 'shadow-[0_40px_80px_-30px_rgba(20,20,19,0.45)]';

/** Three fanned posters for the hero. */
export function HeroPosters() {
  return (
    <div className="relative mx-auto flex h-[440px] w-full max-w-[560px] items-center justify-center sm:h-[540px]">
      <PosterPreview
        data={SHOWCASE.neon}
        width={210}
        className={`absolute top-10 left-0 hidden -rotate-[8deg] sm:block ${SHADOW}`}
      />
      <PosterPreview
        data={SHOWCASE.washi}
        width={200}
        className={`absolute right-0 bottom-0 hidden rotate-[7deg] sm:block ${SHADOW}`}
      />
      <PosterPreview data={SHOWCASE.newsprint} width={244} className={`relative z-10 ${SHADOW}`} />
    </div>
  );
}

const FORMATS = [
  { data: SHOWCASE.bib, label: '9:16', hint: 'Race Bib · Stories & Reels', width: 200 },
  { data: SHOWCASE.retro, label: '4:5', hint: 'Retro Mag · portrait feed', width: 250 },
  { data: SHOWCASE.stats, label: '1:1', hint: 'Stats Card · square feed', width: 270 },
];

/** One poster per export format, aligned on a shared baseline. */
export function FormatShowcase() {
  const t = useT();
  return (
    <div className="flex snap-x snap-mandatory items-end gap-8 overflow-x-auto pb-4 sm:justify-center sm:overflow-visible">
      {FORMATS.map((f) => (
        <figure key={f.label} className="shrink-0 snap-center">
          <PosterPreview data={f.data} width={f.width} className={SHADOW} />
          <figcaption className="mt-4 flex items-baseline gap-2">
            <span className="font-mono text-sm font-semibold text-ink">{f.label}</span>
            <span className="text-xs text-muted">{t(f.hint)}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
