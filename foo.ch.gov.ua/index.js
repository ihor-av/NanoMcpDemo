/**
 * foo.ch.gov.ua — департамент із JSON API.
 *
 * GET /api/announcements  → { items: [...] }
 * GET /announcements/:id  → одне оголошення
 *
 * Жодного веб-фреймворка: один Request входить, один Response виходить.
 */
import { ANNOUNCEMENTS } from "../shared/data.js";

export function handleFooRequest(request) {
  const pathname = new URL(request.url).pathname;

  if (request.method === "GET" && pathname === "/") {
    return new Response(
      [
        "foo.ch.gov.ua — mock JSON API",
        "",
        "GET /api/announcements",
        "GET /announcements/1",
      ].join("\n"),
    );
  }

  if (request.method === "GET" && pathname === "/api/announcements") {
    const items = ANNOUNCEMENTS.map((item) => ({
      id: item.id,
      title: item.title,
      date: item.date,
      url: `/announcements/${item.id}`,
    }));

    // Response.json sets Content-Type: application/json for us.
    return Response.json({ items });
  }

  // Turn a path such as /announcements/1 into announcementId = "1".
  const announcementMatch = pathname.match(/^\/announcements\/([^/]+)$/);
  if (request.method === "GET" && announcementMatch) {
    const announcementId = announcementMatch[1];
    const item = ANNOUNCEMENTS.find((announcement) => announcement.id === announcementId);

    if (!item) {
      return Response.json({ error: "not found" }, { status: 404 });
    }

    return Response.json({ ...item, url: `/announcements/${item.id}` });
  }

  if (request.method !== "GET") {
    return new Response("This site only accepts GET requests.\n", {
      status: 405,
      headers: { allow: "GET" },
    });
  }

  return new Response("Not found.\n", { status: 404 });
}

// This block runs for `bun foo.ch.gov.ua/index.js`, but not when dev.js imports this file.
if (import.meta.main) {
  Bun.serve({
    port: 4101,
    fetch: handleFooRequest,
  });
  console.log("foo.ch.gov.ua → http://127.0.0.1:4101");
}
