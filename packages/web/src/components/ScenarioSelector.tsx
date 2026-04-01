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

  return (
    <div>
      <div className="mb-6">
        <label
          htmlFor="year-picker"
          className="block text-sm font-medium text-stone-700 mb-1"
        >
          Injection year
        </label>
        <div className="flex items-center gap-3">
          <input
            id="year-picker"
            type="range"
            min={polity.start_year}
            max={polity.end_year}
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="flex-1"
          />
          <span className="text-sm font-mono text-stone-600 w-24 text-right">
            {selectedYear < 0
              ? `${Math.abs(selectedYear)} BCE`
              : `${selectedYear} CE`}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sortedScenarios.map((scenario) => {
          const applicable = isApplicable(scenario);
          return (
            <Link
              key={scenario.id}
              href={`/explore/${polity.id}/${scenario.id}?year=${selectedYear}`}
              className={`block rounded-lg border p-4 transition-all ${
                applicable
                  ? 'border-stone-200 bg-white hover:border-blue-400 hover:shadow-sm'
                  : 'border-stone-100 bg-stone-50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <h3 className="font-medium text-stone-900">
                  {scenario.label}
                </h3>
                {applicable && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    Applicable
                  </span>
                )}
              </div>
              <p className="text-sm text-stone-500 mt-1">
                {scenario.description}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
