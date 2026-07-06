/**
 * Tests for schema-driven input validation.
 *
 * validateArgs derives its rules from the tool definitions' inputSchema,
 * so these tests also pin the schema constraints (required fields, enums,
 * array bounds) that LLM callers rely on for friendly error messages.
 */

import { describe, it, expect } from 'vitest';
import { validateArgs } from '../src/tools/validation.js';

describe('validateArgs', () => {
  it('accepts valid search_polities args', () => {
    expect(() =>
      validateArgs('search_polities', {
        query: 'Roman',
        region: 'Europe',
        year: -500,
        limit: 10,
      })
    ).not.toThrow();
  });

  it('accepts empty args when nothing is required', () => {
    expect(() => validateArgs('search_polities', {})).not.toThrow();
  });

  it('rejects a missing required field', () => {
    expect(() => validateArgs('get_polity_detail', {})).toThrow(
      /polity_id is required/
    );
  });

  it('rejects a wrong primitive type', () => {
    expect(() =>
      validateArgs('search_polities', { year: '500 BCE' })
    ).toThrow(/year must be a number/);
  });

  it('rejects an enum violation and lists the options', () => {
    expect(() =>
      validateArgs('search_polities', { region: 'Atlantis' })
    ).toThrow(/region must be one of: .*Europe/);
  });

  it('enforces compare_polities 2-5 bounds', () => {
    expect(() =>
      validateArgs('compare_polities', { polity_ids: ['only_one'] })
    ).toThrow(/at least 2 items/);
    expect(() =>
      validateArgs('compare_polities', {
        polity_ids: ['a', 'b', 'c', 'd', 'e', 'f'],
      })
    ).toThrow(/at most 5 items/);
    expect(() =>
      validateArgs('compare_polities', { polity_ids: ['a', 'b'] })
    ).not.toThrow();
  });

  it('validates nested array item objects', () => {
    expect(() =>
      validateArgs('run_counterfactual_estimate', {
        polity_id: 'mx_classic_maya',
        injection_year: 300,
        changes: [{ variable_code: 'Iron_weapons' }], // missing new_value
      })
    ).toThrow(/changes\[0\]\.new_value is required/);
  });

  it('enforces numeric bounds on projection_centuries', () => {
    expect(() =>
      validateArgs('run_counterfactual_estimate', {
        polity_id: 'x',
        injection_year: 0,
        changes: [{ variable_code: 'Iron_weapons', new_value: 'present' }],
        projection_centuries: 50,
      })
    ).toThrow(/projection_centuries must be <= 20/);
  });

  it('rejects an empty changes array', () => {
    expect(() =>
      validateArgs('run_counterfactual_estimate', {
        polity_id: 'x',
        injection_year: 0,
        changes: [],
      })
    ).toThrow(/changes must have at least 1 items/);
  });

  it('reports multiple violations in one error', () => {
    try {
      validateArgs('run_counterfactual_estimate', {});
      expect.unreachable('should have thrown');
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toMatch(/polity_id is required/);
      expect(msg).toMatch(/injection_year is required/);
      expect(msg).toMatch(/changes is required/);
    }
  });

  it('ignores unknown tools (dispatcher reports those)', () => {
    expect(() => validateArgs('not_a_tool', { anything: 1 })).not.toThrow();
  });
});
