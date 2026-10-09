'use client';

import { useState, useSyncExternalStore, type RefObject } from 'react';
import type { AspectRatio } from '@/types/poster';
import { Check, CircleAlert, Download, LoaderCircle, Share2 } from 'lucide-react';
import Link from 'next/link';
import { currentRecipe, usePosterStore } from '@/store/usePosterStore';
import { useAccountStore } from '@/store/useAccountStore';
import { useGalleryStore } from '@/store/useGalleryStore';
import { POSTER_DIMENSIONS } from '@/lib/poster-presets';
import {
  canShareFiles,
  createThumbnail,
  exportPosterAsPng,
  sharePoster,
  type ExportPixelRatio,
} from '@/lib/export-engine';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type ExportState = 'idle' | 'rendering' | 'done' | 'error';

const noopSubscribe = () => () => {};

/**
 * Files an exported poster in the signed-in user's gallery. Runs after the
 * download has started, so a gallery hiccup never blocks the export itself.
 */
async function saveToGallery(png: Blob) {
  if (useAccountStore.getState().status !== 'signed-in') return;
  const { showNotice } = useAccountStore.getState();
  try {
    const thumbnail = await createThumbnail(png);
    const res = await useGalleryStore.getState().save(currentRecipe(), thumbnail);
    if (!res.ok) showNotice({ kind: 'error', text: `Exported, but not saved to your gallery: ${res.error}` });
    else if (!res.data.skipped) showNotice({ kind: 'success', text: 'Exported and saved to your gallery.' });
  } catch {
    showNotice({ kind: 'error', text: 'Exported, but the gallery thumbnail could not be created.' });
  }
}

interface ExportPanelProps {
  posterRef: RefObject<HTMLDivElement | null>;
  /** Overrides for non-studio posters (the recap); default to the studio poster. */
  filename?: string;
  aspectRatio?: AspectRatio;
  /** Studio exports are filed in the gallery; recaps are not single-run recipes. */
  saveToGalleryOnExport?: boolean;
}

export function ExportPanel({
  posterRef,
  filename: filenameOverride,
  aspectRatio: aspectRatioOverride,
  saveToGalleryOnExport = true,
}: ExportPanelProps) {
  const [pixelRatio, setPixelRatio] = useState<ExportPixelRatio>(2);
  const [state, setState] = useState<ExportState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const shareSupported = useSyncExternalStore(noopSubscribe, canShareFiles, () => false);
  const accountStatus = useAccountStore((s) => s.status);
  const openSignIn = useAccountStore((s) => s.openSignIn);

  const studioAspectRatio = usePosterStore((s) => s.config.aspectRatio);
  const title = usePosterStore((s) => s.metrics.activityTitle);
  const aspectRatio = aspectRatioOverride ?? studioAspectRatio;
  const { width, height } = POSTER_DIMENSIONS[aspectRatio];
  const filename = filenameOverride ?? `ryannpace-${title || 'workout'}-${aspectRatio.replace(':', 'x')}`;
  const archive = (blob: Blob) => {
    if (saveToGalleryOnExport) void saveToGallery(blob);
  };
  const busy = state === 'rendering';

  const run = async (action: 'download' | 'share') => {
    const node = posterRef.current;
    if (!node || busy) return;
    setState('rendering');
    setMessage(null);
    try {
      if (action === 'share') {
        try {
          const { shared, blob } = await sharePoster(node, { filename, pixelRatio });
          setState(shared ? 'done' : 'idle');
          if (shared) archive(blob);
          return;
        } catch (error) {
          // Safari drops the user-gesture window during a long render; fall back to a download.
          if (error instanceof DOMException && error.name === 'NotAllowedError') {
            const blob = await exportPosterAsPng(node, { filename, pixelRatio });
            setMessage('Sharing was blocked by the browser, so the PNG was downloaded instead.');
            setState('done');
            archive(blob);
            return;
          }
          throw error;
        }
      }
      const blob = await exportPosterAsPng(node, { filename, pixelRatio });
      setState('done');
      archive(blob);
    } catch {
      setState('error');
      setMessage('Export failed. Try 1x resolution or a smaller background photo.');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <div role="radiogroup" aria-label="Export resolution" className="flex rounded-full bg-white p-1 shadow-sm">
          {([1, 2] as const).map((ratio) => (
            <button
              key={ratio}
              type="button"
              role="radio"
              aria-checked={pixelRatio === ratio}
              onClick={() => setPixelRatio(ratio)}
              className={cn(
                'rounded-full px-3 py-1 font-mono text-[11px] transition-colors',
                pixelRatio === ratio ? 'bg-ink text-white' : 'text-muted hover:text-ink'
              )}
            >
              {ratio}x · {width * ratio}×{height * ratio}
            </button>
          ))}
        </div>

        <Button onClick={() => run('download')} disabled={busy} className="min-w-[150px]">
          {busy ? <LoaderCircle className="animate-spin" /> : state === 'done' ? <Check /> : <Download />}
          {busy ? 'Rendering…' : 'Export PNG'}
        </Button>

        {shareSupported && (
          <Button variant="secondary" onClick={() => run('share')} disabled={busy}>
            <Share2 /> Share
          </Button>
        )}
      </div>

      {saveToGalleryOnExport && accountStatus === 'signed-in' && !message && (
        <p className="text-center text-[11px] text-muted">
          Exports are saved to your{' '}
          <Link href="/gallery" className="underline underline-offset-2 hover:text-ink">
            gallery
          </Link>
          .
        </p>
      )}
      {saveToGalleryOnExport && accountStatus === 'signed-out' && !message && (
        <p className="text-center text-[11px] text-muted">
          <button type="button" onClick={openSignIn} className="underline underline-offset-2 hover:text-ink">
            Sign in
          </button>{' '}
          to keep a gallery of every poster you export.
        </p>
      )}
      {message && (
        <p
          role={state === 'error' ? 'alert' : 'status'}
          className={cn(
            'flex items-center justify-center gap-1.5 text-center text-xs',
            state === 'error' ? 'text-brand' : 'text-muted'
          )}
        >
          {state === 'error' && <CircleAlert className="size-3.5" />}
          {message}
        </p>
      )}
    </div>
  );
}
