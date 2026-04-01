import { CounterfactualResults } from '@/components/CounterfactualResults';
import { getScenarioById } from '@seshat/shared';
import type { Polity } from '@seshat/shared';

async function getPolity(id: string): Promise<Polity | null> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/polities/${id}`, {
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function CounterfactualPage({
  params,
  searchParams,
}: {
  params: Promise<{ polityId: string; scenarioId: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const { polityId, scenarioId } = await params;
  const { year: yearStr } = await searchParams;
  const year = yearStr ? parseInt(yearStr, 10) : 0;

  const [polity, scenario] = await Promise.all([
    getPolity(polityId),
    Promise.resolve(getScenarioById(scenarioId)),
  ]);

  if (!polity) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Polity not found</h1>
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Scenario not found</h1>
      </div>
    );
  }

  return (
    <CounterfactualResults
      polity={polity}
      scenario={scenario}
      injectionYear={year}
    />
  );
}
