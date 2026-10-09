'use client';

import { useRef } from 'react';
import { usePosterStore } from '@/store/usePosterStore';
import { POSTER_DIMENSIONS, TEMPLATES } from '@/lib/poster-presets';
import { TopNavigation } from '@/components/TopNavigation';
import { PosterBoard } from '@/components/canvas/PosterBoard';
import { ControlSection } from '@/components/controls/ControlSection';
import { FileUploader } from '@/components/controls/FileUploader';
import { TemplateSelector } from '@/components/controls/TemplateSelector';
import { AspectRatioPicker } from '@/components/controls/AspectRatioPicker';
import { PaletteSelector } from '@/components/controls/PaletteSelector';
import { DisplayOptions } from '@/components/controls/DisplayOptions';
import { MetricsForm } from '@/components/controls/MetricsForm';
import { ExportPanel } from '@/components/controls/ExportPanel';

export default function StudioPage() {
  const posterRef = useRef<HTMLDivElement>(null);
  const aspectRatio = usePosterStore((s) => s.config.aspectRatio);
  const templateId = usePosterStore((s) => s.config.templateId);
  const paletteName = usePosterStore((s) => s.config.palette.name);
  const { width, height } = POSTER_DIMENSIONS[aspectRatio];
  const templateName = TEMPLATES.find((t) => t.id === templateId)?.name ?? 'Editorial';

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <TopNavigation />

      <main className="flex flex-1 flex-col lg:min-h-0 lg:flex-row">
        {/* Controls */}
        <aside className="scrollbar-thin order-2 border-line bg-panel lg:order-1 lg:w-[400px] lg:shrink-0 lg:overflow-y-auto lg:border-r">
          <ControlSection id="upload" index="01" title="Route">
            <FileUploader />
          </ControlSection>

          <div id="design" className="scroll-mt-20">
            <ControlSection index="02" title="Template">
              <TemplateSelector />
            </ControlSection>
            <ControlSection index="03" title="Format">
              <AspectRatioPicker />
            </ControlSection>
            <ControlSection index="04" title="Palette">
              <PaletteSelector />
            </ControlSection>
            <ControlSection index="05" title="Elements">
              <DisplayOptions />
            </ControlSection>
          </div>

          <ControlSection id="metrics" index="06" title="Workout metrics">
            <MetricsForm />
          </ControlSection>
        </aside>

        {/* Preview */}
        <section
          aria-label="Poster preview"
          className="bg-dot-grid order-1 flex flex-col gap-4 px-4 py-5 lg:order-2 lg:min-h-0 lg:flex-1 lg:px-10 lg:py-8"
        >
          <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.18em] text-muted uppercase">
            <span className="flex items-center gap-2">
              <span className="size-1.5 animate-pulse rounded-full bg-brand" />
              Live preview
            </span>
            <span>
              {templateName} · {paletteName} · {aspectRatio} · {width}×{height}
            </span>
          </div>

          <div className="h-[62vh] min-h-[360px] lg:h-auto lg:min-h-0 lg:flex-1">
            <PosterBoard ref={posterRef} />
          </div>

          <ExportPanel posterRef={posterRef} />
        </section>
      </main>
    </div>
  );
}
