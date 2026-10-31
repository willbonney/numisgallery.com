// Same rules as WololoWeb.Plugs.BlockBots. "bot" also matches "robot" (AhrefsSiteAudit).
const blockedPattern =
  /bot|spider|crawl|slurp|scrap|archiver|ahrefs|petal|semrush|mj12|bytespider|gptbot|claude|anthropic|ccbot|dataforseo|wget|python-requests|aiohttp|scrapy|go-http-client|libwww|httpclient|okhttp|headlesschrome|phantomjs|selenium|curl\//i;

const allowedPattern = /sentryuptimebot/i;

export function isBlockedUserAgent(userAgent) {
  if (!userAgent) return false;
  return blockedPattern.test(userAgent) && !allowedPattern.test(userAgent);
}

export function blockedResponse(request) {
  const url = new URL(request.url);
  if (url.pathname === "/robots.txt") return null;

  const userAgent = request.headers.get("user-agent") || "";
  if (!isBlockedUserAgent(userAgent)) return null;

  return new Response("Forbidden", {
    status: 403,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export async function onRequest(context) {
  const blocked = blockedResponse(context.request);
  if (blocked) return blocked;
  return context.next();
}
