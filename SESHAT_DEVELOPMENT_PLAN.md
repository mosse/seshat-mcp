# Seshat: Echoes of History — Development Plan

## Project overview

Build a two-part project on the Seshat Global History Databank:

1. **A Seshat MCP server** — an open-source tool for the research community that exposes Seshat's dataset as queryable tools compatible with Claude and other MCP-enabled AI assistants.
2. **"Echoes of History" web app** — a public-facing counterfactual history explorer that lets casual users inject hypothetical changes into real civilizations (e.g. "give the Maya gunpowder in 500 CE") and see what the data-driven model predicts would have changed, narrated by Claude.

The MCP server is built first and serves as the data backbone for the web app. Both are open-sourced on GitHub.

---

## Guiding principles

- **Data first**: All counterfactual estimates are anchored to real Seshat findings. The 4-variable regression model from Turchin et al. (2022, *Science Advances*) is the estimation engine.
- **Playful but grounded**: Outputs feel like educated speculation, not fabrication. Every estimate cites real historical analogues from the dataset.
- **MCP server is the shared foundation**: The web app queries through the same interface researchers use. One codebase, two audiences.
- **Honest uncertainty**: Confidence bands widen over time. Language like "based on patterns from 14 comparable societies..." is always preferred over false precision.
- **License compliance**: Equinox-2020 and Cliopatria data are CC BY-NC-SA. The app must be non-commercial. Credit Turchin et al. (2015) and the Seshat project prominently.

---

## Tech stack

| Layer | Technology | Hosting |
|---|---|---|
| Database | Supabase (PostgreSQL + PostGIS) | Supabase cloud |
| MCP server | TypeScript, `@modelcontextprotocol/sdk` | Railway |
| Web app | Next.js 14 (App Router), TypeScript | Vercel |
| Styling | Tailwind CSS | — |
| Map | MapLibre GL JS | — |
| Charts | Recharts + D3 (for complex viz) | — |
| AI layer | Anthropic Claude API (claude-sonnet-4-6) | — |
| ETL scripts | Python 3.11+ | Run locally / GitHub Actions |
| Auth (MCP) | API key via Railway env vars | — |
| Analytics | Plausible (privacy-first) | Plausible cloud |

---

## Repository structure

```
seshat-project/
├── packages/
│   ├── mcp-server/          # MCP server (open-sourced separately)
│   ├── web/                 # Next.js web app
│   └── shared/              # Shared TypeScript types and utilities
├── data/
│   ├── etl/                 # Python ingest scripts
│   ├── schemas/             # SQL migration files
│   └── seeds/               # Curated scenario catalogue
├── docs/                    # MCP tool documentation
└── tests/                   # E2E and integration tests
```

Use a pnpm monorepo with workspaces. TypeScript strict mode throughout.

---

## Phase 1: Data foundation (weeks 1–2)

### Goal
Ingest Equinox-2020 and Cliopatria into Supabase. This is the single source of truth for everything else.

### Data sources to download

1. **Equinox-2020** — `https://zenodo.org/record/6642229`
   - Primary dataset: `seshat_data_v2_1.csv` (~47,400 records, 374 polities)
   - Variables: social complexity, warfare, religion, agriculture
   - License: CC BY-NC-SA 4.0

2. **Cliopatria** — `https://github.com/Seshat-Global-History-Databank/cliopatria`
   - GeoJSON files for 1,600+ polities from 3400 BCE to 2024 CE
   - License: CC BY 4.0

3. **Military technology paper replication data** — `https://zenodo.org/record/5507438`
   - Used to calibrate the MilTech index

### Database schema

```sql
-- Core polity table
CREATE TABLE polities (
  id TEXT PRIMARY KEY,                    -- Seshat NGA_polity format e.g. "Egypt_UpperEgypt"
  name TEXT NOT NULL,
  nga TEXT NOT NULL,                      -- Natural Geographic Area
  region TEXT NOT NULL,
  subregion TEXT,
  start_year INTEGER NOT NULL,           -- BCE negative
  end_year INTEGER NOT NULL,
  capital TEXT,
  language_family TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Variable values (EAV pattern — Seshat has ~500 active variables)
CREATE TABLE variable_values (
  id BIGSERIAL PRIMARY KEY,
  polity_id TEXT REFERENCES polities(id),
  variable_code TEXT NOT NULL,           -- e.g. "Polity_territory", "Iron_weapons"
  category TEXT NOT NULL,                -- "social_complexity", "warfare", "religion", "agriculture"
  year_from INTEGER NOT NULL,
  year_to INTEGER NOT NULL,
  value_text TEXT,                       -- for present/absent/unknown
  value_numeric NUMERIC,                 -- for quantitative variables
  value_low NUMERIC,                     -- lower bound of range estimates
  value_high NUMERIC,                    -- upper bound
  confidence TEXT CHECK (confidence IN ('inferred_present','inferred_absent','suspected_present','suspected_absent','unknown','present','absent')),
  notes TEXT,
  UNIQUE(polity_id, variable_code, year_from, year_to)
);

-- Pre-computed complexity scores per century
CREATE TABLE complexity_scores (
  polity_id TEXT REFERENCES polities(id),
  century INTEGER NOT NULL,             -- e.g. -500 = 5th century BCE
  pc1_scale NUMERIC,                    -- Scale component (population, territory)
  pc1_hier NUMERIC,                     -- Hierarchical complexity
  pc1_gov NUMERIC,                      -- Government sophistication
  pc1_composite NUMERIC,               -- Single composite (77.2% variance explained)
  iron_cav INTEGER CHECK (iron_cav IN (0,1,2)),   -- 0=none, 1=one, 2=both
  mil_tech_index NUMERIC,              -- Composite 0-1
  agri_productivity NUMERIC,           -- tonnes/hectare/year
  agri_years_since INTEGER,            -- years since agriculture adopted
  PRIMARY KEY (polity_id, century)
);

-- Geospatial boundaries (PostGIS)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE TABLE polity_borders (
  id BIGSERIAL PRIMARY KEY,
  polity_id TEXT REFERENCES polities(id),
  year_from INTEGER NOT NULL,
  year_to INTEGER NOT NULL,
  boundary GEOMETRY(MULTIPOLYGON, 4326) NOT NULL,
  area_km2 NUMERIC,
  UNIQUE(polity_id, year_from, year_to)
);

-- Indexes
CREATE INDEX idx_vv_polity ON variable_values(polity_id);
CREATE INDEX idx_vv_category ON variable_values(category);
CREATE INDEX idx_vv_variable ON variable_values(variable_code);
CREATE INDEX idx_cs_century ON complexity_scores(century);
CREATE INDEX idx_pb_years ON polity_borders(year_from, year_to);
CREATE INDEX idx_pb_boundary ON polity_borders USING GIST(boundary);
```

### ETL pipeline (`data/etl/`)

Write the following Python scripts:

**`ingest_equinox.py`**
- Parse `seshat_data_v2_1.csv`
- Map column names to `variable_code` using the Seshat codebook
- Handle value parsing: "present" → `value_text`, numeric strings with ranges → `value_low`/`value_high`
- Insert into `polities` and `variable_values`
- Log unmapped columns and unknown values to `data/etl/logs/`

**`ingest_cliopatria.py`**
- Iterate GeoJSON files in Cliopatria repo
- Match polity names to `polities.id` using fuzzy matching + manual override map
- Compute `area_km2` from geometry
- Insert into `polity_borders`

**`compute_complexity_scores.py`**
- For each polity × century, compute `pc1_composite` from 51 social complexity variables
- Use PCA coefficients from Turchin et al. (2018) supplementary materials
- Compute `iron_cav` from `Iron_weapons` and `Cavalry` variable presence
- Compute `mil_tech_index` as normalised sum of 15 warfare variables
- Estimate `agri_productivity` using crop type × region × technology level lookup table from Turchin et al. (2021)
- Store results in `complexity_scores`

**`validate.py`**
- Row counts match expected ranges
- No polity has complexity scores outside [-3, 3] (standardised)
- Geospatial checks: no self-intersecting polygons, all coordinates valid
- Cross-check 10 hand-verified polities against published paper tables

---

## Phase 2: MCP server (weeks 3–5)

### Goal
Build and open-source a TypeScript MCP server that exposes Seshat as a suite of queryable tools. Researchers should be able to point Claude at this server and ask questions like "Which Eurasian societies had cavalry before 800 BCE?" without writing any code.

### Repository
Publish as `seshat-global-history-databank/seshat-mcp` on GitHub (or under your own GitHub org initially). Include a `LICENSE` (MIT), `README.md`, and contribution guide.

### Server setup

```typescript
// packages/mcp-server/src/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createClient } from '@supabase/supabase-js';

const server = new Server(
  { name: 'seshat-mcp', version: '0.1.0' },
  { capabilities: { tools: {} } }
);
```

Deploy on Railway with environment variables:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `MCP_API_KEY` (optional — for hosted version)

Support both stdio transport (local self-hosted) and SSE transport (hosted endpoint).

### Tools to implement

Each tool must include a well-documented `description` field. The descriptions are what Claude reads to decide whether to use the tool, so they must be precise and include examples.

---

**`search_polities`**
```typescript
{
  name: 'search_polities',
  description: 'Search for historical polities (societies, states, empires) in the Seshat dataset. Returns basic info and date ranges. Use this to find polity IDs before calling other tools.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Name or partial name, e.g. "Roman", "Maya", "Han"' },
      region: { type: 'string', enum: ['Africa', 'Americas', 'Central Eurasia', 'East Asia', 'Europe', 'Middle East and North Africa', 'Oceania-Pacific', 'South Asia', 'Southeast Asia'] },
      year: { type: 'number', description: 'Filter to polities active in this year (BCE = negative)' },
      limit: { type: 'number', default: 10 }
    },
    required: []
  }
}
```

---

**`get_polity_detail`**
```typescript
{
  name: 'get_polity_detail',
  description: 'Get detailed information about a specific polity including its complexity scores, key variables, and time range.',
  inputSchema: {
    type: 'object',
    properties: {
      polity_id: { type: 'string', description: 'Seshat polity ID from search_polities' }
    },
    required: ['polity_id']
  }
}
```
Returns: polity metadata, composite complexity score time series, and a summary of well-evidenced variables.

---

**`get_variables`**
```typescript
{
  name: 'get_variables',
  description: 'Get specific variable values for a polity over time. Categories: social_complexity, warfare, religion, agriculture.',
  inputSchema: {
    type: 'object',
    properties: {
      polity_id: { type: 'string' },
      category: { type: 'string', enum: ['social_complexity', 'warfare', 'religion', 'agriculture'] },
      variable_codes: { type: 'array', items: { type: 'string' }, description: 'Specific variables e.g. ["Iron_weapons", "Cavalry", "Professional_soldiers"]' },
      year_from: { type: 'number' },
      year_to: { type: 'number' }
    },
    required: ['polity_id']
  }
}
```

---

**`get_complexity_timeline`**
```typescript
{
  name: 'get_complexity_timeline',
  description: 'Get the social complexity score trajectory for a polity across centuries. Returns pc1_composite (single index) and sub-components.',
  inputSchema: {
    type: 'object',
    properties: {
      polity_id: { type: 'string' },
      century_from: { type: 'number', description: 'e.g. -500 for 6th century BCE' },
      century_to: { type: 'number' }
    },
    required: ['polity_id']
  }
}
```

---

**`compare_polities`**
```typescript
{
  name: 'compare_polities',
  description: 'Compare two or more polities across specific variables or complexity scores at a given time period.',
  inputSchema: {
    type: 'object',
    properties: {
      polity_ids: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 5 },
      variables: { type: 'array', items: { type: 'string' } },
      year: { type: 'number' }
    },
    required: ['polity_ids']
  }
}
```

---

**`find_analogous_polities`**
```typescript
{
  name: 'find_analogous_polities',
  description: 'Find historical societies that had similar characteristics to a given polity at a specific time. Critical for grounding counterfactual estimates in real historical patterns.',
  inputSchema: {
    type: 'object',
    properties: {
      polity_id: { type: 'string' },
      year: { type: 'number' },
      match_on: { type: 'array', items: { type: 'string' }, description: 'Variables to match on, e.g. ["pc1_composite", "Iron_weapons", "agri_productivity"]' },
      limit: { type: 'number', default: 5 }
    },
    required: ['polity_id', 'year']
  }
}
// Implementation: cosine similarity on normalised variable vectors
```

---

**`get_technology_diffusion`**
```typescript
{
  name: 'get_technology_diffusion',
  description: 'Show how a specific technology (e.g. iron weapons, cavalry, writing) spread across regions over time. Useful for estimating how long it would realistically take a society to adopt a given technology.',
  inputSchema: {
    type: 'object',
    properties: {
      variable_code: { type: 'string', description: 'e.g. "Iron_weapons", "Cavalry", "Writing"' },
      region: { type: 'string', description: 'Optional — filter by region' }
    },
    required: ['variable_code']
  }
}
```
Returns: list of polities with first adoption year, sorted chronologically. Include geographic spread rate (km/century).

---

**`run_counterfactual_estimate`**
```typescript
{
  name: 'run_counterfactual_estimate',
  description: 'Core estimation tool. Given a polity, an injection year, and a variable change, projects estimated complexity trajectory under counterfactual conditions using the Turchin et al. (2022) dynamic regression model. Returns point estimates with confidence bands.',
  inputSchema: {
    type: 'object',
    properties: {
      polity_id: { type: 'string' },
      injection_year: { type: 'number' },
      changes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            variable_code: { type: 'string' },
            new_value: { type: 'string' }  // "present", "absent", or numeric
          }
        }
      },
      projection_centuries: { type: 'number', default: 5, description: 'How many centuries forward to project' }
    },
    required: ['polity_id', 'injection_year', 'changes']
  }
}
```
Returns: `{ baseline: ComplexityTimeSeries, counterfactual: ComplexityTimeSeries, confidence_bands: BandSeries, analogues: Polity[], delta_complexity: number, notes: string[] }`

---

**`get_region_snapshot`**
```typescript
{
  name: 'get_region_snapshot',
  description: 'Get all polities active in a region during a specific century, with their complexity scores and key variables. Useful for understanding the geopolitical context around a civilization.',
  inputSchema: {
    type: 'object',
    properties: {
      region: { type: 'string' },
      century: { type: 'number' }
    },
    required: ['region', 'century']
  }
}
```

---

### Counterfactual estimation engine (`packages/mcp-server/src/engine/`)

This is the core intellectual contribution. Implement as a standalone module so it can also be imported by the web app.

**`model.ts` — dynamic regression forward projection**

Based on Turchin et al. (2022) *Science Advances*, Supplementary Materials, Table S3.

The model estimates next-century complexity from:
```
PC1_t+1 = α + β1·PC1_t + β2·IronCav_t + β3·MilTech_t + β4·Agri_t + β5·AgriLag_t + ε
```

Coefficients (from paper supplementary materials — extract these from replication code):
- These are available in the R replication code on OSF (`osf.io/` — link to be confirmed from Zenodo deposit)
- Use the "best model" from Table S3 (lowest AIC across 100,000+ model combinations)
- Include 3 sub-models (Scale, Hierarchical, Government) plus composite

Forward projection algorithm:
```typescript
function projectForward(
  baseline: CenturyState,
  injectedChanges: VariableChanges,
  centuries: number
): ProjectionResult {
  // 1. Apply injection to baseline state at injection century
  // 2. Evaluate preconditions (is this injection plausible?)
  // 3. Run regression forward century by century
  // 4. At each step, add residual noise sampled from model error distribution
  // 5. Run N=1000 Monte Carlo samples to generate confidence bands
  // 6. Return p5, p25, p50, p75, p95 bands
}
```

**`analogues.ts` — comparable society matching**

For a given (polity, year, variable_changes) triplet, find societies that:
1. Had similar baseline complexity at a comparable stage
2. Actually adopted the injected technology
3. Show what happened to their complexity afterward

Use cosine similarity on a normalised feature vector:
```typescript
type FeatureVector = {
  pc1_composite: number;
  agri_productivity: number;
  population_log: number;
  territory_log: number;
  region_encoded: number[];  // one-hot
}
```

Return the top 5 analogues plus their post-adoption trajectories. These become the "real historical evidence" cited in the narrative.

**`preconditions.ts` — injection plausibility checker**

Before projecting, evaluate whether the injection is historically reasonable:
- Does the polity have access to the required raw materials? (iron → needs iron deposits in or near territory)
- Does the polity have enabling prerequisites? (cavalry → needs horses or access to horse traders)
- Is the injection anachronistic? (firearms before 1200 CE is implausible anywhere)

Return: `{ plausible: boolean, warnings: string[], adjustedYear: number | null }`

**`scenarios.ts` — curated injection catalogue**

Define ~20 named scenarios as structured objects. These are what the web UI presents as clickable options:

```typescript
export const SCENARIOS: Scenario[] = [
  {
    id: 'iron_weapons',
    label: 'Iron weapons',
    description: 'Introduce iron metallurgy for weapons production',
    changes: [{ variable_code: 'Iron_weapons', new_value: 'present' }],
    requires: [],
    regions_applicable: ['Americas', 'Oceania-Pacific'],  // where it was absent
    expected_lag_centuries: 3,
    real_world_example: 'The spread of iron across Sub-Saharan Africa (800 BCE–200 CE) transformed military capacity and territorial organisation.'
  },
  {
    id: 'cavalry',
    label: 'Cavalry warfare',
    description: 'Introduce horse-mounted combat',
    changes: [{ variable_code: 'Cavalry', new_value: 'present' }],
    requires: ['Horse_riding'],
    regions_applicable: ['Americas', 'Oceania-Pacific', 'East Asia'],
    expected_lag_centuries: 2,
    real_world_example: 'Cavalry adoption transformed the Xiongnu and later Mongol states into dominant regional powers within 200 years.'
  },
  {
    id: 'iron_cav_combined',
    label: 'Iron weapons + cavalry',
    description: 'The historically most powerful combination — the full IronCav variable',
    changes: [
      { variable_code: 'Iron_weapons', new_value: 'present' },
      { variable_code: 'Cavalry', new_value: 'present' }
    ],
    requires: [],
    regions_applicable: ['Americas', 'Oceania-Pacific'],
    expected_lag_centuries: 3,
    real_world_example: 'The combination that drove the rise of megaempires across Eurasia between 500 BCE and 200 CE.'
  },
  {
    id: 'writing_system',
    label: 'Writing system',
    description: 'Introduce a phonetic alphabet or logographic script',
    changes: [{ variable_code: 'Writing', new_value: 'present' }],
    requires: [],
    regions_applicable: [],
    expected_lag_centuries: 1,
    real_world_example: 'Adoption of Phoenician script by Greek-speaking peoples (800 BCE) enabled rapid literary and administrative expansion.'
  },
  {
    id: 'gunpowder',
    label: 'Gunpowder weapons',
    description: 'Introduce gunpowder and early firearms',
    changes: [
      { variable_code: 'Firearms_handheld', new_value: 'present' },
      { variable_code: 'Gunpowder', new_value: 'present' }
    ],
    requires: [],
    regions_applicable: ['Americas', 'Oceania-Pacific', 'Sub-Saharan Africa'],
    expected_lag_centuries: 2,
    real_world_example: 'Ottoman adoption of gunpowder artillery (1453) enabled conquest of Constantinople within 50 years of widespread adoption.'
  },
  // ... 15 more scenarios: bronze weapons, professional army, coinage, moralizing religion,
  //     irrigation systems, llama domestication (Americas-specific), obsidian trade networks,
  //     long-distance seafaring, iron plows, writing + bureaucracy combined, steel weapons, etc.
]
```

---

### MCP server tests (`packages/mcp-server/tests/`)

Write Jest unit tests for:
- Each tool returns valid JSON matching its output schema
- `run_counterfactual_estimate` with known inputs produces results in expected range
- Analogue matching returns geographically plausible societies
- Precondition checker correctly flags implausible injections
- Monte Carlo confidence bands are wider at century 5 than century 1

---

## Phase 3: Web app — counterfactual explorer (weeks 6–9)

### Goal
Build "Echoes of History" — a public web app that makes the counterfactual engine delightful for casual users. The app calls the MCP server's `run_counterfactual_estimate` tool (and others) via a thin internal API wrapper, then uses Claude to generate the narrative.

### Next.js project setup

```bash
pnpm create next-app packages/web --typescript --tailwind --app --src-dir
```

Install additional packages:
```bash
pnpm add maplibre-gl recharts d3 @anthropic-ai/sdk framer-motion
pnpm add -D @types/maplibre-gl
```

### App routes

```
/                        → Landing page with featured scenarios
/explore                 → Civilization picker
/explore/[polityId]      → Polity detail + scenario selector
/explore/[polityId]/[scenarioId]  → Counterfactual results page
/research                → MCP server docs + researcher tools
/about                   → Project info + data credits
```

### Core components

---

**`CivilizationPicker` (`src/components/CivilizationPicker.tsx`)**

- Search box with autocomplete against `search_polities` tool
- Region filter tabs
- Time period slider (default: 500 BCE – 1000 CE, the best-covered period)
- Card grid showing matched polities with: name, region, dates, thumbnail complexity chart
- Clicking a card navigates to `/explore/[polityId]`

---

**`PolityDetailView` (`src/components/PolityDetailView.tsx`)**

Layout: two-column on desktop (map left, detail right), single column on mobile.

Left: `MiniMap` showing polity territory at peak extent (Cliopatria GeoJSON).

Right:
- Polity name, dates, region
- "Complexity score" progress bar with annotation (e.g. "More complex than 73% of contemporary societies")
- Key stats: population at peak, territory at peak, capital
- 3–4 "did you know" facts pulled from the narrative paragraphs in Seshat
- Scenario selector (see below)

---

**`ScenarioSelector` (`src/components/ScenarioSelector.tsx`)**

Display the 20 curated scenarios as cards. Each card shows:
- Icon (SVG, not emoji)
- Label
- One-line description
- "Applicable" badge if the injection is historically interesting for this polity
- "Already had this" badge if the polity already had the variable

Also include a custom injection mode: "Something else →" which opens a freeform input where users can describe a change in natural language. Claude translates this to structured `changes[]` before running the engine.

When a scenario is selected, show a confirmation panel:
- "You're about to give [Polity] [scenario] in [year CE/BCE]"
- Year picker (constrained to polity's active date range)
- "What do you think will happen?" → optional free text (used to create a "myth-busting" moment in the results)
- "Run the simulation →" button

---

**`CounterfactualResultsPage` (`src/app/explore/[polityId]/[scenarioId]/page.tsx`)**

This is the hero experience. Layout:

**Section 1 — The Setup**
- Animated headline: "What if the [Polity] had [scenario] in [year]?"
- Split map: left = real history, right = counterfactual (initially identical, then diverging)

**Section 2 — The Divergence**
- Animated timeline chart (`ComplexityChart`) showing:
  - Historical baseline (solid line)
  - Counterfactual projection (dashed line, distinct color)
  - Confidence bands (shaded region, widening over time)
  - Key events annotated on real timeline
- Below chart: "The model projects [polity] would have been [X]% more complex by [year]"

**Section 3 — The Narrative** (Claude-generated)
- Rendered as flowing prose, not bullet points
- Structure (controlled via system prompt):
  1. What changed first (~100 words) — immediate military/economic effects
  2. What rippled outward (~150 words) — second-order political and social effects
  3. How neighbours would have responded (~100 words) — geopolitical context
  4. Where confidence fades (~80 words) — honest limits of the projection
- Inline callouts: "Based on [Analogue Society]'s trajectory after adopting [technology]..."
- Uncertainty caveat always present: "This estimate is based on patterns from N comparable historical societies..."

**Section 4 — The Evidence**
- "Here's what we based this on" — 3–5 analogue society cards
- Each card: society name, dates, region, what they did, what happened
- Link to their full profile

**Section 5 — The Myth-Busting Moment** (if user entered a prediction)
- "You thought [user prediction]"
- "The model suggests [what actually projected]"
- "Here's the surprising part: [counterintuitive finding]"

**Section 6 — Share + Explore More**
- Permalink to this exact counterfactual
- "Try a different scenario →"
- "What about [suggested related polity]? →" (Claude suggests based on analogy)

---

**`ComplexityChart` (`src/components/ComplexityChart.tsx`)**

Use Recharts (`ComposedChart`) with:
- X-axis: years (BCE/CE formatted)
- Y-axis: complexity score (labeled as "Social complexity index", not raw PC1 number)
- Baseline: solid `#374151` line
- Counterfactual: dashed `#2563EB` line
- Confidence bands: `ReferenceArea` with low opacity fill
- Annotation markers for key events (battles, collapses, expansions)
- Animated entry — lines draw left to right on mount (`isAnimationActive`)
- Responsive via `ResponsiveContainer`

---

**`HistoryMap` (`src/components/HistoryMap.tsx`)**

MapLibre GL JS with:
- Base map: `https://demotiles.maplibre.org/style.json` (or a free Protomaps tile set — prefer Protomaps for reliability)
- Cliopatria GeoJSON loaded as a vector source
- Time slider controls displayed year, filters `polity_borders` by active date range
- Baseline/counterfactual toggle switches between real and projected territory shading
- Complexity heatmap layer: fill color interpolated from `pc1_composite` (gray → blue → amber)
- Click a polity region to navigate to its detail page
- On the results page, show side-by-side split: use `maplibre-gl`'s `compare` plugin

---

### AI narrative layer (`src/lib/narrative.ts`)

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function generateCounterfactualNarrative(params: {
  polity: PolityDetail;
  scenario: Scenario;
  injectionYear: number;
  projectionResult: ProjectionResult;
  analogues: PolityDetail[];
}): Promise<NarrativeOutput> {

  const systemPrompt = `
You are a cliodynamics analyst specialising in quantitative history.
You explain counterfactual historical scenarios in an engaging, accessible way
for general audiences.

RULES:
- Ground every claim in the provided analogue societies and model outputs.
- Never state outcomes as certain. Use language like "patterns suggest", "comparable societies experienced", "the model estimates".
- Confidence fades over time — always note where projections become speculative (beyond ~300 years).
- Keep the tone curious and engaging, not academic. No jargon without explanation.
- Never exceed 500 words total.
- Always mention at least 2 specific analogue societies by name.
- Structure: immediate_effects → ripple_effects → geopolitical_response → confidence_limits
- Return valid JSON matching the NarrativeOutput schema.
`;

  const userPrompt = `
Generate a counterfactual narrative for:

POLITY: ${params.polity.name} (${params.polity.start_year}–${params.polity.end_year} CE)
REGION: ${params.polity.region}
SCENARIO: ${params.scenario.label} — injected in ${params.injectionYear}
BASELINE COMPLEXITY AT INJECTION: ${params.projectionResult.baseline[0].pc1_composite.toFixed(2)}
PROJECTED COMPLEXITY CHANGE: +${params.projectionResult.delta_complexity.toFixed(2)} by century 3

ANALOGUES (societies that actually adopted this technology at comparable stages):
${params.analogues.map(a => `- ${a.name}: adopted ${params.scenario.label} in ~${a.adoption_year}, complexity increased by ${a.delta.toFixed(1)} over next 300 years`).join('\n')}

REAL-WORLD EXAMPLE FROM SESHAT: ${params.scenario.real_world_example}

Return JSON: {
  immediate_effects: string,
  ripple_effects: string,
  geopolitical_response: string,
  confidence_limits: string,
  headline: string  // one punchy sentence summarising the key finding
}
`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  });

  return JSON.parse(response.content[0].text);
}
```

Stream the narrative response to the client using Next.js Route Handlers with `ReadableStream`.

---

### Internal API routes (`src/app/api/`)

```
POST /api/counterfactual        → calls engine + Claude, returns full result
GET  /api/polities/search       → wraps search_polities MCP tool
GET  /api/polities/[id]         → wraps get_polity_detail
GET  /api/polities/[id]/borders → returns GeoJSON for map
GET  /api/scenarios             → returns curated scenario catalogue
```

The API routes call the MCP server tools via direct function import (same monorepo) rather than HTTP — this avoids the overhead of an MCP round-trip for the web app while keeping the MCP server independently deployable for researchers.

---

### Landing page featured scenarios

Hardcode 6 featured "what-ifs" on the landing page to hook users immediately:

1. "What if the Maya had ironworking in 300 CE?"
2. "What if the Roman Empire adopted the stirrup 200 years earlier?"
3. "What if the Aztecs had cavalry?"
4. "What if the Maurya Empire kept iron weapons out of the Gangetic Plain?"
5. "What if the Inca had writing?"
6. "What if Sub-Saharan African kingdoms adopted cavalry in 500 CE?"

Each links directly to the pre-computed results page for that scenario.

---

## Phase 4: Research page and MCP documentation (week 9)

### `/research` page

Aimed at researchers who want to use the MCP server with Claude or other tools.

Include:
- What the MCP server does and why it exists
- Installation instructions (self-hosted with Docker, or connect to hosted endpoint)
- All 8 tools documented with example inputs and outputs
- Sample Claude conversations showing research queries
- Link to GitHub repo
- Citation instructions (how to cite Seshat data in research)
- Contact / contribution information

### MCP README (`packages/mcp-server/README.md`)

Must include:
- One-paragraph description
- Quickstart (3 commands to get running locally)
- Full tool reference (all 8 tools, parameters, example outputs)
- Self-hosting instructions (Docker + Railway)
- Connection instructions for Claude Desktop
- Data provenance and license
- Contributing guide

---

## Phase 5: Testing and launch (weeks 10–11)

### Test coverage targets

| Layer | Tool | Coverage target |
|---|---|---|
| ETL scripts | pytest | 80% — validate parsing, schema mapping |
| Estimation engine | Jest | 90% — model outputs, analogue matching, confidence bands |
| MCP tools | Jest | 85% — each tool, error cases, empty results |
| API routes | Jest + Supertest | 80% — happy path + error cases |
| Web app E2E | Playwright | Key user journeys: pick polity → run scenario → view results |

### Playwright E2E test scenarios

1. User searches "Maya" → selects Maya Classic → selects "Iron weapons" → sees results page
2. Results page shows both chart lines (baseline + counterfactual)
3. Narrative renders and contains at least one analogue society name
4. Share link is copyable and navigates correctly on reload
5. Mobile viewport: all key elements visible, map renders
6. Custom injection: user types "give them wheels" → Claude interprets → runs engine

### Performance targets

- Time to interactive: <3s on 4G
- Counterfactual computation + narrative generation: <8s (stream narrative progressively)
- Map tile load: <2s initial viewport
- Lighthouse score: >85 performance, >90 accessibility

### Launch checklist

- [ ] Data credits on `/about`: "Data sourced from Seshat Global History Databank (Turchin et al., 2015). Cliopatria dataset (Seshat team, 2025). Used under CC BY-NC-SA."
- [ ] Link to Seshat home page from footer and about page
- [ ] CC BY-NC-SA license notice on data download (if any)
- [ ] Open-source MCP server repo published
- [ ] README mentions this is an independent project, not affiliated with the Seshat team
- [ ] Plausible analytics installed (no cookies, GDPR-compliant)
- [ ] Outreach email drafted to seshat-db.com contact for collaboration

---

## Key decisions and constraints for Claude Code

1. **Supabase over raw PostgreSQL**: Use Supabase client (`@supabase/supabase-js`) everywhere. Never write raw SQL in application code — use the query builder or RPC functions.

2. **No database credentials in the web app**: The web app calls internal API routes only. API routes use the Supabase service key (server-side only). The client-side code never touches Supabase directly.

3. **MCP server is stateless**: Each tool call is independent. No session state. The estimation engine is called fresh each time.

4. **Claude API key is server-side only**: Never expose it to the browser. All Claude calls go through `/api/counterfactual`.

5. **Year convention**: BCE years are stored as negative integers. Year 0 = 1 BCE (astronomical convention). Display as "500 BCE" not "-500". The ETL scripts must handle this conversion.

6. **Complexity score display**: Never show raw PC1 numbers to users. Always translate to relative terms: "More complex than X% of contemporary societies" or a 0–100 rescaled "civilisation complexity index".

7. **Uncertainty is a feature**: The confidence bands on charts must always be visible. The narrative must always include the `confidence_limits` section. Never present a single-point estimate without uncertainty.

8. **Americas and Oceania edge cases**: The IronCav model was validated on Eurasian data. For Americas and Oceania polities, use MilTech + Agri only, and add a prominent caveat in the narrative: "Note: this model was developed primarily on Eurasian data — estimates for [region] carry higher uncertainty."

9. **Streaming narrative**: Use Next.js `ReadableStream` + `TransformStream` to stream the Claude response token by token to the results page. This makes the ~3–5s wait feel like watching the AI think rather than a blank page loading.

10. **Progressive enhancement**: The complexity chart and narrative must render correctly even if the map fails to load (MapLibre can be flaky). Always show the numerical results independently of the map.

---

## Environment variables

```bash
# .env.local (web app)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=          # server-side only
ANTHROPIC_API_KEY=             # server-side only
MCP_SERVER_URL=                # optional: for remote MCP calls

# .env (mcp-server)
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
PORT=3001
```

---

## Data credits (must appear in UI)

> Data sourced from the **Seshat Global History Databank** (Turchin, P., Brennan, R., Currie, T.E., Feeney, K.C., François, P., Hoyer, D., ... Whitehouse, H., 2015. *Seshat: The Global History Databank*. Cliodynamics 6(1)). Used under CC BY-NC-SA 4.0. Geospatial data from **Cliopatria** (Seshat Global History Databank, 2025), CC BY 4.0. Counterfactual model based on Turchin et al. (2022). *Disentangling the evolutionary drivers of social complexity*. Science Advances.

---

## Stretch goals (post-launch)

- **Multiplayer what-ifs**: Two users each inject a change into neighbouring civilisations and see how the model plays out geopolitically
- **SPARQL endpoint**: When Seshat publishes their planned RDF triplestore, add a SPARQL tool to the MCP server
- **Clio-Infra integration**: Add GDP/economic productivity data from Clio-Infra to complement Seshat's social complexity scores
- **Researcher API keys**: Allow researchers to request API keys for the hosted MCP endpoint with higher rate limits
- **Mobile app**: React Native (Expo) version of the core experience
