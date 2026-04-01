"""Tests for the Equinox ingestion pipeline's pure logic functions."""

import pytest

from ingest_equinox import (
    categorize_variable,
    parse_value,
    _detect_meta_columns,
    _parse_year,
    _safe_str,
)


class TestParseValue:
    """Tests for Seshat cell value parsing."""

    def test_present(self):
        result = parse_value("present")
        assert result["value_text"] == "present"
        assert result["confidence"] == "present"

    def test_absent(self):
        result = parse_value("absent")
        assert result["value_text"] == "absent"
        assert result["confidence"] == "absent"

    def test_unknown(self):
        result = parse_value("unknown")
        assert result["value_text"] == "unknown"

    def test_inferred_present(self):
        result = parse_value("inferred present")
        assert result["confidence"] == "inferred_present"
        assert result["value_text"] == "present"

    def test_suspected_absent(self):
        result = parse_value("suspected absent")
        assert result["confidence"] == "suspected_absent"
        assert result["value_text"] == "absent"

    def test_plain_integer(self):
        result = parse_value("1000")
        assert result["value_numeric"] == 1000.0
        assert result["value_text"] is None

    def test_comma_separated_number(self):
        result = parse_value("1,000,000")
        assert result["value_numeric"] == 1000000.0

    def test_float(self):
        result = parse_value("3.14")
        assert result["value_numeric"] == pytest.approx(3.14)

    def test_range_dash(self):
        result = parse_value("100-500")
        assert result["value_low"] == 100.0
        assert result["value_high"] == 500.0
        assert result["value_numeric"] == 300.0

    def test_range_spaced_dash(self):
        result = parse_value("100 - 500")
        assert result["value_low"] == 100.0
        assert result["value_high"] == 500.0

    def test_range_en_dash(self):
        result = parse_value("100\u2013500")
        assert result["value_low"] == 100.0
        assert result["value_high"] == 500.0

    def test_range_with_commas(self):
        result = parse_value("10,000-50,000")
        assert result["value_low"] == 10000.0
        assert result["value_high"] == 50000.0

    def test_empty_string(self):
        result = parse_value("")
        assert all(v is None for v in result.values())

    def test_none(self):
        result = parse_value(None)
        assert all(v is None for v in result.values())

    def test_nan(self):
        import math
        result = parse_value(float("nan"))
        assert all(v is None for v in result.values())

    def test_fallback_text(self):
        result = parse_value("some descriptive text")
        assert result["value_text"] == "some descriptive text"
        assert result["value_numeric"] is None

    def test_whitespace_handling(self):
        result = parse_value("  present  ")
        assert result["value_text"] == "present"

    def test_case_insensitive(self):
        result = parse_value("Present")
        assert result["value_text"] == "present"


class TestCategorizeVariable:
    """Tests for variable → category mapping."""

    def test_social_complexity(self):
        assert categorize_variable("PolPop") == "social_complexity"
        assert categorize_variable("Polity_territory") == "social_complexity"
        assert categorize_variable("Writing") == "social_complexity"
        assert categorize_variable("Gov_levels") == "social_complexity"

    def test_warfare(self):
        assert categorize_variable("Iron_weapons") == "warfare"
        assert categorize_variable("Cavalry") == "warfare"
        assert categorize_variable("MilTech") == "warfare"
        assert categorize_variable("Sword") == "warfare"

    def test_religion(self):
        assert categorize_variable("High_god") == "religion"
        assert categorize_variable("Moralizing_god") == "religion"
        assert categorize_variable("Human_sacrifice") == "religion"

    def test_agriculture(self):
        assert categorize_variable("Agri") == "agriculture"
        assert categorize_variable("Crop") == "agriculture"
        assert categorize_variable("Irrigation") == "agriculture"

    def test_unmapped(self):
        assert categorize_variable("CompletelyUnknownVariable") is None
        assert categorize_variable("") is None


class TestParseYear:
    """Tests for year string parsing."""

    def test_negative_integer(self):
        assert _parse_year(-500) == -500

    def test_positive_integer(self):
        assert _parse_year(1500) == 1500

    def test_zero(self):
        assert _parse_year(0) == 0

    def test_bce_string(self):
        assert _parse_year("500 BCE") == -500

    def test_bce_no_space(self):
        assert _parse_year("500BCE") == -500

    def test_ce_string(self):
        assert _parse_year("500 CE") == 500

    def test_float_value(self):
        assert _parse_year(1500.0) == 1500

    def test_string_number(self):
        assert _parse_year("1500") == 1500

    def test_none(self):
        assert _parse_year(None) is None

    def test_empty_string(self):
        assert _parse_year("") is None

    def test_unparseable(self):
        assert _parse_year("not a year") is None


class TestDetectMetaColumns:
    """Tests for heuristic column detection."""

    def test_standard_columns(self):
        cols = ["NGA", "Polity", "Start", "End", "Capital", "PolPop", "Iron_weapons"]
        result = _detect_meta_columns(cols)
        assert result.get("nga") == "NGA"
        assert result.get("polity_id") == "Polity"
        assert result.get("start_year") == "Start"
        assert result.get("end_year") == "End"

    def test_alternative_names(self):
        cols = ["Natural_Geographic_Area", "PolityID", "StartYear", "EndYear"]
        result = _detect_meta_columns(cols)
        assert "nga" in result
        assert "polity_id" in result

    def test_case_insensitive(self):
        cols = ["nga", "polity", "start_year", "end_year"]
        result = _detect_meta_columns(cols)
        assert "nga" in result
        assert "polity_id" in result


class TestSafeStr:
    """Tests for safe string conversion."""

    def test_normal_string(self):
        assert _safe_str("hello") == "hello"

    def test_none(self):
        assert _safe_str(None) is None

    def test_nan(self):
        assert _safe_str(float("nan")) is None

    def test_empty_string(self):
        assert _safe_str("") is None

    def test_whitespace_only(self):
        assert _safe_str("   ") is None

    def test_number(self):
        assert _safe_str(42) == "42"

    def test_strips_whitespace(self):
        assert _safe_str("  hello  ") == "hello"
