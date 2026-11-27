// The plain domains send visitors to home.corporatetambola.com (PM request 27 Nov 2026). Run: node tests/apex-redirect.mjs
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(root, "functions/_middleware.js"), "utf8");
const mod = await import("data:text/javascript," + encodeURIComponent(src));
let n = 0; const ok = (m) => { n++; console.log("PASS " + m); };
const run = async (url, method = "GET") => { let passed = false; const r = await mod.onRequest({ request: { url, method }, next: async () => { passed = true; return new Response("page", { status: 200 }); } }); return { r, passed }; };

let x = await run("https://corporatetambola.com/games?utm=a&b=2#frag");
assert.equal(x.r.status, 308); assert.equal(x.r.headers.get("Location"), "https://home.corporatetambola.com/games?utm=a&b=2"); assert.equal(x.passed, false);
x = await run("https://corporatetambola.com/"); assert.equal(x.r.headers.get("Location"), "https://home.corporatetambola.com/");
ok("apex redirects with 308 and keeps path and query");
x = await run("https://www.corporatetambola.com/pricing?x=1"); assert.equal(x.r.status, 308); assert.equal(x.r.headers.get("Location"), "https://home.corporatetambola.com/pricing?x=1");
x = await run("https://WWW.CorporateTambola.com./privacy"); assert.equal(x.r.headers.get("Location"), "https://home.corporatetambola.com/privacy");
ok("www redirects (also upper case and a trailing dot)");
for (const u of ["https://home.corporatetambola.com/", "https://home.corporatetambola.com/games?a=1", "https://corporatetambola-home.pages.dev/", "https://abc123.corporatetambola-home.pages.dev/games", "http://localhost:8788/", "http://127.0.0.1:8788/x", "https://housie.corporatetambola.com/", "https://evilcorporatetambola.com/", "https://corporatetambola.com.evil.example/"]) {
  x = await run(u); assert.equal(x.passed, true, u); assert.equal(x.r.status, 200, u);
}
ok("home host, pages.dev previews, localhost, other hosts and look-alike hosts are served, never redirected");
assert.equal(mod.redirectTarget("not a url"), null); assert.equal(mod.redirectTarget("https://home.corporatetambola.com/"), null);
ok("a broken address does not throw");
// no loop: the target is a host that does not redirect
assert.equal(mod.redirectTarget(mod.HOME + "/anything"), null);
ok("the redirect target never redirects again (no loop)");
// canonical tags, og:url and sitemap use home. only
for (const f of readdirSync(root).filter((f) => f.endsWith(".html"))) {
  const t = readFileSync(join(root, f), "utf8");
  for (const m of t.matchAll(/(?:rel="canonical" href|property="og:url" content)="([^"]+)"/g)) assert.match(m[1], /^https:\/\/home\.corporatetambola\.com\//, f + " " + m[1]);
}
for (const m of readFileSync(join(root, "sitemap.xml"), "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)) assert.match(m[1], /^https:\/\/home\.corporatetambola\.com\//, m[1]);
assert.match(readFileSync(join(root, "robots.txt"), "utf8"), /Sitemap: https:\/\/home\.corporatetambola\.com\/sitemap\.xml/);
ok("every canonical tag, og:url and sitemap address is on home.corporatetambola.com only");
console.log(`\n${n} groups passed`);
