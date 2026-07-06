# Data pipeline — reproducing the database from scratch

This guide takes a fresh machine from zero to a populated Supabase instance that
the MCP server and web app can query. It covers: source data, schema migrations,
the Python ETL, and validation.

## 1. Source data

| Dataset | What | Where | License |
|---------|------|-------|---------|
| **Equinox-2020** | Coded Seshat variables per polity | [Zenodo record 6642229](https://zenodo.org/record/6642229) | CC BY-NC-SA 4.0 |
| **Cliopatria** | GeoJSON polity borders | [GitHub](https://github.com/Seshat-Global-History-Databank/cliopatria) | CC BY 4.0 |

Download both into `data/raw/` (gitignored). Any use of the Seshat data must be
**non-commercial and attributed**.

## 2. Database schema

Run the SQL migrations against your Supabase project **in order** (SQL editor or
`psql`):

```
data/schemas/001_core_tables.sql    # polities, variable_values, complexity_scores, polity_borders
data/schemas/002_indexes.sql        # query indexes
data/schemas/003_rpc_functions.sql  # RPC functions used by the query layer
```

## 3. ETL environment

The ETL is a separate Python project with its own venv:

```bash
cd data/etl
python3 -m venv .venv
source .venv/bin/activate
pip install -e .            # deps from pyproject.toml
cp .env.example .env        # add SUPABASE_URL + SUPABASE_SERVICE_KEY
```

## 4. Run the pipeline (order matters)

```bash
# 1. Polities + variable values from the Equinox Excel file
python ingest_equinox.py

# 2. Geospatial borders (matches Cliopatria names/SeshatIDs to polities;
#    exact match first, then fuzzy with a manual override map)
python ingest_cliopatria.py

# 3. Pre-aggregated complexity scores per polity × century
#    (PC1 composite + Scale/Hier/Gov sub-components, iron_cav, mil-tech, agri)
python compute_complexity_scores.py

# 4. Validation suite — cross-checks ingested data for consistency
python validate.py
```

## 5. Tests

```bash
cd data/etl && source .venv/bin/activate && pytest tests/   # 75 tests
```

## Caveats (read before trusting outputs)

- **Score derivation is not yet the paper's.** `compute_complexity_scores.py`
  currently uses illustrative weightings, not the exact PCA/aggregation pipeline
  of Turchin et al. (2022). The *projection model* downstream is the validated
  published fit (see [`docs/MODEL.md`](../docs/MODEL.md)), but its inputs from
  this ETL are directional until this step is upgraded — tracked as Layer 3 in
  [`IMPROVEMENT_PLAN.md`](../IMPROVEMENT_PLAN.md).
- The model's own provenance and audit trail live in
  [`docs/MODEL_AUDIT.md`](../docs/MODEL_AUDIT.md), including how to reproduce the
  coefficient validation from the paper's OSF deposit.
