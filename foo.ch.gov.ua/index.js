/**
 * foo.ch.gov.ua — a department with a JSON API.
 *
 * GET /api/announcements  → { items: [...] }
 * GET /announcements/:id  → one item
 */
import { Hono } from "hono";
import { ANNOUNCEMENTS } from "../shared/data.js";

export const app = new Hono();

app.get("/", (c) =>
  c.text(
    [
      "foo.ch.gov.ua — mock JSON API",
      "",
      "GET /api/announcements",
      "GET /announcements/1",
    ].join("\n"),
  ),
);

app.get("/api/announcements", (c) =>
  c.json({
    items: ANNOUNCEMENTS.map((item) => ({
      id: item.id,
      title: item.title,
      date: item.date,
      url: `/announcements/${item.id}`,
    })),
  }),
);

app.get("/announcements/:id", (c) => {
  const item = ANNOUNCEMENTS.find((announcement) => announcement.id === c.req.param("id"));
  if (!item) return c.json({ error: "not found" }, 404);
  return c.json({ ...item, url: `/announcements/${item.id}` });
});

if (import.meta.main) {
  Bun.serve({ port: 4101, fetch: app.fetch });
  console.log("foo.ch.gov.ua → http://127.0.0.1:4101");
}
