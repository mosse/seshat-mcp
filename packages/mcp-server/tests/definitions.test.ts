/**
 * Tests for MCP tool definitions — structural validation.
 *
 * Ensures every tool has the required fields and that the definitions
 * array is consistent with what the handler expects.
 */

import { describe, it, expect } from 'vitest';
import { toolDefinitions } from '../src/tools/definitions.js';

describe('toolDefinitions', () => {
  it('defines exactly 9 tools', () => {
    expect(toolDefinitions).toHaveLength(9);
  });

  it('every tool has a name, description, and inputSchema', () => {
    for (const tool of toolDefinitions) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('tool names are unique', () => {
    const names = toolDefinitions.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('descriptions are at least 40 characters', () => {
    for (const tool of toolDefinitions) {
      expect(tool.description.length).toBeGreaterThanOrEqual(40);
    }
  });

  const expectedTools = [
    'search_polities',
    'get_polity_detail',
    'get_variables',
    'get_complexity_timeline',
    'compare_polities',
    'find_analogous_polities',
    'get_technology_diffusion',
    'run_counterfactual_estimate',
    'get_region_snapshot',
  ];

  for (const toolName of expectedTools) {
    it(`includes the ${toolName} tool`, () => {
      expect(toolDefinitions.find((t) => t.name === toolName)).toBeDefined();
    });
  }

  it('run_counterfactual_estimate requires polity_id, injection_year, and changes', () => {
    const tool = toolDefinitions.find(
      (t) => t.name === 'run_counterfactual_estimate'
    );
    expect(tool!.inputSchema.required).toContain('polity_id');
    expect(tool!.inputSchema.required).toContain('injection_year');
    expect(tool!.inputSchema.required).toContain('changes');
  });

  it('search_polities has no required parameters', () => {
    const tool = toolDefinitions.find((t) => t.name === 'search_polities');
    expect(tool!.inputSchema.required ?? []).toHaveLength(0);
  });

  it('compare_polities requires polity_ids', () => {
    const tool = toolDefinitions.find((t) => t.name === 'compare_polities');
    expect(tool!.inputSchema.required).toContain('polity_ids');
  });
});
