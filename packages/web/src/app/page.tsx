import Link from 'next/link';

const FEATURED_SCENARIOS = [
  {
    question: 'What if the Maya had ironworking in 300 CE?',
    polityId: 'mx_classic_maya',
    scenarioId: 'iron_weapons',
    year: 300,
    color: 'bg-amber-50 border-amber-200 hover:border-amber-400',
  },
  {
    question: 'What if the Roman Empire adopted the stirrup 200 years earlier?',
    polityId: 'it_roman_empire_principate',
    scenarioId: 'cavalry',
    year: 0,
    color: 'bg-red-50 border-red-200 hover:border-red-400',
  },
  {
    question: 'What if the Aztecs had cavalry?',
    polityId: 'mx_aztec_empire',
    scenarioId: 'cavalry',
    year: 1400,
    color: 'bg-emerald-50 border-emerald-200 hover:border-emerald-400',
  },
  {
    question: 'What if the Maurya Empire kept iron weapons from the Gangetic Plain?',
    polityId: 'in_maurya_empire',
    scenarioId: 'iron_weapons',
    year: -300,
    color: 'bg-violet-50 border-violet-200 hover:border-violet-400',
  },
  {
    question: 'What if the Inca had writing?',
    polityId: 'pe_inca_empire',
    scenarioId: 'writing_system',
    year: 1400,
    color: 'bg-sky-50 border-sky-200 hover:border-sky-400',
  },
  {
    question: 'What if Sub-Saharan African kingdoms adopted cavalry in 500 CE?',
    polityId: 'gh_akan_kingdoms',
    scenarioId: 'cavalry',
    year: 500,
    color: 'bg-orange-50 border-orange-200 hover:border-orange-400',
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
      <section className="text-center mb-16">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-stone-900 mb-4">
          What if history had gone differently?
        </h1>
        <p className="text-lg text-stone-600 max-w-2xl mx-auto">
          Inject hypothetical changes into real civilisations and see what a
          data-driven model predicts would have changed. Powered by the Seshat
          Global History Databank and 400+ historical societies.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/explore"
            className="rounded-lg bg-stone-900 px-6 py-3 text-sm font-medium text-white hover:bg-stone-800 transition-colors"
          >
            Start exploring
          </Link>
          <Link
            href="/research"
            className="rounded-lg border border-stone-300 px-6 py-3 text-sm font-medium text-stone-700 hover:bg-stone-100 transition-colors"
          >
            For researchers
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-6 text-center">
          Featured what-ifs
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURED_SCENARIOS.map((s) => (
            <Link
              key={s.question}
              href={`/explore/${s.polityId}/${s.scenarioId}?year=${s.year}`}
              className={`block rounded-xl border-2 p-6 transition-all ${s.color}`}
            >
              <p className="text-lg font-medium text-stone-800">
                {s.question}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-20 text-center">
        <h2 className="text-2xl font-bold text-stone-900 mb-4">
          How it works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div>
            <div className="text-3xl font-bold text-stone-300 mb-2">1</div>
            <h3 className="font-semibold mb-1">Pick a civilisation</h3>
            <p className="text-sm text-stone-600">
              Choose from 400+ historical societies spanning 10,000 years
              across every continent.
            </p>
          </div>
          <div>
            <div className="text-3xl font-bold text-stone-300 mb-2">2</div>
            <h3 className="font-semibold mb-1">Inject a change</h3>
            <p className="text-sm text-stone-600">
              Give them iron weapons, writing, cavalry, or gunpowder.
              Choose when the change occurs.
            </p>
          </div>
          <div>
            <div className="text-3xl font-bold text-stone-300 mb-2">3</div>
            <h3 className="font-semibold mb-1">See what changes</h3>
            <p className="text-sm text-stone-600">
              The model projects how social complexity would diverge,
              grounded in patterns from comparable real societies.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
