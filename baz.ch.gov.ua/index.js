/**
 * baz.ch.gov.ua — пастка.
 *
 * Ця гілка імітує зміну словника JSON-LD. Видимий HTML не змінився,
 * тому запасний шлях через HTML досі працює.
 *
 * API немає. Ми свідомо повертаємо на /api/announcements HTTP 200 і text/html,
 * тому наївний response.json() падає на першому символі.
 *
 * Справжні дані — на серверно зрендереній сторінці:
 *   GET /                 → та сама HTML-сторінка зі списком
 *   GET /announcements     → JSON-LD + видимий <article class="announcement">
 *   GET /announcements/:id → HTML-сторінка оголошення
 */
import { ANNOUNCEMENTS } from "../shared/data.js";
import { renderTemplate } from "../shared/templates.js";

const HTML_HEADERS = { "content-type": "text/html; charset=utf-8" };

export function handleBazRequest(request) {
  const pathname = new URL(request.url).pathname;

  if (request.method === "GET" && pathname === "/") {
    const html = renderTemplate("baz/announcements.njk", {
      announcements: ANNOUNCEMENTS,
      jsonLd: jsonLd(),
    });
    return new Response(html, { headers: HTML_HEADERS });
  }

  /**
   * Вигаданий API. API немає. Це навмисно оформлена HTML-сторінка зі статусом 200.
   * Статус успіху не означає, що відповідь містить JSON.
   */
  if (request.method === "GET" && pathname === "/api/announcements") {
    return new Response(renderTemplate("baz/guessed-api.njk"), {
      headers: HTML_HEADERS,
    });
  }

  if (request.method === "GET" && pathname === "/announcements") {
    const html = renderTemplate("baz/announcements.njk", {
      announcements: ANNOUNCEMENTS,
      jsonLd: jsonLd(),
    });
    return new Response(html, { headers: HTML_HEADERS });
  }

  const announcementMatch = pathname.match(/^\/announcements\/([^/]+)$/);
  if (request.method === "GET" && announcementMatch) {
    const announcementId = announcementMatch[1];
    const item = ANNOUNCEMENTS.find((announcement) => announcement.id === announcementId);

    if (!item) {
      return new Response(renderTemplate("baz/not-found.njk"), {
        status: 404,
        headers: HTML_HEADERS,
      });
    }

    return new Response(renderTemplate("baz/announcement.njk", { item }), {
      headers: HTML_HEADERS,
    });
  }

  if (request.method !== "GET") {
    return new Response(
      renderTemplate("error.njk", {
        site: "baz.ch.gov.ua",
        status: 405,
        heading: "Метод не дозволено",
        message: "Цей сайт приймає лише GET-запити.",
      }),
      { status: 405, headers: { ...HTML_HEADERS, allow: "GET" } },
    );
  }

  return new Response(
    renderTemplate("error.njk", {
      site: "baz.ch.gov.ua",
      status: 404,
      heading: "Сторінку не знайдено",
      message: "Такої сторінки на сайті немає.",
    }),
    { status: 404, headers: HTML_HEADERS },
  );
}

function jsonLd() {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: ANNOUNCEMENTS.map((item) => ({
        "@type": "Article",
        name: item.title,
        dateCreated: item.date,
        description: item.summary,
        url: `/announcements/${item.id}`,
      })),
    },
  });
}

if (import.meta.main) {
  Bun.serve({
    port: 4103,
    fetch: handleBazRequest,
  });
  console.log("baz.ch.gov.ua → http://127.0.0.1:4103");
}
