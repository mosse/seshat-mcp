/**
 * Tests for the curated scenario catalogue.
 */

import { describe, it, expect } from 'vitest';
import { SCENARIOS, getScenarioById } from '../src/engine/scenarios.js';

describe('SCENARIOS', () => {
  it('contains at least 10 scenarios', () => {
    expect(SCENARIOS.length).toBeGreaterThanOrEqual(10);
  });

  it('every scenario has a unique id', () => {
    const ids = SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every scenario has at least one change', () => {
    for (const scenario of SCENARIOS) {
      expect(scenario.changes.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('every change has a variable_code and new_value', () => {
    for (const scenario of SCENARIOS) {
      for (const change of scenario.changes) {
        expect(change.variable_code).toBeTruthy();
        expect(change.new_value).toBeTruthy();
      }
    }
  });

  it('every scenario has a non-empty label and description', () => {
    for (const scenario of SCENARIOS) {
      expect(scenario.label.length).toBeGreaterThan(0);
      expect(scenario.description.length).toBeGreaterThan(0);
    }
  });

  it('every scenario has a real_world_example', () => {
    for (const scenario of SCENARIOS) {
      expect(scenario.real_world_example.length).toBeGreaterThan(20);
    }
  });

  it('expected_lag_centuries is a positive number', () => {
    for (const scenario of SCENARIOS) {
      expect(scenario.expected_lag_centuries).toBeGreaterThan(0);
    }
  });

  it('iron_cav_combined has both Iron_weapons and Cavalry', () => {
    const ironCav = getScenarioById('iron_cav_combined');
    expect(ironCav).toBeDefined();
    const codes = ironCav!.changes.map((c) => c.variable_code);
    expect(codes).toContain('Iron_weapons');
    expect(codes).toContain('Cavalry');
  });

  it('gunpowder scenario requires both Gunpowder and firearms', () => {
    const gp = getScenarioById('gunpowder');
    expect(gp).toBeDefined();
    const codes = gp!.changes.map((c) => c.variable_code);
    expect(codes).toContain('Gunpowder');
    expect(codes).toContain('Handheld_firearm');
  });
});

describe('getScenarioById', () => {
  it('returns a scenario for a valid id', () => {
    const scenario = getScenarioById('iron_weapons');
    expect(scenario).toBeDefined();
    expect(scenario!.id).toBe('iron_weapons');
  });

  it('returns undefined for an unknown id', () => {
    expect(getScenarioById('nonexistent')).toBeUndefined();
  });
});
