# Worked examples — using the Seshat MCP server

End-to-end examples showing which tool a research question exercises, the exact
call, and the shape of what comes back. Output values below are **illustrative**
(shapes are exact; numbers depend on your database).

## The discovery workflow (start here)

Most tools take a `polity_id`. You don't guess these — you **always start with
`search_polities`** and use the returned `id`:

```
Question: "Which Eurasian societies had cavalry before 800 BCE?"

Step 1 → search_polities  { "region": "Central Eurasia", "year": -800 }
Step 2 → get_variables    { "polity_id": "<id from step 1>",
                            "variable_codes": ["Cavalry"], "year_to": -800 }
```

## Example 1 — find a polity

**Call:**
```json
{ "tool": "search_polities", "arguments": { "query": "Maya", "limit": 5 } }
```

**Returns** (shape exact, values illustrative):
```json
{
  "polities": [
    {
      "id": "mx_classic_maya",
      "name": "Classic Maya",
      "region": "Americas",
      "nga": "Yucatan Peninsula",
      "start_year": 250,
      "end_year": 900
    }
  ],
  "total_count": 3
}
```

Note the year convention throughout: **BCE years are negative** (`-500` = 500 BCE).

## Example 2 — complexity trajectory

**Call:**
```json
{
  "tool": "get_complexity_timeline",
  "arguments": { "polity_id": "it_roman_empire_principate", "century_from": -200, "century_to": 300 }
}
```

**Returns:** one row per century with `pc1_composite` (the summary social-complexity
index) and the `pc1_scale` / `pc1_hier` / `pc1_gov` sub-components — all standardised
scores, so 0 ≈ the historical sample average.

## Example 3 — the counterfactual (the core tool)

*"What if the Classic Maya had iron weapons in 300 CE?"*

**Call:**
```json
{
  "tool": "run_counterfactual_estimate",
  "arguments": {
    "polity_id": "mx_classic_maya",
    "injection_year": 300,
    "changes": [{ "variable_code": "Iron_weapons", "new_value": "present" }],
    "projection_centuries": 5
  }
}
```

**Returns** (abridged):
```json
{
  "baseline":       [ { "century": 300, "pc1_composite": -0.42, "...": "…" }, "… per century" ],
  "counterfactual": [ { "century": 300, "pc1_composite": -0.42, "...": "…" }, "… per century" ],
  "confidence_bands": [ { "century": 300, "p5": -0.9, "p25": -0.6, "p50": -0.4, "p75": -0.2, "p95": 0.1 } ],
  "analogues": [ { "polity": { "id": "…", "name": "…" }, "similarity_score": 0.91, "delta": 0.35 } ],
  "delta_complexity": 0.31,
  "notes": [
    "The regression model was validated on Eurasian data; Americas projections carry higher uncertainty."
  ]
}
```

How to read it: `delta_complexity` is the endpoint gap between the counterfactual
and baseline trajectories **in standardised index units** (not a percentage). The
bands are Monte-Carlo noise at the model's published residual scale. **Always
surface the `notes`** — they carry the preconditions warnings (e.g. the
Americas/Oceania caveat).

The model behind this is the published Turchin et al. (2022) dynamic regression —
see [`MODEL.md`](MODEL.md) for the equations and [`MODEL_AUDIT.md`](MODEL_AUDIT.md)
for how the coefficients were validated. Input data is still illustrative-grade;
treat results as directional.

## Example 4 — grounding in analogues

```json
{
  "tool": "find_analogous_polities",
  "arguments": { "polity_id": "mx_classic_maya", "year": 300, "limit": 5 }
}
```

Returns societies ranked by cosine similarity on normalised feature vectors, each
with its subsequent complexity `delta` — the empirical answer to *"what happened
to societies like this one?"*.

## Example 5 — side-by-side comparison

```json
{
  "tool": "compare_polities",
  "arguments": {
    "polity_ids": ["it_roman_empire_principate", "cn_western_han"],
    "year": 1
  }
}
```

`polity_ids` takes **2–5** IDs (validated). Add `"variables": ["Iron_weapons", "Writing"]`
to compare specific codes.

## Variable-code reference

`get_variables`, `get_technology_diffusion`, and `run_counterfactual_estimate`
take Seshat variable codes. Codes follow the Equinox-2020 column names,
`Snake_case`d. The most useful ones:

| Category | Codes |
|----------|-------|
| **Warfare — key model inputs** | `Iron_weapons`, `Cavalry`, `Military_tech` |
| **Warfare — other** | `Steel`, `Handheld_firearm`, `Gunpowder_siege_artillery`, `Composite_bow`, `Crossbow`, `Fortification`, `Stone_wall`, `War_vessel` |
| **Information systems** | `Writing`, `Script`, `Phonetic_alphabet`, `Calendar`, `Lists_tables_classifications`, `Sacred_text` |
| **Government** | `Full_time_bureaucrat`, `Formal_legal_code`, `Judge`, `Court`, `Exam_system`, `Merit_promotion` |
| **Infrastructure / economy** | `Irrigation_system`, `Road`, `Bridge`, `Canal`, `Port`, `Market`, `Indigenous_coin`, `Paper_currency` |
| **Scale** | `PolPop`, `Polity_territory`, `Pop_of_largest_settlement` |
| **Agriculture** | `Plow`, `Irrigation` |
| **Religion** | `Moralizing_god`, `High_god` |

Categories accepted by `get_variables.category`: `social_complexity`, `warfare`,
`religion`, `agriculture`. The full code→category mapping lives in
[`data/etl/ingest_equinox.py`](../data/etl/ingest_equinox.py) (`CATEGORY_MAP`);
the authoritative definitions are the [Seshat codebook](https://seshat-db.com/).

## Prompts to try once connected

- "Which societies in East Asia had iron weapons by 500 BCE?" — `search_polities` + `get_variables`
- "Compare the Roman Empire and Han Dynasty at 1 CE" — `compare_polities`
- "How did cavalry spread across Central Eurasia?" — `get_technology_diffusion`
- "What if the Inca had writing in 1400 CE?" — `run_counterfactual_estimate`
- "Who were the Aztecs' contemporaries in 1400 CE?" — `get_region_snapshot`
