-- Seshat Global History Databank — Indexes
-- Migration 002: Performance indexes for common query patterns.

-- variable_values: lookup by polity, category, or specific variable
CREATE INDEX idx_vv_polity ON variable_values (polity_id);
CREATE INDEX idx_vv_category ON variable_values (category);
CREATE INDEX idx_vv_variable ON variable_values (variable_code);
CREATE INDEX idx_vv_polity_variable ON variable_values (polity_id, variable_code);
CREATE INDEX idx_vv_year_range ON variable_values (year_from, year_to);

-- complexity_scores: time-series queries by century
CREATE INDEX idx_cs_century ON complexity_scores (century);

-- polity_borders: temporal and spatial queries
CREATE INDEX idx_pb_years ON polity_borders (year_from, year_to);
CREATE INDEX idx_pb_boundary ON polity_borders USING GIST (boundary);

-- polities: search by region and name
CREATE INDEX idx_polities_region ON polities (region);
CREATE INDEX idx_polities_name_trgm ON polities USING GIN (name gin_trgm_ops);

-- Enable the trigram extension for fuzzy name search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
