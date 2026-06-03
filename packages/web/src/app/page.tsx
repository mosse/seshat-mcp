import Link from 'next/link';

const FEATURED_SCENARIOS = [
  {
    question: 'What if the Maya had ironworking in 300 CE?',
    polityId: 'mx_classic_maya',
    scenarioId: 'iron_weapons',
    year: 300,
    tag: 'Iron weapons',
    when: '300 CE',
    region: 'Mesoamerica',
    accent: 'brass' as const,
  },
  {
    question: 'What if the Roman Empire adopted the stirrup 200 years earlier?',
    polityId: 'it_roman_empire_principate',
    scenarioId: 'cavalry',
    year: 0,
    tag: 'Cavalry',
    when: '1 BCE',
    region: 'Europe',
    accent: 'patina' as const,
  },
  {
    question: 'What if the Aztecs had cavalry?',
    polityId: 'mx_aztec_empire',
    scenarioId: 'cavalry',
    year: 1400,
    tag: 'Cavalry',
    when: '1400 CE',
    region: 'Mesoamerica',
    accent: 'brass' as const,
  },
  {
    question: 'What if the Maurya Empire kept iron weapons from the Gangetic Plain?',
    polityId: 'in_maurya_empire',
    scenarioId: 'iron_weapons',
    year: -300,
    tag: 'Iron weapons',
    when: '300 BCE',
    region: 'South Asia',
    accent: 'patina' as const,
  },
  {
    question: 'What if the Inca had writing?',
    polityId: 'pe_inca_empire',
    scenarioId: 'writing_system',
    year: 1400,
    tag: 'Writing system',
    when: '1400 CE',
    region: 'Andes',
    accent: 'brass' as const,
  },
  {
    question: 'What if Sub-Saharan African kingdoms adopted cavalry in 500 CE?',
    polityId: 'gh_akan_kingdoms',
    scenarioId: 'cavalry',
    year: 500,
    tag: 'Cavalry',
    when: '500 CE',
    region: 'Africa',
    accent: 'patina' as const,
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Pick a civilisation',
    body: 'Choose from 400+ historical societies spanning 10,000 years across every inhabited continent.',
  },
  {
    n: '02',
    title: 'Inject a change',
    body: 'Give them iron weapons, writing, cavalry, or gunpowder — and choose the century it arrives.',
  },
  {
    n: '03',
    title: 'See what changes',
    body: 'The model projects how social complexity would diverge, grounded in patterns from comparable real societies.',
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* ---------- Hero ---------- */}
      <section className="relative pb-20 pt-20 sm:pt-28">
        <p className="reveal reveal-1 kicker mb-6">
          Counterfactual history · Seshat Databank
        </p>
        <h1 className="reveal reveal-2 max-w-4xl font-display text-5xl font-semibold leading-[0.98] tracking-tight text-parchment sm:text-7xl">
          What if history had gone{' '}
          <em className="text-gilt not-italic">differently</em>?
        </h1>
        <p className="reveal reveal-3 mt-8 max-w-2xl text-lg leading-relaxed text-parchment-dim">
          Inject a hypothetical change into a real civilisation — and watch a
          data-driven model project how the arc of its complexity would have
          bent. Built on the Seshat Global History Databank and 400+ historical
          societies.
        </p>
        <div className="reveal reveal-4 mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/explore"
            className="group inline-flex items-center gap-2 rounded-full bg-brass-400 px-7 py-3.5 text-sm font-semibold text-ink-950 shadow-[0_0_30px_-8px_rgba(210,161,78,0.6)] transition-all hover:bg-brass-300 hover:shadow-[0_0_40px_-6px_rgba(210,161,78,0.8)]"
          >
            Start exploring
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>
          <Link
            href="/research"
            className="rounded-full border border-rule-strong px-7 py-3.5 text-sm font-medium text-parchment-dim transition-colors hover:border-brass-600 hover:text-parchment"
          >
            For researchers
          </Link>
        </div>

        {/* Time-spine motif */}
        <div className="reveal reveal-5 mt-16 flex items-center gap-4 font-mono text-xs text-parchment-faint">
          <span>10,000 BCE</span>
          <div className="relative h-px flex-1 bg-rule">
            <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brass-400 shadow-[0_0_12px_2px_rgba(210,161,78,0.6)]" />
          </div>
          <span>today</span>
        </div>
      </section>

      <hr className="rule-brass" />

      {/* ---------- Featured what-ifs ---------- */}
      <section className="py-20">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="kicker mb-2">Featured what-ifs</p>
            <h2 className="font-display text-3xl font-semibold text-parchment">
              Six divergences to explore
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURED_SCENARIOS.map((s, i) => {
            const accentText =
              s.accent === 'brass' ? 'text-brass-400' : 'text-patina-400';
            const accentHover =
              s.accent === 'brass'
                ? 'hover:border-brass-600/70'
                : 'hover:border-patina-500/70';
            return (
              <Link
                key={s.question}
                href={`/explore/${s.polityId}/${s.scenarioId}?year=${s.year}`}
                className={`reveal reveal-${i + 1} panel group relative flex flex-col overflow-hidden p-6 transition-all duration-300 hover:-translate-y-1 ${accentHover}`}
              >
                {/* index numeral */}
                <span
                  aria-hidden="true"
                  className="absolute right-5 top-4 font-display text-5xl font-semibold text-ink-700 transition-colors group-hover:text-ink-600"
                >
                  {i + 1}
                </span>
                <div className="mb-4 flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-[0.18em]">
                  <span className={accentText}>{s.tag}</span>
                  <span className="text-parchment-faint">·</span>
                  <span className="text-parchment-faint">{s.when}</span>
                </div>
                <p className="font-display text-xl font-medium leading-snug text-parchment">
                  {s.question}
                </p>
                <div className="mt-auto pt-6 text-xs text-parchment-faint">
                  {s.region}
                  <span className={`ml-2 ${accentText} opacity-0 transition-opacity group-hover:opacity-100`}>
                    Run projection →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <hr className="rule-brass" />

      {/* ---------- How it works ---------- */}
      <section className="py-20">
        <div className="mb-12 text-center">
          <p className="kicker mb-2">The method</p>
          <h2 className="font-display text-3xl font-semibold text-parchment">
            How it works
          </h2>
        </div>
        <ol className="grid grid-cols-1 gap-10 md:grid-cols-3">
          {STEPS.map((step) => (
            <li key={step.n} className="relative">
              <div
                aria-hidden="true"
                className="mb-4 font-mono text-sm text-brass-500"
              >
                {step.n}
              </div>
              <h3 className="mb-2 font-display text-xl font-semibold text-parchment">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-parchment-dim">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
