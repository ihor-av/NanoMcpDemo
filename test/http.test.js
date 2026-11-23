import { describe, expect, it } from "bun:test";
import { handleFooRequest } from "../foo.ch.gov.ua/index.js";
import { handleBarRequest } from "../bar.ch.gov.ua/index.js";
import { handleBazRequest } from "../baz.ch.gov.ua/index.js";
import { handleMcpRequest } from "../mcp/index.js";

// Call the same request handlers that Bun.serve uses. No network is needed.
describe("plain Bun HTTP handlers", () => {
  it("foo answers a GET request with JSON", async () => {
    const request = new Request("http://foo.test/api/announcements");
    const response = await handleFooRequest(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(data.items).toHaveLength(6);
  });

  it("foo lets the browser discover its internal API through JavaScript", async () => {
    const pageResponse = await handleFooRequest(new Request("http://foo.test/"));
    const html = await pageResponse.text();

    expect(pageResponse.headers.get("content-type")).toContain("text/html");
    expect(html).toContain('/assets/app.js');
    expect(html).not.toContain('/api/announcements');

    const scriptResponse = await handleFooRequest(new Request("http://foo.test/assets/app.js"));
    const script = await scriptResponse.text();

    expect(scriptResponse.headers.get("content-type")).toContain("text/javascript");
    expect(script).toContain('fetch("/api/announcements")');
  });

  it("foo answers a POST request with 405 Method Not Allowed", async () => {
    const request = new Request("http://foo.test/api/announcements", { method: "POST" });
    const response = await handleFooRequest(request);

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET");
  });

  it("bar answers a GET request with HTML", async () => {
    const request = new Request("http://bar.test/announcements");
    const response = await handleBarRequest(request);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(html).toContain('<article class="announcement">');
  });

  it("bar returns a real 404 for a missing announcement", async () => {
    const request = new Request("http://bar.test/announcements/999");
    const response = await handleBarRequest(request);

    expect(response.status).toBe(404);
  });

  it("baz pretends that its guessed API succeeded, but returns HTML", async () => {
    const request = new Request("http://baz.test/api/announcements");
    const response = await handleBazRequest(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
  });

  it("the MCP server still has an ordinary GET health route", async () => {
    const request = new Request("http://mcp.test/health");
    const response = await handleMcpRequest(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, mcp: "/mcp" });
  });
});
