"""
Ingest Cliopatria GeoJSON data into Supabase.

Reads the Cliopatria GeoJSON file and populates the `polity_borders` table.
Matches Cliopatria polity names/SeshatIDs to existing polity records using
exact match first, then fuzzy matching with a manual override map.

Usage:
    python ingest_cliopatria.py <path_to_cliopatria_geojson>

Data source: https://github.com/Seshat-Global-History-Databank/cliopatria
License: CC BY 4.0
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from thefuzz import fuzz

from config import get_supabase_client, setup_logger

logger = setup_logger("ingest_cliopatria")

# Manual overrides for polity names that fuzzy matching can't resolve.
# Maps Cliopatria Name → Equinox polity ID.
MANUAL_OVERRIDES: dict[str, str] = {
    # Add overrides as they're discovered during ingestion.
    # Example: "Roman Republic (Senatorial Province)": "it_roman_republic",
}


def ingest_cliopatria(file_path: Path) -> dict:
    """
    Main ingestion function. Reads Cliopatria GeoJSON and populates
    the polity_borders table.

    Returns a summary dict with counts and matching statistics.
    """
    logger.info("Reading Cliopatria GeoJSON from %s", file_path)

    with open(file_path, encoding="utf-8") as f:
        geojson = json.load(f)

    features = geojson.get("features", [])
    logger.info("Loaded %d features from Cliopatria", len(features))

    supabase = get_supabase_client()

    # Load existing polity IDs and names for matching
    existing_polities = _load_existing_polities(supabase)
    logger.info("Found %d existing polities in database", len(existing_polities))

    summary = {
        "features_processed": 0,
        "borders_inserted": 0,
        "matched_by_seshat_id": 0,
        "matched_by_fuzzy": 0,
        "unmatched": [],
        "invalid_geometry": 0,
    }

    border_rows = []

    for feature in features:
        props = feature.get("properties", {})
        geometry = feature.get("geometry")
        summary["features_processed"] += 1

        if not geometry:
            summary["invalid_geometry"] += 1
            continue

        name = props.get("Name", "")
        seshat_id = props.get("SeshatID", "")
        from_year = props.get("FromYear")
        to_year = props.get("ToYear")
        area_km2 = props.get("Area")

        if from_year is None or to_year is None:
            logger.warning("Skipping feature %s: missing year range", name)
            continue

        # Normalize geometry to MultiPolygon for consistent storage
        normalized = _normalize_to_multipolygon(geometry)
        if normalized is None:
            summary["invalid_geometry"] += 1
            logger.warning("Skipping feature %s: unsupported geometry type", name)
            continue

        # Match to existing polity
        polity_id = _match_polity(
            seshat_id, name, existing_polities
        )

        if polity_id is None:
            summary["unmatched"].append(
                {"name": name, "seshat_id": seshat_id}
            )
            continue

        if seshat_id and polity_id == seshat_id:
            summary["matched_by_seshat_id"] += 1
        else:
            summary["matched_by_fuzzy"] += 1

        border_rows.append(
            {
                "polity_id": polity_id,
                "year_from": int(from_year),
                "year_to": int(to_year),
                "boundary": json.dumps(normalized),
                "area_km2": float(area_km2) if area_km2 is not None else None,
            }
        )

    if border_rows:
        logger.info("Inserting %d border records", len(border_rows))
        _batch_insert(supabase, "polity_borders", border_rows, batch_size=50)
        summary["borders_inserted"] = len(border_rows)

    logger.info(
        "Cliopatria ingestion complete: %d features → %d borders inserted, "
        "%d by SeshatID, %d by fuzzy match, %d unmatched, %d invalid geometry",
        summary["features_processed"],
        summary["borders_inserted"],
        summary["matched_by_seshat_id"],
        summary["matched_by_fuzzy"],
        len(summary["unmatched"]),
        summary["invalid_geometry"],
    )

    if summary["unmatched"]:
        logger.warning(
            "Unmatched polities (first 20): %s",
            summary["unmatched"][:20],
        )

    return summary


def _load_existing_polities(supabase) -> dict[str, str]:
    """
    Load all polity IDs and names from the database.

    Returns a dict mapping both polity ID → polity ID and
    lowercase name → polity ID for matching.
    """
    result = supabase.table("polities").select("id, name").execute()
    mapping: dict[str, str] = {}

    for row in result.data:
        pid = row["id"]
        name = row["name"]
        mapping[pid] = pid
        mapping[pid.lower()] = pid
        mapping[name.lower()] = pid

    return mapping


def _match_polity(
    seshat_id: str,
    name: str,
    existing: dict[str, str],
) -> str | None:
    """
    Match a Cliopatria feature to an existing polity.

    Priority:
    1. Manual override map
    2. Exact SeshatID match
    3. Exact name match (case-insensitive)
    4. Fuzzy name match (threshold: 80)
    """
    # Manual override
    if name in MANUAL_OVERRIDES:
        override_id = MANUAL_OVERRIDES[name]
        if override_id in existing:
            return override_id

    # Exact SeshatID match
    if seshat_id and seshat_id in existing:
        return existing[seshat_id]
    if seshat_id and seshat_id.lower() in existing:
        return existing[seshat_id.lower()]

    # Exact name match
    if name.lower() in existing:
        return existing[name.lower()]

    # Fuzzy match against all polity names
    best_score = 0
    best_match = None
    for key, polity_id in existing.items():
        score = fuzz.ratio(name.lower(), key)
        if score > best_score and score >= 80:
            best_score = score
            best_match = polity_id

    if best_match:
        logger.info(
            "Fuzzy matched '%s' → '%s' (score: %d)", name, best_match, best_score
        )
        return best_match

    return None


def _normalize_to_multipolygon(geometry: dict) -> dict | None:
    """
    Normalize a GeoJSON geometry to MultiPolygon.

    Cliopatria uses both Polygon and MultiPolygon geometries.
    We store everything as MultiPolygon for consistency.
    """
    geom_type = geometry.get("type")

    if geom_type == "MultiPolygon":
        return geometry
    if geom_type == "Polygon":
        return {
            "type": "MultiPolygon",
            "coordinates": [geometry["coordinates"]],
        }
    return None


def _batch_insert(
    supabase, table: str, rows: list[dict], batch_size: int = 50
):
    """Insert rows in batches using upsert on the unique constraint."""
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        try:
            supabase.table(table).upsert(
                batch, on_conflict="polity_id,year_from,year_to"
            ).execute()
        except Exception as e:
            logger.error(
                "Error inserting batch %d-%d into %s: %s",
                i,
                i + len(batch),
                table,
                e,
            )
            for row in batch:
                try:
                    supabase.table(table).upsert(
                        row, on_conflict="polity_id,year_from,year_to"
                    ).execute()
                except Exception as row_err:
                    logger.error("Failed row: %s — %s", row["polity_id"], row_err)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python ingest_cliopatria.py <path_to_cliopatria_geojson>")
        sys.exit(1)

    file_path = Path(sys.argv[1])
    if not file_path.exists():
        print(f"File not found: {file_path}")
        sys.exit(1)

    summary = ingest_cliopatria(file_path)
    print(f"\nIngestion summary:")
    print(f"  Features processed: {summary['features_processed']}")
    print(f"  Borders inserted: {summary['borders_inserted']}")
    print(f"  Matched by SeshatID: {summary['matched_by_seshat_id']}")
    print(f"  Matched by fuzzy: {summary['matched_by_fuzzy']}")
    print(f"  Unmatched: {len(summary['unmatched'])}")
    print(f"  Invalid geometry: {summary['invalid_geometry']}")
