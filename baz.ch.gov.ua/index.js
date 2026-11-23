/**
 * baz.ch.gov.ua — пастка.
 *
 * API немає. Ми свідомо повертаємо на /api/announcements HTTP 200 і text/html,
 * тому наївний response.json() падає на першому символі.
 *
 * Справжні дані — на серверно зрендереній сторінці:
 *   GET /announcements     → JSON-LD ItemList + видимий <article class="announcement">
 *   GET /announcements/:id → HTML-сторінка оголошення
 */
import { ANNOUNCEMENTS } from "../shared/data.js";
import { escapeHtml, page } from "../shared/html.js";

const HTML_HEADERS = { "content-type": "text/html; charset=utf-8" };

export function handleBazRequest(request) {
  const pathname = new URL(request.url).pathname;

  if (request.method === "GET" && pathname === "/") {
    return new Response(
      [
        "baz.ch.gov.ua — mock open data portal",
        "",
        "GET /announcements",
        "GET /api/announcements  (not an API: it returns HTML with HTTP 200)",
      ].join("\n"),
    );
  }

  /**
   * Вигаданий API. API немає. Це навмисно оформлена HTML-сторінка зі статусом 200.
   * Статус успіху не означає, що відповідь містить JSON.
   */
  if (request.method === "GET" && pathname === "/api/announcements") {
    return new Response(
      page(
        "Сторінку не знайдено — baz.ch.gov.ua",
        `<h1>Сторінку не знайдено</h1>
<p>Можливо, ви мали на увазі <a href="/announcements">/announcements</a>.</p>
<p>Це не API. Це HTML-оболонка застосунку.</p>`,
      ),
      { headers: HTML_HEADERS },
    );
  }

  if (request.method === "GET" && pathname === "/announcements") {
    return new Response(listPage(), { headers: HTML_HEADERS });
  }

  const announcementMatch = pathname.match(/^\/announcements\/([^/]+)$/);
  if (request.method === "GET" && announcementMatch) {
    const announcementId = announcementMatch[1];
    const item = ANNOUNCEMENTS.find((announcement) => announcement.id === announcementId);

    if (!item) {
      return new Response(page("Не знайдено", "<h1>404</h1>"), {
        status: 404,
        headers: HTML_HEADERS,
      });
    }

    return new Response(detailPage(item), { headers: HTML_HEADERS });
  }

  if (request.method !== "GET") {
    return new Response("This site only accepts GET requests.\n", {
      status: 405,
      headers: { allow: "GET" },
    });
  }

  return new Response("Not found.\n", { status: 404 });
}

function detailPage(item) {
  return page(
    `${item.title} — baz.ch.gov.ua`,
    `<article class="announcement-detail">
  <h1>${escapeHtml(item.title)}</h1>
  <time datetime="${item.date}">${escapeHtml(item.date)}</time>
  <p>${escapeHtml(item.body)}</p>
  <p>Адреса: ${escapeHtml(item.address)}</p>
</article>
<p><a href="/announcements">Назад</a></p>`,
  );
}

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
  Bun.serve({
    port: 4103,
    fetch: handleBazRequest,
  });
  console.log("baz.ch.gov.ua → http://127.0.0.1:4103");
}
