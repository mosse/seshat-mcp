/**
 * Tests for the forward projection model.
 *
 * Verifies that the regression model produces reasonable outputs:
 * - Deterministic projections follow expected patterns
 * - Monte Carlo confidence bands widen over time
 * - Iron+cavalry injection increases complexity
 * - Empty baseline produces zero-ish trajectory
 */

import { describe, it, expect } from 'vitest';
import { projectForward, MODEL_COEFFICIENTS } from '../src/engine/model.js';
import type { CenturyState } from '@seshat/shared';

function makeBaseline(overrides?: Partial<CenturyState>): CenturyState {
  return {
    century: 0,
    pc1_composite: 0,
    pc1_scale: 0,
    pc1_hier: 0,
    pc1_gov: 0,
    iron_cav: 0,
    mil_tech_index: 0,
    agri_productivity: 0.5,
    agri_years_since: 500,
    ...overrides,
  };
}

describe('projectForward', () => {
  it('returns the correct number of projection points', () => {
    const { points } = projectForward(makeBaseline(), 5);
    expect(points).toHaveLength(6); // 0 + 5 centuries
  });

  it('returns the correct number of confidence bands', () => {
    const { bands } = projectForward(makeBaseline(), 5);
    expect(bands).toHaveLength(6);
  });

  it('first point matches the baseline state', () => {
    const baseline = makeBaseline({ pc1_composite: 1.5 });
    const { points } = projectForward(baseline, 3);
    expect(points[0].pc1_composite).toBe(1.5);
    expect(points[0].century).toBe(0);
  });

  it('centuries increment by 100', () => {
    const { points } = projectForward(makeBaseline({ century: -500 }), 3);
    expect(points.map((p) => p.century)).toEqual([-500, -400, -300, -200]);
  });

  it('iron+cavalry injection increases complexity over baseline', () => {
    const baseline = makeBaseline({ pc1_composite: 0.5, iron_cav: 0 });

    const withoutInjection = projectForward(baseline, 5);
    const withInjection = projectForward(baseline, 5, { iron_cav: 2 });

    const lastWithout =
      withoutInjection.points[withoutInjection.points.length - 1];
    const lastWith =
      withInjection.points[withInjection.points.length - 1];

    expect(lastWith.pc1_composite).toBeGreaterThan(lastWithout.pc1_composite);
  });

  it('higher mil_tech increases complexity', () => {
    const baseline = makeBaseline({ pc1_composite: 0.5 });

    const low = projectForward(baseline, 3, { mil_tech_index: 0.1 });
    const high = projectForward(baseline, 3, { mil_tech_index: 0.9 });

    const lastLow = low.points[low.points.length - 1];
    const lastHigh = high.points[high.points.length - 1];

    expect(lastHigh.pc1_composite).toBeGreaterThan(lastLow.pc1_composite);
  });

  it('confidence bands widen over time', () => {
    const { bands } = projectForward(makeBaseline(), 5);

    const firstBandWidth = bands[1].p95 - bands[1].p5;
    const lastBandWidth = bands[5].p95 - bands[5].p5;

    expect(lastBandWidth).toBeGreaterThan(firstBandWidth);
  });

  it('p50 is between p25 and p75', () => {
    const { bands } = projectForward(makeBaseline(), 3);
    for (const band of bands) {
      expect(band.p50).toBeGreaterThanOrEqual(band.p25);
      expect(band.p50).toBeLessThanOrEqual(band.p75);
    }
  });

  it('band percentiles are ordered p5 <= p25 <= p50 <= p75 <= p95', () => {
    const { bands } = projectForward(makeBaseline(), 3);
    for (const band of bands) {
      expect(band.p5).toBeLessThanOrEqual(band.p25);
      expect(band.p25).toBeLessThanOrEqual(band.p50);
      expect(band.p50).toBeLessThanOrEqual(band.p75);
      expect(band.p75).toBeLessThanOrEqual(band.p95);
    }
  });

  it('zero baseline with no predictors stays near zero', () => {
    const baseline = makeBaseline({
      pc1_composite: 0,
      iron_cav: 0,
      mil_tech_index: 0,
      agri_productivity: 0,
      agri_years_since: 0,
    });
    const { points } = projectForward(baseline, 3);

    // With only the intercept, should stay small
    for (const point of points) {
      expect(Math.abs(point.pc1_composite)).toBeLessThan(3);
    }
  });

  it('autoregressive term preserves high baseline', () => {
    const baseline = makeBaseline({ pc1_composite: 3.0 });
    const { points } = projectForward(baseline, 2);

    // With β1=0.85, a high baseline should remain relatively high
    expect(points[1].pc1_composite).toBeGreaterThan(2.0);
  });
});

describe('MODEL_COEFFICIENTS', () => {
  it('autoregressive coefficient is between 0 and 1', () => {
    expect(MODEL_COEFFICIENTS.pc1_lag).toBeGreaterThan(0);
    expect(MODEL_COEFFICIENTS.pc1_lag).toBeLessThan(1);
  });

  it('iron_cav coefficient is positive', () => {
    expect(MODEL_COEFFICIENTS.iron_cav).toBeGreaterThan(0);
  });

  it('residual_sd is positive', () => {
    expect(MODEL_COEFFICIENTS.residual_sd).toBeGreaterThan(0);
  });
});
