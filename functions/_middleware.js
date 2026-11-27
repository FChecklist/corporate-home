// Cloudflare Pages Functions middleware for home.corporatetambola.com (added in 2.2.1, PM request 27 Nov 2026).
// corporatetambola.com and www.corporatetambola.com used to serve the same pages as home.corporatetambola.com (duplicate content for search engines).
// They now answer a permanent redirect (308: method, path and query kept) to https://home.corporatetambola.com. EVERY other host is passed through untouched:
// home.corporatetambola.com itself, the *.pages.dev preview addresses and localhost never redirect, so there is no loop.
export const HOME = "https://home.corporatetambola.com";
export const REDIRECT_HOSTS = ["corporatetambola.com", "www.corporatetambola.com"];

/** the address to send a visitor to, or null when the request should be served normally */
export function redirectTarget(requestUrl) {
  let u;
  try { u = new URL(requestUrl); } catch { return null; }
  const host = u.hostname.toLowerCase().replace(/\.$/, "");
  if (!REDIRECT_HOSTS.includes(host)) return null;
  return HOME + u.pathname + u.search;
}

export async function onRequest(context) {
  const to = redirectTarget(context.request.url);
  if (to) return new Response(null, { status: 308, headers: { Location: to, "Cache-Control": "public, max-age=3600" } });
  return context.next();
}
