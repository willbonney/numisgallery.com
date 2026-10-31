import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { blockedResponse, onRequest } from "../functions/_block-bots.mjs";

const ahrefs = "Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)";
const ahrefsAudit =
  "Mozilla/5.0 (compatible; AhrefsSiteAudit/6.1; +http://ahrefs.com/robot/site-audit)";
const petal =
  "Mozilla/5.0 (Linux; Android 7.0;) AppleWebKit/537.36 (HTML, like Gecko) Mobile Safari/537.36 (compatible; PetalBot;+https://webmaster.petalsearch.com/site/petalbot)";
const google = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const claude =
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)";
const gpt =
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)";
const curl = "curl/8.11.0";
const browser = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:158.0) Gecko/20100101 Firefox/158.0";
const sentry = "SentryUptimeBot/1.0 (+http://docs.sentry.io/product/alerts/uptime-monitoring/)";

function request(path, userAgent) {
  const headers = new Headers();
  if (userAgent !== undefined) headers.set("user-agent", userAgent);
  return new Request(`https://numisgallery.com${path}`, { headers });
}

test("crawlers are forbidden on pages, the sitemap, and assets", async () => {
  for (const userAgent of [ahrefs, ahrefsAudit, petal, google, claude, gpt, curl]) {
    for (const path of ["/", "/community", "/sitemap.xml", "/logo.svg"]) {
      const response = blockedResponse(request(path, userAgent));
      assert.ok(response);
      assert.equal(response.status, 403);
      assert.equal(await response.text(), "Forbidden");
    }
  }
});

test("blocked crawlers can still read robots.txt", () => {
  assert.equal(blockedResponse(request("/robots.txt", google)), null);
  assert.equal(blockedResponse(request("/robots.txt?from=bot", google)), null);
});

test("browsers, Sentry uptime, and a missing user agent are allowed", () => {
  for (const userAgent of [browser, sentry, undefined]) {
    assert.equal(blockedResponse(request("/", userAgent)), null);
  }
});

test("middleware returns the block without calling next", async () => {
  let called = false;
  const response = await onRequest({
    request: request("/pricing", google),
    next() {
      called = true;
      return new Response("ok");
    },
  });

  assert.equal(called, false);
  assert.equal(response.status, 403);
});

test("middleware serves the site for a browser", async () => {
  const response = await onRequest({
    request: request("/", browser),
    next() {
      return new Response("ok", { status: 200 });
    },
  });

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "ok");
});

test("robots.txt disallows every crawler", () => {
  const body = readFileSync(new URL("../frontend/public/robots.txt", import.meta.url), "utf8");
  assert.match(body, /User-agent: \*\r?\nDisallow: \/\s*$/);
  assert.equal(body.includes("Allow:"), false);
  assert.equal(body.includes("Sitemap:"), false);
});

test("functions run on every path, including static files", () => {
  const routes = JSON.parse(
    readFileSync(new URL("../frontend/public/_routes.json", import.meta.url), "utf8"),
  );
  assert.deepEqual(routes, { version: 1, include: ["/*"], exclude: [] });
});
