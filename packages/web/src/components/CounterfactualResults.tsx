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
  const deltaPct = projection
    ? `${projection.delta_complexity > 0 ? '+' : ''}${(projection.delta_complexity * 100).toFixed(0)}%`
    : null;
  const deltaPositive = (projection?.delta_complexity ?? 0) >= 0;

  return (
    <article className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Section 1: The Setup */}
      <header className="reveal reveal-1 mb-16">
        <p className="kicker mb-4">A counterfactual · {scenario.label}</p>
        <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-parchment sm:text-5xl">
          What if {polity.name} had{' '}
          <em className="text-gilt not-italic">
            {scenario.label.toLowerCase()}
          </em>{' '}
          in {yearLabel}?
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-parchment-dim">
          {scenario.description} · Projected five centuries forward.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-10 rounded-xl border border-terracotta/40 bg-terracotta/10 p-5"
        >
          <p className="text-terracotta">{error}</p>
        </div>
      )}

      {/* Section 2: The Divergence */}
      {projection && (
        <section className="reveal mb-16">
          <div className="mb-5 flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-semibold text-parchment">
              The divergence
            </h2>
            {deltaPct && (
              <span
                className={`font-mono text-sm ${deltaPositive ? 'text-patina-300' : 'text-terracotta'}`}
              >
                {deltaPct} by century 5
              </span>
            )}
          </div>
          <div className="panel p-6">
            <ComplexityChart
              baseline={projection.baseline}
              counterfactual={projection.counterfactual}
              confidenceBands={projection.confidence_bands}
            />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-parchment-dim">
            The model projects {polity.name} would have been{' '}
            <span className="font-semibold text-parchment">{deltaPct}</span> more
            complex by century 5. The shaded region is the 90% confidence
            interval — it widens over time as uncertainty compounds.
          </p>
        </section>
      )}

      {/* Section 3: The Narrative */}
      <section className="mb-16">
        <h2 className="reveal mb-5 font-display text-2xl font-semibold text-parchment">
          The narrative
        </h2>
        <div className="panel p-8 sm:p-10">
          {loading && !narrative && (
            <div>
              {narrativeText ? (
                <p className="dropcap whitespace-pre-wrap font-display text-lg leading-relaxed text-parchment-dim">
                  {narrativeText}
                </p>
              ) : (
                <div className="flex items-center gap-3 text-parchment-faint">
                  <span className="h-2 w-2 animate-ping rounded-full bg-brass-400" />
                  <span className="font-mono text-sm">
                    Consulting the model…
                  </span>
                </div>
              )}
            </div>
          )}
          {narrative && (
            <div className="space-y-8 leading-relaxed text-parchment-dim">
              {narrative.headline && (
                <p className="font-display text-2xl font-semibold leading-snug text-parchment">
                  {narrative.headline}
                </p>
              )}
              {narrative.immediate_effects && (
                <div>
                  <h3 className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-brass-400">
                    What changed first
                  </h3>
                  <p className="dropcap text-lg leading-relaxed">
                    {narrative.immediate_effects}
                  </p>
                </div>
              )}
              {narrative.ripple_effects && (
                <div>
                  <h3 className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-brass-400">
                    What rippled outward
                  </h3>
                  <p className="text-lg leading-relaxed">
                    {narrative.ripple_effects}
                  </p>
                </div>
              )}
              {narrative.geopolitical_response && (
                <div>
                  <h3 className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-brass-400">
                    How neighbours responded
                  </h3>
                  <p className="text-lg leading-relaxed">
                    {narrative.geopolitical_response}
                  </p>
                </div>
              )}
              {narrative.confidence_limits && (
                <div className="border-t border-rule pt-5 text-sm italic text-parchment-faint">
                  {narrative.confidence_limits}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Section 4: Warnings/Notes */}
      {projection && projection.notes.length > 0 && (
        <section className="mb-16">
          <h2 className="mb-5 font-display text-2xl font-semibold text-parchment">
            Caveats
          </h2>
          <ul className="space-y-3">
            {projection.notes.map((note, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-xl border border-terracotta/30 bg-terracotta/5 p-4 text-sm leading-relaxed text-parchment-dim"
              >
                <span className="shrink-0 font-mono text-xs uppercase tracking-wider text-terracotta">
                  Note
                </span>
                {note}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Section 5: Explore More */}
      <section>
        <hr className="rule-brass mb-8" />
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/explore/${polity.id}`}
            className="rounded-full border border-rule-strong px-5 py-2.5 text-sm font-medium text-parchment-dim transition-colors hover:border-brass-600 hover:text-parchment"
          >
            Try a different scenario
          </Link>
          <Link
            href="/explore"
            className="rounded-full border border-rule-strong px-5 py-2.5 text-sm font-medium text-parchment-dim transition-colors hover:border-brass-600 hover:text-parchment"
          >
            Choose another civilisation
          </Link>
        </div>
      </section>
    </article>
  );
}
