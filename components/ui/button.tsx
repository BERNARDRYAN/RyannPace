import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

const variants = {
  primary: 'bg-ink text-white hover:bg-ink-soft disabled:bg-ink/40',
  secondary: 'border border-line-strong bg-panel text-ink hover:bg-white disabled:text-muted',
  ghost: 'text-ink-soft hover:bg-black/5 disabled:text-muted',
} as const;

const sizes = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  icon: 'size-9',
} as const;

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export function Button({ className, variant = 'primary', size = 'md', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed',
        '[&_svg]:size-4 [&_svg]:shrink-0',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
