# Echoes of History — Web App

The Next.js front end for [Seshat](../../README.md). Pick a civilisation, inject a hypothetical change, and watch a forward-projected social-complexity trajectory unfold with confidence bands and a streaming narrative.

Part of the Seshat monorepo — see the [root README](../../README.md) for the big picture.

## Stack

- **Next.js 16** (App Router) + **React 19**
- **Tailwind CSS 4**
- **Recharts** + **d3** for charts, **MapLibre GL** for the history map
- **Framer Motion** for transitions
- **Supabase** (server-side only) for data
- **Anthropic SDK** for streaming narrative generation
- **Playwright** for end-to-end tests

## Prerequisites

The shared package must be built first — the app imports the estimation engine and types from `@seshat/shared`:

```bash
# From the repo root
pnpm install
pnpm --filter @seshat/shared build
```

You also need a populated Supabase project (run the migrations in [`data/schemas`](../../data/schemas) and the ETL in [`data/etl`](../../data/etl)).

## Environment

Copy `.env.example` to `.env.local` and fill in:

| Variable | Notes |
|----------|-------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Service-role key — **server-side only**, never exposed to the browser |
| `ANTHROPIC_API_KEY` | For streaming narrative generation |

## Scripts

```bash
pnpm dev      # Start the dev server (http://localhost:3000)
pnpm build    # Production build
pnpm start    # Serve the production build
```

Run from the repo root with `pnpm --filter web <script>`, or from this directory directly.

## Routes

| Path | Page |
|------|------|
| `/` | Landing — headline, featured scenarios, "how it works" |
| `/explore` | Search civilisations and launch a counterfactual |
| `/research` | MCP tool documentation and quickstart for researchers |
| `/about` | Project description, model limitations, data credits |

### API routes

| Endpoint | Purpose |
|----------|---------|
| `GET /api/scenarios` | Featured counterfactual scenarios |
| `GET /api/polities/search` | Search polities by name/region/year |
| `GET /api/polities/[id]` | Polity detail |
| `POST /api/counterfactual` | Run a counterfactual estimate (streams narrative) |

Supabase is only ever touched server-side in these routes — the client never holds credentials.

## Testing

```bash
# Unit/integration of the shared engine lives in @seshat/shared and packages/mcp-server.
# This package's tests are end-to-end (Playwright), covering Desktop Chrome and mobile (WebKit):
pnpm exec playwright test            # all 34 tests
pnpm exec playwright test --ui       # interactive runner
pnpm exec playwright show-report     # open the last HTML report
```

The Playwright config boots its own dev server on port 3100 (reusing one if already running). First run: `pnpm exec playwright install` to download browsers.

## Conventions

- **Uncertainty is a feature** — charts always show confidence bands; narratives include a confidence-limits section.
- **Americas / Oceania caveat** — the regression model was validated on Eurasian data; these regions get a prominent caveat.
- **Year convention** — BCE years are negative integers, displayed as `"500 BCE"` (never `"-500"`).

> **Note:** This project uses Next.js 16, which has breaking changes from earlier versions. See [`AGENTS.md`](AGENTS.md) before writing code against the framework.
