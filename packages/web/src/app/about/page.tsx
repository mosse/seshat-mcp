export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="kicker mb-3">Colophon</p>
      <h1 className="mb-8 font-display text-4xl font-semibold tracking-tight text-parchment sm:text-5xl">
        About Echoes of History
      </h1>

      <div className="prose-echoes prose prose-lg max-w-none">
        <p className="dropcap">
          Echoes of History is a counterfactual history explorer that lets you
          inject hypothetical changes into real civilisations and see what a
          data-driven model predicts would have changed.
        </p>

        <h2>How it works</h2>
        <p>
          The estimation engine implements the dynamic regression model from
          Turchin et al. (2022) using its <strong>published coefficients</strong>,
          recovered from the paper&apos;s replication deposit and independently
          validated — we re-fit the deposit&apos;s own data and reproduced every
          coefficient exactly. The model identifies four key predictors of social
          complexity: the existing complexity level, the presence of iron weapons
          and cavalry, military technology breadth, and agricultural productivity.
        </p>
        <p>
          When you inject a change (like giving the Maya iron weapons), the model
          projects how the polity&apos;s social complexity score would diverge from
          its historical trajectory. Monte Carlo simulation (1,000 samples)
          generates confidence bands at the model&apos;s published residual scale.
          They represent statistical noise within the model — not the full range
          of historical possibility — and use Gaussian noise as an approximation
          of the paper&apos;s bootstrap procedure.
        </p>

        <h2>The data</h2>
        <p>
          All estimates are anchored to real data from the Seshat Global History
          Databank, which contains coded information on over 400 historical
          societies spanning 10,000 years. Geospatial data comes from
          Cliopatria, a companion dataset with boundaries for 1,600+ political
          entities.
        </p>

        <h2>Limitations</h2>
        <ul>
          <li>
            The model equations are the published, validated Turchin et al. (2022)
            fit — but the historical <em>input data</em> feeding them is still
            illustrative while real Seshat ingestion is completed. Treat outputs as
            directional illustrations, not authoritative estimates.
          </li>
          <li>
            Scenario effects are <strong>schematic</strong>: injecting a change
            nudges the model&apos;s inputs in a plausible direction rather than
            precisely simulating each technology, so different scenarios can produce
            similar trajectories.
          </li>
          <li>
            The regression model was developed primarily on Eurasian data.
            Estimates for the Americas and Oceania carry higher uncertainty.
          </li>
          <li>
            Confidence bands represent statistical uncertainty in the model, not
            the full range of historical contingency.
          </li>
          <li>
            Projections beyond ~300 years should be treated as speculative.
          </li>
          <li>
            The model captures broad patterns of social complexity, not specific
            events, battles, or individual decisions.
          </li>
        </ul>

        <h2>Data credits</h2>
        <p>
          Data sourced from the{' '}
          <a href="https://seshatdatabank.info">
            Seshat Global History Databank
          </a>{' '}
          (Turchin, P., Brennan, R., Currie, T.E., et al., 2015. Seshat: The
          Global History Databank. <em>Cliodynamics</em> 6(1)). Used under CC
          BY-NC-SA 4.0.
        </p>
        <p>
          Geospatial data from{' '}
          <a href="https://github.com/Seshat-Global-History-Databank/cliopatria">
            Cliopatria
          </a>{' '}
          (Seshat Global History Databank, 2025), CC BY 4.0.
        </p>
        <p>
          Counterfactual model based on Turchin et al. (2022). Disentangling the
          evolutionary drivers of social complexity.{' '}
          <em>Science Advances</em>.
        </p>

        <h2>Open source</h2>
        <p>
          This project is open source. The MCP server is available for
          researchers to use with Claude and other AI assistants.
        </p>
        <p>
          This is an independent project and is not affiliated with the Seshat
          Global History Databank team.
        </p>
      </div>
    </div>
  );
}
