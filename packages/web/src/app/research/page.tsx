export default function ResearchPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="kicker mb-3">MCP server</p>
      <h1 className="mb-8 font-display text-4xl font-semibold tracking-tight text-parchment sm:text-5xl">
        For Researchers
      </h1>

      <div className="prose-echoes prose prose-lg max-w-none">
        <p>
          The Seshat MCP server exposes the Seshat Global History Databank as a
          suite of queryable tools compatible with Claude and other MCP-enabled
          AI assistants. Point Claude at the server and ask questions like
          &ldquo;Which Eurasian societies had cavalry before 800 BCE?&rdquo;
          without writing any code.
        </p>

        <h2>Quickstart</h2>
        <p>
          Clone the repository and run the MCP server locally:
        </p>
        <pre>
          <code>{`git clone https://github.com/your-org/seshat-mcp
cd seshat-mcp/packages/mcp-server
cp .env.example .env  # Add your Supabase credentials
pnpm install
pnpm dev`}</code>
        </pre>
        <p>
          Or connect to the hosted endpoint (when available):
        </p>
        <pre>
          <code>{`# In your Claude Desktop config:
{
  "mcpServers": {
    "seshat": {
      "url": "https://seshat-mcp.railway.app/sse"
    }
  }
}`}</code>
        </pre>

        <h2>Available tools</h2>
        <table>
          <thead>
            <tr>
              <th>Tool</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>search_polities</code></td>
              <td>Search societies by name, region, or active year</td>
            </tr>
            <tr>
              <td><code>get_polity_detail</code></td>
              <td>Full detail including complexity timeline</td>
            </tr>
            <tr>
              <td><code>get_variables</code></td>
              <td>Query specific variables for a polity over time</td>
            </tr>
            <tr>
              <td><code>get_complexity_timeline</code></td>
              <td>PC1 composite score trajectory across centuries</td>
            </tr>
            <tr>
              <td><code>compare_polities</code></td>
              <td>Side-by-side comparison of 2-5 societies</td>
            </tr>
            <tr>
              <td><code>find_analogous_polities</code></td>
              <td>Find similar societies via cosine similarity</td>
            </tr>
            <tr>
              <td><code>get_technology_diffusion</code></td>
              <td>Track how a technology spread across regions</td>
            </tr>
            <tr>
              <td><code>run_counterfactual_estimate</code></td>
              <td>Project counterfactual complexity with confidence bands</td>
            </tr>
            <tr>
              <td><code>get_region_snapshot</code></td>
              <td>All polities active in a region during a century</td>
            </tr>
          </tbody>
        </table>

        <h2>Example queries</h2>
        <p>Once connected, try asking Claude:</p>
        <ul>
          <li>&ldquo;Which societies in East Asia had iron weapons by 500 BCE?&rdquo;</li>
          <li>&ldquo;Compare the Roman Empire and Han Dynasty at 0 CE&rdquo;</li>
          <li>&ldquo;How did cavalry spread across Central Eurasia?&rdquo;</li>
          <li>&ldquo;What if the Inca had writing in 1400 CE?&rdquo;</li>
        </ul>

        <h2>Citation</h2>
        <p>
          If you use this tool in your research, please cite both the Seshat
          dataset and the Turchin et al. (2022) model:
        </p>
        <pre>
          <code>{`Turchin, P., et al. (2015). Seshat: The Global History Databank.
  Cliodynamics 6(1).

Turchin, P., et al. (2022). Disentangling the evolutionary
  drivers of social complexity. Science Advances.`}</code>
        </pre>

        <h2>License</h2>
        <p>
          The MCP server code is MIT licensed. The underlying Seshat data is CC
          BY-NC-SA 4.0. Cliopatria data is CC BY 4.0. Any use of the data must
          be non-commercial and properly attributed.
        </p>
      </div>
    </div>
  );
}
