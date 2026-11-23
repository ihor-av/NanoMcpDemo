/**
 * Чотири шляхи доступу в одному файлі.
 *
 * foo: внутрішнє JSON API, адресу якого розкриває браузерний JavaScript.
 * bar: серверний HTML.
 * baz: вигаданий API, потім JSON-LD, потім HTML.
 * all: усі три джерела зі звітом про помилки кожного.
 *
 * Кожен парсер перевіряє, що саме він отримав. Парсер не може гарантувати
 * контракт зовнішнього джерела; він може лише чесно зламатися, коли той зміниться.
 */
import { stripTags } from "../shared/html.js";

const FOO_URL = process.env.FOO_URL ?? "http://127.0.0.1:4101";
const BAR_URL = process.env.BAR_URL ?? "http://127.0.0.1:4102";
const BAZ_URL = process.env.BAZ_URL ?? "http://127.0.0.1:4103";

export class UpstreamError extends Error {
  constructor(message) {
    super(message);
    this.name = "UpstreamError";
  }
}

function isRecord(value) {
  return typeof value === "object" && value !== null;
}

export function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

async function fetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
  if (!response.ok) throw new UpstreamError(`${url} returned HTTP ${response.status}`);

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    // Класична невдача вигаданого API: HTTP 200, text/html.
    throw new UpstreamError(
      `${url} returned ${contentType || "an unknown content type"}, not JSON. ` +
        `An HTTP 200 does not mean the endpoint is an API.`,
    );
  }
  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
  if (!response.ok) throw new UpstreamError(`${url} returned HTTP ${response.status}`);
  return response.text();
}

// --- foo: внутрішнє JSON API ----------------------------------------------

export async function fooAnnouncements() {
  const data = await fetchJson(`${FOO_URL}/api/announcements`);
  return parseFoo(data);
}

export function parseFoo(data) {
  if (!isRecord(data) || !Array.isArray(data.items)) {
    const actual = isRecord(data) ? `{ ${Object.keys(data).join(", ")} }` : typeof data;
    throw new UpstreamError(
      `foo: expected { items: [...] } but got ${actual}. The JSON API changed shape.`,
    );
  }

  return data.items.map((item, index) => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      typeof item.title !== "string" ||
      typeof item.date !== "string"
    ) {
      throw new UpstreamError(`foo: item ${index} is missing id/title/date.`);
    }

    const path = typeof item.url === "string" ? item.url : `/announcements/${item.id}`;
    return {
      id: item.id,
      title: item.title,
      date: item.date,
      summary: "",
      body: "",
      address: "",
      url: new URL(path, FOO_URL).toString(),
    };
  });
}

// --- bar: серверний HTML ---------------------------------------------------

export async function barAnnouncements() {
  const html = await fetchText(`${BAR_URL}/announcements`);
  return parseBar(html, BAR_URL);
}

export function parseBar(html, baseUrl) {
  const blocks = [...html.matchAll(/<article class="announcement">([\s\S]*?)<\/article>/g)];

  if (blocks.length === 0) {
    throw new UpstreamError(
      "bar: parsed 0 announcements. The page returned HTTP 200, so nothing looks " +
        "broken — but the markup changed. This is the silent failure mode of scraping.",
    );
  }

  return blocks.map((block, index) => {
    const chunk = block[1] ?? "";
    const href = /<a href="([^"]+)"/.exec(chunk)?.[1];
    const title = stripTags(/<h2>([\s\S]*?)<\/h2>/.exec(chunk)?.[1] ?? "");
    const date = /<time datetime="([^"]+)"/.exec(chunk)?.[1];
    const summary = stripTags(/<p>([\s\S]*?)<\/p>/.exec(chunk)?.[1] ?? "");

    if (!href || !title || !date) {
      throw new UpstreamError(`bar: item ${index} is missing href/title/date.`);
    }

    return {
      id: href.split("/").pop() ?? String(index),
      title,
      date,
      summary,
      body: "",
      address: "",
      url: new URL(href, baseUrl).toString(),
    };
  });
}

// --- baz: вигаданий API → JSON-LD → HTML ----------------------------------

export async function bazAnnouncements() {
  const warnings = [];

  // 1. API, який вигадав агент.
  try {
    const data = await fetchJson(`${BAZ_URL}/api/announcements`);
    return { items: parseBazApi(data), mode: "api" };
  } catch (error) {
    warnings.push(`api: ${errorMessage(error)}`);
  }

  const html = await fetchText(`${BAZ_URL}/announcements`);

  // 2. JSON-LD, вбудований у сторінку.
  try {
    return {
      items: parseBazJsonLd(html),
      mode: "json-ld",
      warning: warnings.join(" | ") || undefined,
    };
  } catch (error) {
    warnings.push(`JSON-LD: ${errorMessage(error)}`);
  }

  // 3. Видимий HTML.
  try {
    return {
      items: parseBazHtml(html, BAZ_URL),
      mode: "html",
      warning: warnings.join(" | "),
    };
  } catch (error) {
    warnings.push(`HTML: ${errorMessage(error)}`);
    throw new UpstreamError(`baz: every access path failed.\n- ${warnings.join("\n- ")}`);
  }
}

export function parseBazApi(data) {
  if (!isRecord(data) || !Array.isArray(data.items)) {
    throw new UpstreamError("baz: guessed API did not return { items: [...] }.");
  }

  return data.items.map((item, index) => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      typeof item.title !== "string" ||
      typeof item.date !== "string"
    ) {
      throw new UpstreamError(`baz: API item ${index} is missing id/title/date.`);
    }
    return {
      id: item.id,
      title: item.title,
      date: item.date,
      summary: "",
      body: "",
      address: "",
      url: `${BAZ_URL}/announcements/${item.id}`,
    };
  });
}

export function parseBazJsonLd(html) {
  const script = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/i.exec(html)?.[1];
  if (!script) throw new UpstreamError("baz: no JSON-LD script found.");

  let data;
  try {
    data = JSON.parse(script);
  } catch {
    throw new UpstreamError("baz: JSON-LD is not valid JSON.");
  }

  if (!isRecord(data) || data["@type"] !== "ItemList" || !Array.isArray(data.itemListElement)) {
    const type = isRecord(data) ? String(data["@type"]) : typeof data;
    throw new UpstreamError(
      `baz: expected JSON-LD ItemList, got ${type}. Schema.org types are a contract too.`,
    );
  }

  return data.itemListElement.map((item, index) => {
    if (
      !isRecord(item) ||
      item["@type"] !== "NewsArticle" ||
      typeof item.headline !== "string" ||
      typeof item.datePublished !== "string"
    ) {
      throw new UpstreamError(`baz: JSON-LD item ${index} is not a NewsArticle.`);
    }

    const path = typeof item.url === "string" ? item.url : `/announcements/${index + 1}`;
    return {
      id: path.split("/").pop() ?? String(index),
      title: item.headline,
      date: item.datePublished,
      summary: typeof item.description === "string" ? item.description : "",
      body: "",
      address: "",
      url: new URL(path, BAZ_URL).toString(),
    };
  });
}

export function parseBazHtml(html, baseUrl) {
  const blocks = [...html.matchAll(/<article class="announcement">([\s\S]*?)<\/article>/g)];
  if (blocks.length === 0) {
    throw new UpstreamError("baz: parsed 0 announcements from the visible HTML.");
  }

  return blocks.map((block, index) => {
    const chunk = block[1] ?? "";
    const href = /<a href="([^"]+)"/.exec(chunk)?.[1];
    const title = stripTags(/<h2>([\s\S]*?)<\/h2>/.exec(chunk)?.[1] ?? "");
    const date = /<time datetime="([^"]+)"/.exec(chunk)?.[1];
    const summary = stripTags(/<p>([\s\S]*?)<\/p>/.exec(chunk)?.[1] ?? "");

    if (!href || !title || !date) {
      throw new UpstreamError(`baz: HTML item ${index} is missing href/title/date.`);
    }

    return {
      id: href.split("/").pop() ?? String(index),
      title,
      date,
      summary,
      body: "",
      address: "",
      url: new URL(href, baseUrl).toString(),
    };
  });
}

// --- all: часткова помилка — це нормально ----------------------------------

export async function allAnnouncements() {
  const [foo, bar, baz] = await Promise.allSettled([
    fooAnnouncements(),
    barAnnouncements(),
    bazAnnouncements(),
  ]);

  const sources = [];
  const items = [];

  if (foo.status === "fulfilled") {
    items.push(...foo.value);
    sources.push({ site: "foo.ch.gov.ua", ok: true, count: foo.value.length, mode: "json-api" });
  } else {
    sources.push({ site: "foo.ch.gov.ua", ok: false, count: 0, error: errorMessage(foo.reason) });
  }

  if (bar.status === "fulfilled") {
    items.push(...bar.value);
    sources.push({ site: "bar.ch.gov.ua", ok: true, count: bar.value.length, mode: "html" });
  } else {
    sources.push({ site: "bar.ch.gov.ua", ok: false, count: 0, error: errorMessage(bar.reason) });
  }

  if (baz.status === "fulfilled") {
    items.push(...baz.value.items);
    sources.push({
      site: "baz.ch.gov.ua",
      ok: true,
      count: baz.value.items.length,
      mode: baz.value.mode,
      warning: baz.value.warning,
    });
  } else {
    sources.push({ site: "baz.ch.gov.ua", ok: false, count: 0, error: errorMessage(baz.reason) });
  }

  const seen = new Set();
  const deduped = items.filter((item) => {
    const key = `${item.title.toLowerCase()}|${item.date}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { items: deduped, sources };
}
