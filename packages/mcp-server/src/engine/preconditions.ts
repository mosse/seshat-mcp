/**
 * Injection plausibility checker.
 *
 * Before projecting a counterfactual, evaluates whether the injection
 * is historically reasonable. Checks for:
 * - Material prerequisites (iron needs iron ore deposits)
 * - Enabling technologies (cavalry needs horses)
 * - Anachronism (firearms before 1200 CE)
 */

import type { PreconditionResult, VariableChange, Region } from '@seshat/shared';

interface PreconditionContext {
  polityId: string;
  region: Region;
  injectionYear: number;
  existingVariables: Set<string>;
}

interface PreconditionRule {
  variable: string;
  check: (ctx: PreconditionContext) => PreconditionCheckResult | null;
}

interface PreconditionCheckResult {
  warning: string;
  adjustedYear?: number;
  blocks?: boolean;
}

const ANACHRONISM_LIMITS: Record<string, number> = {
  Handheld_firearm: -1200,  // Earliest plausible: 1200 CE → stored as 1200
  Gunpowder: -850,          // Earliest plausible: ~850 CE (Chinese invention)
  Gunpowder_siege_artillery: -1300,
  Plate_armor: -800,
  Paper_currency: -600,
  Crossbow: -700,
};

const PREREQUISITE_MAP: Record<string, string[]> = {
  Cavalry: ['Horse'],
  Plate_armor: ['Iron_weapons'],
  Steel: ['Iron_weapons'],
  Chainmail: ['Iron_weapons'],
  Gunpowder_siege_artillery: ['Gunpowder'],
  Handheld_firearm: ['Gunpowder'],
};

/** Regions where iron ore is naturally scarce/absent. */
const IRON_SCARCE_REGIONS: Set<Region> = new Set([
  'Oceania-Pacific',
]);

const rules: PreconditionRule[] = [
  {
    variable: 'Iron_weapons',
    check: (ctx) => {
      if (IRON_SCARCE_REGIONS.has(ctx.region)) {
        return {
          warning:
            `Iron ore deposits are extremely rare in ${ctx.region}. ` +
            'Iron metallurgy would require extensive trade networks or imports.',
        };
      }
      return null;
    },
  },
  {
    variable: 'Cavalry',
    check: (ctx) => {
      if (!ctx.existingVariables.has('Horse') && !ctx.existingVariables.has('Horse_riding')) {
        const americasOrOceania =
          ctx.region === 'Americas' || ctx.region === 'Oceania-Pacific';
        return {
          warning: americasOrOceania
            ? `Horses were absent from ${ctx.region} until European contact. ` +
              'Cavalry requires horses to be introduced alongside the military innovation.'
            : 'Cavalry requires access to horses or horse-trading networks.',
        };
      }
      return null;
    },
  },
];

/**
 * Check whether a set of variable changes is historically plausible
 * for a given polity at a given time.
 */
export function checkPreconditions(
  changes: VariableChange[],
  context: PreconditionContext
): PreconditionResult {
  const warnings: string[] = [];
  let adjustedYear: number | null = null;
  let plausible = true;

  for (const change of changes) {
    // Anachronism check
    const earliest = ANACHRONISM_LIMITS[change.variable_code];
    if (earliest !== undefined && context.injectionYear < earliest) {
      warnings.push(
        `${change.variable_code} before ${formatYear(earliest)} is anachronistic. ` +
        `Earliest plausible date globally: ~${formatYear(earliest)}.`
      );
      adjustedYear = earliest;
    }

    // Prerequisite check
    const prereqs = PREREQUISITE_MAP[change.variable_code];
    if (prereqs) {
      const missing = prereqs.filter(
        (p) =>
          !context.existingVariables.has(p) &&
          !changes.some((c) => c.variable_code === p)
      );
      if (missing.length > 0) {
        warnings.push(
          `${change.variable_code} typically requires: ${missing.join(', ')}. ` +
          'These prerequisites are not present and not included in the injection.'
        );
      }
    }

    // Custom rules
    for (const rule of rules) {
      if (rule.variable === change.variable_code) {
        const result = rule.check(context);
        if (result) {
          warnings.push(result.warning);
          if (result.adjustedYear) {
            adjustedYear = result.adjustedYear;
          }
          if (result.blocks) {
            plausible = false;
          }
        }
      }
    }
  }

  // Americas/Oceania model caveat
  if (
    context.region === 'Americas' ||
    context.region === 'Oceania-Pacific'
  ) {
    warnings.push(
      `Note: The regression model was developed primarily on Eurasian data. ` +
      `Estimates for ${context.region} carry higher uncertainty.`
    );
  }

  return { plausible, warnings, adjusted_year: adjustedYear };
}

function formatYear(year: number): string {
  if (year < 0) return `${Math.abs(year)} BCE`;
  return `${year} CE`;
}
