# Contributing

Thanks for your interest! This project aims to make quantitative history
queryable and honest — contributions are judged as much on *scientific
truthfulness* as on code quality.

## Setup

```bash
pnpm install
pnpm --filter @seshat/shared build   # MUST build first — everything depends on it
```

The web app and MCP server need a populated Supabase instance — see
[`data/README.md`](data/README.md) for the full pipeline. Copy the
`.env.example` files in `packages/mcp-server/` and `packages/web/`.

## Repository layout

| Path | What |
|------|------|
| `packages/shared` | Types, the projection model, scenario catalogue, year utils |
| `packages/mcp-server` | The MCP server (stdio) — 9 tools |
| `packages/web` | Next.js app |
| `data/etl`, `data/schemas` | Python ETL + SQL migrations |
| `docs/` | Model provenance ([`MODEL.md`](docs/MODEL.md)), audit trail ([`MODEL_AUDIT.md`](docs/MODEL_AUDIT.md)), worked examples ([`EXAMPLES.md`](docs/EXAMPLES.md)) |
| `IMPROVEMENT_PLAN.md` | The tracked roadmap — check it before starting work |

## Tests (all must pass; CI runs them on every PR)

```bash
pnpm --filter @seshat/mcp-server test          # vitest — 72 tests
pnpm --filter web build                        # next build runs the type-checker
pnpm --filter web exec playwright test         # 34 e2e tests (needs `playwright install`)
cd data/etl && source .venv/bin/activate && pytest tests/   # 75 tests
```

## Ground rules

- **Never weaken the model's honesty.** The engine's coefficients are locked to
  [`docs/MODEL_AUDIT.md`](docs/MODEL_AUDIT.md) by tests; any change to
  `packages/shared/src/model.ts` constants must update the audit doc *with
  provenance* (where the new numbers come from), or the tests will —
  correctly — fail. Claims in user-facing copy must not run ahead of what the
  code does.
- **Year convention:** BCE years are negative integers (year 0 = 1 BCE).
  Display as "500 BCE", never "-500".
- **Uncertainty is a feature:** projections always ship with confidence bands
  and caveats; don't remove them to make output look cleaner.
- **No raw SQL in app code** — Supabase query builder or RPC functions only.
- **Supabase credentials are server-side only** — the web client never touches
  Supabase directly.
- **TypeScript strict mode** everywhere; match the surrounding code style.

## Commits & PRs

- Imperative mood, 1–2 sentence summary; include `Co-Authored-By` for
  AI-assisted commits.
- Small, reviewable PRs against `main`. CI (build + unit + e2e) must be green.
- If your change affects the model, data pipeline, or any scientific claim,
  say so explicitly in the PR description and link the relevant doc.

## Data licensing

Code is MIT. The Seshat data is **CC BY-NC-SA 4.0** — contributions must not
introduce commercial use of the data or strip attribution.
