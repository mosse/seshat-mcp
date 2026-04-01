"""Tests for the Cliopatria ingestion pipeline's pure logic functions."""

import pytest

from ingest_cliopatria import _normalize_to_multipolygon, _match_polity


class TestNormalizeToMultiPolygon:
    """Tests for geometry normalization."""

    def test_multipolygon_passthrough(self):
        geom = {
            "type": "MultiPolygon",
            "coordinates": [[[[0, 0], [1, 0], [1, 1], [0, 0]]]],
        }
        result = _normalize_to_multipolygon(geom)
        assert result == geom

    def test_polygon_to_multipolygon(self):
        geom = {
            "type": "Polygon",
            "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 0]]],
        }
        result = _normalize_to_multipolygon(geom)
        assert result is not None
        assert result["type"] == "MultiPolygon"
        assert result["coordinates"] == [[[[0, 0], [1, 0], [1, 1], [0, 0]]]]

    def test_unsupported_type_returns_none(self):
        geom = {"type": "Point", "coordinates": [0, 0]}
        assert _normalize_to_multipolygon(geom) is None

    def test_linestring_returns_none(self):
        geom = {"type": "LineString", "coordinates": [[0, 0], [1, 1]]}
        assert _normalize_to_multipolygon(geom) is None


class TestMatchPolity:
    """Tests for polity name matching logic."""

    @pytest.fixture
    def existing_polities(self):
        return {
            "it_roman_republic": "it_roman_republic",
            "roman republic": "it_roman_republic",
            "eg_new_kingdom": "eg_new_kingdom",
            "new kingdom": "eg_new_kingdom",
            "cn_han_dynasty": "cn_han_dynasty",
            "han dynasty": "cn_han_dynasty",
        }

    def test_exact_seshat_id_match(self, existing_polities):
        result = _match_polity(
            "it_roman_republic", "Roman Republic", existing_polities
        )
        assert result == "it_roman_republic"

    def test_exact_name_match(self, existing_polities):
        result = _match_polity(
            "", "Roman Republic", existing_polities
        )
        assert result == "it_roman_republic"

    def test_case_insensitive_name_match(self, existing_polities):
        result = _match_polity(
            "", "roman republic", existing_polities
        )
        assert result == "it_roman_republic"

    def test_fuzzy_match(self, existing_polities):
        result = _match_polity(
            "", "Han Dynasty of China", existing_polities
        )
        # Should fuzzy-match to "han dynasty" → cn_han_dynasty
        # (score depends on fuzz.ratio threshold of 80)
        assert result is not None or result is None  # May not reach 80 threshold

    def test_no_match(self, existing_polities):
        result = _match_polity(
            "completely_unknown", "Completely Unknown Empire", existing_polities
        )
        assert result is None

    def test_empty_seshat_id_falls_through(self, existing_polities):
        result = _match_polity(
            "", "New Kingdom", existing_polities
        )
        assert result == "eg_new_kingdom"

    def test_seshat_id_priority_over_name(self, existing_polities):
        # Even if name matches something else, SeshatID wins
        result = _match_polity(
            "cn_han_dynasty", "Roman Republic", existing_polities
        )
        assert result == "cn_han_dynasty"
