import { CivilizationPicker } from '@/components/CivilizationPicker';

export default function ExplorePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-10 max-w-2xl">
        <p className="kicker mb-3">Step one</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-parchment sm:text-5xl">
          Choose a civilisation
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-parchment-dim">
          Search 400+ societies by name, or filter by region, to find a starting
          point for your counterfactual.
        </p>
      </div>
      <CivilizationPicker />
    </div>
  );
}
