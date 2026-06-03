'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/explore', label: 'Explore' },
  { href: '/research', label: 'Research' },
  { href: '/about', label: 'About' },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="sticky top-0 z-50 border-b border-rule bg-ink-950/80 backdrop-blur-md"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link
            href="/"
            className="group flex items-baseline gap-2.5"
            aria-label="Echoes of History — home"
          >
            <span
              aria-hidden="true"
              className="text-brass-400 text-lg transition-transform duration-500 group-hover:rotate-180"
            >
              ☉
            </span>
            <span className="font-display text-lg font-semibold tracking-tight text-parchment">
              Echoes of History
            </span>
            <span className="hidden font-mono text-[0.62rem] uppercase tracking-[0.2em] text-parchment-faint sm:inline">
              Seshat Explorer
            </span>
          </Link>

          <div className="flex items-center gap-1 text-sm">
            {LINKS.map((link) => {
              const active =
                pathname === link.href || pathname.startsWith(link.href + '/');
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={`relative rounded-md px-3 py-2 transition-colors ${
                    active
                      ? 'text-brass-300'
                      : 'text-parchment-dim hover:text-parchment'
                  }`}
                >
                  {link.label}
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-3 -bottom-px h-px bg-brass-400"
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
