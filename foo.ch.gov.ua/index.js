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
import { page } from "../shared/html.js";

// Цей код виконується в браузері, а не на сервері Bun.
// Саме рядок fetch("/api/announcements") розкриває адресу внутрішнього API.
const BROWSER_SCRIPT = `
async function loadAnnouncements() {
  const response = await fetch("/api/announcements");
  const data = await response.json();
  const list = document.querySelector("#announcements");
  list.textContent = "";

  for (const announcement of data.items) {
    const item = document.createElement("li");
    item.textContent = announcement.date + " — " + announcement.title;
    list.append(item);
  }
}

loadAnnouncements().catch(() => {
  document.querySelector("#announcements").textContent = "Не вдалося завантажити оголошення.";
});
`;

export function handleFooRequest(request) {
  const pathname = new URL(request.url).pathname;

  if (request.method === "GET" && pathname === "/") {
    return new Response(
      page(
        "Оголошення — foo.ch.gov.ua",
        `<h1>Оголошення</h1>
<ul id="announcements">Завантаження…</ul>
<script src="/assets/app.js"></script>`,
      ),
      { headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }

  if (request.method === "GET" && pathname === "/assets/app.js") {
    return new Response(BROWSER_SCRIPT, {
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
