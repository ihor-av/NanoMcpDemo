/**
 * The MCP surface. Four read-only tools.
 *
 * Each one is a different bet on somebody else's output:
 *   foo — a JSON API that can change shape
 *   bar — an SSR page that can change markup
 *   baz — a guessed API, then JSON-LD, then HTML
 *   all — all three, with per-source failure reports
 */
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import {
  allAnnouncements,
  barAnnouncements,
  bazAnnouncements,
  errorMessage,
  fooAnnouncements,
} from "./clients.js";

const readOnly = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

function ok(data) {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

function fail(error) {
  return {
    content: [{ type: "text", text: errorMessage(error) }],
    isError: true,
  };
}

export function buildServer() {
  const server = new McpServer({ name: "nanomcp", version: "0.1.0" });

  server.registerTool(
    "foo_announcements",
    {
      title: "foo.ch.gov.ua announcements (JSON API)",
      description:
        "Reads the mock city JSON API. It assumes { items: [...] }. If the shape changes, " +
        "this tool returns an explicit error instead of an empty list.",
      inputSchema: z.object({}),
      annotations: readOnly,
    },
    async () => {
      try {
        const items = await fooAnnouncements();
        return ok({ source: "foo.ch.gov.ua", access: "json-api", count: items.length, items });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "bar_announcements",
    {
      title: "bar.ch.gov.ua announcements (SSR HTML)",
      description:
        'Scrapes the mock press-service page. It assumes <article class="announcement">. ' +
        "If the markup changes, this tool returns an explicit parse error instead of pretending there are no announcements.",
      inputSchema: z.object({}),
      annotations: readOnly,
    },
    async () => {
      try {
        const items = await barAnnouncements();
        return ok({ source: "bar.ch.gov.ua", access: "html", count: items.length, items });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "baz_announcements",
    {
      title: "baz.ch.gov.ua announcements (guessed API, then JSON-LD, then HTML)",
      description:
        "Tries the guessed API, then JSON-LD, then visible HTML. The result says which " +
        "layer answered and what failed. Fallbacks help until every layer changes.",
      inputSchema: z.object({}),
      annotations: readOnly,
    },
    async () => {
      try {
        const result = await bazAnnouncements();
        return ok({
          source: "baz.ch.gov.ua",
          access: result.mode,
          count: result.items.length,
          warning: result.warning,
          items: result.items,
        });
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "all_announcements",
    {
      title: "All three sites at once",
      description:
        "Aggregates foo, bar, and baz. One broken source does not hide the others. " +
        "The result includes a per-source report, so the model can say which integration is down.",
      inputSchema: z.object({}),
      annotations: readOnly,
    },
    async () => {
      try {
        const result = await allAnnouncements();
        return ok({
          source: "all",
          count: result.items.length,
          sources: result.sources,
          items: result.items,
        });
      } catch (error) {
        return fail(error);
      }
    },
  );

  return server;
}
