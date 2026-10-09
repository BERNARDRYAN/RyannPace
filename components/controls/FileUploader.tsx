'use client';

import { useRef, useState, type DragEvent } from 'react';
import { CircleAlert, FileCheck, LoaderCircle, RotateCcw, Upload, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { usePosterStore } from '@/store/usePosterStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function FileUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const { status, error, fileName, isSampleData, pointCount, loadActivityFile, loadSample, clearGpxError } =
    usePosterStore(
      useShallow((s) => ({
        status: s.gpxStatus,
        error: s.gpxError,
        fileName: s.gpxFileName,
        isSampleData: s.isSampleData,
        pointCount: s.rawPoints.length,
        loadActivityFile: s.loadActivityFile,
        loadSample: s.loadSample,
        clearGpxError: s.clearGpxError,
      }))
    );

  const isLoading = status === 'loading';

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) void loadActivityFile(file);
  };

  const onDragEnter = (e: DragEvent) => {
    e.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload a GPX, FIT or TCX file"
        aria-busy={isLoading}
        onClick={() => !isLoading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !isLoading) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={onDragEnter}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          'group relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 text-center transition-all',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
          isDragging
            ? 'scale-[1.01] border-brand bg-brand-soft/60'
            : 'border-line-strong bg-white hover:border-ink/50',
          isLoading && 'cursor-wait opacity-80'
        )}
      >
        <span
          className={cn(
            'flex size-10 items-center justify-center rounded-full transition-colors',
            isDragging ? 'bg-brand text-white' : 'bg-studio text-ink group-hover:bg-ink group-hover:text-white'
          )}
        >
          {isLoading ? <LoaderCircle className="size-5 animate-spin" /> : <Upload className="size-5" />}
        </span>
        <span className="text-sm font-medium text-ink">
          {isLoading ? 'Reading activity…' : isDragging ? 'Drop to load route' : 'Drop a GPX, FIT or TCX file'}
        </span>
        <span className="text-xs text-muted">
          Garmin, Strava, Coros, Apple Watch exports · read on your device, never uploaded
        </span>
        <input
          ref={inputRef}
          type="file"
          accept=".gpx,.fit,.tcx,application/gpx+xml"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg bg-brand-soft px-3 py-2.5 text-xs text-ink">
          <CircleAlert className="mt-px size-4 shrink-0 text-brand" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={clearGpxError} aria-label="Dismiss error" className="text-muted hover:text-ink">
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="flex min-w-0 items-center gap-1.5 text-muted">
          {isSampleData ? (
            <>Showing sample route · Marina Bay loop</>
          ) : (
            <>
              <FileCheck className="size-3.5 shrink-0 text-ink" />
              <span className="truncate text-ink">{fileName ?? 'Uploaded track'}</span>
              <span className="shrink-0">· {pointCount.toLocaleString()} pts</span>
            </>
          )}
        </span>
        {!isSampleData && (
          <Button variant="ghost" size="sm" onClick={loadSample} className="-mr-2">
            <RotateCcw /> Sample
          </Button>
        )}
      </div>
    </div>
  );
}
