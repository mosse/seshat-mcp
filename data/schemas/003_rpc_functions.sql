-- Seshat Global History Databank — RPC Functions
-- Migration 003: Supabase RPC functions for common query patterns.
-- These are called via supabase.rpc() instead of raw SQL in application code.

-- Search polities by name with optional region and year filters.
-- Uses trigram similarity for fuzzy matching when a query is provided.
CREATE OR REPLACE FUNCTION search_polities(
  p_query TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL,
  p_year INTEGER DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS SETOF polities
LANGUAGE sql STABLE
AS $$
  SELECT *
  FROM polities
  WHERE
    (p_query IS NULL OR name ILIKE '%' || p_query || '%')
    AND (p_region IS NULL OR region = p_region)
    AND (p_year IS NULL OR (start_year <= p_year AND end_year >= p_year))
  ORDER BY
    CASE
      WHEN p_query IS NOT NULL THEN similarity(name, p_query)
      ELSE 0
    END DESC,
    name ASC
  LIMIT p_limit;
$$;

-- Get all polities active in a region during a given century.
CREATE OR REPLACE FUNCTION get_region_polities(
  p_region TEXT,
  p_century INTEGER
)
RETURNS TABLE (
  polity_id TEXT,
  polity_name TEXT,
  pc1_composite NUMERIC,
  iron_cav INTEGER,
  mil_tech_index NUMERIC,
  agri_productivity NUMERIC
)
LANGUAGE sql STABLE
AS $$
  SELECT
    p.id AS polity_id,
    p.name AS polity_name,
    cs.pc1_composite,
    cs.iron_cav,
    cs.mil_tech_index,
    cs.agri_productivity
  FROM polities p
  LEFT JOIN complexity_scores cs
    ON cs.polity_id = p.id AND cs.century = p_century
  WHERE p.region = p_region
    AND p.start_year <= p_century + 99
    AND p.end_year >= p_century;
$$;

-- Get the first adoption year of a variable across all polities,
-- optionally filtered by region. Used for technology diffusion queries.
CREATE OR REPLACE FUNCTION get_technology_adoption(
  p_variable_code TEXT,
  p_region TEXT DEFAULT NULL
)
RETURNS TABLE (
  polity_id TEXT,
  polity_name TEXT,
  region TEXT,
  first_adoption_year INTEGER
)
LANGUAGE sql STABLE
AS $$
  SELECT DISTINCT ON (vv.polity_id)
    vv.polity_id,
    p.name AS polity_name,
    p.region,
    vv.year_from AS first_adoption_year
  FROM variable_values vv
  JOIN polities p ON p.id = vv.polity_id
  WHERE vv.variable_code = p_variable_code
    AND vv.value_text = 'present'
    AND (p_region IS NULL OR p.region = p_region)
  ORDER BY vv.polity_id, vv.year_from ASC;
$$;
