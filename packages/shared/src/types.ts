/**
 * Core domain types for the Seshat project.
 *
 * Year convention: BCE years are negative integers. Year 0 = 1 BCE (astronomical).
 * Complexity scores are standardized (mean=0, sd=1) PC1 composites from
 * Turchin et al. (2018). Display code should rescale these for end users.
 */

// ---------------------------------------------------------------------------
// Regions
// ---------------------------------------------------------------------------

export const REGIONS = [
  'Africa',
  'Americas',
  'Central Eurasia',
  'East Asia',
  'Europe',
  'Middle East and North Africa',
  'Oceania-Pacific',
  'South Asia',
  'Southeast Asia',
] as const;

export type Region = (typeof REGIONS)[number];

// ---------------------------------------------------------------------------
// Confidence levels (Seshat evidence coding)
// ---------------------------------------------------------------------------

export const CONFIDENCE_LEVELS = [
  'present',
  'absent',
  'inferred_present',
  'inferred_absent',
  'suspected_present',
  'suspected_absent',
  'unknown',
] as const;

export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

// ---------------------------------------------------------------------------
// Variable categories
// ---------------------------------------------------------------------------

export const VARIABLE_CATEGORIES = [
  'social_complexity',
  'warfare',
  'religion',
  'agriculture',
] as const;

export type VariableCategory = (typeof VARIABLE_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Polity
// ---------------------------------------------------------------------------

export interface Polity {
  id: string;
  name: string;
  nga: string;
  region: Region;
  subregion: string | null;
  start_year: number;
  end_year: number;
  capital: string | null;
  language_family: string | null;
}

// ---------------------------------------------------------------------------
// Variable values (EAV rows)
// ---------------------------------------------------------------------------

export interface VariableValue {
  id: number;
  polity_id: string;
  variable_code: string;
  category: VariableCategory;
  year_from: number;
  year_to: number;
  value_text: string | null;
  value_numeric: number | null;
  value_low: number | null;
  value_high: number | null;
  confidence: Confidence | null;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// Complexity scores (pre-computed per polity × century)
// ---------------------------------------------------------------------------

export interface ComplexityScore {
  polity_id: string;
  century: number;
  pc1_scale: number | null;
  pc1_hier: number | null;
  pc1_gov: number | null;
  pc1_composite: number | null;
  iron_cav: 0 | 1 | 2;
  mil_tech_index: number | null;
  agri_productivity: number | null;
  agri_years_since: number | null;
}

// ---------------------------------------------------------------------------
// Geospatial borders
// ---------------------------------------------------------------------------

export interface PolityBorder {
  id: number;
  polity_id: string;
  year_from: number;
  year_to: number;
  /** GeoJSON MultiPolygon geometry */
  boundary: GeoJSON.MultiPolygon;
  area_km2: number | null;
}

// ---------------------------------------------------------------------------
// Scenarios (curated counterfactual injections)
// ---------------------------------------------------------------------------

export interface VariableChange {
  variable_code: string;
  new_value: string;
}

export interface Scenario {
  id: string;
  label: string;
  description: string;
  changes: VariableChange[];
  requires: string[];
  regions_applicable: Region[];
  expected_lag_centuries: number;
  real_world_example: string;
}

// ---------------------------------------------------------------------------
// Counterfactual estimation engine types
// ---------------------------------------------------------------------------

export interface CenturyState {
  century: number;
  pc1_composite: number;
  pc1_scale: number;
  pc1_hier: number;
  pc1_gov: number;
  iron_cav: 0 | 1 | 2;
  mil_tech_index: number;
  agri_productivity: number;
  agri_years_since: number;
}

export interface ProjectionPoint {
  century: number;
  pc1_composite: number;
  pc1_scale: number;
  pc1_hier: number;
  pc1_gov: number;
}

export interface ConfidenceBand {
  century: number;
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
}

export interface ProjectionResult {
  baseline: ProjectionPoint[];
  counterfactual: ProjectionPoint[];
  confidence_bands: ConfidenceBand[];
  analogues: AnalogueMatch[];
  delta_complexity: number;
  notes: string[];
}

export interface AnalogueMatch {
  polity: Polity;
  similarity_score: number;
  adoption_year: number;
  delta: number;
  trajectory: ProjectionPoint[];
}

export interface PreconditionResult {
  plausible: boolean;
  warnings: string[];
  adjusted_year: number | null;
}

// ---------------------------------------------------------------------------
// Narrative (Claude-generated)
// ---------------------------------------------------------------------------

export interface NarrativeOutput {
  headline: string;
  immediate_effects: string;
  ripple_effects: string;
  geopolitical_response: string;
  confidence_limits: string;
}

// ---------------------------------------------------------------------------
// MCP tool response wrappers
// ---------------------------------------------------------------------------

export interface PolitySearchResult {
  polities: Polity[];
  total_count: number;
}

export interface PolityDetail extends Polity {
  complexity_timeline: ComplexityScore[];
  key_variables: VariableValue[];
}

export interface TechnologyDiffusionEntry {
  polity: Polity;
  first_adoption_year: number;
  spread_rate_km_per_century: number | null;
}

export interface RegionSnapshot {
  region: Region;
  century: number;
  polities: Array<{
    polity: Polity;
    complexity: ComplexityScore | null;
  }>;
}
