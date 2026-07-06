# Seshat — Echoes of History

Ask counterfactual questions of the historical record. Seshat turns the [Seshat Global History Databank](https://seshat-db.com/) into something you can *interrogate* — both programmatically through an MCP server and visually through a web app — and then project what *might* have happened if history had gone differently.

> *"What if the Roman Empire had developed gunpowder weapons in 200 BCE? How might its social complexity have evolved?"*

This monorepo has two front doors:

- **🔌 MCP server** — exposes 9 Seshat tools to Claude and other MCP-enabled assistants, so researchers can query 10,000 years of social-complexity data in natural language. See [`packages/mcp-server/README.md`](packages/mcp-server/README.md).
- **🌍 Echoes of History web app** — a Next.js app for picking a civilisation, injecting a hypothetical change, and watching a forward-projected complexity trajectory with confidence bands.

Both are powered by the same estimation engine, which lives in the shared package.

## About the Seshat Global History Databank

This project is built on top of [**Seshat**](https://seshat-db.com/) — it does not generate historical data, it makes Seshat's data queryable and projectable.

Seshat (named after the ancient Egyptian goddess of wisdom and record-keeping) is a research databank founded in 2011 that systematically documents the social and political organisation of human societies across history. It calls itself "the most current and comprehensive body of knowledge about human history," structured so that the past can be studied with established scientific techniques. The databank is maintained by an international team of historians, social scientists, and data scientists, and underpins peer-reviewed research into the long-run evolution of social complexity.

Its scope is what makes counterfactual projection possible:

- **864 polities** (political societies) across **47 regions** grouped into **10 macro-regions** spanning Africa, Europe, Asia, the Americas, and Oceania
- Coverage from roughly **3550 BCE to the modern era**
- **77 social-complexity variables** (territory, population, settlement hierarchies, infrastructure, information systems, money) — the basis for the PC1 composite complexity score
- **49 warfare variables** (military technology, fortifications, conflict patterns)
- **26 general variables** (capitals, languages, religions, degree of centralisation)

Learn more or explore the source data at **[seshat-db.com](https://seshat-db.com/)**. See [Data provenance](#data-provenance) below for the specific datasets and licensing this project relies on.

## Repository structure

This is a [pnpm](https://pnpm.io) workspace monorepo:

| Package | What it is |
|---------|------------|
| [`packages/shared`](packages/shared) | TypeScript types, the forward-projection model, scenario catalogue, and BCE/CE year utilities. **Built first** — the other packages depend on it. |
| [`packages/mcp-server`](packages/mcp-server) | MCP server exposing 9 Seshat tools. Independently publishable for researchers. |
| [`packages/web`](packages/web) | The "Echoes of History" Next.js 16 web app. |
| [`data/etl`](data/etl) | Python ETL pipeline that ingests Seshat data into Supabase (separate venv). |
| [`data/schemas`](data/schemas) | Supabase SQL migrations, indexes, and RPC functions. |

## Quickstart

```bash
git clone https://github.com/mosse/seshat-mcp
cd seshat-mcp
pnpm install

# The shared package MUST be built before anything else
pnpm --filter @seshat/shared build
```

You'll need a Supabase project loaded with Seshat data (run the migrations in [`data/schemas`](data/schemas) and the ETL in [`data/etl`](data/etl)). Copy the `.env.example` files in `packages/mcp-server/` and `packages/web/` and fill in:

| Variable | Used by | Notes |
|----------|---------|-------|
| `SUPABASE_URL` | both | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | both | Service-role key — **server-side only** |
| `ANTHROPIC_API_KEY` | web | Narrative generation |

### Run the MCP server

```bash
pnpm --filter @seshat/shared build
pnpm --filter @seshat/mcp-server build
pnpm --filter @seshat/mcp-server dev
```

Then point Claude Desktop at it — see the [MCP server README](packages/mcp-server/README.md#connect-to-claude-desktop) for config.

### Run the web app

```bash
pnpm --filter @seshat/shared build
pnpm --filter web dev
```

## The 9 MCP tools

| Tool | Purpose |
|------|---------|
| `search_polities` | Find historical polities by name, region, or active year |
| `get_polity_detail` | Complexity scores and key variables for one polity |
| `get_variables` | Variable values for a polity over time |
| `get_complexity_timeline` | PC1 composite complexity trajectory across centuries |
| `compare_polities` | Side-by-side comparison of 2–5 polities |
| `find_analogous_polities` | Similar societies via cosine similarity on feature vectors |
| `get_technology_diffusion` | How a technology spread across regions over time |
| `run_counterfactual_estimate` | Project complexity under hypothetical changes with Monte Carlo confidence bands |
| `get_region_snapshot` | All polities active in a region during a given century |

Full parameter tables are in the [MCP server README](packages/mcp-server/README.md#tools).

## Testing

```bash
# MCP server (vitest) — 56 tests
pnpm --filter @seshat/mcp-server test

# Web app end-to-end (Playwright) — 34 tests, Desktop Chrome + mobile
pnpm --filter web exec playwright test

# ETL (pytest) — 75 tests, requires venv
cd data/etl && source .venv/bin/activate && pytest tests/
```

## How estimates work — and their limits

The counterfactual engine implements the dynamic regression model from Turchin et al. (2022), *Disentangling the evolutionary drivers of social complexity* (*Science Advances*), using the **published coefficients recovered from the paper's replication deposit and independently validated** — see [`docs/MODEL.md`](docs/MODEL.md) and the audit trail in [`docs/MODEL_AUDIT.md`](docs/MODEL_AUDIT.md). Monte Carlo sampling at the published residual scale produces the confidence bands.

> ⚠️ **The model is real; the input data is still illustrative.** The engine runs the validated published equations, but the historical values feeding it remain placeholder-grade until real Seshat ingestion lands (tracked in [`IMPROVEMENT_PLAN.md`](IMPROVEMENT_PLAN.md)). The bands use Gaussian noise as an approximation of the paper's bootstrap. Read projections as directional illustrations, not authoritative estimates.

A few things to keep in mind when reading any projection:

- **Uncertainty is a feature.** Every projection ships with confidence bands and an explicit `confidence_limits` section. The bands capture statistical noise within the model — not the full range of historical contingency. Treat the central line as one illustrative path, not a prediction.
- **Eurasian validation.** The regression model was validated on Eurasian data. Projections for the **Americas and Oceania-Pacific** carry a prominent caveat and should be read with extra caution.
- **Year convention.** BCE years are negative integers (year 0 = 1 BCE, astronomical). They're displayed as `"500 BCE"`, never `"-500"`.

## Data provenance

- **Equinox-2020** — Seshat Global History Databank (Turchin et al., 2015). CC BY-NC-SA 4.0. [Zenodo](https://zenodo.org/record/6642229)
- **Cliopatria** — Seshat geospatial boundaries. CC BY 4.0. [GitHub](https://github.com/Seshat-Global-History-Databank/cliopatria)
- **Counterfactual model** — Turchin et al. (2022). *Disentangling the evolutionary drivers of social complexity*. *Science Advances*.

## License

Code is [MIT](LICENSE). The underlying Seshat data is **CC BY-NC-SA 4.0** — any use of the data must be **non-commercial and attributed**.
