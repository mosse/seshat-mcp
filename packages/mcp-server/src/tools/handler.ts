/**
 * Tool call dispatcher.
 *
 * Routes incoming MCP tool calls to the appropriate implementation.
 * Each tool function receives validated arguments and returns a
 * JSON-serializable result.
 */

import {
  searchPolities,
  getPolityDetail,
  getVariables,
  getComplexityTimeline,
  comparePolities,
  getRegionSnapshot,
  getTechnologyDiffusion,
  findAnalogousPolities,
} from './queries.js';
import { runCounterfactualEstimate } from '../engine/index.js';
import { validateArgs } from './validation.js';

type ToolArgs = Record<string, unknown>;

const handlers: Record<string, (args: ToolArgs) => Promise<unknown>> = {
  search_polities: searchPolities,
  get_polity_detail: getPolityDetail,
  get_variables: getVariables,
  get_complexity_timeline: getComplexityTimeline,
  compare_polities: comparePolities,
  find_analogous_polities: findAnalogousPolities,
  get_technology_diffusion: getTechnologyDiffusion,
  run_counterfactual_estimate: runCounterfactualEstimate,
  get_region_snapshot: getRegionSnapshot,
};

export async function handleToolCall(
  name: string,
  args: ToolArgs
): Promise<unknown> {
  const handler = handlers[name];
  if (!handler) {
    throw new Error(`Unknown tool: ${name}`);
  }
  validateArgs(name, args);
  return handler(args);
}
