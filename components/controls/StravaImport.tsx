'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { LoaderCircle, MapPinOff, X } from 'lucide-react';
import type { ParsedActivity } from '@/lib/activity-parsers';
import { usePosterStore } from '@/store/usePosterStore';
import { useAccountStore } from '@/store/useAccountStore';
import { tr, useLocaleStore, useT } from '@/store/useLocaleStore';
import { formatDateLong } from '@/lib/i18n';
import { formatDuration } from '@/lib/format';
import { displayDistance, distanceLabel } from '@/lib/units';
import { Button } from '@/components/ui/button';

interface Status {
  configured: boolean;
  connected: boolean;
  athlete: { firstname: string | null } | null;
}

interface ActivitySummary {
  id: string;
  name: string;
  sport: string;
  startDate: string;
  distanceKm: number;
  movingSeconds: number;
  hasRoute: boolean;
}

const STRAVA_ORANGE = '#FC4C02';

async function getJson<T>(url: string, init?: RequestInit): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, { ...init, credentials: 'same-origin', cache: 'no-store' });
    const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
    if (!res.ok) return { ok: false, error: body?.error ?? 'Request failed. Please try again.' };
    return { ok: true, data: body as T };
  } catch {
    return { ok: false, error: 'Network error. Check your connection.' };
  }
}

function StravaMark({ className }: { className?: string }) {
  // Simplified Strava chevron mark, used next to the Strava name per its brand guidelines.
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M15.4 17.9 13.3 13.7h-3.1l5.2 10.3 5.2-10.3h-3.1M10.5 2 3.4 16h4.2l2.9-5.6 2.9 5.6h4.2z" />
    </svg>
  );
}

function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const t = useT();
  const locale = useLocaleStore((s) => s.locale);
  const units = usePosterStore((s) => s.config.units);
  const [activities, setActivities] = useState<ActivitySummary[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async (nextPage: number) => {
    setLoading(true);
    setError(null);
    const res = await getJson<{ activities: ActivitySummary[] }>(`/api/strava/activities?page=${nextPage}`);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setActivities((prev) => (nextPage === 1 ? res.data.activities : [...prev, ...res.data.activities]));
    setHasMore(res.data.activities.length === 30);
    setPage(nextPage);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      void load(1);
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, load]);

  const importActivity = async (a: ActivitySummary) => {
    setImporting(a.id);
    setError(null);
    const res = await getJson<{ activity: ParsedActivity }>(`/api/strava/activities/${a.id}`);
    setImporting(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    usePosterStore.getState().loadActivity(res.data.activity, `${a.name} · Strava`);
    useAccountStore.getState().showNotice({ kind: 'success', text: tr('Imported “{name}” from Strava.', { name: a.name }) });
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="strava-import-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-panel p-0 text-ink shadow-2xl backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
    >
      <div className="flex max-h-[80dvh] flex-col">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id="strava-import-title" className="flex items-center gap-2 font-semibold">
            <span style={{ color: STRAVA_ORANGE }}>
              <StravaMark className="size-5" />
            </span>
            {t('Import from Strava')}
          </h2>
          <button type="button" onClick={onClose} aria-label={t('Close')} className="rounded-full p-1 text-muted hover:bg-black/5">
            <X className="size-4" />
          </button>
        </div>

        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {error && (
            <p role="alert" className="mx-2 mb-3 rounded-lg bg-brand-soft px-3 py-2 text-xs">
              {t(error)}
            </p>
          )}
          <ul className="space-y-1">
            {activities.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  disabled={!a.hasRoute || importing !== null}
                  onClick={() => void importActivity(a)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{a.name}</span>
                    <span className="block font-mono text-[10px] tracking-wider text-muted uppercase">
                      {formatDateLong(a.startDate, locale)} · {a.sport} · {displayDistance(a.distanceKm, units).toFixed(2)}{' '}
                      {distanceLabel(units)} · {formatDuration(a.movingSeconds)}
                    </span>
                  </span>
                  {importing === a.id ? (
                    <LoaderCircle className="size-4 shrink-0 animate-spin" />
                  ) : (
                    !a.hasRoute && (
                      <span className="flex shrink-0 items-center gap-1 text-[10px] text-muted">
                        <MapPinOff className="size-3.5" /> {t('No GPS')}
                      </span>
                    )
                  )}
                </button>
              </li>
            ))}
          </ul>
          {loading && (
            <div className="flex justify-center py-6">
              <LoaderCircle className="size-5 animate-spin text-muted" />
            </div>
          )}
          {!loading && activities.length === 0 && !error && (
            <p className="py-6 text-center text-sm text-muted">{t('No activities found on Strava.')}</p>
          )}
          {!loading && hasMore && activities.length > 0 && (
            <div className="flex justify-center py-2">
              <Button variant="ghost" size="sm" onClick={() => void load(page + 1)}>
                {t('Load older activities')}
              </Button>
            </div>
          )}
        </div>

        {/* Required attribution when showing Strava data. */}
        <div className="border-t border-line px-5 py-3 text-center text-[11px] font-semibold tracking-wide" style={{ color: STRAVA_ORANGE }}>
          {t('Powered by Strava')}
        </div>
      </div>
    </dialog>
  );
}

/**
 * Strava connection and import. Hidden entirely when the server has no
 * Strava credentials, so self-hosted copies without an API app just don't show it.
 */
export function StravaImport() {
  const t = useT();
  const [status, setStatus] = useState<Status | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const refresh = useCallback(async () => {
    const res = await getJson<Status>('/api/strava/status');
    setStatus(res.ok ? res.data : null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void getJson<Status>('/api/strava/status').then((res) => {
      if (!cancelled) setStatus(res.ok ? res.data : null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!status?.configured) return null;

  if (!status.connected) {
    return (
      <a
        href="/api/strava/connect"
        className="flex h-10 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ background: STRAVA_ORANGE }}
      >
        <StravaMark className="size-4" />
        {t('Connect with Strava')}
      </a>
    );
  }

  const disconnect = async () => {
    await getJson('/api/strava/disconnect', { method: 'POST' });
    useAccountStore.getState().showNotice({ kind: 'success', text: 'Strava disconnected.' });
    void refresh();
  };

  return (
    <div className="flex items-center gap-2">
      <Button className="flex-1" onClick={() => setDialogOpen(true)} style={{ background: STRAVA_ORANGE }}>
        <StravaMark /> {t('Import from Strava')}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => void disconnect()} title={status.athlete?.firstname ?? undefined}>
        {t('Disconnect')}
      </Button>
      <ImportDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
