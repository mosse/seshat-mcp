'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { REGIONS } from '@seshat/shared';
import { formatYear } from '@seshat/shared';
import type { Polity, Region } from '@seshat/shared';

export function CivilizationPicker() {
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState<Region | ''>('');
  const [polities, setPolities] = useState<Polity[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const search = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (region) params.set('region', region);
    params.set('limit', '24');

    try {
      const res = await fetch(`/api/polities/search?${params}`);
      const data = await res.json();
      setPolities(data.polities ?? []);
      setTotalCount(data.total_count ?? 0);
    } catch {
      setPolities([]);
    } finally {
      setLoading(false);
    }
  }, [query, region]);

  useEffect(() => {
    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const hasQuery = Boolean(query || region);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor="polity-search" className="sr-only">
            Search civilisations by name
          </label>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-parchment-faint"
          >
            ⌕
          </span>
          <input
            id="polity-search"
            type="text"
            placeholder="Search by name (e.g. Roman, Maya, Han)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-rule bg-ink-850 py-3 pl-11 pr-4 text-sm text-parchment placeholder:text-parchment-faint transition-colors hover:border-rule-strong focus:border-brass-500"
          />
        </div>
        <div className="sm:w-64">
          <label htmlFor="region-filter" className="sr-only">
            Filter by region
          </label>
          <select
            id="region-filter"
            aria-label="Filter by region"
            value={region}
            onChange={(e) => setRegion(e.target.value as Region | '')}
            className="w-full rounded-xl border border-rule bg-ink-850 px-4 py-3 text-sm text-parchment transition-colors hover:border-rule-strong focus:border-brass-500"
          >
            <option value="">All regions</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* status region for assistive tech */}
      <p aria-live="polite" className="sr-only">
        {loading
          ? 'Searching'
          : polities.length > 0
            ? `${polities.length} of ${totalCount} results`
            : ''}
      </p>

      {loading && (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="panel h-28 animate-pulse"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
      )}

      {!loading && polities.length === 0 && (
        <div className="mt-12 rounded-2xl border border-dashed border-rule px-6 py-16 text-center">
          <p className="font-display text-xl text-parchment">
            {hasQuery
              ? 'No polities found. Try a different search.'
              : 'Enter a search term or select a region to get started.'}
          </p>
          {!hasQuery && (
            <p className="mt-2 text-sm text-parchment-faint">
              Try “Roman”, “Maya”, “Han”, or pick a region from the filter.
            </p>
          )}
        </div>
      )}

      {!loading && polities.length > 0 && (
        <>
          <p className="mb-4 mt-8 font-mono text-xs uppercase tracking-[0.18em] text-parchment-faint">
            Showing {polities.length} of {totalCount} results
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {polities.map((p, i) => (
              <Link
                key={p.id}
                href={`/explore/${p.id}`}
                className={`reveal reveal-${(i % 8) + 1} panel group p-5 transition-all duration-300 hover:-translate-y-1 hover:border-brass-600/70`}
              >
                <h3 className="font-display text-lg font-semibold text-parchment transition-colors group-hover:text-brass-300">
                  {p.name}
                </h3>
                <p className="mt-2 font-mono text-xs text-parchment-dim">
                  {formatYear(p.start_year)} — {formatYear(p.end_year)}
                </p>
                <p className="mt-1 text-xs text-parchment-faint">
                  {p.region}
                  {p.nga ? ` · ${p.nga}` : ''}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
