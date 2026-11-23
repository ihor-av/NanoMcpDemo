/**
 * Nunjucks перетворює HTML-шаблони на готові сторінки.
 *
 * Шаблони лежать у папці templates. Ми вимкнули кеш, щоб після зміни
 * шаблону достатньо було оновити сторінку в браузері.
 */
import nunjucks from "nunjucks";
import path from "node:path";

const templatesDirectory = path.join(import.meta.dir, "..", "templates");
const loader = new nunjucks.FileSystemLoader(templatesDirectory, { noCache: true });
const environment = new nunjucks.Environment(loader, { autoescape: true });

export function renderTemplate(name, data) {
  return environment.render(name, data);
}
