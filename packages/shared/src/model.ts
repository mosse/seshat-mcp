/**
 * Dynamic regression forward projection model — Turchin et al. (2022).
 *
 * This implements the PUBLISHED model recovered and validated from the
 * paper's replication deposit (OSF osf.io/tekb6):
 *
 *   X_{t+1} = β1·X_t + β2·X_t.sq + β_agri·Agri + β_agriLag·AgriLag
 *             + β_milTech·MilTech + β_ironCav·IronCav        (per dimension)
 *
 * for the three complexity dimensions Scale / Hier / Gov, where every
 * quantity is STANDARDISED (full-sample z-score) and `X.sq` is the
 * standardised *raw square* of X, reconstructed via an exact affine-in-
 * (X, X²) map recovered from the deposit data.
 *
 * Provenance & audit status (see docs/MODEL.md and docs/MODEL_AUDIT.md):
 * - Coefficients: EXACT — independently re-fit from the deposit's
 *   MultiVar.csv; reproduce the published values to 5 dp.
 * - .sq maps: EXACT — recovered at R²=1.0 (max error ~1e-14).
 * - Residual SDs: EXACT — from the same re-fit (Scale matches the SI's
 *   printed root MSE digit-for-digit).
 * - Predictor standardisation constants: NEAR-EXACT — recovered by joining
 *   the regression rows back to the deposit's raw table (corr 0.991–0.9996
 *   with the standardized columns; the residual gap is the paper's multiple
 *   imputation step, which the deposit does not fully expose).
 * - Input DATA remains illustrative until the ETL produces real
 *   Seshat-derived values (Layer 3 in IMPROVEMENT_PLAN.md).
 *
 * The PC1 composite reported to callers is the mean of the three
 * standardised dimensions — an app-level summary, not a quantity from the
 * paper (which models the dimensions separately and jointly via SUReg).
 *
 * Uncertainty: Monte-Carlo bands use Gaussian noise at the published
 * residual SDs. The paper's residuals are NON-Gaussian (it uses a
 * non-parametric bootstrap), so the bands are an approximation of the
 * published procedure and are labelled as such in the UI.
 */

import type {
  CenturyState,
  ProjectionPoint,
  ConfidenceBand,
} from './types.js';

// ---------------------------------------------------------------------------
// Validated model specification (docs/MODEL_AUDIT.md §5 — do not edit without
// updating the audit doc; a test asserts these match it).
// ---------------------------------------------------------------------------

export interface DimensionCoefficients {
  readonly lag: number;
  readonly lagSq: number;
  readonly agri: number;
  readonly agriLag: number;
  readonly milTech: number;
  readonly ironCav: number;
  readonly residualSd: number;
}

export interface SqMap {
  readonly A: number; // ·X²
  readonly B: number; // ·X
  readonly C: number; // constant (≈ −A by the mean-zero constraint)
}

export const TURCHIN_2022 = {
  /** SUReg coefficients, standardised variables. Source: MODEL_AUDIT.md §3. */
  coefficients: {
    scale: {
      lag: 1.20789,
      lagSq: -0.355695,
      agri: 0.030962,
      agriLag: 0.0383049,
      milTech: 0, // not selected for Scale in the best-supported model
      ironCav: 0.0930742,
      residualSd: 0.288106,
    },
    hier: {
      lag: 1.03122,
      lagSq: -0.222218,
      agri: 0.032604,
      agriLag: 0.0415172,
      milTech: 0.0586117,
      ironCav: 0.0441969,
      residualSd: 0.335424,
    },
    gov: {
      lag: 1.02589,
      lagSq: -0.248156,
      agri: 0.0499141,
      agriLag: 0, // not selected for Gov in the best-supported model
      milTech: 0.0685953,
      ironCav: 0.0874432,
      residualSd: 0.352592,
    },
  } as const satisfies Record<string, DimensionCoefficients>,

  /** X.sq = A·X² + B·X + C (standardised). Source: MODEL_AUDIT.md §4. */
  sqMaps: {
    scale: { A: 0.157112, B: 0.960746, C: -0.156952 },
    hier: { A: 0.231611, B: 0.774601, C: -0.231375 },
    gov: { A: 0.376006, B: 0.689379, C: -0.375623 },
  } as const satisfies Record<string, SqMap>,

  /**
   * Predictor standardisation constants, recovered from the deposit
   * (NEAR-EXACT — see header). Raw scales:
   * - ironCav: Iron{0,1} + Cavalry{0,0.5,1} → 0..2 (same coding as the
   *   app's `iron_cav`)
   * - milTech: count of military technologies, observed range 0..41; the
   *   app's `mil_tech_index` ∈ [0,1] maps as index·41
   * - agri: productivity measure, same scale as `agri_productivity`
   * - agriLagYears: years since agriculture onset
   */
  standardization: {
    ironCav: { mean: 0.61128, sd: 0.88996 },
    milTech: { mean: 16.387259, sd: 11.639466, maxRaw: 41 },
    agri: { mean: 0.575033, sd: 0.461329 },
    agriLagYears: { mean: 2255.386179, sd: 2529.880727 },
  },
} as const;

const MONTE_CARLO_SAMPLES = 1000;

/**
 * Out-of-domain guard for the NOISY Monte-Carlo path only. The observed
 * standardised range in the fitting data is roughly ±2.5; beyond ~±4 the
 * quadratic recurrence is pure extrapolation and can diverge, so noise
 * draws are clamped there. The deterministic path is the pure recurrence
 * (bit-comparable with the Python reference implementation).
 */
const MC_STATE_CLAMP = 4;

// ---------------------------------------------------------------------------
// Projection API (signature unchanged from the previous engine)
// ---------------------------------------------------------------------------

/**
 * Project complexity forward from a baseline state.
 *
 * Runs the validated recurrence century-by-century, optionally applying
 * injected variable changes at the injection point. Returns deterministic
 * point estimates and Monte Carlo confidence bands.
 */
export function projectForward(
  baseline: CenturyState,
  centuries: number,
  injectedChanges?: Partial<CenturyState>
): {
  points: ProjectionPoint[];
  bands: ConfidenceBand[];
} {
  const startState = injectedChanges
    ? { ...baseline, ...injectedChanges }
    : baseline;

  const points = runDeterministic(startState, centuries);
  const bands = runMonteCarlo(startState, centuries);

  return { points, bands };
}

/** Standardise the app-state predictors into the model's z-scored space. */
function standardizedPredictors(state: CenturyState): {
  agri: number;
  agriLag: number;
  milTech: number;
  ironCav: number;
} {
  const s = TURCHIN_2022.standardization;
  return {
    ironCav: (state.iron_cav - s.ironCav.mean) / s.ironCav.sd,
    milTech:
      (state.mil_tech_index * s.milTech.maxRaw - s.milTech.mean) /
      s.milTech.sd,
    agri: (state.agri_productivity - s.agri.mean) / s.agri.sd,
    agriLag:
      ((state.agri_years_since ?? 0) - s.agriLagYears.mean) /
      s.agriLagYears.sd,
  };
}

/** One dimension, one century: the published recurrence. */
function stepDimension(
  x: number,
  coef: DimensionCoefficients,
  sq: SqMap,
  p: { agri: number; agriLag: number; milTech: number; ironCav: number }
): number {
  const xsq = sq.A * x * x + sq.B * x + sq.C;
  return (
    coef.lag * x +
    coef.lagSq * xsq +
    coef.agri * p.agri +
    coef.agriLag * p.agriLag +
    coef.milTech * p.milTech +
    coef.ironCav * p.ironCav
  );
}

/** Advance the full state by one century (deterministic). */
function stepForward(state: CenturyState): CenturyState {
  const p = standardizedPredictors(state);
  const { coefficients: c, sqMaps: m } = TURCHIN_2022;

  const scale = stepDimension(state.pc1_scale, c.scale, m.scale, p);
  const hier = stepDimension(state.pc1_hier, c.hier, m.hier, p);
  const gov = stepDimension(state.pc1_gov, c.gov, m.gov, p);

  return {
    century: state.century + 100,
    pc1_scale: scale,
    pc1_hier: hier,
    pc1_gov: gov,
    // App-level summary of the three modelled dimensions (see header).
    pc1_composite: (scale + hier + gov) / 3,
    iron_cav: state.iron_cav,
    mil_tech_index: state.mil_tech_index,
    agri_productivity: state.agri_productivity,
    agri_years_since: (state.agri_years_since ?? 0) + 100,
  };
}

function runDeterministic(
  start: CenturyState,
  centuries: number
): ProjectionPoint[] {
  const points: ProjectionPoint[] = [];
  let state = { ...start };

  for (let i = 0; i <= centuries; i++) {
    points.push({
      century: state.century,
      pc1_composite: state.pc1_composite,
      pc1_scale: state.pc1_scale,
      pc1_hier: state.pc1_hier,
      pc1_gov: state.pc1_gov,
    });
    if (i < centuries) state = stepForward(state);
  }

  return points;
}

/** Advance with Gaussian noise at the published residual SDs (see header). */
function stepForwardWithNoise(state: CenturyState): CenturyState {
  const next = stepForward(state);
  const { coefficients: c } = TURCHIN_2022;
  next.pc1_scale = clampMc(next.pc1_scale + gaussianRandom() * c.scale.residualSd);
  next.pc1_hier = clampMc(next.pc1_hier + gaussianRandom() * c.hier.residualSd);
  next.pc1_gov = clampMc(next.pc1_gov + gaussianRandom() * c.gov.residualSd);
  next.pc1_composite = (next.pc1_scale + next.pc1_hier + next.pc1_gov) / 3;
  return next;
}

function runMonteCarlo(
  start: CenturyState,
  centuries: number
): ConfidenceBand[] {
  const samples: number[][] = Array.from({ length: centuries + 1 }, () => []);

  for (let s = 0; s < MONTE_CARLO_SAMPLES; s++) {
    let state = { ...start };
    samples[0].push(state.pc1_composite);
    for (let c = 1; c <= centuries; c++) {
      state = stepForwardWithNoise(state);
      samples[c].push(state.pc1_composite);
    }
  }

  return samples.map((centurySamples, i) => {
    centurySamples.sort((a, b) => a - b);
    return {
      century: start.century + i * 100,
      p5: percentile(centurySamples, 5),
      p25: percentile(centurySamples, 25),
      p50: percentile(centurySamples, 50),
      p75: percentile(centurySamples, 75),
      p95: percentile(centurySamples, 95),
    };
  });
}

function clampMc(x: number): number {
  return Math.max(-MC_STATE_CLAMP, Math.min(MC_STATE_CLAMP, x));
}

/** Compute a percentile from a sorted array. */
function percentile(sorted: number[], p: number): number {
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

/** Box-Muller transform for Gaussian random numbers. */
function gaussianRandom(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
