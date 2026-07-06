/**
 * Seshat MCP Server — entry point.
 *
 * Exposes the Seshat Global History Databank as a suite of queryable
 * tools for Claude and other MCP-enabled AI assistants.
 *
 * Transport: stdio only — this is a local server, launched by an MCP
 * client (e.g. Claude Desktop) as a child process:
 *
 *   node dist/index.js
 *
 * A hosted/HTTP transport is a possible future addition (tracked in
 * IMPROVEMENT_PLAN.md, Phase 3) but is intentionally NOT implemented or
 * advertised today.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { toolDefinitions } from './tools/definitions.js';
import { handleToolCall } from './tools/handler.js';

const server = new Server(
  { name: 'seshat-mcp', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: toolDefinitions,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const result = await handleToolCall(name, args ?? {});
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Seshat MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
