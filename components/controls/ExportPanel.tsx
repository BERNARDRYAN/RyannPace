'use client';

import { useState, useSyncExternalStore, type RefObject } from 'react';
import { Check, CircleAlert, Download, LoaderCircle, Share2 } from 'lucide-react';
import { usePosterStore } from '@/store/usePosterStore';
import { POSTER_DIMENSIONS } from '@/lib/poster-presets';
import {
  canShareFiles,
  exportPosterAsPng,
  sharePoster,
  type ExportPixelRatio,
} from '@/lib/export-engine';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type ExportState = 'idle' | 'rendering' | 'done' | 'error';

const noopSubscribe = () => () => {};

interface ExportPanelProps {
  posterRef: RefObject<HTMLDivElement | null>;
}

export function ExportPanel({ posterRef }: ExportPanelProps) {
  const [pixelRatio, setPixelRatio] = useState<ExportPixelRatio>(2);
  const [state, setState] = useState<ExportState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const shareSupported = useSyncExternalStore(noopSubscribe, canShareFiles, () => false);

  const aspectRatio = usePosterStore((s) => s.config.aspectRatio);
  const title = usePosterStore((s) => s.metrics.activityTitle);
  const { width, height } = POSTER_DIMENSIONS[aspectRatio];
  const filename = `ryannpace-${title || 'workout'}-${aspectRatio.replace(':', 'x')}`;
  const busy = state === 'rendering';

  const run = async (action: 'download' | 'share') => {
    const node = posterRef.current;
    if (!node || busy) return;
    setState('rendering');
    setMessage(null);
    try {
      if (action === 'share') {
        try {
          const shared = await sharePoster(node, { filename, pixelRatio });
          setState(shared ? 'done' : 'idle');
          return;
        } catch (error) {
          // Safari drops the user-gesture window during a long render; fall back to a download.
          if (error instanceof DOMException && error.name === 'NotAllowedError') {
            await exportPosterAsPng(node, { filename, pixelRatio });
            setMessage('Sharing was blocked by the browser, so the PNG was downloaded instead.');
            setState('done');
            return;
          }
          throw error;
        }
      }
      await exportPosterAsPng(node, { filename, pixelRatio });
      setState('done');
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
