'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ComplexityChart } from './ComplexityChart';
import { formatYear } from '@seshat/shared';
import type {
  Polity,
  Scenario,
  ProjectionResult,
  NarrativeOutput,
} from '@seshat/shared';

interface CounterfactualResultsProps {
  polity: Polity;
  scenario: Scenario;
  injectionYear: number;
}

export function CounterfactualResults({
  polity,
  scenario,
  injectionYear,
}: CounterfactualResultsProps) {
  const [projection, setProjection] = useState<ProjectionResult | null>(null);
  const [narrative, setNarrative] = useState<NarrativeOutput | null>(null);
  const [narrativeText, setNarrativeText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      setNarrativeText('');

      try {
        const res = await fetch('/api/counterfactual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            polity_id: polity.id,
            scenario_id: scenario.id,
            injection_year: injectionYear,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Request failed');
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('No response stream');

        const decoder = new TextDecoder();
        let buffer = '';
        let projectionParsed = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (cancelled) break;

          buffer += decoder.decode(value, { stream: true });

          // First line is JSON projection result
          if (!projectionParsed) {
            const newlineIdx = buffer.indexOf('\n');
            if (newlineIdx !== -1) {
              const jsonLine = buffer.slice(0, newlineIdx);
              buffer = buffer.slice(newlineIdx + 1);
              const result = JSON.parse(jsonLine) as ProjectionResult;
              setProjection(result);
              projectionParsed = true;
            }
          } else {
            // Remaining is streamed narrative
            setNarrativeText(buffer);
          }
        }

        // Parse complete narrative JSON
        if (buffer && projectionParsed) {
          try {
            const parsed = JSON.parse(buffer) as NarrativeOutput;
            setNarrative(parsed);
          } catch {
            // Narrative might not be valid JSON (e.g. if Claude returned plain text)
            setNarrative({
              headline: '',
              immediate_effects: buffer,
              ripple_effects: '',
              geopolitical_response: '',
              confidence_limits: '',
            });
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Something went wrong'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [polity.id, scenario.id, injectionYear]);

  const yearLabel = formatYear(injectionYear);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
      {/* Section 1: The Setup */}
      <section className="mb-12 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-2">
          What if {polity.name} had {scenario.label.toLowerCase()} in{' '}
          {yearLabel}?
        </h1>
        <p className="text-stone-600">
          {scenario.description} &middot; Projection: 5 centuries forward
        </p>
      </section>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 mb-8">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Section 2: The Divergence */}
      {projection && (
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-stone-900 mb-4">
            The Divergence
          </h2>
          <div className="rounded-xl border border-stone-200 bg-white p-6">
            <ComplexityChart
              baseline={projection.baseline}
              counterfactual={projection.counterfactual}
              confidenceBands={projection.confidence_bands}
            />
          </div>
          <p className="text-sm text-stone-600 mt-3 text-center">
            The model projects {polity.name} would have been{' '}
            <span className="font-semibold">
              {projection.delta_complexity > 0 ? '+' : ''}
              {(projection.delta_complexity * 100).toFixed(0)}%
            </span>{' '}
            more complex by century 5.
            <br />
            <span className="text-stone-400">
              Shaded region: 90% confidence interval (widens over time).
            </span>
          </p>
        </section>
      )}

      {/* Section 3: The Narrative */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-stone-900 mb-4">
          The Narrative
        </h2>
        <div className="rounded-xl border border-stone-200 bg-white p-8">
          {loading && !narrative && (
            <div className="text-stone-500">
              {narrativeText ? (
                <p className="whitespace-pre-wrap font-serif text-stone-700 leading-relaxed">
                  {narrativeText}
                </p>
              ) : (
                <p>Generating narrative...</p>
              )}
            </div>
          )}
          {narrative && (
            <div className="space-y-6 font-serif text-stone-700 leading-relaxed">
              {narrative.headline && (
                <p className="text-lg font-semibold text-stone-900 font-sans">
                  {narrative.headline}
                </p>
              )}
              {narrative.immediate_effects && (
                <div>
                  <h3 className="text-sm font-medium text-stone-500 font-sans uppercase tracking-wider mb-2">
                    What changed first
                  </h3>
                  <p>{narrative.immediate_effects}</p>
                </div>
              )}
              {narrative.ripple_effects && (
                <div>
                  <h3 className="text-sm font-medium text-stone-500 font-sans uppercase tracking-wider mb-2">
                    What rippled outward
                  </h3>
                  <p>{narrative.ripple_effects}</p>
                </div>
              )}
              {narrative.geopolitical_response && (
                <div>
                  <h3 className="text-sm font-medium text-stone-500 font-sans uppercase tracking-wider mb-2">
                    How neighbours responded
                  </h3>
                  <p>{narrative.geopolitical_response}</p>
                </div>
              )}
              {narrative.confidence_limits && (
                <div className="border-t border-stone-100 pt-4 text-sm text-stone-500 italic">
                  {narrative.confidence_limits}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Section 4: Warnings/Notes */}
      {projection && projection.notes.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-stone-900 mb-4">
            Caveats
          </h2>
          <ul className="space-y-2">
            {projection.notes.map((note, i) => (
              <li
                key={i}
                className="flex gap-2 text-sm text-stone-600 bg-amber-50 border border-amber-200 rounded-lg p-3"
              >
                <span className="text-amber-600 font-medium shrink-0">
                  Note:
                </span>
                {note}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Section 5: Explore More */}
      <section className="text-center">
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href={`/explore/${polity.id}`}
            className="rounded-lg border border-stone-300 px-5 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-100 transition-colors"
          >
            Try a different scenario
          </Link>
          <Link
            href="/explore"
            className="rounded-lg border border-stone-300 px-5 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-100 transition-colors"
          >
            Choose another civilisation
          </Link>
        </div>
      </section>
    </div>
  );
}
