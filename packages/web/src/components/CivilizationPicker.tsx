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

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <input
          type="text"
          placeholder="Search by name (e.g. Roman, Maya, Han)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 rounded-lg border border-stone-300 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-stone-400"
        />
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value as Region | '')}
          className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-stone-400"
        >
          <option value="">All regions</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="text-center text-stone-500 py-8">Searching...</div>
      )}

      {!loading && polities.length === 0 && (
        <div className="text-center text-stone-500 py-8">
          {query || region
            ? 'No polities found. Try a different search.'
            : 'Enter a search term or select a region to get started.'}
        </div>
      )}

      {!loading && polities.length > 0 && (
        <>
          <p className="text-sm text-stone-500 mb-4">
            Showing {polities.length} of {totalCount} results
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {polities.map((p) => (
              <Link
                key={p.id}
                href={`/explore/${p.id}`}
                className="block rounded-xl border border-stone-200 bg-white p-5 hover:border-stone-400 hover:shadow-sm transition-all"
              >
                <h3 className="font-semibold text-stone-900">{p.name}</h3>
                <p className="text-sm text-stone-500 mt-1">
                  {p.region} &middot; {formatYear(p.start_year)} &ndash;{' '}
                  {formatYear(p.end_year)}
                </p>
                {p.nga && (
                  <p className="text-xs text-stone-400 mt-1">NGA: {p.nga}</p>
                )}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
