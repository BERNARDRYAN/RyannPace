import type { ReactNode } from 'react';

interface ControlSectionProps {
  id?: string;
  index: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}

export function ControlSection({ id, index, title, action, children }: ControlSectionProps) {
  return (
    <section id={id} className="scroll-mt-20 border-b border-line px-5 py-6 last:border-b-0">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-baseline gap-2 text-sm font-semibold text-ink">
          <span className="font-mono text-[10px] font-normal tracking-[0.2em] text-muted">{index}</span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
