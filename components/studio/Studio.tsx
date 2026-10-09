'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Palette, SlidersHorizontal, Upload } from 'lucide-react';
import { currentRecipe, usePosterStore } from '@/store/usePosterStore';
import { useAccountStore } from '@/store/useAccountStore';
import { useGalleryStore } from '@/store/useGalleryStore';
import { POSTER_DIMENSIONS, TEMPLATES } from '@/lib/poster-presets';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';
import { SiteHeader } from '@/components/SiteHeader';
import { PosterBoard } from '@/components/canvas/PosterBoard';
import { ControlSection } from '@/components/controls/ControlSection';
import { FileUploader } from '@/components/controls/FileUploader';
import { TemplateSelector } from '@/components/controls/TemplateSelector';
import { AspectRatioPicker } from '@/components/controls/AspectRatioPicker';
import { PaletteSelector } from '@/components/controls/PaletteSelector';
import { DisplayOptions } from '@/components/controls/DisplayOptions';
import { MetricsForm } from '@/components/controls/MetricsForm';
import { ExportPanel } from '@/components/controls/ExportPanel';
import { PresetsPanel } from '@/components/controls/PresetsPanel';

/** Opens /studio?poster=<id> from the gallery, then strips the param from the URL. */
function useOpenGalleryPoster() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const id = url.searchParams.get('poster');
    if (!id) return;
    url.searchParams.delete('poster');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);

    let cancelled = false;
    void (async () => {
      const res = await useGalleryStore.getState().fetchDetail(id);
      if (cancelled) return;
      const { showNotice } = useAccountStore.getState();
      if (!res.ok) {
        showNotice({
          kind: 'error',
          text: res.status === 401 ? 'Sign in to open posters from your gallery.' : res.error,
        });
        return;
      }
      usePosterStore.getState().loadRecipe(res.data.recipe);
      // Re-exporting the reopened poster unchanged shouldn't add a duplicate.
      useGalleryStore.setState({ lastSavedRecipe: JSON.stringify(currentRecipe()) });
      showNotice({ kind: 'success', text: `Opened “${res.data.title}” from your gallery.` });
    })();
    return () => {
      cancelled = true;
    };
  }, []);
}

function PreviewMeta() {
  const aspectRatio = usePosterStore((s) => s.config.aspectRatio);
  const templateId = usePosterStore((s) => s.config.templateId);
  const paletteName = usePosterStore((s) => s.config.palette.name);
  const { width, height } = POSTER_DIMENSIONS[aspectRatio];
  const templateName = TEMPLATES.find((t) => t.id === templateId)?.name ?? 'Editorial';
  return (
    <div className="flex items-center justify-between gap-3 font-mono text-[10px] tracking-[0.18em] text-muted uppercase">
      <span className="flex shrink-0 items-center gap-2">
        <span className="size-1.5 animate-pulse rounded-full bg-brand" />
        Live preview
      </span>
      <span className="truncate">
        {templateName} · {paletteName} · {aspectRatio}
        <span className="hidden sm:inline">
          {' '}
          · {width}×{height}
        </span>
      </span>
    </div>
  );
}

/* Control groups, shared by the desktop sidebar and the mobile bottom sheet. */

function RouteControls() {
  return (
    <>
      <ControlSection id="upload" index="01" title="Route">
        <FileUploader />
      </ControlSection>
      <ControlSection id="presets" index="02" title="Saved presets">
        <PresetsPanel />
      </ControlSection>
    </>
  );
}

function StyleControls() {
  return (
    <div id="design" className="scroll-mt-20">
      <ControlSection index="03" title="Template">
        <TemplateSelector />
      </ControlSection>
      <ControlSection index="04" title="Format">
        <AspectRatioPicker />
      </ControlSection>
      <ControlSection index="05" title="Palette">
        <PaletteSelector />
      </ControlSection>
      <ControlSection index="06" title="Elements">
        <DisplayOptions />
      </ControlSection>
    </div>
  );
}

function MetricControls() {
  return (
    <ControlSection id="metrics" index="07" title="Workout metrics">
      <MetricsForm />
    </ControlSection>
  );
}

function DesktopStudio() {
  const posterRef = useRef<HTMLDivElement>(null);
  return (
    <div className="flex h-dvh flex-col">
      <SiteHeader />
      <main className="flex min-h-0 flex-1 flex-row">
        {/* `relative` makes this the containing block for the visually-hidden file
            inputs (absolutely positioned); without it they escape the scroll area
            and stretch the whole page taller than the screen. */}
        <aside className="scrollbar-thin relative w-100 shrink-0 overflow-y-auto border-r border-line bg-panel">
          <RouteControls />
          <StyleControls />
          <MetricControls />
        </aside>
        <section aria-label="Poster preview" className="bg-dot-grid flex min-h-0 flex-1 flex-col gap-4 px-10 py-8">
          <PreviewMeta />
          <div className="min-h-0 flex-1">
            <PosterBoard ref={posterRef} />
          </div>
          <ExportPanel posterRef={posterRef} />
        </section>
      </main>
    </div>
  );
}

const MOBILE_TABS = [
  { id: 'route', label: 'Route', icon: Upload },
  { id: 'style', label: 'Style', icon: Palette },
  { id: 'metrics', label: 'Metrics', icon: SlidersHorizontal },
  { id: 'export', label: 'Export', icon: Download },
] as const;
type MobileTab = (typeof MOBILE_TABS)[number]['id'];

/**
 * Phone layout: the poster fills the screen and the controls live in a
 * bottom sheet. Opening the sheet shrinks the preview so the poster stays
 * fully visible above it.
 */
function MobileStudio() {
  const posterRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<MobileTab>('route');
  const [open, setOpen] = useState(false);

  const selectTab = (next: MobileTab) => {
    if (open && next === tab) {
      setOpen(false);
    } else {
      setTab(next);
      setOpen(true);
    }
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <SiteHeader />
      <main className="bg-dot-grid flex min-h-0 flex-1 flex-col">
        <section
          aria-label="Poster preview"
          className={cn('flex min-h-0 flex-col gap-3 px-4 pt-4', open ? 'h-[36%] shrink-0 pb-2' : 'flex-1 pb-3')}
        >
          <PreviewMeta />
          <div className="min-h-0 flex-1">
            <PosterBoard ref={posterRef} />
          </div>
        </section>

        <div
          className={cn(
            'relative z-20 flex min-h-0 flex-col rounded-t-2xl border-t border-line bg-panel shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.25)]',
            open ? 'flex-1' : 'shrink-0 pb-[env(safe-area-inset-bottom)]'
          )}
        >
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Collapse controls' : 'Expand controls'}
            aria-expanded={open}
            className="flex w-full justify-center pt-2.5 pb-1"
          >
            <span className="h-1.5 w-10 rounded-full bg-line-strong" />
          </button>
          <nav aria-label="Studio controls" className="grid grid-cols-4 gap-1 px-3 pb-2">
            {MOBILE_TABS.map(({ id, label, icon: Icon }) => {
              const active = open && tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectTab(id)}
                  aria-pressed={active}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium transition-colors',
                    active ? 'bg-ink text-white' : 'text-ink-soft hover:bg-black/5'
                  )}
                >
                  <Icon className="size-4.5" />
                  {label}
                </button>
              );
            })}
          </nav>
          {open && (
            // `relative` contains the visually-hidden file inputs (see DesktopStudio).
            <div className="scrollbar-thin relative min-h-0 flex-1 overflow-y-auto border-t border-line pb-[env(safe-area-inset-bottom)]">
              {tab === 'route' && <RouteControls />}
              {tab === 'style' && <StyleControls />}
              {tab === 'metrics' && <MetricControls />}
              {tab === 'export' && (
                <div className="px-5 py-6">
                  <ExportPanel posterRef={posterRef} />
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export function Studio() {
  useOpenGalleryPoster();
  // Desktop is the server/hydration default; phones switch right after hydration.
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  return isDesktop ? <DesktopStudio /> : <MobileStudio />;
}
