/**
 * Counterfactual change application — single source of truth.
 *
 * Maps qualitative variable changes ("give them iron weapons") onto the
 * engine's state fields. Previously duplicated in the MCP engine and the
 * web API route, which had already drifted (the web copy lost the Plow
 * case); both now import this implementation.
 *
 * NOTE (SCI-5): these effects are SCHEMATIC — a plausible directional
 * nudge per variable, not a per-technology calibration. Most military
 * variables share the same mil_tech_index bump. This is disclosed in the
 * app's About page; differentiated effects are tracked in
 * IMPROVEMENT_PLAN.md (SCI-5/B).
 */

import type { CenturyState, VariableChange } from './types.js';

/** Size of one military-technology increment (one tech out of ~15). */
const MIL_TECH_STEP = 1 / 15;

/**
 * Apply variable changes to a baseline state, returning only the modified
 * fields (to be spread into the baseline for projection).
 */
export function applyChanges(
  baseline: CenturyState,
  changes: VariableChange[]
): Partial<CenturyState> {
  const mods: Partial<CenturyState> = {};

  const bumpMilTech = () => {
    mods.mil_tech_index = Math.min(
      1,
      (mods.mil_tech_index ?? baseline.mil_tech_index) + MIL_TECH_STEP
    );
  };

  for (const change of changes) {
    switch (change.variable_code) {
      case 'Iron_weapons': {
        const hasIron = change.new_value === 'present';
        const hasCav = baseline.iron_cav >= 1;
        mods.iron_cav = ((hasIron ? 1 : 0) + (hasCav ? 1 : 0)) as 0 | 1 | 2;
        if (hasIron) bumpMilTech();
        break;
      }
      case 'Cavalry': {
        const hasIron = baseline.iron_cav >= 1;
        const hasCav = change.new_value === 'present';
        mods.iron_cav = ((hasIron ? 1 : 0) + (hasCav ? 1 : 0)) as 0 | 1 | 2;
        if (hasCav) bumpMilTech();
        break;
      }
      case 'Irrigation': {
        if (change.new_value === 'present') {
          mods.agri_productivity = Math.max(baseline.agri_productivity, 1.5);
        }
        break;
      }
      case 'Plow': {
        if (change.new_value === 'present') {
          mods.agri_productivity = Math.max(baseline.agri_productivity, 0.8);
        }
        break;
      }
      default: {
        // Other (military) technology variables: schematic mil-tech bump.
        if (change.new_value === 'present') bumpMilTech();
        break;
      }
    }
  }

  return mods;
}
