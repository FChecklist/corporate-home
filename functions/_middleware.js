// The old addresses (corporatetambola.com and www.corporatetambola.com) point at this same site.
// There is one public home address; every other request is served as usual.
export async function onRequest(ctx) {
  const url = new URL(ctx.request.url);
  const host = url.hostname.toLowerCase();
  if (host === "corporatetambola.com" || host === "www.corporatetambola.com") {
    return Response.redirect("https://home.corporatetambola.com" + url.pathname + url.search, 301);
  }
  return ctx.next();
}
