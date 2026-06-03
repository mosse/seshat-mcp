import { ScenarioSelector } from '@/components/ScenarioSelector';
import { ComplexityChart } from '@/components/ComplexityChart';
import { formatYear } from '@seshat/shared';
import type { PolityDetail, ComplexityScore, ProjectionPoint } from '@seshat/shared';

async function getPolity(id: string): Promise<PolityDetail | null> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/polities/${id}`, {
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}

function toProjectionPoints(scores: ComplexityScore[]): ProjectionPoint[] {
  return scores.map((s) => ({
    century: s.century,
    pc1_composite: s.pc1_composite ?? 0,
    pc1_scale: s.pc1_scale ?? 0,
    pc1_hier: s.pc1_hier ?? 0,
    pc1_gov: s.pc1_gov ?? 0,
  }));
}

export default async function PolityDetailPage({
  params,
}: {
  params: Promise<{ polityId: string }>;
}) {
  const { polityId } = await params;
  const polity = await getPolity(polityId);

  if (!polity) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-24 text-center">
        <h1 className="mb-4 font-display text-3xl font-semibold text-parchment">
          Polity not found
        </h1>
        <p className="text-parchment-dim">
          No polity found with ID &ldquo;{polityId}&rdquo;.
        </p>
      </div>
    );
  }

  const timelinePoints = toProjectionPoints(polity.complexity_timeline);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="reveal reveal-1 mb-12">
        <p className="kicker mb-3">{polity.region}</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-parchment sm:text-5xl">
          {polity.name}
        </h1>
        <p className="mt-3 font-mono text-sm text-parchment-dim">
          {formatYear(polity.start_year)} — {formatYear(polity.end_year)}
          {polity.capital ? ` · Capital: ${polity.capital}` : ''}
        </p>
      </div>

      {timelinePoints.length > 0 && (
        <div className="reveal reveal-2 mb-14">
          <h2 className="mb-4 font-display text-2xl font-semibold text-parchment">
            Complexity timeline
          </h2>
          <div className="panel p-6">
            <ComplexityChart baseline={timelinePoints} animated={false} />
          </div>
        </div>
      )}

      <div className="reveal reveal-3">
        <h2 className="mb-2 font-display text-2xl font-semibold text-parchment">
          What if…?
        </h2>
        <p className="mb-6 text-parchment-dim">
          Choose a scenario to see how this civilisation might have developed
          differently.
        </p>
        <ScenarioSelector polity={polity} />
      </div>
    </div>
  );
}
