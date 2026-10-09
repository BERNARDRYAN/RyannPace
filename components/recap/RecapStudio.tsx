'use client';

import { useRef, useState, type DragEvent } from 'react';
import { CircleAlert, Layers, LoaderCircle, RotateCcw, Sparkles, Trash, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import type { AspectRatio } from '@/types/poster';
import { useRecapStore } from '@/store/useRecapStore';
import { MAX_RECAP_RUNS, periodLabel } from '@/lib/recap';
import { CYBERPUNK_PALETTES, MAGAZINE_PALETTES, MINIMAL_PALETTES, POSTER_DIMENSIONS } from '@/lib/poster-presets';
import { displayDistance, distanceLabel } from '@/lib/units';
import { formatDateLong } from '@/lib/i18n';
import { useHydrated } from '@/hooks/useHydrated';
import { cn } from '@/lib/utils';
import { SiteHeader } from '@/components/SiteHeader';
import { ScaledFrame } from '@/components/canvas/ScaledFrame';
import { RecapTemplate } from '@/components/recap/RecapTemplate';
import { ControlSection } from '@/components/controls/ControlSection';
import { ExportPanel } from '@/components/controls/ExportPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useLocaleStore, useT } from '@/store/useLocaleStore';

const PALETTE_GROUPS = [
  { name: 'Editorial', palettes: MAGAZINE_PALETTES },
  { name: 'Neon', palettes: CYBERPUNK_PALETTES },
  { name: 'Minimal', palettes: MINIMAL_PALETTES },
];

const RATIOS: AspectRatio[] = ['9:16', '4:5', '1:1'];

function Dropzone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const t = useT();
  const { loading, addFiles, count } = useRecapStore(
    useShallow((s) => ({ loading: s.loading, addFiles: s.addFiles, count: s.runs.length }))
  );

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void addFiles(Array.from(e.dataTransfer.files));
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={t('Add activity files')}
      onClick={() => !loading && inputRef.current?.click()}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !loading) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        'relative flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors',
        dragging ? 'border-brand bg-brand-soft/60' : 'border-line-strong bg-white hover:border-ink/50'
      )}
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-studio text-ink">
        {loading ? <LoaderCircle className="size-5 animate-spin" /> : <Layers className="size-5" />}
      </span>
      <span className="text-sm font-medium text-ink">
        {loading ? t('Reading activities…') : t('Drop several GPX, FIT or TCX files')}
      </span>
      <span className="text-xs text-muted">
        {t('Up to {max} runs · {count} added · read on your device', { max: MAX_RECAP_RUNS, count })}
      </span>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".gpx,.fit,.tcx"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          void addFiles(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />
    </div>
  );
}

function RunList() {
  const hydrated = useHydrated();
  const t = useT();
  const locale = useLocaleStore((s) => s.locale);
  const { runs, units, removeRun, clear, errors, dismissErrors } = useRecapStore(
    useShallow((s) => ({
      runs: s.runs,
      units: s.config.units,
      removeRun: s.removeRun,
      clear: s.clear,
      errors: s.errors,
      dismissErrors: s.dismissErrors,
    }))
  );

  return (
    <div className="space-y-3">
      {errors.length > 0 && (
        <div role="alert" className="flex items-start gap-2 rounded-lg bg-brand-soft px-3 py-2.5 text-xs text-ink">
          <CircleAlert className="mt-px size-4 shrink-0 text-brand" />
          <ul className="flex-1 space-y-0.5">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          <button type="button" onClick={dismissErrors} aria-label={t('Dismiss')} className="text-muted hover:text-ink">
            <X className="size-3.5" />
          </button>
        </div>
      )}
      {runs.length > 0 && (
        <>
          <ul className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
            {runs.map((run) => (
              <li key={run.id} className="flex items-center gap-3 rounded-lg border border-line bg-white px-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink">{run.name}</span>
                  <span className="block font-mono text-[10px] tracking-wider text-muted uppercase">
                    {hydrated && run.date ? `${formatDateLong(run.date, locale)} · ` : ''}
                    {displayDistance(run.distanceKm, units).toFixed(2)} {distanceLabel(units)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => removeRun(run.id)}
                  aria-label={t('Remove {name}', { name: run.name })}
                  className="rounded-full p-1.5 text-muted hover:bg-black/5 hover:text-brand"
                >
                  <Trash className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <Button variant="ghost" size="sm" onClick={clear} className="-ml-2">
            <RotateCcw /> {t('Clear all')}
          </Button>
        </>
      )}
    </div>
  );
}

function StyleControls() {
  const { config, runs, updateConfig } = useRecapStore(
    useShallow((s) => ({ config: s.config, runs: s.runs, updateConfig: s.updateConfig }))
  );
  const t = useT();
  const locale = useLocaleStore((s) => s.locale);

  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="recap-title">{t('Title')}</Label>
        <div className="flex gap-2">
          <Input
            id="recap-title"
            value={config.titleEdited ? config.title : periodLabel(runs, locale)}
            maxLength={40}
            onChange={(e) => updateConfig({ title: e.target.value, titleEdited: true })}
          />
          {config.titleEdited && (
            <Button
              variant="secondary"
              className="rounded-lg"
              onClick={() => updateConfig({ title: periodLabel(runs, locale), titleEdited: false })}
            >
              {t('Auto')}
            </Button>
          )}
        </div>
      </div>

      <div>
        <Label>{t('Format')}</Label>
        <div role="radiogroup" aria-label={t('Format')} className="grid grid-cols-3 gap-1 rounded-xl bg-studio p-1">
          {RATIOS.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={config.aspectRatio === r}
              onClick={() => updateConfig({ aspectRatio: r })}
              className={cn(
                'rounded-lg py-2 text-xs font-semibold transition-all',
                config.aspectRatio === r ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>{t('Palette')}</Label>
        <div className="space-y-3">
          {PALETTE_GROUPS.map((group) => (
            <div key={group.name} className="flex items-center gap-2.5">
              <span className="w-14 shrink-0 text-[11px] text-muted">{t(group.name)}</span>
              <div className="flex flex-wrap gap-2">
                {group.palettes.map((p) => {
                  const active = p.id === config.palette.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      title={p.name}
                      aria-label={`${p.name} palette`}
                      aria-pressed={active}
                      onClick={() => updateConfig({ palette: p })}
                      className={cn(
                        'relative size-8 overflow-hidden rounded-full ring-offset-2 ring-offset-panel transition-all',
                        active ? 'ring-2 ring-ink' : 'ring-1 ring-line-strong hover:ring-ink/40'
                      )}
                      style={{ background: p.background }}
                    >
                      <span className="absolute right-0 bottom-0 size-3.5 rounded-tl-full" style={{ background: p.accent }} />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-ink">{t('Units')}</span>
        <div role="radiogroup" aria-label={t('Units')} className="flex rounded-full bg-studio p-0.5">
          {(['km', 'mi'] as const).map((u) => (
            <button
              key={u}
              type="button"
              role="radio"
              aria-checked={config.units === u}
              onClick={() => updateConfig({ units: u })}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                config.units === u ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'
              )}
            >
              {u === 'km' ? t('Kilometres') : t('Miles')}
            </button>
          ))}
        </div>
      </div>

      <Switch
        label={t('Privacy zone')}
        description={t('Hide the first & last 200 m of every route')}
        checked={config.privacyZone}
        onCheckedChange={(privacyZone) => updateConfig({ privacyZone })}
      />

      <div>
        <Label htmlFor="recap-watermark">{t('Watermark')}</Label>
        <Input
          id="recap-watermark"
          value={config.watermarkText}
          maxLength={32}
          onChange={(e) => updateConfig({ watermarkText: e.target.value })}
        />
      </div>
    </div>
  );
}

function RecapPreview({ posterRef }: { posterRef: React.RefObject<HTMLDivElement | null> }) {
  const { runs, config, loadSample } = useRecapStore(
    useShallow((s) => ({ runs: s.runs, config: s.config, loadSample: s.loadSample }))
  );
  const t = useT();
  const { width, height } = POSTER_DIMENSIONS[config.aspectRatio];

  if (runs.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-panel text-ink shadow-sm">
          <Layers className="size-6" />
        </span>
        <div>
          <p className="font-serif text-3xl text-ink italic">{t('Your month, on one poster.')}</p>
          <p className="mt-2 max-w-sm text-sm text-ink-soft">
            {t('Add several runs to see your total distance, time, climb and every route side by side.')}
          </p>
        </div>
        <Button variant="secondary" onClick={loadSample}>
          <Sparkles /> {t('Try with sample runs')}
        </Button>
      </div>
    );
  }

  return (
    <ScaledFrame ref={posterRef} width={width} height={height}>
      <RecapTemplate runs={runs} config={config} />
    </ScaledFrame>
  );
}

export function RecapStudio() {
  const posterRef = useRef<HTMLDivElement>(null);
  const { hasRuns, title, aspectRatio } = useRecapStore(
    useShallow((s) => ({ hasRuns: s.runs.length > 0, title: s.config.title, aspectRatio: s.config.aspectRatio }))
  );

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <SiteHeader />
      <main className="flex flex-1 flex-col lg:min-h-0 lg:flex-row">
        <aside className="scrollbar-thin relative order-2 border-line bg-panel lg:order-1 lg:w-100 lg:shrink-0 lg:overflow-y-auto lg:border-r">
          <ControlSection index="01" title="Runs">
            <div className="space-y-3">
              <Dropzone />
              <RunList />
            </div>
          </ControlSection>
          <ControlSection index="02" title="Style">
            <StyleControls />
          </ControlSection>
        </aside>
        <section
          className="bg-dot-grid order-1 flex flex-col gap-4 px-4 py-5 lg:order-2 lg:min-h-0 lg:flex-1 lg:px-10 lg:py-8"
        >
          <div className="h-[62vh] min-h-[360px] lg:h-auto lg:min-h-0 lg:flex-1">
            <RecapPreview posterRef={posterRef} />
          </div>
          {hasRuns && (
            <ExportPanel
              posterRef={posterRef}
              aspectRatio={aspectRatio}
              filename={`ryannpace-recap-${title || 'runs'}-${aspectRatio.replace(':', 'x')}`}
              saveToGalleryOnExport={false}
            />
          )}
        </section>
      </main>
    </div>
  );
}
