import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-10 w-full min-w-0 rounded-lg border border-line bg-white px-3 text-sm text-ink transition-colors',
        'placeholder:text-muted/70 focus:border-ink focus:outline-none aria-invalid:border-brand',
        className
      )}
      {...props}
    />
  );
}
