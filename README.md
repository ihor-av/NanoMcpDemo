# NanoMCP — a small, honest city MCP

> The MCP server is not the hard part.
> The hard part is that every tool is a bet on somebody else's unversioned output.

This is a teaching project for developers who are about to work on the real
Chernivtsi City MCP. It is deliberately tiny: **no database, no cache, no auth,
no CSS, no deployment**.

Three mock government sites, four MCP tools, one Bun process.

---

## What MCP is, in five lines

MCP is JSON-RPC between an AI client and a server.

The client asks `tools/list`; the model picks a tool; the client sends
`tools/call`; your code runs and returns text or JSON. That is the whole idea.

This project uses the official MCP server SDK for the protocol and Hono for the
HTTP server. Bun runs the JavaScript directly; there is no build step.

---

## Run it

```bash
bun install
bun run dev
```

```text
foo.ch.gov.ua   http://127.0.0.1:4101   JSON API
bar.ch.gov.ua   http://127.0.0.1:4102   SSR HTML
baz.ch.gov.ua   http://127.0.0.1:4103   guessed API + JSON-LD + HTML
MCP             http://127.0.0.1:8787/mcp
```

All three sites serve the same six announcements. The announcements are
fictional. The street addresses are real Chernivtsi addresses.

---

## Connect a real AI client

There is no project MCP config to maintain. Add the running server once:

```bash
pi mcp add nanomcp --url http://127.0.0.1:8787/mcp --exposure direct
pi mcp list
```

```text
nanomcp: connected, 4 tools (direct, global)
  http://127.0.0.1:8787/mcp
  tools: foo_announcements, bar_announcements, baz_announcements,
         all_announcements
```

Ask the model to use it:

```bash
pi -p --model opencode-go/deepseek-v4.1-flash \
  "Call mcp__nanomcp__foo_announcements, mcp__nanomcp__bar_announcements, \
   mcp__nanomcp__baz_announcements, and mcp__nanomcp__all_announcements. \
   Reply with the count and access mode of each."
```

Observed:

```text
- foo: 6, json-api
- bar: 6, html
- baz: 6, json-ld (the API guess returned HTML)
- all: 6 total, 3/3 sources OK
```

Remove it when you are done:

```bash
pi mcp remove nanomcp
```

---

## The sites and the tools

| Site | Routes | The bet |
|---|---|---|
| `foo.ch.gov.ua` | `GET /api/announcements` | The JSON shape `{ items: [...] }` stays the same. |
| `bar.ch.gov.ua` | `GET /announcements` | The HTML keeps `<article class="announcement">`. |
| `baz.ch.gov.ua` | `GET /announcements` | There is a guessed API; JSON-LD and HTML are stable. |

| Tool | Reads | Failure |
|---|---|---|
| `foo_announcements` | foo JSON | Throws if `items` is missing. |
| `bar_announcements` | bar HTML | Throws if it parses 0 items. |
| `baz_announcements` | guessed API → JSON-LD → HTML | Returns the first layer that works, with a warning. |
| `all_announcements` | all three | `Promise.allSettled`: one failure does not hide the others. |

---

## The two code styles

**The agent guesses an API (`foo`):**

```js
const data = await fetchJson(`${FOO_URL}/api/announcements`);
return data.items.map((item) => ({ ... }));
```

That is a bet. The guard in `mcp/clients.js` makes the bet visible:

```js
if (!isRecord(data) || !Array.isArray(data.items)) {
  throw new UpstreamError(
    `foo: expected { items: [...] } but got ${actual}. The JSON API changed shape.`,
  );
}
```

**The agent scrapes SSR HTML (`bar`):**

```js
const blocks = [...html.matchAll(/<article class="announcement">([\s\S]*?)<\/article>/g)];

if (blocks.length === 0) {
  throw new UpstreamError("bar: parsed 0 announcements; the markup changed.");
}
```

Without the guard, the tool returns `items: []` and the model tells the user
"there are no announcements." That is worse than an error, because it looks like
a valid answer.

**The agent guessed an API that does not exist (`baz`):**

`GET /api/announcements` returns **HTTP 200 and `text/html`**. The client checks
the content type first, then falls back to JSON-LD, then to visible HTML.

---

## Break it with git branches

An upstream change is a new version of the site, not a runtime switch. Each
branch is one commit on top of `main` that simulates a real change.

| Branch | What changed | Expected result |
|---|---|---|
| `main` | nothing | all four tools work |
| `break-foo-api` | foo returns `{ data: [...] }` | foo fails; bar and baz work |
| `break-bar-html` | bar uses `<div class="news-card">` | bar fails; foo and baz work |
| `break-baz-jsonld` | baz JSON-LD becomes `CollectionPage` | baz falls back to HTML with a warning |
| `break-all` | all of the above, plus baz's HTML | all four sources fail; 0 items |

```bash
git switch break-foo-api
# restart the server: Ctrl+C, then bun run dev
# run the pi prompt again

git diff main..break-foo-api     # see exactly what the upstream changed
git switch main
```

What you should see:

```text
break-foo-api:      foo_announcements → ERROR; all_announcements → foo FAIL
break-bar-html:     bar_announcements → ERROR; all_announcements → bar FAIL
break-baz-jsonld:   baz_announcements → 6 via html + warning
break-all:          all_announcements → 0 items, all three sources FAIL
```

Each failure message says what changed. That is the difference between "the
city has no announcements" and "we could not read the city's page."

---

## Tests

```bash
bun test
```

All eight tests pass. That is the point and the trap. The tests prove the
parsers match the fixtures. They do not prove the live sites still return those
fixtures. A fixture is a photograph, not a contract.

---

## Files

```text
NanoMcpDemo/
├── shared/
│   ├── data.js              one dataset, three delivery formats
│   └── html.js              escape/strip helpers, no libraries
├── foo.ch.gov.ua/index.js   JSON API
├── bar.ch.gov.ua/index.js   SSR HTML
├── baz.ch.gov.ua/index.js   guessed API + JSON-LD + HTML
├── mcp/
│   ├── index.js             Hono + createMcpHandler
│   ├── server.js            four tools
│   └── clients.js           fetch, parse, fallback, aggregate
├── scripts/dev.js           all four servers on four ports
└── test/parsers.test.js     fixtures for the parsers
```

---

## Exercises

1. Add `bar_announcement_get`. Scrape `/announcements/:id` for the body.
2. Make `foo` accept the `break-foo-api` shape and return `mode: "api-v2"`.
   Is that better or worse than failing? Argue both sides.
3. Add a local `snapshot.json` fallback when all sources fail. Return
   `mode: "snapshot"` and a warning.
4. Change a fixture to the broken markup. The test fails. Did the live site
   fail? What does that tell you about parser tests versus contract tests?

---

## The one sentence

**The MCP server is easy. The data contracts are hard, and nobody signed them.**
