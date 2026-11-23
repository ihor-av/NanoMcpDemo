/**
 * Start all four servers in one Bun process.
 *
 * Run: bun run dev
 * Stop: Ctrl+C
 */
import { app as foo } from "../foo.ch.gov.ua/index.js";
import { app as bar } from "../bar.ch.gov.ua/index.js";
import { app as baz } from "../baz.ch.gov.ua/index.js";
import { app as mcp } from "../mcp/index.js";

const servers = [
  Bun.serve({ port: 4101, fetch: foo.fetch }),
  Bun.serve({ port: 4102, fetch: bar.fetch }),
  Bun.serve({ port: 4103, fetch: baz.fetch }),
  Bun.serve({ port: 8787, fetch: mcp.fetch }),
];

console.log(`
NanoMCP demo:

  foo.ch.gov.ua   http://127.0.0.1:4101   JSON API
  bar.ch.gov.ua   http://127.0.0.1:4102   SSR HTML
  baz.ch.gov.ua   http://127.0.0.1:4103   guessed API + JSON-LD + HTML
  MCP             http://127.0.0.1:8787/mcp

Ctrl+C stops all four.
`);

process.on("SIGINT", () => {
  for (const server of servers) server.stop();
  process.exit(0);
});
