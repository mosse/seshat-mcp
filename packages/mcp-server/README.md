# Seshat MCP Server

An open-source MCP (Model Context Protocol) server that exposes the [Seshat Global History Databank](https://seshat-db.com/) as queryable tools for Claude and other MCP-enabled AI assistants.

Point Claude at this server and ask questions like *"Which Eurasian societies had cavalry before 800 BCE?"* without writing any code.

## Quickstart

```bash
git clone https://github.com/mosse/seshat-mcp
cd seshat-mcp/packages/mcp-server
cp .env.example .env   # Add your Supabase credentials
pnpm install
pnpm dev
```

### Connect to Claude Desktop

Add this to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "seshat": {
      "command": "node",
      "args": ["/path/to/seshat-mcp/packages/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "your-supabase-url",
        "SUPABASE_SERVICE_KEY": "your-service-key"
      }
    }
  }
}
```

Or connect to the hosted endpoint (when available):

```json
{
  "mcpServers": {
    "seshat": {
      "url": "https://seshat-mcp.railway.app/sse"
    }
  }
}
```

## Tools

### `search_polities`

Search for historical polities by name, region, or active year.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | No | Name or partial name (e.g. "Roman", "Maya") |
| `region` | string | No | One of: Africa, Americas, Central Eurasia, East Asia, Europe, Middle East and North Africa, Oceania-Pacific, South Asia, Southeast Asia |
| `year` | number | No | Filter to polities active in this year (BCE = negative) |
| `limit` | number | No | Max results (default: 10) |

### `get_polity_detail`

Get detailed information about a specific polity including complexity scores and key variables.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `polity_id` | string | Yes | Seshat polity ID from `search_polities` |

### `get_variables`

Get specific variable values for a polity over time.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `polity_id` | string | Yes | Polity ID |
| `category` | string | No | social_complexity, warfare, religion, or agriculture |
| `variable_codes` | string[] | No | Specific variables (e.g. ["Iron_weapons", "Cavalry"]) |
| `year_from` | number | No | Start of time range |
| `year_to` | number | No | End of time range |

### `get_complexity_timeline`

Get the social complexity score trajectory across centuries. Returns the PC1 composite (explains 77% of variance) and sub-components.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `polity_id` | string | Yes | Polity ID |
| `century_from` | number | No | Start century (e.g. -500 for 6th century BCE) |
| `century_to` | number | No | End century |

### `compare_polities`

Compare 2–5 polities side-by-side at a given time period.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `polity_ids` | string[] | Yes | 2–5 polity IDs |
| `variables` | string[] | No | Specific variables to compare |
| `year` | number | No | Year to compare at (BCE = negative) |

### `find_analogous_polities`

Find historical societies with similar characteristics using cosine similarity on normalised feature vectors.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `polity_id` | string | Yes | Polity ID |
| `year` | number | Yes | Year to match at (BCE = negative) |
| `match_on` | string[] | No | Variables to match on (default: pc1_composite, mil_tech_index, agri_productivity) |
| `limit` | number | No | Max results (default: 5) |

### `get_technology_diffusion`

Track how a technology spread across regions over time.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `variable_code` | string | Yes | e.g. "Iron_weapons", "Cavalry", "Writing" |
| `region` | string | No | Region filter |

### `run_counterfactual_estimate`

Project estimated complexity under counterfactual conditions using the Turchin et al. (2022) dynamic regression model — published coefficients, recovered from the paper's replication deposit and independently validated (see `docs/MODEL_AUDIT.md`) — with Monte Carlo confidence bands. (Underlying historical input data is still illustrative — read results as directional.)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `polity_id` | string | Yes | Polity ID |
| `injection_year` | number | Yes | Year to inject the change (BCE = negative) |
| `changes` | object[] | Yes | Array of `{ variable_code, new_value }` |
| `projection_centuries` | number | No | Centuries to project (default: 5) |

### `get_region_snapshot`

Get all polities active in a region during a specific century with complexity scores.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `region` | string | Yes | Region name |
| `century` | number | Yes | Century (e.g. -500 for 6th century BCE) |

## Self-hosting

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY packages/mcp-server ./packages/mcp-server
COPY packages/shared ./packages/shared
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm --filter @seshat/shared build && pnpm --filter @seshat/mcp-server build
EXPOSE 3001
CMD ["node", "packages/mcp-server/dist/index.js"]
```

### Railway

1. Connect the repo to Railway
2. Set build command: `pnpm install && pnpm --filter @seshat/shared build && pnpm --filter @seshat/mcp-server build`
3. Set start command: `node packages/mcp-server/dist/index.js`
4. Add environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `PORT`

## Data provenance

- **Equinox-2020**: Seshat Global History Databank (Turchin et al., 2015). CC BY-NC-SA 4.0. [Zenodo](https://zenodo.org/record/6642229)
- **Cliopatria**: Seshat geospatial boundaries, CC BY 4.0. [GitHub](https://github.com/Seshat-Global-History-Databank/cliopatria)
- **Counterfactual model**: Turchin et al. (2022). *Disentangling the evolutionary drivers of social complexity*. Science Advances.

## License

MIT (server code). Underlying Seshat data is CC BY-NC-SA 4.0 — any use of the data must be non-commercial and attributed.
