/**
 * baz.ch.gov.ua — the trap.
 *
 * There is no API. The SPA catch-all answers /api/announcements with HTTP 200
 * and text/html, so a naive response.json() dies on the first character.
 *
 * The real data is in the SSR page:
 *   GET /announcements     → JSON-LD ItemList + visible <article class="announcement">
 *   GET /announcements/:id → HTML detail
 */
import { Hono } from "hono";
import { ANNOUNCEMENTS } from "../shared/data.js";
import { escapeHtml, page } from "../shared/html.js";

export const app = new Hono();

app.get("/", (c) =>
  c.text(
    [
      "baz.ch.gov.ua — mock open data portal",
      "",
      "GET /announcements",
      "GET /api/announcements  (this is not an API; it returns HTML with 200)",
    ].join("\n"),
  ),
);

/**
 * The guessed API. There is no API. This is the SPA catch-all.
 * HTTP 200, content-type: text/html, and a page that says "not found".
 */
app.get("/api/announcements", (c) =>
  c.html(
    page(
      "Сторінку не знайдено — baz.ch.gov.ua",
      `<h1>Сторінку не знайдено</h1>
<p>Можливо, ви мали на увазі <a href="/announcements">/announcements</a>.</p>
<p>Це не API. Це HTML-оболонка застосунку.</p>`,
    ),
  ),
);

app.get("/announcements", (c) => c.html(listPage()));

app.get("/announcements/:id", (c) => {
  const item = ANNOUNCEMENTS.find((announcement) => announcement.id === c.req.param("id"));
  if (!item) return c.html(page("Не знайдено", "<h1>404</h1>"), 404);
  return c.html(
    page(
      `${item.title} — baz.ch.gov.ua`,
      `<article class="announcement-detail">
  <h1>${escapeHtml(item.title)}</h1>
  <time datetime="${item.date}">${escapeHtml(item.date)}</time>
  <p>${escapeHtml(item.body)}</p>
  <p>Адреса: ${escapeHtml(item.address)}</p>
</article>
<p><a href="/announcements">Назад</a></p>`,
    ),
  );
});

function jsonLd() {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: ANNOUNCEMENTS.map((item) => ({
      "@type": "NewsArticle",
      headline: item.title,
      datePublished: item.date,
      description: item.summary,
      url: `/announcements/${item.id}`,
    })),
  });
}

function listPage() {
  const items = ANNOUNCEMENTS.map(
    (item) => `<article class="announcement">
  <h2><a href="/announcements/${item.id}">${escapeHtml(item.title)}</a></h2>
  <time datetime="${item.date}">${escapeHtml(item.date)}</time>
  <p>${escapeHtml(item.summary)}</p>
</article>`,
  ).join("\n");

  return page(
    "Оголошення — baz.ch.gov.ua",
    `<h1>Оголошення</h1>
<script type="application/ld+json">${jsonLd()}</script>
<main>
${items}
</main>`,
  );
}

if (import.meta.main) {
  Bun.serve({ port: 4103, fetch: app.fetch });
  console.log("baz.ch.gov.ua → http://127.0.0.1:4103");
}
