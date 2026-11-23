/**
 * bar.ch.gov.ua — департамент із серверною HTML-версткою без API.
 *
 * GET /announcements     → HTML-список
 * GET /announcements/:id → HTML-сторінка оголошення
 *
 * Список використовує <article class="announcement">. Назва цього класу —
 * контракт, на який спирається скрапер, і це не справжній контракт.
 */
import { ANNOUNCEMENTS } from "../shared/data.js";
import { escapeHtml, page } from "../shared/html.js";

export function handleBarRequest(request) {
  const pathname = new URL(request.url).pathname;

  if (request.method === "GET" && pathname === "/") {
    return new Response(
      [
        "bar.ch.gov.ua — mock server-rendered site",
        "",
        "GET /announcements",
        "GET /announcements/1",
      ].join("\n"),
    );
  }

  if (request.method === "GET" && pathname === "/announcements") {
    return new Response(listPage(), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  const announcementMatch = pathname.match(/^\/announcements\/([^/]+)$/);
  if (request.method === "GET" && announcementMatch) {
    const announcementId = announcementMatch[1];
    const item = ANNOUNCEMENTS.find((announcement) => announcement.id === announcementId);

    if (!item) {
      return new Response(page("Не знайдено", "<h1>404</h1>"), {
        status: 404,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    return new Response(detailPage(item), {
      headers: { "content-type": "text/html; charset=utf-8" },
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
  Bun.serve({
    port: 4102,
    fetch: handleBarRequest,
  });
  console.log("bar.ch.gov.ua → http://127.0.0.1:4102");
}
