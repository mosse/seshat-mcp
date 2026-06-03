# Seshat / Echoes of History — Improvement Plan

> Derived from a code-grounded critical review (June 2026) of the MCP server, the
> estimation engine + narrative path, and all documentation/educational copy.
> This is a planning artifact for review — nothing here is implemented yet.

## How to read this

- **Tracks** group related work: **SCI** (scientific integrity), **LAY** (educational/lay UX),
  **ACAD** (academic readiness), **MCP** (reusability/deployment), **DOC** (documentation hygiene).
- **Severity:** 🔴 Critical (truthfulness / credibility blocker) · 🟠 High · 🟡 Medium · 🟢 Polish.
- **Effort:** S (≤½ day) · M (1–2 days) · L (multi-day, needs data or design).
- Each item has a **Done when** acceptance criterion so it can be tracked/closed.

## The one-sentence problem

An excellent product *shell* (monorepo, tests, CI, design, a11y) currently wraps a
scientifically *under-developed core*, and the **claims/presentation run ahead of the
substance** — the main risk for a tool whose mission is to build trust in rigorous
quantitative history.

## Strengths to preserve (do not regress)

- Clean architecture: shared engine, declarative MCP tool registry, thin dispatcher.
- Real test coverage (56 MCP + 75 ETL + 34 e2e) and green CI on Node 24.
- Honest *uncertainty messaging* where it exists (Eurasian caveat is genuinely emitted).
- Strong dark "observatory" redesign + accessibility (skip link, landmarks, aria, reduced-motion).
- License/attribution hygiene (MIT code, CC BY-NC-SA data, provenance cited).

---

## Key decisions — RESOLVED (maintainer, June 2026)

| # | Decision | Resolution |
|---|----------|------------|
| D1 | **Model coefficients** | **Fit the real model (B), with interim relabel (A) as a safety net.** Relabel as "illustrative approximation" *now* (Phase 0) so nothing is misleading while the real fit is built; replace with the published Turchin coefficients in Phase 1 (see SCI-1b), then update labels to claim the real model. |
| D2 | **Scenario fidelity** | A now (disclose as schematic), B later as enhancement. |
| D3 | **MCP distribution** | **Local stdio first (A now), host later (B).** Remove SSE/hosted fiction immediately; build streamable-HTTP transport + deploy + npm packaging as a later phase (Phase 3). |
| D4 | **Narrative grounding** | **B** — wire real analogues into the web route. |

### Priority directive: **academics first.** The MCP server is the backbone. Order of work is
Phase 0 (honesty) → Phase 1 (academic backbone: solid local MCP + reproducibility + the real model)
→ Phase 2 (lay/educational) → Phase 3 (hosting + depth).

### Sourcing the real model (de-risks SCI-1b)

The 2022 paper is open-access and the model is **extractable, not a black box**:
- Paper: *Disentangling the evolutionary drivers of social complexity* (Science Advances 2022),
  DOI [10.1126/sciadv.abn3517](https://www.science.org/doi/10.1126/sciadv.abn3517);
  open-access mirror: [PMC9232109](https://pmc.ncbi.nlm.nih.gov/articles/PMC9232109/).
- **Published model (Eq 2, Scale response):**
  `Scale_{t+1} = −0.24 + 1.2·Scaleₜ − 0.04·Scaleₜ² + 0.10·Agriₜ + 0.00002·AgriLagₜ + 0.16·IronCavₜ + εₜ`
- **Two structural gaps vs. the current code** (`model.ts`): (a) the real model is **quadratic** — it
  has a `−0.04·Scaleₜ²` saturation term the app lacks entirely; (b) all current coefficients differ
  from the published values (intercept, lag, IronCav, Agri, AgriLag).
- **Per-response coefficients** (Scale / Hierarchy / Government) live in **Table S3** of the
  supplementary materials (downloadable from science.org). The replication data deposit URL is **TBD**
  — to confirm (likely OSF/Zenodo/Seshat); if unavailable, Eq 2 + Table S3 are enough to transcribe
  the model directly.
- Predictors confirmed by the paper: **IronCav** (cavalry + iron metallurgy), **MilTech** (warfare
  intensity), **Agri** (agricultural productivity), **AgriLag** (antiquity of agriculture).

---

## Track SCI — Scientific integrity & honesty 🔴

The highest-priority track. These are truthfulness issues, not bugs.

### SCI-1a — Interim: relabel invented coefficients as illustrative 🔴 · S · Phase 0
**Problem:** [`model.ts`](packages/shared/src/model.ts) hardcodes round coefficients and comments
*"approximate values [that] should be replaced with exact coefficients"*; the ETL says
*"illustrative defaults."* Yet About/README/MCP tool descriptions present it as "the Turchin et al. (2022) regression model." The disclaimer reaches developers but never users.
**Fix:** Relabel as an *illustrative approximation of the model's functional form* in
[`about/page.tsx`](packages/web/src/app/about/page.tsx), [root README](README.md),
[mcp-server README](packages/mcp-server/README.md), and the `run_counterfactual_estimate`
tool description in [`definitions.ts`](packages/mcp-server/src/tools/definitions.ts). Add a visible
in-app note. *This is the honesty safety-net that holds until SCI-1b lands.*
**Done when:** No user-facing surface implies the running model *is* the peer-reviewed fit; every
counterfactual surface carries an "illustrative approximation" note.

### SCI-1b — Fit the real Turchin (2022) model 🔴 · L · Phase 1 *(academic centerpiece)*
**Problem:** The engine uses a *linear* approximation with invented coefficients; the published model
is *quadratic* with a saturation term and different coefficients (see "Sourcing the real model" above).
**Fix:**
1. Locate the replication deposit (DOI/OSF/Zenodo) **or** transcribe from Eq 2 + Table S3.
2. Restructure [`model.ts`](packages/shared/src/model.ts) to the published functional form —
   add the `−β·Xₜ²` saturation term; set per-response (Scale/Hier/Gov) coefficients from Table S3.
3. Reconcile variable definitions: the engine's `pc1_composite`/`iron_cav`/`mil_tech_index`/
   `agri_productivity` must match the paper's `Scale`/`IronCav`/`MilTech`/`Agri`/`AgriLag` scaling.
4. Derive `residual_sd` from the paper's reported residual variance (fixes SCI-4 at the source).
5. Validate: reproduce a published trajectory/figure within tolerance; add a test asserting
   coefficients match the source.
6. Then flip the labels from SCI-1a back to "the Turchin et al. (2022) model."
**Risks/unknowns:** deposit may be hard to locate; variable scaling reconciliation is the fiddly part;
may need to re-derive the PC1/Scale inputs in the ETL ([`compute_complexity_scores.py`](data/etl/compute_complexity_scores.py))
to match the paper rather than the current "illustrative defaults."
**Done when:** Coefficients and functional form are sourced from the paper, a validation test passes,
and the "approximate" disclaimers are removed because they're no longer true.

### SCI-2 — Remove the misleading "+X% more complex" statistic 🔴 · S
**Problem:** `delta_complexity` is a standardized PC1 delta (≈ z-score); [`CounterfactualResults.tsx:119`](packages/web/src/components/CounterfactualResults.tsx)
multiplies by 100 and appends "%", implying a precise, meaningful percentage.
**Fix:** Replace with an honest framing — e.g. "a larger/smaller divergence" in qualitative terms,
or a clearly-labeled standardized-units delta, paired with the percentile rescale (see LAY-2).
**Done when:** No "%" is shown for a quantity that isn't a percentage.

### SCI-3 — Stop the web narrative from confabulating analogues 🔴 · S
**Problem:** [`route.ts`](packages/web/src/app/api/counterfactual/route.ts) hardcodes `analogues: []`,
but [`narrative.ts`](packages/web/src/lib/narrative.ts) instructs Claude to *"mention at least 2
specific analogue societies by name"* and *"ground every claim in the provided analogues."* With none
supplied, the model invents societies — displayed under confident headers.
**Fix (D4-B):** Wire `findAnalogousPolities` into the web route (the MCP engine already does this in
[`engine/index.ts`](packages/mcp-server/src/engine/index.ts)). If none found, relax the prompt to not
demand named societies.
**Done when:** The narrative only names analogues actually passed to it; with zero analogues it does
not fabricate.

### SCI-4 — Correct the "confidence bands widen as uncertainty compounds" claim 🟠 · S
**Problem:** The only stochastic input is one guessed `residual_sd`; the AR term (~0.85) is
mean-reverting, so bands *converge*. UI ([`CounterfactualResults.tsx`](packages/web/src/components/CounterfactualResults.tsx))
and [`about/page.tsx`](packages/web/src/app/about/page.tsx) say they widen/compound.
**Fix:** Either correct the copy to describe what the band actually represents (model residual noise
only — not parameter or contingency uncertainty), or implement parameter-uncertainty sampling so the
claim becomes true.
**Done when:** The uncertainty description matches the math; "1,000 Monte Carlo samples" is not
implied to capture more than it does.

### SCI-5 — Differentiate (or disclose) scenario effects 🟠 · M
**Problem:** `applyChanges` routes most scenarios (writing, religion, coinage, fortifications…) to an
identical `mil_tech_index += 1/15` nudge; `expected_lag_centuries` is never used. Qualitatively
different counterfactuals produce near-identical output.
**Fix (D2):** Either (A) add a clear "effects are schematic/directional" disclosure, or (B) give each
scenario a distinct, sourced effect vector and honor `expected_lag_centuries`.
**Done when:** Either users are told effects are schematic, or distinct scenarios yield distinct,
defensible trajectories.

### SCI-6 — De-duplicate `applyChanges` (drift risk) 🟡 · S
**Problem:** `applyChanges` is duplicated verbatim in [`engine/index.ts`](packages/mcp-server/src/engine/index.ts)
and [`route.ts`](packages/web/src/app/api/counterfactual/route.ts); the web copy already dropped the
`Plow` case — they've diverged.
**Fix:** Move to `@seshat/shared` as the single source of truth; import in both.
**Done when:** One implementation, imported by both web and MCP.

### SCI-7 — Soften the "numerical results are still valid" fallback 🟡 · S
**Problem:** [`narrative.ts`](packages/web/src/lib/narrative.ts) fallback asserts the numbers are
"still valid" — numbers built on admittedly placeholder coefficients.
**Fix:** Reword to "the projection above is still shown" without claiming validity.
**Done when:** No copy asserts validity of the approximate output.

---

## Track LAY — Educational / layperson UX 🟠

The app teaches people *how to drive it* but not *what it means*. This track is the core of the
"educational tool" mission.

### LAY-1 — Define "social complexity" / the index in plain language 🔴 · M
**Problem:** Nowhere in the app is the central concept defined. The chart Y-axis is bare
("Complexity index"); the Research page uses "PC1 composite" with no explanation.
**Fix:** Add a plain-language explainer (what social complexity is, what higher means, what feeds it)
on the landing/about pages and an info-tooltip on the chart.
**Done when:** A non-expert can state what the index measures after one screen.

### LAY-2 — Humanize the numbers (implement the planned percentile rescale) 🟠 · M
**Problem:** Raw PC1 numbers are shown, contradicting the project's own decision ("never show raw
PC1; translate to 'more complex than 73% of contemporary societies'"). The rescale was specced,
never built.
**Fix:** Add a percentile/relative framing for complexity scores in the chart tooltip and detail page.
**Done when:** Users see relative/percentile framing, not raw standardized scores.

### LAY-3 — Add a glossary + info-tooltips; fix jargon leaks 🟡 · M
**Problem:** No glossary or info-tooltips anywhere. "NGA" is rendered raw in search results
([`CivilizationPicker.tsx`](packages/web/src/components/CivilizationPicker.tsx)); "polity" leaks into
error/empty states.
**Fix:** Add a small glossary (PC1, polity, NGA, counterfactual, social complexity) and reusable
info-tooltip; label or expand "NGA"; replace bare "polity" in UI copy.
**Done when:** No unexplained jargon on lay-facing surfaces; key terms have hover/long-press help.

### LAY-4 — Surface the limitations beyond /about 🟡 · S
**Problem:** The genuinely good "what this can/can't show" copy lives only on `/about`, which casual
users may never open.
**Fix:** Add a compact caveat/framing on first counterfactual result and/or landing.
**Done when:** A user can't reach a projection without encountering its limitations once.

### LAY-5 — Add first-run / "what am I looking at" framing on the polity detail page 🟢 · M
**Problem:** The detail page shows a bare timeline chart with no interpretive framing; the planned
"did you know" facts were not built.
**Fix:** Add a one-line interpretation of the timeline and optional contextual facts.
**Done when:** The detail page explains the chart, not just renders it.

---

## Track ACAD — Academic readiness 🟠

What's needed before sharing with the research community.

### ACAD-1 — Methods write-up + pinned coefficient provenance 🔴 · M
**Problem:** No document derives the model coefficients from the paper; the dev plan leaves the source
"to be confirmed." This is the single most important artifact missing for academic trust.
**Fix:** Add `docs/METHODS.md`: PCA derivation, which variables feed scores, coefficient source (or
explicit "illustrative" status per D1), and how the engine differs from the published model.
**Done when:** A researcher can trace every number to a source or a labeled approximation.

### ACAD-2 — Add `CITATION.cff` 🟠 · S
**Problem:** Citation info exists only as prose; no machine-readable "Cite this repository."
**Fix:** Add a root `CITATION.cff` citing the tool, the Seshat dataset, and Turchin et al. (2022).
**Done when:** GitHub renders a "Cite this repository" button.

### ACAD-3 — Data-pipeline reproducibility guide 🟠 · M
**Problem:** `docs/` is empty; `data/etl/` and `data/schemas/` have no README; no documented
download → migrate → ingest → validate sequence.
**Fix:** Add `data/README.md` (or `docs/REPRODUCIBILITY.md`) with the exact run order and `validate.py`
expectations.
**Done when:** A new machine can rebuild the database from the docs alone.

### ACAD-4 — `CONTRIBUTING.md` + worked MCP examples (inputs **and** outputs) 🟡 · M
**Problem:** No contribution guide (dev plan required one); example prompts are one-liners with no
outputs or multi-tool workflows.
**Fix:** Add `CONTRIBUTING.md` and an `examples/` cookbook: end-to-end query → tool call → sample
output → interpretation, including the `search_polities`-first discovery flow.
**Done when:** A researcher can follow a complete worked example without guessing.

### ACAD-5 — Publish a valid `variable_code` reference / codebook link 🟡 · S
**Problem:** `get_variables` / `get_technology_diffusion` need codes, but no list or Seshat-codebook
link exists beyond 2–3 inline examples.
**Done when:** Valid variable codes are discoverable from the docs.

---

## Track MCP — Reusability & deployment 🟠

Resolved direction: **local stdio now** (reframe + harden in Phase 1), **hosted later** (transport +
packaging + deploy in Phase 3).

### MCP-1 — Resolve the SSE / hosted-endpoint fiction 🔴 · S–L
**Problem:** [`index.ts`](packages/mcp-server/src/index.ts) is stdio-only; the docstring/README
advertise `--sse` and a hosted `https://seshat-mcp.railway.app/sse` that no code or infra backs.
`PORT`/`EXPOSE 3001` are dead.
**Fix (D3-A):** Remove SSE/hosted claims and reframe as a local stdio server. **Or (D3-B):** implement
streamable-HTTP transport and a real deploy manifest.
**Done when:** Docs and code agree on the transports that actually exist.

### MCP-2 — Make it npm-publishable (if D3-B) 🟠 · M
**Problem:** No `bin`, no shebang, no `files`/`exports`, `workspace:*` dep on unpublished
`@seshat/shared`. Cannot `npx`.
**Done when:** `npx @seshat/mcp-server` works from a clean environment.

### MCP-3 — Fix the Dockerfile/transport mismatch 🟡 · S
**Problem:** `EXPOSE 3001` + stdio `CMD` is internally contradictory.
**Done when:** The Dockerfile matches the chosen transport (drop `EXPOSE` for stdio, or run the HTTP
server for D3-B).

### MCP-4 — Add input validation + tighten loose tool schemas 🟡 · M
**Problem:** No schema/handler-layer validation despite a comment claiming "validated arguments";
`compare_polities` 2–5 bound is prose-only; `run_counterfactual_estimate.new_value` is loosely typed
and only `'present'` is handled; several params lack descriptions.
**Fix:** Add Zod (or JSON-schema) validation in the dispatcher; add `minItems`/`maxItems`/`enum`;
describe all params.
**Done when:** Bad input returns friendly validation errors; schemas fully constrain inputs.

### MCP-5 — Decouple from the hardwired Seshat schema (stretch) 🟢 · L
**Problem:** Queries bake in Seshat table/column names; "bring your own data" means rebuilding the DB.
**Fix:** Introduce a thin data-access interface; ship the schema/migrations with the package.
**Done when:** The server can run against a documented, swappable data source.

---

## Track DOC — Documentation hygiene 🟡

### DOC-1 — Fix credibility-eroding inconsistencies 🟠 · S
**Problem:** Two Seshat domains (`seshat-db.com` vs `seshatdatabank.info`); placeholder clone URLs
(`your-org` vs `mosse`); "when available" endpoint.
**Done when:** One canonical Seshat URL, real clone URLs, no fictional endpoints.

### DOC-2 — Populate or remove the empty `docs/` 🟡 · S
**Problem:** `docs/` exists but is empty (dev plan intended MCP docs there).
**Done when:** `docs/` holds real content (METHODS, REPRODUCIBILITY) or is removed.

---

## Phasing (academics-first ordering)

### Phase 0 — Honesty pass (ship first; all S, ~1–2 days) 🔴
The truthfulness gates — make nothing the tool says misleading, *today*.
**SCI-1a** (relabel as illustrative), **SCI-2** (drop the fake "%"), **SCI-3** (stop narrative
confabulation), **SCI-4** (correct band copy), **SCI-7** (soften "still valid"), **SCI-5/A**
(disclose scenarios are schematic), **DOC-1** (fix URL/endpoint inconsistencies).
*Outcome: nothing the tool claims about itself is untrue.*

### Phase 1 — Academic backbone (the priority) 🟠 🔴
The MCP server is the backbone; make it solid, reproducible, and scientifically real.
- **The real model:** **SCI-1b** (fit/transcribe the published Turchin model — the centerpiece).
- **MCP solidity for local research:** **MCP-1/A** (reframe to local stdio, kill the SSE fiction),
  **MCP-3** (Dockerfile), **MCP-4** (input validation + schema tightening), **SCI-6** (dedupe engine).
- **Reproducibility & citation:** **ACAD-1** (methods write-up), **ACAD-2** (`CITATION.cff`),
  **ACAD-3** (data-pipeline reproducibility guide), **ACAD-4** (`CONTRIBUTING.md` + worked examples
  with outputs), **ACAD-5** (variable-code reference), **DOC-2** (populate `docs/`).
*Outcome: a researcher can cite, reproduce, run, and trust the MCP locally.*

### Phase 2 — Educational / lay layer 🟠
Now make it teach the public. **LAY-1** (define social complexity), **LAY-2** (humanize numbers),
**LAY-3** (glossary + tooltips), **LAY-4** (surface limitations), **LAY-5** (detail-page framing),
**SCI-5/B** (differentiated scenario effects).
*Outcome: a layperson understands what they're looking at and why it's interesting.*

### Phase 3 — Hosting & reusability 🟡
The "host eventually" goal. **MCP-1/B** (streamable-HTTP transport), **MCP-2** (npm publishable),
**MCP-5** (decouple from the hardwired schema), real deploy manifest.
*Outcome: others can run it; you can host a multi-user endpoint.*

---

## Open questions — RESOLVED

1. **MCP: reference impl or hosted?** → *Local stdio first, host eventually.* (D3: A now, B in Phase 3.)
2. **Access to the replication deposit?** → *Aim to fit the real model.* Deposit URL still TBD, but the
   model is extractable from the open-access paper (Eq 2 + Table S3) — see SCI-1b. (D1: B, with A interim.)
3. **Near-term audience?** → *Academics first; the MCP is the backbone.* (Phase 1 = academic backbone.)
