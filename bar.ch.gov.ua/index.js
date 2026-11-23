/**
 * bar.ch.gov.ua — a department with a server-rendered site and no API.
 *
 * GET /announcements     → HTML list
 * GET /announcements/:id → HTML detail
 *
 * The list uses <article class="announcement">. That class name is the
 * contract the scraper depends on, and it is not a real contract.
 */
import { Hono } from "hono";
import { ANNOUNCEMENTS } from "../shared/data.js";
import { escapeHtml, page } from "../shared/html.js";

export const app = new Hono();

app.get("/", (c) =>
  c.text(
    [
      "bar.ch.gov.ua — mock SSR site",
      "",
      "GET /announcements",
      "GET /announcements/1",
    ].join("\n"),
  ),
);

app.get("/announcements", (c) => c.html(listPage()));

app.get("/announcements/:id", (c) => {
  const item = ANNOUNCEMENTS.find((announcement) => announcement.id === c.req.param("id"));
  if (!item) return c.html(page("Не знайдено", "<h1>404</h1>"), 404);
  return c.html(detailPage(item));
});

function listPage() {
  const items = ANNOUNCEMENTS.map(
    (item) => `<article class="announcement">
  <h2><a href="/announcements/${item.id}">${escapeHtml(item.title)}</a></h2>
  <time datetime="${item.date}">${escapeHtml(item.date)}</time>
  <p>${escapeHtml(item.summary)}</p>
</article>`,
  ).join("\n");

  return page(
    "Оголошення — bar.ch.gov.ua",
    `<h1>Оголошення</h1>
<main>
${items}
</main>`,
  );
}

function detailPage(item) {
  return page(
    `${item.title} — bar.ch.gov.ua`,
    `<article class="announcement-detail">
  <h1>${escapeHtml(item.title)}</h1>
  <time datetime="${item.date}">${escapeHtml(item.date)}</time>
  <p>${escapeHtml(item.body)}</p>
  <p>Адреса: ${escapeHtml(item.address)}</p>
</article>
<p><a href="/announcements">Назад</a></p>`,
  );
}

if (import.meta.main) {
  Bun.serve({ port: 4102, fetch: app.fetch });
  console.log("bar.ch.gov.ua → http://127.0.0.1:4102");
}
