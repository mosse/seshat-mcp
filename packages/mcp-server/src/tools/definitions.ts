/**
 * MCP tool definitions for the Seshat server.
 *
 * Each tool's description is what Claude reads to decide when to use it,
 * so descriptions must be precise and include examples.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const toolDefinitions: Tool[] = [
  {
    name: 'search_polities',
    description:
      'Search for historical polities (societies, states, empires) in the Seshat Global History Databank. ' +
      'Returns basic info and date ranges. Use this to find polity IDs before calling other tools. ' +
      'Examples: search for "Roman", filter by region "Europe", or find polities active in year -500 (500 BCE).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description:
            'Name or partial name, e.g. "Roman", "Maya", "Han"',
        },
        region: {
          type: 'string',
          enum: [
            'Africa',
            'Americas',
            'Central Eurasia',
            'East Asia',
            'Europe',
            'Middle East and North Africa',
            'Oceania-Pacific',
            'South Asia',
            'Southeast Asia',
          ],
        },
        year: {
          type: 'number',
          description:
            'Filter to polities active in this year. BCE years are negative, e.g. -500 for 500 BCE.',
        },
        limit: { type: 'number', description: 'Max results (default: 10)' },
      },
    },
  },
  {
    name: 'get_polity_detail',
    description:
      'Get detailed information about a specific polity including its complexity scores over time, ' +
      'key variables, and full time range. Use a polity ID from search_polities.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        polity_id: {
          type: 'string',
          description: 'Seshat polity ID from search_polities',
        },
      },
      required: ['polity_id'],
    },
  },
  {
    name: 'get_variables',
    description:
      'Get specific variable values for a polity over time. ' +
      'Categories: social_complexity, warfare, religion, agriculture. ' +
      'You can request specific variables like ["Iron_weapons", "Cavalry"] or all variables in a category.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        polity_id: { type: 'string' },
        category: {
          type: 'string',
          enum: ['social_complexity', 'warfare', 'religion', 'agriculture'],
        },
        variable_codes: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Specific variable codes, e.g. ["Iron_weapons", "Cavalry", "Professional_soldiers"]',
        },
        year_from: { type: 'number' },
        year_to: { type: 'number' },
      },
      required: ['polity_id'],
    },
  },
  {
    name: 'get_complexity_timeline',
    description:
      'Get the social complexity score trajectory for a polity across centuries. ' +
      'Returns pc1_composite (single index explaining 77% of variance) and sub-components ' +
      '(scale, hierarchical, government). Useful for understanding a civilization\'s rise and fall.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        polity_id: { type: 'string' },
        century_from: {
          type: 'number',
          description: 'Start century, e.g. -500 for 6th century BCE',
        },
        century_to: {
          type: 'number',
          description: 'End century, e.g. 500 for 6th century CE',
        },
      },
      required: ['polity_id'],
    },
  },
  {
    name: 'compare_polities',
    description:
      'Compare two to five polities side-by-side across complexity scores and specific variables ' +
      'at a given time period. Useful for understanding relative development levels.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        polity_ids: {
          type: 'array',
          items: { type: 'string' },
          description: '2-5 polity IDs to compare',
        },
        variables: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional specific variables to compare',
        },
        year: {
          type: 'number',
          description: 'Year to compare at (BCE negative)',
        },
      },
      required: ['polity_ids'],
    },
  },
  {
    name: 'find_analogous_polities',
    description:
      'Find historical societies with similar characteristics to a given polity at a specific time. ' +
      'Critical for grounding counterfactual estimates in real historical patterns. ' +
      'Uses cosine similarity on normalised feature vectors.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        polity_id: { type: 'string' },
        year: {
          type: 'number',
          description: 'Year to match at (BCE negative)',
        },
        match_on: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Variables to match on, e.g. ["pc1_composite", "Iron_weapons", "agri_productivity"]',
        },
        limit: { type: 'number', description: 'Max results (default: 5)' },
      },
      required: ['polity_id', 'year'],
    },
  },
  {
    name: 'get_technology_diffusion',
    description:
      'Show how a specific technology (e.g. iron weapons, cavalry, writing) spread across regions over time. ' +
      'Returns polities with their first adoption year, sorted chronologically. ' +
      'Includes geographic spread rate (km/century). Useful for estimating realistic adoption timelines.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        variable_code: {
          type: 'string',
          description: 'e.g. "Iron_weapons", "Cavalry", "Writing"',
        },
        region: {
          type: 'string',
          description: 'Optional region filter',
        },
      },
      required: ['variable_code'],
    },
  },
  {
    name: 'run_counterfactual_estimate',
    description:
      'Core estimation tool. Given a polity, an injection year, and variable changes, projects ' +
      'the estimated complexity trajectory under counterfactual conditions using an illustrative ' +
      'approximation of the Turchin et al. (2022) dynamic regression model (coefficients are currently ' +
      'approximate placeholders, not the published fit — treat results as directional, not authoritative). ' +
      'Returns point estimates with confidence bands from 1000 Monte Carlo samples. ' +
      'Example: "What if the Maya had iron weapons in 300 CE?"',
    inputSchema: {
      type: 'object' as const,
      properties: {
        polity_id: { type: 'string' },
        injection_year: {
          type: 'number',
          description: 'Year to inject the change (BCE negative)',
        },
        changes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              variable_code: { type: 'string' },
              new_value: {
                type: 'string',
                description: '"present", "absent", or a numeric value',
              },
            },
            required: ['variable_code', 'new_value'],
          },
        },
        projection_centuries: {
          type: 'number',
          description: 'Centuries to project forward (default: 5)',
        },
      },
      required: ['polity_id', 'injection_year', 'changes'],
    },
  },
  {
    name: 'get_region_snapshot',
    description:
      'Get all polities active in a region during a specific century, with their complexity scores ' +
      'and key variables. Useful for understanding the geopolitical context around a civilization.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        region: {
          type: 'string',
          enum: [
            'Africa',
            'Americas',
            'Central Eurasia',
            'East Asia',
            'Europe',
            'Middle East and North Africa',
            'Oceania-Pacific',
            'South Asia',
            'Southeast Asia',
          ],
        },
        century: {
          type: 'number',
          description: 'Century, e.g. -500 for 6th century BCE',
        },
      },
      required: ['region', 'century'],
    },
  },
];
