/**
 * Database query implementations for MCP tools.
 *
 * Each function corresponds to one MCP tool. They accept raw tool
 * arguments, query Supabase, and return structured results.
 * All queries use the Supabase query builder — no raw SQL.
 */

import { supabase } from '../db.js';
import type {
  Polity,
  PolitySearchResult,
  PolityDetail,
  VariableValue,
  ComplexityScore,
  RegionSnapshot,
  TechnologyDiffusionEntry,
  AnalogueMatch,
  Region,
  VariableCategory,
} from '@seshat/shared';

type ToolArgs = Record<string, unknown>;

// ── search_polities ──────────────────────────────────────────────────

export async function searchPolities(args: ToolArgs): Promise<PolitySearchResult> {
  const query = args.query as string | undefined;
  const region = args.region as Region | undefined;
  const year = args.year as number | undefined;
  const limit = (args.limit as number) ?? 10;

  let q = supabase.from('polities').select('*', { count: 'exact' });

  if (query) {
    q = q.ilike('name', `%${query}%`);
  }
  if (region) {
    q = q.eq('region', region);
  }
  if (year !== undefined) {
    q = q.lte('start_year', year).gte('end_year', year);
  }

  q = q.order('name').limit(limit);

  const { data, count, error } = await q;
  if (error) throw new Error(`search_polities failed: ${error.message}`);

  return {
    polities: (data ?? []) as Polity[],
    total_count: count ?? 0,
  };
}

// ── get_polity_detail ────────────────────────────────────────────────

export async function getPolityDetail(args: ToolArgs): Promise<PolityDetail> {
  const polityId = args.polity_id as string;

  const [polityRes, complexityRes, variablesRes] = await Promise.all([
    supabase.from('polities').select('*').eq('id', polityId).single(),
    supabase
      .from('complexity_scores')
      .select('*')
      .eq('polity_id', polityId)
      .order('century'),
    supabase
      .from('variable_values')
      .select('*')
      .eq('polity_id', polityId)
      .not('value_text', 'is', null)
      .limit(100),
  ]);

  if (polityRes.error) {
    throw new Error(`Polity not found: ${polityId}`);
  }

  return {
    ...(polityRes.data as Polity),
    complexity_timeline: (complexityRes.data ?? []) as ComplexityScore[],
    key_variables: (variablesRes.data ?? []) as VariableValue[],
  };
}

// ── get_variables ────────────────────────────────────────────────────

export async function getVariables(args: ToolArgs): Promise<VariableValue[]> {
  const polityId = args.polity_id as string;
  const category = args.category as VariableCategory | undefined;
  const codes = args.variable_codes as string[] | undefined;
  const yearFrom = args.year_from as number | undefined;
  const yearTo = args.year_to as number | undefined;

  let q = supabase
    .from('variable_values')
    .select('*')
    .eq('polity_id', polityId);

  if (category) {
    q = q.eq('category', category);
  }
  if (codes && codes.length > 0) {
    q = q.in('variable_code', codes);
  }
  if (yearFrom !== undefined) {
    q = q.gte('year_to', yearFrom);
  }
  if (yearTo !== undefined) {
    q = q.lte('year_from', yearTo);
  }

  q = q.order('variable_code').order('year_from');

  const { data, error } = await q;
  if (error) throw new Error(`get_variables failed: ${error.message}`);

  return (data ?? []) as VariableValue[];
}

// ── get_complexity_timeline ──────────────────────────────────────────

export async function getComplexityTimeline(
  args: ToolArgs
): Promise<ComplexityScore[]> {
  const polityId = args.polity_id as string;
  const centuryFrom = args.century_from as number | undefined;
  const centuryTo = args.century_to as number | undefined;

  let q = supabase
    .from('complexity_scores')
    .select('*')
    .eq('polity_id', polityId);

  if (centuryFrom !== undefined) {
    q = q.gte('century', centuryFrom);
  }
  if (centuryTo !== undefined) {
    q = q.lte('century', centuryTo);
  }

  q = q.order('century');

  const { data, error } = await q;
  if (error) throw new Error(`get_complexity_timeline failed: ${error.message}`);

  return (data ?? []) as ComplexityScore[];
}

// ── compare_polities ─────────────────────────────────────────────────

export async function comparePolities(args: ToolArgs): Promise<{
  polities: Array<{
    polity: Polity;
    complexity: ComplexityScore | null;
    variables: VariableValue[];
  }>;
  year: number | null;
}> {
  const polityIds = args.polity_ids as string[];
  const variables = args.variables as string[] | undefined;
  const year = args.year as number | undefined;

  if (polityIds.length < 2 || polityIds.length > 5) {
    throw new Error('compare_polities requires 2-5 polity IDs');
  }

  const century = year !== undefined ? Math.floor(year / 100) * 100 : undefined;

  const results = await Promise.all(
    polityIds.map(async (pid) => {
      const [polityRes, complexityRes, variablesRes] = await Promise.all([
        supabase.from('polities').select('*').eq('id', pid).single(),
        century !== undefined
          ? supabase
              .from('complexity_scores')
              .select('*')
              .eq('polity_id', pid)
              .eq('century', century)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        variables && variables.length > 0
          ? supabase
              .from('variable_values')
              .select('*')
              .eq('polity_id', pid)
              .in('variable_code', variables)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (polityRes.error) {
        throw new Error(`Polity not found: ${pid}`);
      }

      return {
        polity: polityRes.data as Polity,
        complexity: complexityRes.data as ComplexityScore | null,
        variables: (variablesRes.data ?? []) as VariableValue[],
      };
    })
  );

  return { polities: results, year: year ?? null };
}

// ── find_analogous_polities ──────────────────────────────────────────

export async function findAnalogousPolities(
  args: ToolArgs
): Promise<AnalogueMatch[]> {
  const polityId = args.polity_id as string;
  const year = args.year as number;
  const matchOn = args.match_on as string[] | undefined;
  const limit = (args.limit as number) ?? 5;

  const century = Math.floor(year / 100) * 100;

  // Get the target polity's scores at this century
  const targetRes = await supabase
    .from('complexity_scores')
    .select('*')
    .eq('polity_id', polityId)
    .eq('century', century)
    .maybeSingle();

  if (!targetRes.data) {
    throw new Error(
      `No complexity data for ${polityId} at century ${century}`
    );
  }

  const target = targetRes.data as ComplexityScore;

  // Get all other polities' scores at the same century
  const allRes = await supabase
    .from('complexity_scores')
    .select('*, polities!inner(id, name, nga, region, subregion, start_year, end_year, capital, language_family)')
    .eq('century', century)
    .neq('polity_id', polityId);

  if (allRes.error) {
    throw new Error(`find_analogous_polities failed: ${allRes.error.message}`);
  }

  const candidates = allRes.data ?? [];

  // Compute cosine similarity on the feature vector
  const scored = candidates
    .map((candidate) => {
      const similarity = computeSimilarity(target, candidate, matchOn);
      const polityData = candidate.polities as unknown as Polity;
      return {
        polity: polityData,
        similarity_score: similarity,
        adoption_year: century,
        delta: (candidate.pc1_composite ?? 0) - (target.pc1_composite ?? 0),
        trajectory: [],
      } satisfies AnalogueMatch;
    })
    .filter((s) => s.similarity_score > 0)
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, limit);

  return scored;
}

function computeSimilarity(
  a: ComplexityScore,
  b: ComplexityScore,
  matchOn?: string[]
): number {
  const features = matchOn ?? [
    'pc1_composite',
    'mil_tech_index',
    'agri_productivity',
  ];

  const vecA: number[] = [];
  const vecB: number[] = [];

  for (const feat of features) {
    const valA = getFeatureValue(a, feat);
    const valB = getFeatureValue(b, feat);
    if (valA !== null && valB !== null) {
      vecA.push(valA);
      vecB.push(valB);
    }
  }

  if (vecA.length === 0) return 0;
  return cosineSimilarity(vecA, vecB);
}

function getFeatureValue(score: ComplexityScore, feature: string): number | null {
  const val = (score as unknown as Record<string, unknown>)[feature];
  return typeof val === 'number' ? val : null;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

// ── get_technology_diffusion ─────────────────────────────────────────

export async function getTechnologyDiffusion(
  args: ToolArgs
): Promise<TechnologyDiffusionEntry[]> {
  const variableCode = args.variable_code as string;
  const region = args.region as string | undefined;

  let q = supabase
    .from('variable_values')
    .select('polity_id, year_from, polities!inner(id, name, nga, region, subregion, start_year, end_year, capital, language_family)')
    .eq('variable_code', variableCode)
    .eq('value_text', 'present')
    .order('year_from');

  if (region) {
    q = q.eq('polities.region', region);
  }

  const { data, error } = await q;
  if (error) {
    throw new Error(`get_technology_diffusion failed: ${error.message}`);
  }

  // Deduplicate: keep earliest adoption per polity
  const seen = new Map<string, TechnologyDiffusionEntry>();
  for (const row of data ?? []) {
    const polity = row.polities as unknown as Polity;
    if (!seen.has(polity.id)) {
      seen.set(polity.id, {
        polity,
        first_adoption_year: row.year_from,
        spread_rate_km_per_century: null,
      });
    }
  }

  const entries = Array.from(seen.values()).sort(
    (a, b) => a.first_adoption_year - b.first_adoption_year
  );

  return entries;
}

// ── get_region_snapshot ──────────────────────────────────────────────

export async function getRegionSnapshot(
  args: ToolArgs
): Promise<RegionSnapshot> {
  const region = args.region as Region;
  const century = args.century as number;

  const { data, error } = await supabase
    .from('polities')
    .select('*, complexity_scores!left(polity_id, century, pc1_scale, pc1_hier, pc1_gov, pc1_composite, iron_cav, mil_tech_index, agri_productivity, agri_years_since)')
    .eq('region', region)
    .lte('start_year', century + 99)
    .gte('end_year', century);

  if (error) {
    throw new Error(`get_region_snapshot failed: ${error.message}`);
  }

  const polities = (data ?? []).map((row) => {
    const scores = row.complexity_scores as ComplexityScore[] | null;
    const matchingScore =
      scores?.find((s) => s.century === century) ?? null;

    const { complexity_scores: _, ...polityData } = row;
    return {
      polity: polityData as unknown as Polity,
      complexity: matchingScore,
    };
  });

  return { region, century, polities };
}
