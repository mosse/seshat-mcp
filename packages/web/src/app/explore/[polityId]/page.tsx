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
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-stone-900 mb-4">
          Polity not found
        </h1>
        <p className="text-stone-600">
          No polity found with ID &ldquo;{polityId}&rdquo;.
        </p>
      </div>
    );
  }

  const timelinePoints = toProjectionPoints(polity.complexity_timeline);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-stone-900">{polity.name}</h1>
        <p className="text-stone-600 mt-1">
          {polity.region} &middot; {formatYear(polity.start_year)} &ndash;{' '}
          {formatYear(polity.end_year)}
          {polity.capital ? ` · Capital: ${polity.capital}` : ''}
        </p>
      </div>

      {timelinePoints.length > 0 && (
        <div className="mb-12">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">
            Complexity timeline
          </h2>
          <div className="rounded-xl border border-stone-200 bg-white p-6">
            <ComplexityChart baseline={timelinePoints} animated={false} />
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-stone-900 mb-4">
          What if...?
        </h2>
        <p className="text-stone-600 mb-6">
          Choose a scenario to see how this civilisation might have developed
          differently.
        </p>
        <ScenarioSelector polity={polity} />
      </div>
    </div>
  );
}
