/**
 * Tests for the precondition checker.
 */

import { describe, it, expect } from 'vitest';
import { checkPreconditions } from '../src/engine/preconditions.js';
import type { Region } from '@seshat/shared';

function makeContext(overrides?: {
  region?: Region;
  injectionYear?: number;
  existingVariables?: string[];
}) {
  return {
    polityId: 'test_polity',
    region: (overrides?.region ?? 'Europe') as Region,
    injectionYear: overrides?.injectionYear ?? 0,
    existingVariables: new Set(overrides?.existingVariables ?? []),
  };
}

describe('checkPreconditions', () => {
  it('returns plausible for simple iron injection in Europe', () => {
    const result = checkPreconditions(
      [{ variable_code: 'Iron_weapons', new_value: 'present' }],
      makeContext({ region: 'Europe' })
    );
    expect(result.plausible).toBe(true);
  });

  it('warns about iron scarcity in Oceania-Pacific', () => {
    const result = checkPreconditions(
      [{ variable_code: 'Iron_weapons', new_value: 'present' }],
      makeContext({ region: 'Oceania-Pacific' })
    );
    expect(result.warnings.some((w) => w.includes('Iron ore'))).toBe(true);
  });

  it('flags firearms before 1200 CE as anachronistic', () => {
    const result = checkPreconditions(
      [{ variable_code: 'Handheld_firearm', new_value: 'present' }],
      makeContext({ injectionYear: -500 })
    );
    expect(result.warnings.some((w) => w.includes('anachronistic'))).toBe(
      true
    );
    expect(result.adjusted_year).not.toBeNull();
  });

  it('does not flag firearms after 1200 CE', () => {
    const result = checkPreconditions(
      [{ variable_code: 'Handheld_firearm', new_value: 'present' }],
      makeContext({ injectionYear: 1400 })
    );
    expect(result.warnings.some((w) => w.includes('anachronistic'))).toBe(
      false
    );
  });

  it('warns about cavalry without horses', () => {
    const result = checkPreconditions(
      [{ variable_code: 'Cavalry', new_value: 'present' }],
      makeContext({ region: 'Americas', existingVariables: [] })
    );
    expect(result.warnings.some((w) => w.includes('Horses'))).toBe(true);
  });

  it('does not warn about cavalry when horses exist', () => {
    const result = checkPreconditions(
      [{ variable_code: 'Cavalry', new_value: 'present' }],
      makeContext({ existingVariables: ['Horse'] })
    );
    expect(result.warnings.some((w) => w.includes('Horse'))).toBe(false);
  });

  it('warns about missing prerequisites for plate armor', () => {
    const result = checkPreconditions(
      [{ variable_code: 'Plate_armor', new_value: 'present' }],
      makeContext({ existingVariables: [] })
    );
    expect(
      result.warnings.some((w) => w.includes('Iron_weapons'))
    ).toBe(true);
  });

  it('does not warn when prerequisites are in the injection', () => {
    const result = checkPreconditions(
      [
        { variable_code: 'Plate_armor', new_value: 'present' },
        { variable_code: 'Iron_weapons', new_value: 'present' },
      ],
      makeContext({ existingVariables: [] })
    );
    expect(
      result.warnings.some(
        (w) => w.includes('Iron_weapons') && w.includes('prerequisites')
      )
    ).toBe(false);
  });

  it('adds Americas model caveat', () => {
    const result = checkPreconditions(
      [{ variable_code: 'Writing', new_value: 'present' }],
      makeContext({ region: 'Americas' })
    );
    expect(
      result.warnings.some((w) => w.includes('Eurasian data'))
    ).toBe(true);
  });

  it('adds Oceania-Pacific model caveat', () => {
    const result = checkPreconditions(
      [{ variable_code: 'Writing', new_value: 'present' }],
      makeContext({ region: 'Oceania-Pacific' })
    );
    expect(
      result.warnings.some((w) => w.includes('higher uncertainty'))
    ).toBe(true);
  });

  it('does not add model caveat for Eurasian regions', () => {
    const result = checkPreconditions(
      [{ variable_code: 'Writing', new_value: 'present' }],
      makeContext({ region: 'East Asia' })
    );
    expect(
      result.warnings.some((w) => w.includes('Eurasian data'))
    ).toBe(false);
  });
});
