/**
 * bar.ch.gov.ua — департамент із серверною HTML-версткою без API.
 *
 * GET /                 → та сама HTML-сторінка зі списком
 * GET /announcements     → HTML-список
 * GET /announcements/:id → HTML-сторінка оголошення
 *
 * Список використовує <article class="announcement">. Назва цього класу —
 * контракт, на який спирається скрапер, і це не справжній контракт.
 */
import { ANNOUNCEMENTS } from "../shared/data.js";
import { renderTemplate } from "../shared/templates.js";

const HTML_HEADERS = { "content-type": "text/html; charset=utf-8" };

export function handleBarRequest(request) {
  const pathname = new URL(request.url).pathname;

  if (request.method === "GET" && pathname === "/") {
    const html = renderTemplate("bar/announcements.njk", {
      announcements: ANNOUNCEMENTS,
    });
    return new Response(html, { headers: HTML_HEADERS });
  }

  if (request.method === "GET" && pathname === "/announcements") {
    // Шаблон отримує дані й повертає готову HTML-сторінку.
    const html = renderTemplate("bar/announcements.njk", {
      announcements: ANNOUNCEMENTS,
    });
    return new Response(html, { headers: HTML_HEADERS });
  }

  const announcementMatch = pathname.match(/^\/announcements\/([^/]+)$/);
  if (request.method === "GET" && announcementMatch) {
    const announcementId = announcementMatch[1];
    const item = ANNOUNCEMENTS.find((announcement) => announcement.id === announcementId);

    if (!item) {
      return new Response(renderTemplate("bar/not-found.njk"), {
        status: 404,
        headers: HTML_HEADERS,
      });
    }

    return new Response(renderTemplate("bar/announcement.njk", { item }), {
      headers: HTML_HEADERS,
    });
  }

  if (request.method !== "GET") {
    return new Response("This site only accepts GET requests.\n", {
      status: 405,
      headers: { allow: "GET" },
    });
  }

  return new Response("Not found.\n", { status: 404 });
}

if (import.meta.main) {
  Bun.serve({
    port: 4102,
    fetch: handleBarRequest,
  });
  console.log("bar.ch.gov.ua → http://127.0.0.1:4102");
}
