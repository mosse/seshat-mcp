-- Seshat Global History Databank — Core Schema
-- Migration 001: Core tables for polities, variables, complexity scores, and borders.
--
-- Year convention: BCE years are negative integers. Year 0 = 1 BCE (astronomical).
-- All timestamps use TIMESTAMPTZ for timezone-aware storage.

-- ============================================================================
-- Extensions
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================================
-- Core polity table
-- ============================================================================

CREATE TABLE polities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  nga TEXT NOT NULL,
  region TEXT NOT NULL,
  subregion TEXT,
  start_year INTEGER NOT NULL,
  end_year INTEGER NOT NULL,
  capital TEXT,
  language_family TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT polities_valid_year_range CHECK (start_year <= end_year),
  CONSTRAINT polities_valid_region CHECK (
    region IN (
      'Africa',
      'Americas',
      'Central Eurasia',
      'East Asia',
      'Europe',
      'Middle East and North Africa',
      'Oceania-Pacific',
      'South Asia',
      'Southeast Asia'
    )
  )
);

-- ============================================================================
-- Variable values (EAV pattern)
--
-- Seshat has ~500 active variables across social complexity, warfare,
-- religion, and agriculture. EAV avoids a sparse wide table.
-- ============================================================================

CREATE TABLE variable_values (
  id BIGSERIAL PRIMARY KEY,
  polity_id TEXT NOT NULL REFERENCES polities(id) ON DELETE CASCADE,
  variable_code TEXT NOT NULL,
  category TEXT NOT NULL,
  year_from INTEGER NOT NULL,
  year_to INTEGER NOT NULL,
  value_text TEXT,
  value_numeric NUMERIC,
  value_low NUMERIC,
  value_high NUMERIC,
  confidence TEXT,
  notes TEXT,

  CONSTRAINT vv_valid_year_range CHECK (year_from <= year_to),
  CONSTRAINT vv_valid_category CHECK (
    category IN ('social_complexity', 'warfare', 'religion', 'agriculture')
  ),
  CONSTRAINT vv_valid_confidence CHECK (
    confidence IS NULL OR confidence IN (
      'present', 'absent',
      'inferred_present', 'inferred_absent',
      'suspected_present', 'suspected_absent',
      'unknown'
    )
  ),
  CONSTRAINT vv_has_value CHECK (
    value_text IS NOT NULL OR value_numeric IS NOT NULL
    OR value_low IS NOT NULL OR value_high IS NOT NULL
  ),
  UNIQUE (polity_id, variable_code, year_from, year_to)
);

-- ============================================================================
-- Pre-computed complexity scores (per polity × century)
--
-- PC1 scores from Turchin et al. (2018) PCA on 51 social complexity
-- variables. iron_cav encodes the iron+cavalry combination that the
-- Turchin et al. (2022) regression model uses as a key predictor.
-- ============================================================================

CREATE TABLE complexity_scores (
  polity_id TEXT NOT NULL REFERENCES polities(id) ON DELETE CASCADE,
  century INTEGER NOT NULL,
  pc1_scale NUMERIC,
  pc1_hier NUMERIC,
  pc1_gov NUMERIC,
  pc1_composite NUMERIC,
  iron_cav INTEGER NOT NULL DEFAULT 0,
  mil_tech_index NUMERIC,
  agri_productivity NUMERIC,
  agri_years_since INTEGER,

  PRIMARY KEY (polity_id, century),

  CONSTRAINT cs_valid_iron_cav CHECK (iron_cav IN (0, 1, 2)),
  CONSTRAINT cs_composite_range CHECK (
    pc1_composite IS NULL OR (pc1_composite BETWEEN -5 AND 5)
  )
);

-- ============================================================================
-- Geospatial boundaries (PostGIS)
--
-- Sourced from Cliopatria: 1,600+ polity boundaries from 3400 BCE to 2024 CE.
-- ============================================================================

CREATE TABLE polity_borders (
  id BIGSERIAL PRIMARY KEY,
  polity_id TEXT NOT NULL REFERENCES polities(id) ON DELETE CASCADE,
  year_from INTEGER NOT NULL,
  year_to INTEGER NOT NULL,
  boundary GEOMETRY(MULTIPOLYGON, 4326) NOT NULL,
  area_km2 NUMERIC,

  CONSTRAINT pb_valid_year_range CHECK (year_from <= year_to),
  UNIQUE (polity_id, year_from, year_to)
);
