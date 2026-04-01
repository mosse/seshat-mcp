import { CivilizationPicker } from '@/components/CivilizationPicker';

export default function ExplorePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-stone-900 mb-2">
          Choose a civilisation
        </h1>
        <p className="text-stone-600">
          Search by name, region, or time period to find a society to explore.
        </p>
      </div>
      <CivilizationPicker />
    </div>
  );
}
