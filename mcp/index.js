/**
 * Hono serves the MCP endpoint. The MCP SDK handles the protocol.
 *
 * The factory runs once per request: no shared state between calls.
 */
import { Hono } from "hono";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { buildServer } from "./server.js";

const handler = createMcpHandler(() => buildServer());

const app = new Hono();

app.get("/", (c) =>
  c.text(
    [
      "NanoMCP demo",
      "",
      "MCP endpoint: /mcp",
      "Health: /health",
      "",
      "Tools: foo_announcements, bar_announcements, baz_announcements, all_announcements",
    ].join("\n"),
  ),
);

app.get("/health", (c) => c.json({ ok: true, mcp: "/mcp" }));

app.all("/mcp", (c) => handler.fetch(c.req.raw));

if (import.meta.main) {
  Bun.serve({ port: 8787, fetch: app.fetch });
  console.log("MCP → http://127.0.0.1:8787/mcp");
}

export { app };
