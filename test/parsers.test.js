import { describe, expect, it } from "bun:test";
import { parseBar, parseBazHtml, parseBazJsonLd, parseFoo } from "../mcp/clients.js";

/**
 * These tests pass.
 *
 * That is the point and the trap. They prove the parser matches a fixture.
 * They do not prove the live site still returns that fixture.
 * A test is a photograph of an upstream, not a promise from it.
 */

const FOO_OK = {
  items: [{ id: "1", title: "Бюджет 2027", date: "2026-11-20", url: "/announcements/1" }],
};

const FOO_CHANGED = {
  data: [{ id: "1", name: "Бюджет 2027", published_at: "2026-11-20", link: "/announcements/1" }],
};

const BAR_OK = `<article class="announcement">
  <h2><a href="/announcements/1">Бюджет 2027</a></h2>
  <time datetime="2026-11-20">2026-11-20</time>
  <p>Проєкт бюджету.</p>
</article>`;

const BAR_CHANGED = `<div class="news-card">
  <h3 class="news-title"><a href="/announcements/1">Бюджет 2027</a></h3>
  <span class="news-date">2026-11-20</span>
  <p>Проєкт бюджету.</p>
</div>`;

const BAZ_JSONLD_OK = `<script type="application/ld+json">${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "ItemList",
  itemListElement: [
    {
      "@type": "NewsArticle",
      headline: "Бюджет 2027",
      datePublished: "2026-11-20",
      description: "Проєкт бюджету.",
      url: "/announcements/1",
    },
  ],
})}</script>`;

const BAZ_JSONLD_CHANGED = `<script type="application/ld+json">${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  mainEntity: {
    "@type": "ItemList",
    itemListElement: [
      {
        "@type": "Article",
        name: "Бюджет 2027",
        dateCreated: "2026-11-20",
        description: "Проєкт бюджету.",
        url: "/announcements/1",
      },
    ],
  },
})}</script>`;

describe("foo: JSON API", () => {
  it("parses the expected shape", () => {
    const items = parseFoo(FOO_OK);
    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe("Бюджет 2027");
  });

  it("fails loudly when the shape changes", () => {
    expect(() => parseFoo(FOO_CHANGED)).toThrow(/expected \{ items/);
  });
});

describe("bar: SSR HTML", () => {
  it("parses the expected markup", () => {
    const items = parseBar(BAR_OK, "http://127.0.0.1:4102");
    expect(items).toHaveLength(1);
    expect(items[0]?.date).toBe("2026-11-20");
  });

  it("fails loudly when the markup changes", () => {
    expect(() => parseBar(BAR_CHANGED, "http://127.0.0.1:4102")).toThrow(/parsed 0 announcements/);
  });
});

describe("baz: structured data and HTML", () => {
  it("parses the expected JSON-LD", () => {
    const items = parseBazJsonLd(BAZ_JSONLD_OK);
    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe("Бюджет 2027");
  });

  it("fails when the JSON-LD vocabulary changes", () => {
    expect(() => parseBazJsonLd(BAZ_JSONLD_CHANGED)).toThrow(/expected JSON-LD ItemList/);
  });

  it("parses the HTML fallback", () => {
    const items = parseBazHtml(BAR_OK, "http://127.0.0.1:4103");
    expect(items).toHaveLength(1);
  });

  it("fails when the HTML fallback changes too", () => {
    expect(() => parseBazHtml(BAR_CHANGED, "http://127.0.0.1:4103")).toThrow(
      /parsed 0 announcements/,
    );
  });
});
