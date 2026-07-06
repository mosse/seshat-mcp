/**
 * Counterfactual estimation engine — main entry point.
 *
 * Orchestrates the full counterfactual pipeline:
 * 1. Load baseline state from the database
 * 2. Check preconditions for plausibility
 * 3. Apply injected changes to the baseline
 * 4. Run forward projection (deterministic + Monte Carlo)
 * 5. Find analogous historical societies
 * 6. Package results with notes and caveats
 */

import { applyChanges } from '@seshat/shared';
import { supabase } from '../db.js';
import { projectForward } from './model.js';
import { checkPreconditions } from './preconditions.js';
import { findAnalogousPolities } from '../tools/queries.js';
import type {
  CenturyState,
  ComplexityScore,
  Polity,
  ProjectionResult,
  VariableChange,
  Region,
} from '@seshat/shared';

type ToolArgs = Record<string, unknown>;

export async function runCounterfactualEstimate(
  args: ToolArgs
): Promise<ProjectionResult> {
  const polityId = args.polity_id as string;
  const injectionYear = args.injection_year as number;
  const changes = args.changes as VariableChange[];
  const projectionCenturies = (args.projection_centuries as number) ?? 5;

  const injectionCentury = Math.floor(injectionYear / 100) * 100;

  // 1. Load the polity and its baseline state
  const [polityRes, baselineRes, existingVarsRes] = await Promise.all([
    supabase.from('polities').select('*').eq('id', polityId).single(),
    supabase
      .from('complexity_scores')
      .select('*')
      .eq('polity_id', polityId)
      .eq('century', injectionCentury)
      .maybeSingle(),
    supabase
      .from('variable_values')
      .select('variable_code, value_text')
      .eq('polity_id', polityId)
      .eq('value_text', 'present'),
  ]);

  if (polityRes.error || !polityRes.data) {
    throw new Error(`Polity not found: ${polityId}`);
  }

  const polity = polityRes.data as Polity;
  const notes: string[] = [];

  // Build baseline century state (use defaults if no score exists)
  const baselineScore = baselineRes.data as ComplexityScore | null;
  const baseline: CenturyState = baselineScore
    ? {
        century: injectionCentury,
        pc1_composite: baselineScore.pc1_composite ?? 0,
        pc1_scale: baselineScore.pc1_scale ?? 0,
        pc1_hier: baselineScore.pc1_hier ?? 0,
        pc1_gov: baselineScore.pc1_gov ?? 0,
        iron_cav: baselineScore.iron_cav as 0 | 1 | 2,
        mil_tech_index: baselineScore.mil_tech_index ?? 0,
        agri_productivity: baselineScore.agri_productivity ?? 0,
        agri_years_since: baselineScore.agri_years_since ?? 0,
      }
    : createDefaultState(injectionCentury);

  if (!baselineScore) {
    notes.push(
      `No complexity data exists for ${polity.name} at century ${injectionCentury}. Using default baseline values.`
    );
  }

  // 2. Check preconditions
  const existingVars = new Set(
    (existingVarsRes.data ?? []).map(
      (v: { variable_code: string }) => v.variable_code
    )
  );
  const preconditions = checkPreconditions(changes, {
    polityId,
    region: polity.region as Region,
    injectionYear,
    existingVariables: existingVars,
  });

  notes.push(...preconditions.warnings);

  // 3. Apply injected changes to create counterfactual state
  const counterfactualState = applyChanges(baseline, changes);

  // 4. Run forward projections
  const baselineProjection = projectForward(baseline, projectionCenturies);
  const counterfactualProjection = projectForward(
    baseline,
    projectionCenturies,
    counterfactualState
  );

  // 5. Find analogous polities
  let analogues: Awaited<ReturnType<typeof findAnalogousPolities>> = [];
  try {
    analogues = await findAnalogousPolities({
      polity_id: polityId,
      year: injectionYear,
      limit: 5,
    });
  } catch {
    notes.push('Could not find analogous polities for comparison.');
  }

  // 6. Compute delta
  const lastBaseline =
    baselineProjection.points[baselineProjection.points.length - 1];
  const lastCounterfactual =
    counterfactualProjection.points[counterfactualProjection.points.length - 1];
  const deltaComplexity =
    lastCounterfactual.pc1_composite - lastBaseline.pc1_composite;

  return {
    baseline: baselineProjection.points,
    counterfactual: counterfactualProjection.points,
    confidence_bands: counterfactualProjection.bands,
    analogues,
    delta_complexity: Math.round(deltaComplexity * 1000) / 1000,
    notes,
  };
}

function createDefaultState(century: number): CenturyState {
  return {
    century,
    pc1_composite: 0,
    pc1_scale: 0,
    pc1_hier: 0,
    pc1_gov: 0,
    iron_cav: 0,
    mil_tech_index: 0,
    agri_productivity: 0.5,
    agri_years_since: 0,
  };
}
