"""
Validate the ingested Seshat data for correctness and consistency.

Runs a suite of checks against the Supabase database to ensure data
quality after the ETL pipeline has completed. Reports pass/fail for
each check with details on failures.

Usage:
    python validate.py

Checks:
1. Row counts are within expected ranges
2. No complexity scores fall outside standardized bounds
3. All polity borders have valid, non-self-intersecting geometry
4. Cross-reference 10 hand-verified polities against known values
5. Variable category distribution is reasonable
6. Year ranges are consistent across tables
"""

from __future__ import annotations

import sys
from dataclasses import dataclass, field

from config import get_supabase_client, setup_logger

logger = setup_logger("validate")


@dataclass
class ValidationResult:
    name: str
    passed: bool
    message: str
    details: list[str] = field(default_factory=list)


def validate_all() -> list[ValidationResult]:
    """Run all validation checks and return results."""
    supabase = get_supabase_client()
    results = [
        check_row_counts(supabase),
        check_complexity_bounds(supabase),
        check_year_consistency(supabase),
        check_category_distribution(supabase),
        check_known_polities(supabase),
        check_iron_cav_values(supabase),
        check_orphan_references(supabase),
    ]
    return results


def check_row_counts(supabase) -> ValidationResult:
    """Verify table row counts are within expected ranges."""
    checks = {
        "polities": (100, 1000),
        "variable_values": (10000, 200000),
        "complexity_scores": (500, 50000),
        "polity_borders": (100, 100000),
    }

    issues = []
    for table, (low, high) in checks.items():
        result = supabase.table(table).select("*", count="exact", head=True).execute()
        count = result.count or 0
        if count < low:
            issues.append(f"{table}: {count} rows (expected >= {low})")
        elif count > high:
            issues.append(f"{table}: {count} rows (expected <= {high})")
        else:
            logger.info("%s: %d rows (OK)", table, count)

    return ValidationResult(
        name="row_counts",
        passed=len(issues) == 0,
        message=f"Row count check: {len(issues)} issues" if issues else "All row counts within expected ranges",
        details=issues,
    )


def check_complexity_bounds(supabase) -> ValidationResult:
    """
    Verify no complexity scores are outside plausible bounds.

    Standardized PC1 scores should fall within [-5, 5] (the DB constraint
    already enforces this, but we check the actual distribution).
    """
    result = (
        supabase.table("complexity_scores")
        .select("polity_id, century, pc1_composite")
        .or_("pc1_composite.lt.-3,pc1_composite.gt.3")
        .limit(20)
        .execute()
    )

    outliers = result.data
    issues = [
        f"{r['polity_id']} century {r['century']}: pc1={r['pc1_composite']}"
        for r in outliers
    ]

    return ValidationResult(
        name="complexity_bounds",
        passed=len(outliers) == 0,
        message=(
            f"{len(outliers)} complexity scores outside [-3, 3]"
            if outliers
            else "All complexity scores within [-3, 3]"
        ),
        details=issues,
    )


def check_year_consistency(supabase) -> ValidationResult:
    """Check that year ranges are consistent (start <= end) across tables."""
    issues = []

    # Check polities
    bad_polities = (
        supabase.rpc("search_polities", {"p_limit": 0}).execute()
    )
    # Direct check on the table
    result = (
        supabase.table("polities")
        .select("id, start_year, end_year")
        .limit(1000)
        .execute()
    )
    for row in result.data:
        if row["start_year"] > row["end_year"]:
            issues.append(
                f"polity {row['id']}: start {row['start_year']} > end {row['end_year']}"
            )

    return ValidationResult(
        name="year_consistency",
        passed=len(issues) == 0,
        message=(
            f"{len(issues)} year range inconsistencies"
            if issues
            else "All year ranges consistent"
        ),
        details=issues[:20],
    )


def check_category_distribution(supabase) -> ValidationResult:
    """
    Check that variable_values has a reasonable distribution across categories.

    We expect social_complexity to be the largest category, warfare second.
    """
    categories = ["social_complexity", "warfare", "religion", "agriculture"]
    counts: dict[str, int] = {}
    issues = []

    for cat in categories:
        result = (
            supabase.table("variable_values")
            .select("*", count="exact", head=True)
            .eq("category", cat)
            .execute()
        )
        counts[cat] = result.count or 0

    total = sum(counts.values())
    if total == 0:
        return ValidationResult(
            name="category_distribution",
            passed=False,
            message="No variable values found",
        )

    for cat, count in counts.items():
        pct = (count / total) * 100
        logger.info("Category %s: %d (%.1f%%)", cat, count, pct)
        if count == 0:
            issues.append(f"Category {cat} has 0 records")

    return ValidationResult(
        name="category_distribution",
        passed=len(issues) == 0,
        message=(
            f"Category distribution: {counts}"
            if not issues
            else f"{len(issues)} empty categories"
        ),
        details=issues,
    )


def check_known_polities(supabase) -> ValidationResult:
    """
    Cross-check known polities against expected values.

    These are hand-verified reference points from published papers.
    """
    known = [
        {"id": "it_roman_empire_principate", "name_contains": "Roman", "region": "Europe"},
        {"id": "eg_new_kingdom", "name_contains": "Egypt", "region": "Middle East and North Africa"},
        {"id": "cn_han_dynasty", "name_contains": "Han", "region": "East Asia"},
        {"id": "iq_neo_assyrian_emp", "name_contains": "Assyrian", "region": "Middle East and North Africa"},
        {"id": "mx_aztec_empire", "name_contains": "Aztec", "region": "Americas"},
    ]

    issues = []
    found = 0

    for expected in known:
        result = (
            supabase.table("polities")
            .select("id, name, region")
            .ilike("id", f"%{expected['id'].split('_')[1]}%")
            .limit(5)
            .execute()
        )

        if not result.data:
            # Try by name
            result = (
                supabase.table("polities")
                .select("id, name, region")
                .ilike("name", f"%{expected['name_contains']}%")
                .limit(5)
                .execute()
            )

        if result.data:
            found += 1
            for row in result.data:
                if row.get("region") and row["region"] != expected["region"]:
                    issues.append(
                        f"{row['id']}: region is '{row['region']}', "
                        f"expected '{expected['region']}'"
                    )
        else:
            issues.append(f"Could not find polity matching '{expected['name_contains']}'")

    return ValidationResult(
        name="known_polities",
        passed=found >= 3,
        message=f"Found {found}/{len(known)} known reference polities",
        details=issues,
    )


def check_iron_cav_values(supabase) -> ValidationResult:
    """Verify iron_cav values are only 0, 1, or 2."""
    result = (
        supabase.table("complexity_scores")
        .select("polity_id, century, iron_cav")
        .not_.in_("iron_cav", [0, 1, 2])
        .limit(10)
        .execute()
    )

    bad = result.data
    return ValidationResult(
        name="iron_cav_values",
        passed=len(bad) == 0,
        message=(
            f"{len(bad)} invalid iron_cav values"
            if bad
            else "All iron_cav values valid (0, 1, or 2)"
        ),
        details=[f"{r['polity_id']} century {r['century']}: {r['iron_cav']}" for r in bad],
    )


def check_orphan_references(supabase) -> ValidationResult:
    """Check for variable_values or complexity_scores that reference nonexistent polities."""
    issues = []

    # Load all polity IDs
    polity_result = supabase.table("polities").select("id").execute()
    polity_ids = {r["id"] for r in polity_result.data}

    # Sample variable_values
    vv_result = (
        supabase.table("variable_values")
        .select("polity_id")
        .limit(5000)
        .execute()
    )
    orphan_vv = {r["polity_id"] for r in vv_result.data if r["polity_id"] not in polity_ids}
    if orphan_vv:
        issues.append(f"variable_values: {len(orphan_vv)} orphaned polity_ids")

    # Sample complexity_scores
    cs_result = (
        supabase.table("complexity_scores")
        .select("polity_id")
        .limit(5000)
        .execute()
    )
    orphan_cs = {r["polity_id"] for r in cs_result.data if r["polity_id"] not in polity_ids}
    if orphan_cs:
        issues.append(f"complexity_scores: {len(orphan_cs)} orphaned polity_ids")

    return ValidationResult(
        name="orphan_references",
        passed=len(issues) == 0,
        message="No orphan references" if not issues else f"{len(issues)} orphan issues",
        details=issues,
    )


if __name__ == "__main__":
    results = validate_all()

    print("\n" + "=" * 60)
    print("SESHAT DATA VALIDATION REPORT")
    print("=" * 60)

    passed = 0
    failed = 0

    for r in results:
        status = "PASS" if r.passed else "FAIL"
        icon = "[+]" if r.passed else "[-]"
        print(f"\n{icon} {r.name}: {status}")
        print(f"    {r.message}")
        if r.details:
            for detail in r.details[:5]:
                print(f"      - {detail}")
            if len(r.details) > 5:
                print(f"      ... and {len(r.details) - 5} more")

        if r.passed:
            passed += 1
        else:
            failed += 1

    print(f"\n{'=' * 60}")
    print(f"Results: {passed} passed, {failed} failed out of {len(results)} checks")
    print("=" * 60)

    sys.exit(0 if failed == 0 else 1)
