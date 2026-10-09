import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Label({ className, ...props }: ComponentProps<'label'>) {
  return (
    <label
      className={cn('mb-1.5 block font-mono text-[10px] tracking-[0.18em] text-muted uppercase', className)}
      {...props}
    />
  );
}
