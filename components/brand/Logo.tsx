import { cn } from '@/lib/utils';

/**
 * The RyannPace mark: the letter R drawn as a GPS route, with a hollow start
 * ring at the foot and a glowing orange finish pin at the end of the leg,
 * the same markers every poster uses. Keep in sync with app/icon.svg.
 */
export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="64" height="64" rx="15" fill="#141413" />
      <path
        d="M19 48.5V14.5h14.25c8 0 12.75 4.4 12.75 10.6S41.25 35.75 33.25 35.75H27L44.5 48.5"
        fill="none"
        stroke="#F3F1EC"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="19" cy="48.5" r="5.2" fill="#141413" stroke="#F3F1EC" strokeWidth="3.4" />
      <circle cx="44.5" cy="48.5" r="9" fill="#E4572E" opacity=".3" />
      <circle cx="44.5" cy="48.5" r="5.6" fill="#E4572E" />
    </svg>
  );
}

/** "Ryann" in the UI sans, "Pace" in the editorial serif italic. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-semibold tracking-tight', className)}>
      Ryann<span className="font-serif font-normal italic">Pace</span>
    </span>
  );
}

export function Logo({ size = 36, className, wordmarkClassName }: { size?: number; className?: string; wordmarkClassName?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      <Wordmark className={cn('text-lg text-ink', wordmarkClassName)} />
    </span>
  );
}
