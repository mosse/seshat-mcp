'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SCENARIOS } from '@seshat/shared';
import type { Scenario, Polity } from '@seshat/shared';

interface ScenarioSelectorProps {
  polity: Polity;
}

export function ScenarioSelector({ polity }: ScenarioSelectorProps) {
  const [selectedYear, setSelectedYear] = useState(
    Math.round((polity.start_year + polity.end_year) / 2)
  );

  const isApplicable = (scenario: Scenario) =>
    scenario.regions_applicable.length === 0 ||
    scenario.regions_applicable.includes(polity.region);

  const sortedScenarios = [...SCENARIOS].sort((a, b) => {
    const aAppl = isApplicable(a) ? 0 : 1;
    const bAppl = isApplicable(b) ? 0 : 1;
    return aAppl - bAppl;
  });

  const yearLabel =
    selectedYear < 0 ? `${Math.abs(selectedYear)} BCE` : `${selectedYear} CE`;

  return (
    <div>
      <div className="panel mb-8 p-6">
        <label
          htmlFor="year-picker"
          className="mb-3 block font-mono text-xs uppercase tracking-[0.18em] text-brass-400"
        >
          Injection year
        </label>
        <div className="flex items-center gap-5">
          <input
            id="year-picker"
            type="range"
            min={polity.start_year}
            max={polity.end_year}
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            aria-valuetext={yearLabel}
            className="range-brass flex-1"
          />
          <span className="w-24 text-right font-mono text-lg tabular-nums text-parchment">
            {yearLabel}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sortedScenarios.map((scenario) => {
          const applicable = isApplicable(scenario);
          return (
            <Link
              key={scenario.id}
              href={`/explore/${polity.id}/${scenario.id}?year=${selectedYear}`}
              aria-disabled={!applicable}
              className={`group block rounded-xl border p-5 transition-all duration-300 ${
                applicable
                  ? 'border-rule bg-ink-850 hover:-translate-y-1 hover:border-brass-600/70'
                  : 'border-rule/50 bg-ink-900 opacity-55 hover:opacity-80'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-lg font-semibold text-parchment transition-colors group-hover:text-brass-300">
                  {scenario.label}
                </h3>
                {applicable ? (
                  <span className="shrink-0 rounded-full border border-patina-500/40 bg-patina-500/10 px-2.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-patina-300">
                    Applicable
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full border border-rule px-2.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-parchment-faint">
                    Out of region
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-parchment-dim">
                {scenario.description}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
