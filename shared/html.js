/**
 * Tiny HTML helpers. No libraries.
 *
 * The mock sites escape what they render.
 * The scraper strips tags and decodes the five entities it is likely to meet.
 * That is enough for a demo, and it is exactly the kind of code an agent writes
 * when it cannot add a DOM parser.
 */

export function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function decodeEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function stripTags(value) {
  return decodeEntities(value.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

export function page(title, body) {
  return `<!doctype html>
<html lang="uk">
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body>
${body}
</body>
</html>`;
}
