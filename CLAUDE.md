# Seshat Project — Development Conventions

## Repository structure

pnpm monorepo with three packages:

- `packages/shared` — TypeScript types, estimation engine, scenario catalogue, year utilities. **Must be built before other packages** (`pnpm --filter @seshat/shared build`).
- `packages/mcp-server` — MCP server exposing 9 Seshat tools. Independently publishable for researchers.
- `packages/web` — Next.js 16 "Echoes of History" web app.
- `data/etl/` — Python ETL pipeline for Seshat data ingestion (separate venv).
- `data/schemas/` — Supabase SQL migrations.

## Build order

```bash
pnpm --filter @seshat/shared build   # Must run first
pnpm --filter @seshat/mcp-server build
pnpm --filter web build
```

## Running tests

```bash
# MCP server (vitest)
pnpm --filter @seshat/mcp-server test

# ETL (pytest) — requires venv
cd data/etl && source .venv/bin/activate && pytest tests/
```

## Key conventions

- **Year convention**: BCE years are negative integers. Year 0 = 1 BCE (astronomical). Display as "500 BCE" not "-500".
- **No raw SQL in app code**: Use Supabase query builder or RPC functions.
- **Supabase credentials server-side only**: The web app client never touches Supabase directly.
- **Uncertainty is a feature**: Always show confidence bands on charts. Narrative must include confidence_limits section.
- **Americas/Oceania caveat**: The regression model was validated on Eurasian data. Add a prominent caveat for these regions.
- **Streaming narrative**: Claude responses stream token-by-token via ReadableStream.
- **Shared engine**: Forward projection model and preconditions live in `@seshat/shared`, not in individual packages.
- **TypeScript strict mode**: Enabled everywhere.
- **Commit style**: Imperative mood, 1-2 sentence summary, include Co-Authored-By for AI-assisted commits.

## Environment variables

See `.env.example` files in `packages/mcp-server/` and `packages/web/`.

Required:
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_KEY` — Service role key (server-side only)
- `ANTHROPIC_API_KEY` — For narrative generation (web app only)
