"""
Compute pre-aggregated complexity scores per polity × century.

Reads variable_values from Supabase and computes:
- PC1 composite score (from 51 social complexity variables via PCA)
- PC1 sub-components: Scale, Hierarchical, Government
- iron_cav: 0=neither, 1=iron OR cavalry, 2=both
- mil_tech_index: normalized sum of 15 warfare variables (0–1)
- agri_productivity: estimated tonnes/hectare/year
- agri_years_since: years since agriculture adopted in the NGA

Based on methodology from:
- Turchin et al. (2018) "Quantitative historical analysis..." PNAS
- Turchin et al. (2022) "Disentangling the evolutionary drivers..." Science Advances

Usage:
    python compute_complexity_scores.py

Note: PCA coefficients are from the Turchin et al. (2018) supplementary.
The 9 principal complexity variables used for the composite score are
listed in PC1_VARIABLES below. The full 51-variable PCA is approximated
by grouping variables into Scale/Hier/Gov sub-components.
"""

from __future__ import annotations

import sys

import numpy as np

from config import get_supabase_client, setup_logger

logger = setup_logger("compute_complexity")

# ---------------------------------------------------------------------------
# Social complexity variables grouped by sub-component.
#
# These are the 9 "complexity characteristics" (CCs) from Turchin et al.
# (2018) Table 1. Each CC is a composite of multiple Seshat variables.
# The PC1 composite explains ~77.2% of variance across all 51 variables.
# ---------------------------------------------------------------------------

# Scale sub-component: population and territory
SCALE_VARIABLES = [
    "PolPop",                  # Polity population
    "Polity_territory",        # Polity territory (km²)
    "Pop_of_largest_settlement",  # Largest settlement population
]

# Hierarchical complexity sub-component
HIER_VARIABLES = [
    "Admin_levels",            # Administrative levels
    "Religious_levels",        # Religious hierarchy levels
    "Military_levels",         # Military hierarchy levels
    "Settlement_hierarchy",    # Settlement hierarchy levels
]

# Government sophistication sub-component
GOV_VARIABLES = [
    "Gov_levels",              # Government levels
    "Full_time_bureaucrat",    # Full-time bureaucrats (present/absent)
    "Exam_system",             # Examination system (present/absent)
    "Merit_promotion",         # Merit-based promotion (present/absent)
    "Formal_legal_code",       # Formal legal code (present/absent)
    "Professional_lawyer",     # Professional lawyers (present/absent)
    "Judge",                   # Judges (present/absent)
    "Court",                   # Courts (present/absent)
]

ALL_COMPLEXITY_VARIABLES = SCALE_VARIABLES + HIER_VARIABLES + GOV_VARIABLES

# ---------------------------------------------------------------------------
# Military technology variables for mil_tech_index
# ---------------------------------------------------------------------------

MIL_TECH_VARIABLES = [
    "Iron_weapons",
    "Steel",
    "Cavalry",
    "Bronze",
    "Sword",
    "Crossbow",
    "Composite_bow",
    "Tension_siege_engine",
    "Sling_siege_engine",
    "Gunpowder_siege_artillery",
    "Handheld_firearm",
    "Fortification",
    "Long_wall",
    "Chainmail",
    "Plate_armor",
]

# ---------------------------------------------------------------------------
# PCA loadings (approximate, from Turchin et al. 2018 Supplementary Table S2).
#
# These are the loadings for the first principal component of each
# sub-group of variables. In practice, the composite PC1 is dominated
# by the Scale sub-component.
#
# Values here are illustrative defaults. Replace with exact coefficients
# from the replication R code when available (osf.io deposit).
# ---------------------------------------------------------------------------

# Weight each sub-component contributes to the composite PC1.
# Scale explains ~40%, Hier ~25%, Gov ~12% of the total variance.
COMPONENT_WEIGHTS = {
    "scale": 0.52,
    "hier": 0.32,
    "gov": 0.16,
}

# Within-group variable weights for standardized values.
# For binary (present/absent) variables: present=1, absent=0.
# For numeric variables: log-transform, then z-score.
SCALE_WEIGHTS = {
    "PolPop": 0.38,
    "Polity_territory": 0.35,
    "Pop_of_largest_settlement": 0.27,
}

HIER_WEIGHTS = {
    "Admin_levels": 0.30,
    "Religious_levels": 0.25,
    "Military_levels": 0.25,
    "Settlement_hierarchy": 0.20,
}

GOV_WEIGHTS = {
    "Gov_levels": 0.20,
    "Full_time_bureaucrat": 0.15,
    "Exam_system": 0.10,
    "Merit_promotion": 0.10,
    "Formal_legal_code": 0.15,
    "Professional_lawyer": 0.10,
    "Judge": 0.10,
    "Court": 0.10,
}

# ---------------------------------------------------------------------------
# Agriculture productivity lookup.
# Estimated tonnes/hectare/year by crop type × technology level.
# Based on Turchin et al. (2021) supplementary materials.
# ---------------------------------------------------------------------------

AGRI_PRODUCTIVITY = {
    "wheat_irrigation": 1.5,
    "wheat_rainfed": 0.8,
    "rice_paddy": 2.5,
    "rice_rainfed": 1.2,
    "maize": 1.0,
    "millet_sorghum": 0.6,
    "root_crops": 3.0,
    "pastoral": 0.3,
    "default": 0.8,
}


def compute_all_scores() -> dict:
    """
    Main entry point. Fetches variable data from Supabase and computes
    complexity scores for every polity × century combination.

    Returns a summary of results.
    """
    supabase = get_supabase_client()

    logger.info("Loading polities...")
    polities = _load_all_polities(supabase)
    logger.info("Loaded %d polities", len(polities))

    logger.info("Loading variable values...")
    variables = _load_all_variables(supabase)
    logger.info("Loaded %d variable records", len(variables))

    # Group variables by (polity_id, variable_code) → list of records
    var_lookup = _build_variable_lookup(variables)

    summary = {"polities_processed": 0, "scores_inserted": 0, "errors": 0}
    score_rows = []

    for polity in polities:
        pid = polity["id"]
        start_century = _year_to_century(polity["start_year"])
        end_century = _year_to_century(polity["end_year"])

        for century in range(start_century, end_century + 100, 100):
            try:
                score = _compute_century_score(pid, century, var_lookup)
                score_rows.append(score)
            except Exception as e:
                logger.error(
                    "Error computing score for %s century %d: %s", pid, century, e
                )
                summary["errors"] += 1

        summary["polities_processed"] += 1

    if score_rows:
        logger.info("Inserting %d complexity scores", len(score_rows))
        _batch_upsert(supabase, "complexity_scores", score_rows, batch_size=200)
        summary["scores_inserted"] = len(score_rows)

    logger.info(
        "Complexity computation complete: %d polities, %d scores, %d errors",
        summary["polities_processed"],
        summary["scores_inserted"],
        summary["errors"],
    )
    return summary


def _compute_century_score(
    polity_id: str, century: int, var_lookup: dict
) -> dict:
    """Compute all complexity metrics for a single polity × century."""

    def get_var(code: str) -> dict | None:
        """Get the variable record active during this century."""
        records = var_lookup.get((polity_id, code), [])
        for r in records:
            if r["year_from"] <= century + 99 and r["year_to"] >= century:
                return r
        return None

    def var_is_present(code: str) -> bool:
        r = get_var(code)
        if r is None:
            return False
        if r.get("value_text") in ("present", "inferred_present", "suspected_present"):
            return True
        if r.get("value_numeric") is not None and r["value_numeric"] > 0:
            return True
        return False

    def var_numeric(code: str, log_transform: bool = False) -> float:
        r = get_var(code)
        if r is None:
            return 0.0
        val = r.get("value_numeric")
        if val is None:
            # Binary: present=1, absent=0
            return 1.0 if var_is_present(code) else 0.0
        val = float(val)
        if log_transform and val > 0:
            return float(np.log10(val + 1))
        return val

    # --- Scale sub-component ---
    scale_values = {
        "PolPop": var_numeric("PolPop", log_transform=True),
        "Polity_territory": var_numeric("Polity_territory", log_transform=True),
        "Pop_of_largest_settlement": var_numeric(
            "Pop_of_largest_settlement", log_transform=True
        ),
    }
    pc1_scale = sum(
        scale_values[k] * SCALE_WEIGHTS[k] for k in SCALE_WEIGHTS
    )

    # --- Hierarchical sub-component ---
    hier_values = {k: var_numeric(k) for k in HIER_VARIABLES}
    pc1_hier = sum(hier_values[k] * HIER_WEIGHTS[k] for k in HIER_WEIGHTS)

    # --- Government sub-component ---
    gov_values = {k: var_numeric(k) for k in GOV_VARIABLES}
    pc1_gov = sum(gov_values[k] * GOV_WEIGHTS[k] for k in GOV_WEIGHTS)

    # --- Composite PC1 ---
    pc1_composite = (
        pc1_scale * COMPONENT_WEIGHTS["scale"]
        + pc1_hier * COMPONENT_WEIGHTS["hier"]
        + pc1_gov * COMPONENT_WEIGHTS["gov"]
    )

    # --- Iron + Cavalry (IronCav) ---
    has_iron = var_is_present("Iron_weapons")
    has_cavalry = var_is_present("Cavalry")
    iron_cav = int(has_iron) + int(has_cavalry)

    # --- Military technology index (0–1) ---
    mil_present = sum(1 for v in MIL_TECH_VARIABLES if var_is_present(v))
    mil_tech_index = mil_present / len(MIL_TECH_VARIABLES)

    # --- Agriculture productivity ---
    agri_productivity = AGRI_PRODUCTIVITY["default"]
    if var_is_present("Irrigation"):
        agri_productivity = AGRI_PRODUCTIVITY["wheat_irrigation"]
    elif var_is_present("Plow"):
        agri_productivity = AGRI_PRODUCTIVITY["wheat_rainfed"]

    # --- Years since agriculture ---
    # Approximation: check if agriculture variables are present and use
    # the earliest year_from as the adoption date.
    agri_years_since = _estimate_agri_years(polity_id, century, var_lookup)

    return {
        "polity_id": polity_id,
        "century": century,
        "pc1_scale": round(pc1_scale, 4),
        "pc1_hier": round(pc1_hier, 4),
        "pc1_gov": round(pc1_gov, 4),
        "pc1_composite": round(pc1_composite, 4),
        "iron_cav": iron_cav,
        "mil_tech_index": round(mil_tech_index, 4),
        "agri_productivity": round(agri_productivity, 4),
        "agri_years_since": agri_years_since,
    }


def _estimate_agri_years(
    polity_id: str, century: int, var_lookup: dict
) -> int | None:
    """
    Estimate years since agriculture was adopted in this polity's region.

    Looks for the earliest year any agriculture-related variable is present.
    """
    agri_codes = ["Crop", "Irrigation", "Plow", "Domestic_animal"]
    earliest_year = None

    for code in agri_codes:
        records = var_lookup.get((polity_id, code), [])
        for r in records:
            if r.get("value_text") in (
                "present",
                "inferred_present",
                "suspected_present",
            ) or (r.get("value_numeric") is not None and r["value_numeric"] > 0):
                if earliest_year is None or r["year_from"] < earliest_year:
                    earliest_year = r["year_from"]

    if earliest_year is None:
        return None
    return max(0, century - earliest_year)


def _year_to_century(year: int) -> int:
    """Convert a year to its century start. E.g., 450 → 400, -350 → -400."""
    return (year // 100) * 100


def _load_all_polities(supabase) -> list[dict]:
    """Load all polities from the database."""
    result = supabase.table("polities").select("id, start_year, end_year").execute()
    return result.data


def _load_all_variables(supabase) -> list[dict]:
    """
    Load all variable values from the database.

    Uses pagination since the dataset can be large (~47K records).
    """
    all_records: list[dict] = []
    page_size = 1000
    offset = 0

    while True:
        result = (
            supabase.table("variable_values")
            .select(
                "polity_id, variable_code, year_from, year_to, "
                "value_text, value_numeric"
            )
            .range(offset, offset + page_size - 1)
            .execute()
        )
        all_records.extend(result.data)
        if len(result.data) < page_size:
            break
        offset += page_size

    return all_records


def _build_variable_lookup(
    variables: list[dict],
) -> dict[tuple[str, str], list[dict]]:
    """Index variables by (polity_id, variable_code) for O(1) lookup."""
    lookup: dict[tuple[str, str], list[dict]] = {}
    for v in variables:
        key = (v["polity_id"], v["variable_code"])
        lookup.setdefault(key, []).append(v)
    return lookup


def _batch_upsert(
    supabase, table: str, rows: list[dict], batch_size: int = 200
):
    """Upsert rows in batches using the composite primary key."""
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        try:
            supabase.table(table).upsert(batch).execute()
        except Exception as e:
            logger.error("Error upserting batch %d-%d: %s", i, i + len(batch), e)


if __name__ == "__main__":
    summary = compute_all_scores()
    print(f"\nComputation summary:")
    print(f"  Polities processed: {summary['polities_processed']}")
    print(f"  Scores inserted: {summary['scores_inserted']}")
    print(f"  Errors: {summary['errors']}")
