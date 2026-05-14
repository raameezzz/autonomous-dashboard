import { useEffect, useState } from 'react';

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'engineers', label: 'Engineers' },
  { id: 'conversations', label: 'Conversations' },
  { id: 'topics', label: 'Topics' },
] as const;

export default function MenuBar() {
  const [active, setActive] = useState<string>(SECTIONS[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 64; // offset for sticky nav
    window.scrollTo({ top, behavior: 'smooth' });
    setActive(id);
  }

  return (
    <nav className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-surface-border">
      <div className="max-w-[1440px] mx-auto px-6">
        <ul className="flex items-center gap-1 h-12">
          {SECTIONS.map((s) => {
            const isActive = active === s.id;
            return (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={(e) => handleClick(e, s.id)}
                  className={`relative inline-flex items-center px-4 h-12 text-sm font-medium transition-colors ${
                    isActive ? 'text-brand' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {s.label}
                  {isActive && (
                    <span className="absolute left-3 right-3 bottom-0 h-0.5 bg-brand rounded-t" />
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
