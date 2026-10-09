'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ImageOff, LogIn, Plus, RotateCcw, Trash } from 'lucide-react';
import type { GalleryPoster } from '@/types/gallery';
import { useAccountStore } from '@/store/useAccountStore';
import { useGalleryStore } from '@/store/useGalleryStore';
import { formatPace } from '@/lib/format';
import { formatDateLong } from '@/lib/i18n';
import { displayDistance, distanceLabel, paceParts } from '@/lib/units';
import { useHydrated } from '@/hooks/useHydrated';
import { cn } from '@/lib/utils';
import { SiteHeader } from '@/components/SiteHeader';
import { Button, buttonVariants } from '@/components/ui/button';
import { tr, useLocaleStore, useT } from '@/store/useLocaleStore';

const RATIO_CSS: Record<GalleryPoster['aspectRatio'], string> = {
  '9:16': '9 / 16',
  '4:5': '4 / 5',
  '1:1': '1 / 1',
};

function PosterCard({ poster }: { poster: GalleryPoster }) {
  const hydrated = useHydrated();
  const remove = useGalleryStore((s) => s.remove);
  const showNotice = useAccountStore((s) => s.showNotice);
  const [confirming, setConfirming] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const t = useT();
  const locale = useLocaleStore((s) => s.locale);
  const { metrics, palette } = poster;
  const units = poster.units ?? 'km';
  const pace = paceParts(metrics, units);

  const onDelete = async () => {
    setConfirming(false);
    const res = await remove(poster.id);
    if (!res.ok) showNotice({ kind: 'error', text: tr(res.error) });
  };

  return (
    <article className="group mb-5 break-inside-avoid">
      <Link
        href={`/studio?poster=${poster.id}`}
        className="relative block overflow-hidden rounded-lg shadow-[0_12px_30px_-12px_rgba(0,0,0,0.3)] ring-1 ring-black/5 transition-transform duration-300 group-hover:-translate-y-1"
        style={{ aspectRatio: RATIO_CSS[poster.aspectRatio], background: palette?.background ?? '#e6e0d3' }}
        aria-label={t('Open “{title}” in the studio', { title: poster.title })}
      >
        {poster.thumbnailUrl && !imageFailed ? (
          // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from private storage
          <img
            src={poster.thumbnailUrl}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <span
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs"
            style={{ color: palette?.secondaryText ?? '#78746c' }}
          >
            <ImageOff className="size-5" />
            {t('Preview unavailable')}
          </span>
        )}
        <span className="absolute inset-x-3 bottom-3 flex translate-y-2 items-center justify-center gap-1.5 rounded-full bg-ink/90 py-2 text-xs font-medium text-white opacity-0 backdrop-blur transition-all group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
          {t('Open in studio')} <ArrowUpRight className="size-3.5" />
        </span>
      </Link>

      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium text-ink">{poster.title}</h3>
          <p className="mt-0.5 font-mono text-[10px] tracking-wider text-muted uppercase">
            {hydrated && poster.activityDate ? `${formatDateLong(poster.activityDate, locale)} · ` : ''}
            {displayDistance(metrics.distanceKm, units).toFixed(2)} {distanceLabel(units)} ·{' '}
            {formatPace(pace.minutes, pace.seconds)}/{distanceLabel(units)}
          </p>
        </div>
        {confirming ? (
          <span className="flex shrink-0 items-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              {t('Keep')}
            </Button>
            <Button size="sm" className="bg-brand hover:bg-brand/90" onClick={onDelete}>
              {t('Delete')}
            </Button>
          </span>
        ) : (
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setConfirming(true)}
            aria-label={t('Delete “{title}”', { title: poster.title })}
            className="-mt-1 -mr-2 text-muted opacity-60 group-hover:opacity-100 hover:text-brand focus-visible:opacity-100"
          >
            <Trash />
          </Button>
        )}
      </div>
    </article>
  );
}

function SkeletonGrid() {
  const heights = ['aspect-[9/16]', 'aspect-square', 'aspect-[4/5]', 'aspect-[9/16]', 'aspect-[4/5]', 'aspect-square'];
  return (
    <div className="columns-2 gap-5 sm:columns-3 lg:columns-4" aria-busy="true">
      {heights.map((h, i) => (
        <div key={i} className="mb-5 break-inside-avoid">
          <div className={cn('animate-pulse rounded-lg bg-line', h)} />
          <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-line" />
        </div>
      ))}
    </div>
  );
}

function EmptyCard({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-dashed border-line-strong bg-panel px-6 py-12 text-center">
      <h2 className="font-serif text-2xl text-ink italic">{title}</h2>
      <p className="mt-2 text-sm text-ink-soft">{body}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

export function Gallery() {
  const accountStatus = useAccountStore((s) => s.status);
  const openSignIn = useAccountStore((s) => s.openSignIn);
  const posters = useGalleryStore((s) => s.posters);
  const status = useGalleryStore((s) => s.status);
  const error = useGalleryStore((s) => s.error);
  const load = useGalleryStore((s) => s.load);
  const t = useT();

  useEffect(() => {
    // Always refetch on visit: thumbnail links are signed and expire.
    if (accountStatus === 'signed-in') void load();
  }, [accountStatus, load]);

  let content: React.ReactNode;
  if (accountStatus === 'unknown' || (accountStatus === 'signed-in' && (status === 'idle' || (status === 'loading' && posters.length === 0)))) {
    content = <SkeletonGrid />;
  } else if (accountStatus === 'unavailable') {
    content = (
      <EmptyCard
        title={t('Gallery unavailable')}
        body={t("Accounts aren't configured on this server yet, so posters can't be saved.")}
      />
    );
  } else if (accountStatus === 'signed-out') {
    content = (
      <EmptyCard
        title={t('Your posters, all in one place')}
        body={t('Sign in and every poster you export is kept here: reopen any of them, tweak it, and export again in full resolution.')}
        action={
          <Button onClick={openSignIn}>
            <LogIn /> {t('Sign in to see your gallery')}
          </Button>
        }
      />
    );
  } else if (status === 'error') {
    content = (
      <EmptyCard
        title={t("Couldn't load your gallery")}
        body={t(error ?? 'Something went wrong.')}
        action={
          <Button variant="secondary" onClick={() => void load()}>
            <RotateCcw /> {t('Try again')}
          </Button>
        }
      />
    );
  } else if (posters.length === 0) {
    content = (
      <EmptyCard
        title={t('No posters yet')}
        body={t('Design a poster in the studio and export it. It will appear here automatically.')}
        action={
          <Link href="/studio" className={buttonVariants()}>
            <Plus /> {t('Make your first poster')}
          </Link>
        }
      />
    );
  } else {
    content = (
      <div className="columns-2 gap-5 sm:columns-3 lg:columns-4 xl:columns-5">
        {posters.map((poster) => (
          <PosterCard key={poster.id} poster={poster} />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 pt-10 pb-20 sm:px-6 lg:px-10">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
          <div>
            <p className="font-mono text-[10px] tracking-[0.24em] text-muted uppercase">{t('Your archive')}</p>
            <h1 className="mt-1 font-serif text-5xl leading-none text-ink italic sm:text-6xl">{t('Gallery')}</h1>
            {accountStatus === 'signed-in' && status === 'ready' && (
              <p className="mt-3 text-sm text-ink-soft">
                {t(posters.length === 1 ? '{n} poster · click one to reopen it in the studio' : '{n} posters · click one to reopen it in the studio', { n: posters.length })}
              </p>
            )}
          </div>
          <Link href="/studio" className={buttonVariants({ variant: 'secondary' })}>
            <Plus /> {t('New poster')}
          </Link>
        </div>
        {content}
      </main>
    </div>
  );
}
