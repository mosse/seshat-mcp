/**
 * Re-export scenarios from the shared package.
 *
 * The canonical scenario catalogue lives in @seshat/shared so both
 * the MCP server and web app can import from the same source.
 */

export { SCENARIOS, getScenarioById } from '@seshat/shared';
