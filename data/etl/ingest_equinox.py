"""
Ingest the Equinox-2020 dataset into Supabase.

Reads the Seshat Equinox Excel file and populates the `polities` and
`variable_values` tables. The Excel file has polities as rows and variables
as columns, with time-scoped values encoded as strings.

Usage:
    python ingest_equinox.py <path_to_equinox_xlsx>

Data source: https://github.com/seshatdb/Equinox_Data
License: CC BY-NC-SA 4.0
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

import pandas as pd

from config import (
    VALID_CATEGORIES,
    VALID_CONFIDENCE,
    VALID_REGIONS,
    get_supabase_client,
    setup_logger,
)

logger = setup_logger("ingest_equinox")

# Maps Seshat variable name prefixes to our category taxonomy.
# Built from the Seshat codebook categories.
CATEGORY_MAP: dict[str, str] = {
    # Social complexity
    "PolPop": "social_complexity",
    "Polity_territory": "social_complexity",
    "Pop_of_largest_settlement": "social_complexity",
    "Hierarchical_complexity": "social_complexity",
    "Gov_levels": "social_complexity",
    "Admin_levels": "social_complexity",
    "Religious_levels": "social_complexity",
    "Military_levels": "social_complexity",
    "Settlement_hierarchy": "social_complexity",
    "Professional_": "social_complexity",
    "Bureaucr": "social_complexity",
    "Exam_system": "social_complexity",
    "Merit_promotion": "social_complexity",
    "Full_time_bureaucrat": "social_complexity",
    "Specialized_gov_building": "social_complexity",
    "Formal_legal_code": "social_complexity",
    "Judge": "social_complexity",
    "Court": "social_complexity",
    "Professional_lawyer": "social_complexity",
    "Irrigation_system": "social_complexity",
    "Drinking_water_supply": "social_complexity",
    "Market": "social_complexity",
    "Food_storage_site": "social_complexity",
    "Road": "social_complexity",
    "Bridge": "social_complexity",
    "Canal": "social_complexity",
    "Port": "social_complexity",
    "Writing": "social_complexity",
    "Script": "social_complexity",
    "Mnemonic_device": "social_complexity",
    "Nonwritten_record": "social_complexity",
    "Phonetic_alphabet": "social_complexity",
    "Lists_tables_classifications": "social_complexity",
    "Calendar": "social_complexity",
    "Sacred_text": "social_complexity",
    "Religious_literature": "social_complexity",
    "Practical_literature": "social_complexity",
    "History": "social_complexity",
    "Philosophy": "social_complexity",
    "Scientific_literature": "social_complexity",
    "Fiction": "social_complexity",
    "Article": "social_complexity",
    "Token": "social_complexity",
    "Precious_metal": "social_complexity",
    "Foreign_coin": "social_complexity",
    "Indigenous_coin": "social_complexity",
    "Paper_currency": "social_complexity",
    "Courier": "social_complexity",
    "Postal_station": "social_complexity",
    "General_postal_service": "social_complexity",
    # Warfare
    "Military_tech": "warfare",
    "Atlatl": "warfare",
    "Sling": "warfare",
    "Self_bow": "warfare",
    "Composite_bow": "warfare",
    "Crossbow": "warfare",
    "Tension_siege_engine": "warfare",
    "Sling_siege_engine": "warfare",
    "Gunpowder_siege_artillery": "warfare",
    "Handheld_firearm": "warfare",
    "War_club": "warfare",
    "Battle_axe": "warfare",
    "Sword": "warfare",
    "Spear": "warfare",
    "Polearm": "warfare",
    "Dog": "warfare",
    "Donkey": "warfare",
    "Horse": "warfare",
    "Camel": "warfare",
    "Elephant": "warfare",
    "Wood_bark_shield": "warfare",
    "Leather_shield": "warfare",
    "Shield": "warfare",
    "Helmet": "warfare",
    "Breastplate": "warfare",
    "Limb_protection": "warfare",
    "Scaled_armor": "warfare",
    "Laminar_armor": "warfare",
    "Plate_armor": "warfare",
    "Small_vessel": "warfare",
    "Merchant_ship": "warfare",
    "War_vessel": "warfare",
    "Settle_boat": "warfare",
    "Chainmail": "warfare",
    "Iron": "warfare",
    "Steel": "warfare",
    "Javelin": "warfare",
    "Cavalry": "warfare",
    "Bronze": "warfare",
    "Copper": "warfare",
    "Fortification": "warfare",
    "Long_wall": "warfare",
    "Moat": "warfare",
    "Stone_wall": "warfare",
    "Professional_military_officer": "warfare",
    "Professional_soldier": "warfare",
    "Professional_priesthood": "warfare",
    "Firearms": "warfare",
    "Gunpowder": "warfare",
    "Iron_weapons": "warfare",
    "MilTech": "warfare",
    # Religion
    "High_god": "religion",
    "Supernatural_enforce": "religion",
    "Moralizing_god": "religion",
    "Moralizing_supernatural": "religion",
    "Supernatural_punishment": "religion",
    "Supernatural_norm": "religion",
    "Ritual": "religion",
    "Largest_communication": "religion",
    "Frequency_of_ritual": "religion",
    "Dysphoric_element": "religion",
    "Euphoric_element": "religion",
    "Human_sacrifice": "religion",
    # Agriculture
    "Agri": "agriculture",
    "Crop": "agriculture",
    "Irrigation": "agriculture",
    "Plow": "agriculture",
    "Domestic_animal": "agriculture",
    "Pastoral": "agriculture",
}

# Map NGA names to regions. Extended as data is encountered.
# Seshat Natural Geographic Areas (NGAs) group polities by location.
NGA_REGION_MAP: dict[str, str] = {
    "Susiana": "Middle East and North Africa",
    "Upper Egypt": "Middle East and North Africa",
    "Konya Plain": "Middle East and North Africa",
    "Middle Yellow River Valley": "East Asia",
    "Sogdiana": "Central Eurasia",
    "Latium": "Europe",
    "Deccan": "South Asia",
    "Garo Hills": "South Asia",
    "Kachi Plain": "South Asia",
    "Kansai": "East Asia",
    "Orkhon Valley": "Central Eurasia",
    "Paris Basin": "Europe",
    "Finger Lakes": "Americas",
    "Valley of Oaxaca": "Americas",
    "Cahokia": "Americas",
    "Big Island Hawaii": "Oceania-Pacific",
    "Oro PNG": "Oceania-Pacific",
    "Ghanaian Coast": "Africa",
    "Niger Inland Delta": "Africa",
    "Kapuasi Basin": "Southeast Asia",
    "Cambodian Basin": "Southeast Asia",
    "Central Java": "Southeast Asia",
    "Iceland": "Europe",
    "Lena River Valley": "Central Eurasia",
    "Cuzco": "Americas",
    "North Colombia": "Americas",
    "Lowland Andes": "Americas",
}


def categorize_variable(variable_name: str) -> str | None:
    """Map a Seshat variable name to a category using prefix matching."""
    for prefix, category in CATEGORY_MAP.items():
        if variable_name.startswith(prefix):
            return category
    return None


def parse_value(raw: str) -> dict:
    """
    Parse a Seshat cell value into structured fields.

    Seshat encodes values as strings with several conventions:
    - "present" / "absent" / "unknown" → value_text
    - "inferred present" / "suspected absent" etc. → confidence + value_text
    - Numeric: "1000" → value_numeric
    - Range: "100-500" or "100 - 500" → value_low, value_high
    - "3,000" (with commas) → value_numeric after comma removal
    """
    result: dict = {
        "value_text": None,
        "value_numeric": None,
        "value_low": None,
        "value_high": None,
        "confidence": None,
    }

    if pd.isna(raw) or str(raw).strip() == "":
        return result

    raw = str(raw).strip()
    lower = raw.lower()

    # Check for confidence-qualified presence/absence
    for conf in VALID_CONFIDENCE:
        # Match strings like "inferred present", "suspected absent"
        if lower == conf.replace("_", " "):
            parts = conf.split("_")
            if len(parts) == 2:
                result["confidence"] = conf
                result["value_text"] = parts[1]  # "present" or "absent"
            else:
                result["value_text"] = conf
                result["confidence"] = conf
            return result

    # Plain presence/absence
    if lower in ("present", "absent", "unknown"):
        result["value_text"] = lower
        result["confidence"] = lower if lower in VALID_CONFIDENCE else None
        return result

    # Numeric range: "100-500", "100 - 500", "100 to 500"
    range_match = re.match(
        r"^[\[\(]?\s*([\d,]+(?:\.\d+)?)\s*[-–—]\s*([\d,]+(?:\.\d+)?)\s*[\]\)]?$",
        raw,
    )
    if range_match:
        low = float(range_match.group(1).replace(",", ""))
        high = float(range_match.group(2).replace(",", ""))
        result["value_low"] = low
        result["value_high"] = high
        result["value_numeric"] = (low + high) / 2
        return result

    # Plain numeric
    cleaned = raw.replace(",", "")
    try:
        result["value_numeric"] = float(cleaned)
        return result
    except ValueError:
        pass

    # Fallback: store as text
    result["value_text"] = raw
    return result


def extract_nga_and_polity(polity_id: str) -> tuple[str, str]:
    """
    Extract the NGA portion and polity name from a Seshat polity ID.

    Seshat IDs use formats like "eg_new_kingdom" where the prefix
    encodes the region/NGA. Returns (nga_code, full_id).
    """
    return polity_id.split("_", 1)[0] if "_" in polity_id else polity_id, polity_id


def infer_region(nga: str, polity_id: str) -> str:
    """
    Attempt to infer the region from the NGA name or polity ID.

    Falls back to the NGA_REGION_MAP, then returns 'unknown' for manual review.
    """
    for key, region in NGA_REGION_MAP.items():
        if key.lower() in nga.lower() or key.lower() in polity_id.lower():
            return region
    return ""


def ingest_equinox(file_path: Path) -> dict:
    """
    Main ingestion function. Reads the Equinox Excel file and populates
    the polities and variable_values tables.

    Returns a summary dict with counts and any issues encountered.
    """
    logger.info("Reading Equinox data from %s", file_path)
    df = pd.read_excel(file_path, sheet_name=0)

    logger.info("Loaded %d rows, %d columns", len(df), len(df.columns))

    supabase = get_supabase_client()

    summary = {
        "polities_inserted": 0,
        "variables_inserted": 0,
        "unmapped_columns": [],
        "unknown_values": [],
        "skipped_rows": 0,
    }

    # Identify polity metadata columns vs. variable columns.
    # The first few columns are typically: NGA, Polity, OriginalPolityID, etc.
    # Variable columns are everything else.
    meta_columns = set()
    variable_columns = []

    for col in df.columns:
        col_lower = str(col).lower()
        if any(
            kw in col_lower
            for kw in [
                "nga",
                "polity",
                "original",
                "start",
                "end",
                "capital",
                "language",
                "region",
                "subregion",
                "peak",
                "duration",
            ]
        ):
            meta_columns.add(col)
        else:
            category = categorize_variable(str(col))
            if category:
                variable_columns.append((col, category))
            else:
                summary["unmapped_columns"].append(str(col))

    if summary["unmapped_columns"]:
        logger.warning(
            "Unmapped columns (will be skipped): %s", summary["unmapped_columns"]
        )

    # Detect the actual column names for polity metadata by looking at what's available.
    col_map = _detect_meta_columns(df.columns.tolist())
    logger.info("Detected metadata columns: %s", col_map)

    # Insert polities
    polity_rows = []
    for _, row in df.iterrows():
        polity_id = _get_value(row, col_map.get("polity_id"))
        if not polity_id or pd.isna(polity_id):
            summary["skipped_rows"] += 1
            continue

        polity_id = str(polity_id).strip()
        name = str(_get_value(row, col_map.get("name"), polity_id)).strip()
        nga = str(_get_value(row, col_map.get("nga"), "")).strip()

        region = str(_get_value(row, col_map.get("region"), "")).strip()
        if region not in VALID_REGIONS:
            region = infer_region(nga, polity_id)
        if region not in VALID_REGIONS:
            logger.warning(
                "Could not determine region for polity %s (NGA: %s), "
                "defaulting to 'Europe'",
                polity_id,
                nga,
            )
            region = "Europe"

        start_year = _parse_year(_get_value(row, col_map.get("start_year")))
        end_year = _parse_year(_get_value(row, col_map.get("end_year")))

        polity_rows.append(
            {
                "id": polity_id,
                "name": name,
                "nga": nga,
                "region": region,
                "subregion": _safe_str(_get_value(row, col_map.get("subregion"))),
                "start_year": start_year or -3000,
                "end_year": end_year or 2000,
                "capital": _safe_str(_get_value(row, col_map.get("capital"))),
                "language_family": _safe_str(
                    _get_value(row, col_map.get("language_family"))
                ),
            }
        )

    if polity_rows:
        logger.info("Inserting %d polities", len(polity_rows))
        _batch_upsert(supabase, "polities", polity_rows, batch_size=100)
        summary["polities_inserted"] = len(polity_rows)

    # Insert variable values
    polity_ids = {p["id"] for p in polity_rows}
    variable_rows = []

    for _, row in df.iterrows():
        polity_id = _get_value(row, col_map.get("polity_id"))
        if not polity_id or pd.isna(polity_id):
            continue
        polity_id = str(polity_id).strip()
        if polity_id not in polity_ids:
            continue

        start_year = _parse_year(_get_value(row, col_map.get("start_year"))) or -3000
        end_year = _parse_year(_get_value(row, col_map.get("end_year"))) or 2000

        for col, category in variable_columns:
            raw_value = row.get(col)
            if pd.isna(raw_value) or str(raw_value).strip() == "":
                continue

            parsed = parse_value(raw_value)
            if not any(
                parsed[k] is not None
                for k in [
                    "value_text",
                    "value_numeric",
                    "value_low",
                    "value_high",
                ]
            ):
                summary["unknown_values"].append(
                    {"polity": polity_id, "variable": str(col), "raw": str(raw_value)}
                )
                continue

            variable_rows.append(
                {
                    "polity_id": polity_id,
                    "variable_code": str(col),
                    "category": category,
                    "year_from": start_year,
                    "year_to": end_year,
                    **parsed,
                }
            )

    if variable_rows:
        logger.info("Inserting %d variable values", len(variable_rows))
        _batch_upsert(
            supabase, "variable_values", variable_rows, batch_size=500, has_id=False
        )
        summary["variables_inserted"] = len(variable_rows)

    logger.info(
        "Equinox ingestion complete: %d polities, %d variables, "
        "%d unmapped columns, %d unknown values",
        summary["polities_inserted"],
        summary["variables_inserted"],
        len(summary["unmapped_columns"]),
        len(summary["unknown_values"]),
    )

    return summary


def _detect_meta_columns(columns: list[str]) -> dict[str, str]:
    """
    Heuristically detect which columns contain polity metadata.

    Returns a mapping of semantic role → actual column name.
    """
    col_map: dict[str, str] = {}
    lower_map = {str(c).lower(): c for c in columns}

    patterns = {
        "polity_id": ["polity", "polityid", "polity_id", "originalpolityid"],
        "name": ["polity_name", "name", "polityname"],
        "nga": ["nga", "nga_name", "natural_geographic_area"],
        "region": ["region", "world_region"],
        "subregion": ["subregion", "sub_region"],
        "start_year": ["start", "start_year", "startyear", "from", "year_from"],
        "end_year": ["end", "end_year", "endyear", "to", "year_to"],
        "capital": ["capital"],
        "language_family": ["language", "language_family", "languagefamily"],
    }

    for role, candidates in patterns.items():
        for candidate in candidates:
            if candidate in lower_map:
                col_map[role] = lower_map[candidate]
                break
            # Partial match
            for lower_col, actual_col in lower_map.items():
                if candidate in lower_col and role not in col_map:
                    col_map[role] = actual_col
                    break

    return col_map


def _get_value(row: pd.Series, col: str | None, default=None):
    """Safely get a value from a DataFrame row."""
    if col is None or col not in row.index:
        return default
    val = row[col]
    if pd.isna(val):
        return default
    return val


def _safe_str(val) -> str | None:
    """Convert a value to string or None."""
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    s = str(val).strip()
    return s if s else None


def _parse_year(val) -> int | None:
    """
    Parse a year value from Seshat data.

    Handles formats like: -500, "500 BCE", "500 CE", "500BCE", plain integers.
    """
    if val is None:
        return None

    if isinstance(val, (int, float)) and not pd.isna(val):
        return int(val)

    s = str(val).strip().upper()
    if not s:
        return None

    # "500 BCE" or "500BCE"
    bce_match = re.match(r"^(\d+)\s*BCE?$", s)
    if bce_match:
        return -int(bce_match.group(1))

    # "500 CE" or "500CE"
    ce_match = re.match(r"^(\d+)\s*CE?$", s)
    if ce_match:
        return int(ce_match.group(1))

    # Plain number
    try:
        return int(float(s))
    except ValueError:
        return None


def _batch_upsert(
    supabase, table: str, rows: list[dict], batch_size: int = 100, has_id: bool = True
):
    """Insert rows in batches, using upsert to handle duplicates."""
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        try:
            if has_id:
                supabase.table(table).upsert(batch).execute()
            else:
                supabase.table(table).insert(batch).execute()
        except Exception as e:
            logger.error(
                "Error inserting batch %d-%d into %s: %s",
                i,
                i + len(batch),
                table,
                e,
            )
            # Try individual inserts to identify the problematic row
            for row in batch:
                try:
                    if has_id:
                        supabase.table(table).upsert(row).execute()
                    else:
                        supabase.table(table).insert(row).execute()
                except Exception as row_err:
                    logger.error("Failed row in %s: %s — %s", table, row, row_err)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python ingest_equinox.py <path_to_equinox_xlsx>")
        sys.exit(1)

    file_path = Path(sys.argv[1])
    if not file_path.exists():
        print(f"File not found: {file_path}")
        sys.exit(1)

    summary = ingest_equinox(file_path)
    print(f"\nIngestion summary:")
    print(f"  Polities inserted: {summary['polities_inserted']}")
    print(f"  Variables inserted: {summary['variables_inserted']}")
    print(f"  Unmapped columns: {len(summary['unmapped_columns'])}")
    print(f"  Unknown values: {len(summary['unknown_values'])}")
