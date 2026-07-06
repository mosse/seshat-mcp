/**
 * Input validation for MCP tool calls.
 *
 * Validates incoming arguments against each tool's own `inputSchema` from
 * definitions.ts — the schemas are the single source of truth, so
 * tightening a schema automatically tightens enforcement. Covers the
 * JSON-Schema subset the definitions use: object/string/number/array
 * types, enum, required, items, minItems/maxItems, minimum/maximum.
 *
 * On failure, throws an Error listing every problem (not just the first),
 * so an LLM caller can fix its arguments in one retry.
 */

import { toolDefinitions } from './definitions.js';

interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: readonly string[];
  enum?: readonly unknown[];
  items?: JsonSchema;
  minItems?: number;
  maxItems?: number;
  minimum?: number;
  maximum?: number;
  description?: string;
}

const schemaByTool = new Map<string, JsonSchema>(
  toolDefinitions.map((t) => [t.name, t.inputSchema as JsonSchema])
);

/**
 * Validate `args` against the named tool's input schema.
 * Unknown tool names are ignored here (the dispatcher reports those).
 * Throws an Error describing all violations if validation fails.
 */
export function validateArgs(
  toolName: string,
  args: Record<string, unknown>
): void {
  const schema = schemaByTool.get(toolName);
  if (!schema) return;

  const errors: string[] = [];
  checkValue(args, schema, '', errors);

  if (errors.length > 0) {
    throw new Error(
      `Invalid arguments for ${toolName}: ${errors.join('; ')}`
    );
  }
}

function checkValue(
  value: unknown,
  schema: JsonSchema,
  path: string,
  errors: string[]
): void {
  const label = path || 'arguments';

  if (schema.enum) {
    if (!schema.enum.includes(value)) {
      errors.push(
        `${label} must be one of: ${schema.enum.map(String).join(', ')}`
      );
    }
    return;
  }

  switch (schema.type) {
    case 'string': {
      if (typeof value !== 'string') {
        errors.push(`${label} must be a string`);
      }
      return;
    }
    case 'number': {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        errors.push(`${label} must be a number`);
        return;
      }
      if (schema.minimum !== undefined && value < schema.minimum) {
        errors.push(`${label} must be >= ${schema.minimum}`);
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        errors.push(`${label} must be <= ${schema.maximum}`);
      }
      return;
    }
    case 'array': {
      if (!Array.isArray(value)) {
        errors.push(`${label} must be an array`);
        return;
      }
      if (schema.minItems !== undefined && value.length < schema.minItems) {
        errors.push(`${label} must have at least ${schema.minItems} items`);
      }
      if (schema.maxItems !== undefined && value.length > schema.maxItems) {
        errors.push(`${label} must have at most ${schema.maxItems} items`);
      }
      if (schema.items) {
        value.forEach((item, i) =>
          checkValue(item, schema.items as JsonSchema, `${label}[${i}]`, errors)
        );
      }
      return;
    }
    case 'object': {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        errors.push(`${label} must be an object`);
        return;
      }
      const obj = value as Record<string, unknown>;
      for (const req of schema.required ?? []) {
        if (obj[req] === undefined || obj[req] === null) {
          errors.push(`${joinPath(path, req)} is required`);
        }
      }
      for (const [key, propSchema] of Object.entries(schema.properties ?? {})) {
        if (obj[key] !== undefined && obj[key] !== null) {
          checkValue(obj[key], propSchema, joinPath(path, key), errors);
        }
      }
      return;
    }
    default:
      // Untyped schema node: nothing to enforce.
      return;
  }
}

function joinPath(parent: string, key: string): string {
  return parent ? `${parent}.${key}` : key;
}
