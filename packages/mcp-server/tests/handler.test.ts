/**
 * Tests for the tool call handler dispatch.
 *
 * Uses vi.mock to avoid importing the real Supabase client,
 * which requires environment variables at module load time.
 */

import { describe, it, expect, vi } from 'vitest';

// Mock the db module before importing handler
vi.mock('../src/db.js', () => ({
  supabase: {},
}));

// Mock queries to avoid real DB calls
vi.mock('../src/tools/queries.js', () => ({
  searchPolities: vi.fn(),
  getPolityDetail: vi.fn(),
  getVariables: vi.fn(),
  getComplexityTimeline: vi.fn(),
  comparePolities: vi.fn(),
  getRegionSnapshot: vi.fn(),
  getTechnologyDiffusion: vi.fn(),
  findAnalogousPolities: vi.fn(),
}));

// Mock the engine index
vi.mock('../src/engine/index.js', () => ({
  runCounterfactualEstimate: vi.fn(),
}));

const { handleToolCall } = await import('../src/tools/handler.js');

describe('handleToolCall', () => {
  it('throws for unknown tool names', async () => {
    await expect(handleToolCall('nonexistent_tool', {})).rejects.toThrow(
      'Unknown tool: nonexistent_tool'
    );
  });

  it('throws for empty tool name', async () => {
    await expect(handleToolCall('', {})).rejects.toThrow('Unknown tool: ');
  });

  it('dispatches search_polities to the correct handler', async () => {
    const { searchPolities } = await import('../src/tools/queries.js');
    const mockFn = vi.mocked(searchPolities);
    mockFn.mockResolvedValueOnce({ polities: [], total_count: 0 });

    const result = await handleToolCall('search_polities', { query: 'test' });
    expect(mockFn).toHaveBeenCalledWith({ query: 'test' });
    expect(result).toEqual({ polities: [], total_count: 0 });
  });

  it('dispatches run_counterfactual_estimate to the engine', async () => {
    const { runCounterfactualEstimate } = await import(
      '../src/engine/index.js'
    );
    const mockFn = vi.mocked(runCounterfactualEstimate);
    mockFn.mockResolvedValueOnce({
      baseline: [],
      counterfactual: [],
      confidence_bands: [],
      analogues: [],
      delta_complexity: 0.5,
      notes: [],
    });

    const args = {
      polity_id: 'test',
      injection_year: 0,
      changes: [{ variable_code: 'Iron_weapons', new_value: 'present' }],
    };
    const result = await handleToolCall('run_counterfactual_estimate', args);
    expect(mockFn).toHaveBeenCalledWith(args);
    expect(result).toHaveProperty('delta_complexity', 0.5);
  });
});
