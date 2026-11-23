/**
 * Запустити всі чотири сервери в одному процесі Bun.
 *
 * Запуск: bun run dev
 * Зупинка: Ctrl+C
 */
import { handleFooRequest } from "../foo.ch.gov.ua/index.js";
import { handleBarRequest } from "../bar.ch.gov.ua/index.js";
import { handleBazRequest } from "../baz.ch.gov.ua/index.js";
import { handleMcpRequest } from "../mcp/index.js";

// Коли надходить HTTP-запит, Bun.serve викликає відповідну функцію.
// Кожна функція отримує запит і готує відповідь.
const servers = [
  Bun.serve({ port: 4101, fetch: handleFooRequest }),
  Bun.serve({ port: 4102, fetch: handleBarRequest }),
  Bun.serve({ port: 4103, fetch: handleBazRequest }),
  Bun.serve({ port: 8787, fetch: handleMcpRequest }),
];

console.log(`
NanoMCP demo:

  foo.ch.gov.ua   http://127.0.0.1:4101   browser page + internal JSON API
  bar.ch.gov.ua   http://127.0.0.1:4102   HTML pages (GET)
  baz.ch.gov.ua   http://127.0.0.1:4103   HTML + JSON-LD (GET)
  MCP             http://127.0.0.1:8787/mcp   MCP messages (POST)

Ctrl+C stops all four.
`);

process.on("SIGINT", () => {
  for (const server of servers) server.stop();
  process.exit(0);
});
