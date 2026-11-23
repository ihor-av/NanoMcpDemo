/**
 * Bun.serve приймає HTTP-запити, а MCP SDK розуміє MCP-протокол.
 *
 * Це звичайний HTTP-маршрут: pi надсилає POST /mcp із повідомленнями
 * tools/list і tools/call. GET /health — окремий маршрут для перевірки.
 */
import { createMcpHandler } from "@modelcontextprotocol/server";
import { buildServer } from "./server.js";

// The SDK builds a fresh MCP server for each request: no shared tool state.
const mcpHandler = createMcpHandler(() => buildServer());

export function handleMcpRequest(request) {
  const pathname = new URL(request.url).pathname;

  if (request.method === "GET" && pathname === "/") {
    return new Response(
      [
        "NanoMCP demo",
        "",
        "MCP endpoint: POST /mcp",
        "Health: GET /health",
        "",
        "Tools: foo_announcements, bar_announcements, baz_announcements, all_announcements",
      ].join("\n"),
    );
  }

  if (request.method === "GET" && pathname === "/health") {
    return Response.json({ ok: true, mcp: "/mcp" });
  }

  // MCP tool discovery and tool calls arrive as HTTP POST requests.
  // GET and DELETE are also part of Streamable HTTP, so pass them to the SDK too.
  if (
    pathname === "/mcp" &&
    (request.method === "POST" || request.method === "GET" || request.method === "DELETE")
  ) {
    return mcpHandler.fetch(request);
  }

  if (pathname === "/mcp") {
    return new Response("Use POST for MCP messages.\n", {
      status: 405,
      headers: { allow: "GET, POST, DELETE" },
    });
  }

  return new Response("Not found.\n", { status: 404 });
}

if (import.meta.main) {
  Bun.serve({
    port: 8787,
    fetch: handleMcpRequest,
  });
  console.log("MCP → http://127.0.0.1:8787/mcp");
}
