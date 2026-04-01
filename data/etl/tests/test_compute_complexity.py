"""Tests for complexity score computation logic."""

import pytest

from compute_complexity_scores import (
    _compute_century_score,
    _estimate_agri_years,
    _year_to_century,
    _build_variable_lookup,
    COMPONENT_WEIGHTS,
    MIL_TECH_VARIABLES,
)


class TestYearToCentury:
    """Tests for year → century conversion."""

    def test_positive_year(self):
        assert _year_to_century(450) == 400

    def test_century_boundary(self):
        assert _year_to_century(500) == 500

    def test_negative_year(self):
        assert _year_to_century(-350) == -400

    def test_zero(self):
        assert _year_to_century(0) == 0

    def test_large_positive(self):
        assert _year_to_century(1999) == 1900

    def test_small_negative(self):
        assert _year_to_century(-50) == -100


class TestBuildVariableLookup:
    """Tests for the variable lookup index."""

    def test_groups_by_polity_and_code(self):
        variables = [
            {"polity_id": "a", "variable_code": "Iron_weapons", "year_from": 0, "year_to": 100},
            {"polity_id": "a", "variable_code": "Iron_weapons", "year_from": 100, "year_to": 200},
            {"polity_id": "a", "variable_code": "Cavalry", "year_from": 0, "year_to": 100},
            {"polity_id": "b", "variable_code": "Iron_weapons", "year_from": 0, "year_to": 100},
        ]
        lookup = _build_variable_lookup(variables)
        assert len(lookup[("a", "Iron_weapons")]) == 2
        assert len(lookup[("a", "Cavalry")]) == 1
        assert len(lookup[("b", "Iron_weapons")]) == 1

    def test_empty_input(self):
        lookup = _build_variable_lookup([])
        assert lookup == {}


class TestComputeCenturyScore:
    """Tests for the per-century score computation."""

    @pytest.fixture
    def var_lookup_with_iron_and_cavalry(self):
        """A polity with iron weapons and cavalry present in century 0."""
        variables = [
            {
                "polity_id": "test_polity",
                "variable_code": "Iron_weapons",
                "year_from": -100,
                "year_to": 200,
                "value_text": "present",
                "value_numeric": None,
            },
            {
                "polity_id": "test_polity",
                "variable_code": "Cavalry",
                "year_from": -100,
                "year_to": 200,
                "value_text": "present",
                "value_numeric": None,
            },
            {
                "polity_id": "test_polity",
                "variable_code": "PolPop",
                "year_from": -100,
                "year_to": 200,
                "value_text": None,
                "value_numeric": 500000,
            },
            {
                "polity_id": "test_polity",
                "variable_code": "Polity_territory",
                "year_from": -100,
                "year_to": 200,
                "value_text": None,
                "value_numeric": 100000,
            },
        ]
        return _build_variable_lookup(variables)

    @pytest.fixture
    def empty_var_lookup(self):
        """No variable data at all."""
        return {}

    def test_iron_cav_both_present(self, var_lookup_with_iron_and_cavalry):
        score = _compute_century_score(
            "test_polity", 0, var_lookup_with_iron_and_cavalry
        )
        assert score["iron_cav"] == 2

    def test_iron_cav_none(self, empty_var_lookup):
        score = _compute_century_score("empty_polity", 0, empty_var_lookup)
        assert score["iron_cav"] == 0

    def test_mil_tech_index_range(self, var_lookup_with_iron_and_cavalry):
        score = _compute_century_score(
            "test_polity", 0, var_lookup_with_iron_and_cavalry
        )
        assert 0 <= score["mil_tech_index"] <= 1

    def test_mil_tech_with_two_techs(self, var_lookup_with_iron_and_cavalry):
        score = _compute_century_score(
            "test_polity", 0, var_lookup_with_iron_and_cavalry
        )
        # Iron_weapons and Cavalry are both in MIL_TECH_VARIABLES
        expected = 2 / len(MIL_TECH_VARIABLES)
        assert score["mil_tech_index"] == pytest.approx(expected, abs=0.01)

    def test_empty_polity_baseline(self, empty_var_lookup):
        score = _compute_century_score("empty_polity", 0, empty_var_lookup)
        assert score["pc1_composite"] == 0.0
        assert score["pc1_scale"] == 0.0
        assert score["pc1_hier"] == 0.0
        assert score["pc1_gov"] == 0.0
        assert score["mil_tech_index"] == 0.0

    def test_composite_is_weighted_sum(self, var_lookup_with_iron_and_cavalry):
        score = _compute_century_score(
            "test_polity", 0, var_lookup_with_iron_and_cavalry
        )
        expected = (
            score["pc1_scale"] * COMPONENT_WEIGHTS["scale"]
            + score["pc1_hier"] * COMPONENT_WEIGHTS["hier"]
            + score["pc1_gov"] * COMPONENT_WEIGHTS["gov"]
        )
        assert score["pc1_composite"] == pytest.approx(expected, abs=0.001)

    def test_population_contributes_to_scale(self, var_lookup_with_iron_and_cavalry):
        score = _compute_century_score(
            "test_polity", 0, var_lookup_with_iron_and_cavalry
        )
        # PolPop=500000 → log10(500001) ≈ 5.7, weighted by 0.38
        assert score["pc1_scale"] > 0

    def test_score_has_all_fields(self, empty_var_lookup):
        score = _compute_century_score("x", 0, empty_var_lookup)
        expected_keys = {
            "polity_id", "century", "pc1_scale", "pc1_hier", "pc1_gov",
            "pc1_composite", "iron_cav", "mil_tech_index",
            "agri_productivity", "agri_years_since",
        }
        assert set(score.keys()) == expected_keys


class TestEstimateAgriYears:
    """Tests for agriculture adoption year estimation."""

    def test_with_crop_present(self):
        variables = [
            {
                "polity_id": "test",
                "variable_code": "Crop",
                "year_from": -2000,
                "year_to": 500,
                "value_text": "present",
                "value_numeric": None,
            },
        ]
        lookup = _build_variable_lookup(variables)
        result = _estimate_agri_years("test", 0, lookup)
        assert result == 2000

    def test_no_agriculture(self):
        lookup = {}
        result = _estimate_agri_years("test", 0, lookup)
        assert result is None

    def test_uses_earliest_year(self):
        variables = [
            {
                "polity_id": "test",
                "variable_code": "Crop",
                "year_from": -1000,
                "year_to": 500,
                "value_text": "present",
                "value_numeric": None,
            },
            {
                "polity_id": "test",
                "variable_code": "Irrigation",
                "year_from": -3000,
                "year_to": 500,
                "value_text": "present",
                "value_numeric": None,
            },
        ]
        lookup = _build_variable_lookup(variables)
        result = _estimate_agri_years("test", 0, lookup)
        assert result == 3000  # Uses irrigation at -3000

    def test_never_negative(self):
        variables = [
            {
                "polity_id": "test",
                "variable_code": "Crop",
                "year_from": 500,
                "year_to": 1000,
                "value_text": "present",
                "value_numeric": None,
            },
        ]
        lookup = _build_variable_lookup(variables)
        result = _estimate_agri_years("test", 0, lookup)
        assert result == 0  # max(0, 0 - 500) = 0, but actually -500 → max(0, -500) = 0
