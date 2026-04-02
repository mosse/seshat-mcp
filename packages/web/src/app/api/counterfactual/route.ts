/**
 * POST /api/counterfactual
 *
 * Runs the counterfactual estimation engine and streams back the
 * Claude-generated narrative. Returns a streaming response where
 * the first chunk is the JSON projection result (delimited by a
 * newline), followed by the streamed narrative tokens.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { streamNarrative } from '@/lib/narrative';
import { projectForward, checkPreconditions, getScenarioById } from '@seshat/shared';
import type {
  CenturyState,
  ComplexityScore,
  Polity,
  VariableChange,
  Region,
} from '@seshat/shared';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    polity_id,
    scenario_id,
    injection_year,
    changes: customChanges,
    projection_centuries = 5,
  } = body as {
    polity_id: string;
    scenario_id?: string;
    injection_year: number;
    changes?: VariableChange[];
    projection_centuries?: number;
  };

  const supabase = getSupabase();
  const injectionCentury = Math.floor(injection_year / 100) * 100;

  // Resolve scenario
  const scenario = scenario_id ? getScenarioById(scenario_id) : null;
  const changes = customChanges ?? scenario?.changes ?? [];

  if (changes.length === 0) {
    return NextResponse.json(
      { error: 'No changes specified. Provide scenario_id or changes array.' },
      { status: 400 }
    );
  }

  // Load polity and baseline
  const [polityRes, baselineRes, existingVarsRes] = await Promise.all([
    supabase.from('polities').select('*').eq('id', polity_id).single(),
    supabase
      .from('complexity_scores')
      .select('*')
      .eq('polity_id', polity_id)
      .eq('century', injectionCentury)
      .maybeSingle(),
    supabase
      .from('variable_values')
      .select('variable_code, value_text')
      .eq('polity_id', polity_id)
      .eq('value_text', 'present'),
  ]);

  if (polityRes.error || !polityRes.data) {
    return NextResponse.json({ error: 'Polity not found' }, { status: 404 });
  }

  const polity = polityRes.data as Polity;
  const notes: string[] = [];

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
    : {
        century: injectionCentury,
        pc1_composite: 0,
        pc1_scale: 0,
        pc1_hier: 0,
        pc1_gov: 0,
        iron_cav: 0 as const,
        mil_tech_index: 0,
        agri_productivity: 0.5,
        agri_years_since: 0,
      };

  // Preconditions
  const existingVars = new Set(
    (existingVarsRes.data ?? []).map(
      (v: { variable_code: string }) => v.variable_code
    )
  );
  const preconditions = checkPreconditions(changes, {
    polityId: polity_id,
    region: polity.region as Region,
    injectionYear: injection_year,
    existingVariables: existingVars,
  });
  notes.push(...preconditions.warnings);

  // Apply changes and project
  const counterfactualMods = applyChanges(baseline, changes);
  const baselineProjection = projectForward(baseline, projection_centuries);
  const counterfactualProjection = projectForward(
    baseline,
    projection_centuries,
    counterfactualMods
  );

  const lastBaseline =
    baselineProjection.points[baselineProjection.points.length - 1];
  const lastCf =
    counterfactualProjection.points[counterfactualProjection.points.length - 1];
  const delta = lastCf.pc1_composite - lastBaseline.pc1_composite;

  const projectionResult = {
    baseline: baselineProjection.points,
    counterfactual: counterfactualProjection.points,
    confidence_bands: counterfactualProjection.bands,
    analogues: [],
    delta_complexity: Math.round(delta * 1000) / 1000,
    notes,
  };

  // Resolve the scenario for narrative (use first matching or build a placeholder)
  const narrativeScenario = scenario ?? {
    id: 'custom',
    label: changes.map((c) => c.variable_code).join(' + '),
    description: 'Custom injection',
    changes,
    requires: [],
    regions_applicable: [],
    expected_lag_centuries: 3,
    real_world_example: 'Custom scenario — no predefined historical example.',
  };

  // Stream response: JSON projection on first line, then narrative
  const encoder = new TextEncoder();
  const narrativeStream = streamNarrative({
    polity,
    scenario: narrativeScenario,
    injectionYear: injection_year,
    projectionResult,
  });

  const combinedStream = new ReadableStream({
    async start(controller) {
      // Send the projection result as the first chunk (JSON line)
      controller.enqueue(
        encoder.encode(JSON.stringify(projectionResult) + '\n')
      );

      // Pipe the narrative stream
      const reader = narrativeStream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
      } finally {
        reader.releaseLock();
      }
      controller.close();
    },
  });

  return new Response(combinedStream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  });
}

function applyChanges(
  baseline: CenturyState,
  changes: VariableChange[]
): Partial<CenturyState> {
  const mods: Partial<CenturyState> = {};

  for (const change of changes) {
    switch (change.variable_code) {
      case 'Iron_weapons': {
        const hasIron = change.new_value === 'present';
        const hasCav = baseline.iron_cav >= 1;
        mods.iron_cav = ((hasIron ? 1 : 0) + (hasCav ? 1 : 0)) as 0 | 1 | 2;
        if (hasIron) {
          mods.mil_tech_index = Math.min(1, baseline.mil_tech_index + 1 / 15);
        }
        break;
      }
      case 'Cavalry': {
        const hasIron = baseline.iron_cav >= 1;
        const hasCav = change.new_value === 'present';
        mods.iron_cav = ((hasIron ? 1 : 0) + (hasCav ? 1 : 0)) as 0 | 1 | 2;
        if (hasCav) {
          mods.mil_tech_index = Math.min(
            1,
            (mods.mil_tech_index ?? baseline.mil_tech_index) + 1 / 15
          );
        }
        break;
      }
      case 'Irrigation': {
        if (change.new_value === 'present') {
          mods.agri_productivity = Math.max(baseline.agri_productivity, 1.5);
        }
        break;
      }
      default: {
        if (change.new_value === 'present') {
          mods.mil_tech_index = Math.min(
            1,
            (mods.mil_tech_index ?? baseline.mil_tech_index) + 1 / 15
          );
        }
      }
    }
  }

  return mods;
}
