/**
 * foo.ch.gov.ua — сайт із недокументованим внутрішнім JSON API.
 *
 * На головній сторінці адреси API немає. Однак браузерний JavaScript
 * використовує її, тому адресу можна побачити в інструментах розробника.
 *
 * GET /                    → сторінка, яку бачить звичайний користувач
 * GET /assets/app.js       → JavaScript цієї сторінки
 * GET /api/announcements   → { items: [...] }
 * GET /announcements/:id   → одне оголошення
 */
import { ANNOUNCEMENTS } from "../shared/data.js";
import { renderTemplate } from "../shared/templates.js";

const HTML_HEADERS = { "content-type": "text/html; charset=utf-8" };

export function handleFooRequest(request) {
  const pathname = new URL(request.url).pathname;

  if (request.method === "GET" && pathname === "/") {
    return new Response(renderTemplate("foo/index.njk"), { headers: HTML_HEADERS });
  }

  // The browser loads this separate file. It is where the internal API is revealed.
  if (request.method === "GET" && pathname === "/assets/app.js") {
    return new Response(Bun.file(new URL("./app.js", import.meta.url)), {
      headers: { "content-type": "text/javascript; charset=utf-8" },
    });
  }

  if (request.method === "GET" && pathname === "/api/announcements") {
    const items = ANNOUNCEMENTS.map((item) => ({
      id: item.id,
      title: item.title,
      date: item.date,
      url: `/announcements/${item.id}`,
    }));

    // Так ми кажемо клієнту: ця відповідь містить JSON.
    return Response.json({ items });
  }

  // Шлях /announcements/1 дає нам announcementId = "1".
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
    return new Response("Цей сайт приймає лише GET-запити.\n", {
      status: 405,
      headers: { allow: "GET" },
    });
  }

  return new Response("Сторінку не знайдено.\n", { status: 404 });
}

// Цей блок працює лише під час прямого запуску файла, а не під час імпорту з dev.js.
if (import.meta.main) {
  Bun.serve({
    port: 4101,
    fetch: handleFooRequest,
  });
  console.log("foo.ch.gov.ua → http://127.0.0.1:4101");
}
