// Mercari US blocks all server-side requests via Cloudflare (HTTP 403).
// api.mercari.com does not resolve. api.mercari.jp requires OAuth.
// This stub logs the limitation so CI doesn't silently skip it.
// To enable: add a residential proxy (PROXY_URL env var) or a Mercari OAuth token.

export async function scrapeMercari(_keywords) {
  const proxyUrl = process.env.PROXY_URL;
  const token = process.env.MERCARI_TOKEN;

  if (!proxyUrl && !token) {
    console.warn("  Mercari: skipped — PROXY_URL or MERCARI_TOKEN not set. See scrapers/mercari.js.");
    return [];
  }

  // Placeholder for proxy-based implementation
  console.warn("  Mercari: proxy/token present but implementation not yet wired — returning []");
  return [];
}
