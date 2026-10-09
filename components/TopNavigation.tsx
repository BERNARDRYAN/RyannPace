const LINKS = [
  { href: '#upload', label: 'Upload' },
  { href: '#design', label: 'Design' },
  { href: '#metrics', label: 'Metrics' },
];

export function TopNavigation() {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-line bg-panel/90 px-4 backdrop-blur sm:px-6">
      <a href="#" className="flex items-center gap-2.5" aria-label="RyannPace home">
        <span className="flex size-8 items-center justify-center rounded-lg bg-ink font-serif text-lg leading-none text-white italic">
          R
        </span>
        <span className="flex items-baseline gap-2">
          <span className="text-[15px] font-semibold tracking-tight text-ink">
            Ryann<span className="font-serif text-[17px] font-normal italic">Pace</span>
          </span>
          <span className="hidden font-mono text-[10px] tracking-[0.2em] text-muted uppercase sm:inline">
            Ryann Suite
          </span>
        </span>
      </a>

      <nav aria-label="Studio sections" className="flex items-center gap-1">
        {LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="rounded-full px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:bg-black/5 hover:text-ink"
          >
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
