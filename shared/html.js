/**
 * Крихітні HTML-хелпери для скрапера. Без бібліотек.
 *
 * Мок-сайти екранують те, що рендерять.
 * Скрапер видаляє теги й декодує п'ять сутностей, які найімовірніше зустріне.
 * Для демо цього достатньо, і це саме той код, який пише агент,
 * коли не може додати DOM-парсер.
 */

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
