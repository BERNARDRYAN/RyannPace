'use client';

import { CircleAlert, CircleCheck, X } from 'lucide-react';
import { useAccountStore } from '@/store/useAccountStore';
import { cn } from '@/lib/utils';
import { useT } from '@/store/useLocaleStore';

export function Toast() {
  const notice = useAccountStore((s) => s.notice);
  const dismiss = useAccountStore((s) => s.dismissNotice);
  const t = useT();

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
      {notice && (
        <div
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={cn(
            'pointer-events-auto flex max-w-md items-center gap-2.5 rounded-full py-2 pr-2 pl-4 text-sm text-white shadow-xl',
            notice.kind === 'error' ? 'bg-brand' : 'bg-ink'
          )}
        >
          {notice.kind === 'error' ? (
            <CircleAlert className="size-4 shrink-0" />
          ) : (
            <CircleCheck className="size-4 shrink-0" />
          )}
          {/* Static messages translate here; dynamic ones are translated where they're created. */}
          <span>{t(notice.text)}</span>
          <button type="button" onClick={dismiss} aria-label={t('Dismiss')} className="rounded-full p-1 hover:bg-white/15">
            <X className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
