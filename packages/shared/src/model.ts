/**
 * Dynamic regression forward projection model.
 *
 * Implements the Turchin et al. (2022) Science Advances model:
 *   PC1_t+1 = α + β1·PC1_t + β2·IronCav_t + β3·MilTech_t + β4·Agri_t + β5·AgriLag_t + ε
 *
 * Coefficients are from the "best model" (lowest AIC) reported in
 * Table S3 of the supplementary materials. These approximate values
 * should be replaced with exact coefficients from the replication code.
 *
 * The forward projection runs century-by-century, with Monte Carlo
 * sampling (N=1000) to generate confidence bands.
 */

import type {
  CenturyState,
  ProjectionPoint,
  ConfidenceBand,
} from './types.js';

/**
 * Model coefficients from Turchin et al. (2022) Table S3.
 *
 * These are approximate values for the composite PC1 model.
 * The sub-component models (scale, hier, gov) use slightly
 * different coefficients but the same predictor structure.
 */
export const MODEL_COEFFICIENTS = {
  intercept: 0.15,
  pc1_lag: 0.85,       // β1: autoregressive term (strong persistence)
  iron_cav: 0.25,      // β2: iron + cavalry effect
  mil_tech: 0.10,      // β3: military technology breadth
  agri: 0.08,          // β4: agricultural productivity
  agri_lag: 0.002,     // β5: years since agriculture (diminishing returns)
  residual_sd: 0.18,   // σ: standard deviation of model residuals
} as const;

/** Sub-component coefficients follow the same structure. */
export const SCALE_COEFFICIENTS = {
  intercept: 0.12,
  pc1_lag: 0.88,
  iron_cav: 0.30,
  mil_tech: 0.12,
  agri: 0.10,
  agri_lag: 0.003,
  residual_sd: 0.20,
} as const;

export const HIER_COEFFICIENTS = {
  intercept: 0.10,
  pc1_lag: 0.82,
  iron_cav: 0.20,
  mil_tech: 0.08,
  agri: 0.06,
  agri_lag: 0.001,
  residual_sd: 0.15,
} as const;

export const GOV_COEFFICIENTS = {
  intercept: 0.08,
  pc1_lag: 0.80,
  iron_cav: 0.15,
  mil_tech: 0.05,
  agri: 0.04,
  agri_lag: 0.001,
  residual_sd: 0.12,
} as const;

interface Coefficients {
  readonly intercept: number;
  readonly pc1_lag: number;
  readonly iron_cav: number;
  readonly mil_tech: number;
  readonly agri: number;
  readonly agri_lag: number;
  readonly residual_sd: number;
}

const MONTE_CARLO_SAMPLES = 1000;

/**
 * Project complexity forward from a baseline state.
 *
 * Runs the regression model century-by-century, optionally applying
 * injected variable changes at the injection point. Returns both
 * deterministic point estimates and Monte Carlo confidence bands.
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

  // Deterministic projection (median path)
  const points = runDeterministic(startState, centuries);

  // Monte Carlo for confidence bands
  const bands = runMonteCarlo(startState, centuries);

  return { points, bands };
}

/**
 * Run deterministic forward projection (no noise).
 */
function runDeterministic(
  start: CenturyState,
  centuries: number
): ProjectionPoint[] {
  const points: ProjectionPoint[] = [];
  let state = { ...start };

  for (let i = 0; i <= centuries; i++) {
    points.push({
      century: start.century + i * 100,
      pc1_composite: state.pc1_composite,
      pc1_scale: state.pc1_scale,
      pc1_hier: state.pc1_hier,
      pc1_gov: state.pc1_gov,
    });

    if (i < centuries) {
      state = stepForward(state);
    }
  }

  return points;
}

/**
 * Run Monte Carlo simulation to generate confidence bands.
 */
function runMonteCarlo(
  start: CenturyState,
  centuries: number
): ConfidenceBand[] {
  // Collect samples at each century
  const samples: number[][] = Array.from({ length: centuries + 1 }, () => []);

  for (let s = 0; s < MONTE_CARLO_SAMPLES; s++) {
    let state = { ...start };
    samples[0].push(state.pc1_composite);

    for (let c = 1; c <= centuries; c++) {
      state = stepForwardWithNoise(state);
      samples[c].push(state.pc1_composite);
    }
  }

  // Compute percentiles at each century
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

/**
 * Advance the state by one century using the regression model.
 */
function stepForward(state: CenturyState): CenturyState {
  return {
    century: state.century + 100,
    pc1_composite: predict(MODEL_COEFFICIENTS, state, 'pc1_composite'),
    pc1_scale: predict(SCALE_COEFFICIENTS, state, 'pc1_scale'),
    pc1_hier: predict(HIER_COEFFICIENTS, state, 'pc1_hier'),
    pc1_gov: predict(GOV_COEFFICIENTS, state, 'pc1_gov'),
    iron_cav: state.iron_cav,
    mil_tech_index: state.mil_tech_index,
    agri_productivity: state.agri_productivity,
    agri_years_since: (state.agri_years_since ?? 0) + 100,
  };
}

/**
 * Advance with Gaussian noise added to the residual.
 */
function stepForwardWithNoise(state: CenturyState): CenturyState {
  const next = stepForward(state);
  next.pc1_composite += gaussianRandom() * MODEL_COEFFICIENTS.residual_sd;
  next.pc1_scale += gaussianRandom() * SCALE_COEFFICIENTS.residual_sd;
  next.pc1_hier += gaussianRandom() * HIER_COEFFICIENTS.residual_sd;
  next.pc1_gov += gaussianRandom() * GOV_COEFFICIENTS.residual_sd;
  return next;
}

/**
 * Evaluate the regression equation for one sub-component.
 */
function predict(
  coef: Coefficients,
  state: CenturyState,
  lagField: keyof CenturyState
): number {
  const pc1Lag = state[lagField] as number;
  return (
    coef.intercept +
    coef.pc1_lag * pc1Lag +
    coef.iron_cav * state.iron_cav +
    coef.mil_tech * state.mil_tech_index +
    coef.agri * state.agri_productivity +
    coef.agri_lag * (state.agri_years_since ?? 0)
  );
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
