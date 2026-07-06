/**
 * Tests for the forward projection model (Turchin et al. 2022 recurrence).
 *
 * Three layers:
 * 1. Structural: projection shape, band ordering, injection direction.
 * 2. Coefficient equality: the in-code constants must equal the audited
 *    values in docs/MODEL_AUDIT.md §3–§5 (guards against silent edits).
 * 3. Cross-implementation: the TS engine must reproduce reference
 *    trajectories generated independently in Python from the same spec
 *    (tests/fixtures/turchin_reference_trajectory.json).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { projectForward, TURCHIN_2022 } from '../src/engine/model.js';
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

describe('projectForward — structure', () => {
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
    const baseline = makeBaseline({
      pc1_scale: 0.5,
      pc1_hier: 0.5,
      pc1_gov: 0.5,
      iron_cav: 0,
    });

    const withoutInjection = projectForward(baseline, 5);
    const withInjection = projectForward(baseline, 5, { iron_cav: 2 });

    const lastWithout =
      withoutInjection.points[withoutInjection.points.length - 1];
    const lastWith = withInjection.points[withInjection.points.length - 1];

    expect(lastWith.pc1_composite).toBeGreaterThan(lastWithout.pc1_composite);
  });

  it('higher mil_tech increases complexity', () => {
    const baseline = makeBaseline({
      pc1_scale: 0.5,
      pc1_hier: 0.5,
      pc1_gov: 0.5,
    });

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

  it('sample-mean state with mean predictors stays bounded', () => {
    // Predictors at (approximately) their sample means → z ≈ 0 → dynamics
    // dominated by the autoregression + saturation. Trajectory must not blow up.
    const s = TURCHIN_2022.standardization;
    const baseline = makeBaseline({
      agri_productivity: s.agri.mean,
      agri_years_since: s.agriLagYears.mean,
      mil_tech_index: s.milTech.mean / s.milTech.maxRaw,
      iron_cav: 1, // closest integer to the ironCav mean (0.61)
    });
    const { points } = projectForward(baseline, 5);
    for (const point of points) {
      expect(Math.abs(point.pc1_composite)).toBeLessThan(2);
    }
  });

  it('quadratic saturation pulls very high complexity back down', () => {
    // Distinctive property of the published model (absent from the old
    // linear engine): the negative X² term caps runaway growth.
    const baseline = makeBaseline({
      pc1_scale: 3,
      pc1_hier: 3,
      pc1_gov: 3,
      pc1_composite: 3,
    });
    const { points } = projectForward(baseline, 1);
    expect(points[1].pc1_composite).toBeLessThan(3);
    expect(points[1].pc1_composite).toBeGreaterThan(1.5); // …but stays high
  });
});

describe('TURCHIN_2022 — coefficient equality with docs/MODEL_AUDIT.md', () => {
  it('Scale coefficients match the audited values', () => {
    const c = TURCHIN_2022.coefficients.scale;
    expect(c.lag).toBe(1.20789);
    expect(c.lagSq).toBe(-0.355695);
    expect(c.agri).toBe(0.030962);
    expect(c.agriLag).toBe(0.0383049);
    expect(c.milTech).toBe(0);
    expect(c.ironCav).toBe(0.0930742);
    expect(c.residualSd).toBe(0.288106);
  });

  it('Hier coefficients match the audited values', () => {
    const c = TURCHIN_2022.coefficients.hier;
    expect(c.lag).toBe(1.03122);
    expect(c.lagSq).toBe(-0.222218);
    expect(c.agri).toBe(0.032604);
    expect(c.agriLag).toBe(0.0415172);
    expect(c.milTech).toBe(0.0586117);
    expect(c.ironCav).toBe(0.0441969);
    expect(c.residualSd).toBe(0.335424);
  });

  it('Gov coefficients match the audited values', () => {
    const c = TURCHIN_2022.coefficients.gov;
    expect(c.lag).toBe(1.02589);
    expect(c.lagSq).toBe(-0.248156);
    expect(c.agri).toBe(0.0499141);
    expect(c.agriLag).toBe(0);
    expect(c.milTech).toBe(0.0685953);
    expect(c.ironCav).toBe(0.0874432);
    expect(c.residualSd).toBe(0.352592);
  });

  it('sq maps match the audited values and the mean-zero constraint (C ≈ −A)', () => {
    const m = TURCHIN_2022.sqMaps;
    expect(m.scale).toEqual({ A: 0.157112, B: 0.960746, C: -0.156952 });
    expect(m.hier).toEqual({ A: 0.231611, B: 0.774601, C: -0.231375 });
    expect(m.gov).toEqual({ A: 0.376006, B: 0.689379, C: -0.375623 });
    for (const map of [m.scale, m.hier, m.gov]) {
      expect(Math.abs(map.C + map.A)).toBeLessThan(0.001);
    }
  });
});

describe('cross-implementation: TS engine vs Python reference trajectory', () => {
  interface FixtureCase {
    name: string;
    start: CenturyState;
    centuries: number;
    points: Array<{
      century: number;
      pc1_composite: number;
      pc1_scale: number;
      pc1_hier: number;
      pc1_gov: number;
    }>;
  }

  const fixturePath = fileURLToPath(
    new URL('./fixtures/turchin_reference_trajectory.json', import.meta.url)
  );
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf-8')) as {
    cases: FixtureCase[];
  };

  it('fixture contains the expected cases', () => {
    expect(fixture.cases.map((c) => c.name)).toEqual([
      'baseline',
      'ironcav_injection',
      'at_sample_mean',
    ]);
  });

  for (const testCase of fixture.cases) {
    it(`reproduces the '${testCase.name}' reference to <1e-9`, () => {
      const { points } = projectForward(
        testCase.start,
        testCase.centuries
      );
      expect(points).toHaveLength(testCase.points.length);
      for (let i = 0; i < points.length; i++) {
        const ref = testCase.points[i];
        expect(points[i].century).toBe(ref.century);
        expect(Math.abs(points[i].pc1_scale - ref.pc1_scale)).toBeLessThan(1e-9);
        expect(Math.abs(points[i].pc1_hier - ref.pc1_hier)).toBeLessThan(1e-9);
        expect(Math.abs(points[i].pc1_gov - ref.pc1_gov)).toBeLessThan(1e-9);
        expect(
          Math.abs(points[i].pc1_composite - ref.pc1_composite)
        ).toBeLessThan(1e-9);
      }
    });
  }
});
