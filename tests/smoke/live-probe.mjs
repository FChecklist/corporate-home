// Read-only probe of the LIVE public site, meant to run on a GitHub Actions runner (the build sandbox cannot reach the site).
// Only GET and HEAD. It never posts, never signs in, never sends any cookie, and sends no personal data.
//   node tests/smoke/live-probe.mjs [--base https://home.corporatetambola.com] [--expect <commit>] [--out docs/smoke] [--local]
// --local: the base is a plain http test server (skips the https-only checks); used to prove the probe itself works.
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import tls from "node:tls";

const a = process.argv.slice(2); const arg = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
const base = arg("--base", "https://home.corporatetambola.com").replace(/\/$/, ""); const local = a.includes("--local");
const expect = arg("--expect", process.env.EXPECT_COMMIT || ""); const out = resolve(arg("--out", join(dirname(fileURLToPath(import.meta.url)), "..", "..", "docs", "smoke")));
const UA = "Mozilla/5.0 (compatible; HomeSmokeProbe/1.0; read-only)";
const results = []; let blocked = 0;
const rec = (id, name, ok, detail = "", status) => { results.push({ id, name, status: status || (ok ? "PASS" : "FAIL"), detail: String(detail).slice(0, 400) }); };
async function req(url, { method = "GET", redirect = "manual", headers = {} } = {}) {
  const t0 = Date.now();
  try { const r = await fetch(url, { method, redirect, headers: { "user-agent": UA, ...headers }, signal: AbortSignal.timeout(25000) }); const body = method === "HEAD" ? "" : await r.text(); return { ok: true, status: r.status, h: r.headers, body, loc: r.headers.get("location"), ms: Date.now() - t0 }; }
  catch (e) { return { ok: false, err: String((e.cause && (e.cause.code || e.cause.message)) || e.message), ms: Date.now() - t0 }; }
}
const follow = async (url, method = "GET") => { const chain = []; let u = url; for (let i = 0; i < 6; i++) { const r = await req(u, { method }); if (!r.ok) return { chain, final: r }; chain.push({ url: u, status: r.status, loc: r.loc }); if (r.status >= 300 && r.status < 400 && r.loc) u = new URL(r.loc, u).href; else return { chain, final: { ...r, url: u } }; } return { chain, final: null }; };

const probe = await req(base + "/", { method: "HEAD" });
if (!probe.ok) { rec("L.0", "the site can be reached from this machine", false, probe.err, "BLOCKED"); finish(); }
else {
  const HDR = { "strict-transport-security": /max-age=\d{7,}/, "x-content-type-options": /^nosniff$/i, "referrer-policy": /^strict-origin-when-cross-origin$/, "x-frame-options": /^DENY$/i, "permissions-policy": /camera=\(\)/, "content-security-policy": /default-src 'self'.*frame-ancestors 'none'/ };
  // sitemap drives the page list
  const sm = await req(base + "/sitemap.xml"); rec("L.sitemap", "sitemap.xml answers 200 with XML", sm.status === 200 && /xml/.test(sm.h.get("content-type") || ""), `${sm.status} ${sm.h && sm.h.get("content-type")}`);
  const locs = [...(sm.body || "").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const paths = [...new Set(["/", ...locs.map((l) => new URL(l).pathname), "/offline", "/__no-such-page__"])];
  const pages = {};
  for (const p of paths) {
    const r = await req(base + p); const want404 = p === "/__no-such-page__";
    pages[p] = r; rec(`L.page ${p}`, `${p} answers ${want404 ? 404 : 200}`, r.status === (want404 ? 404 : 200), `${r.status} in ${r.ms} ms`);
    if (!r.ok) continue;
    if (!local) for (const [k, re] of Object.entries(HDR)) rec(`L.hdr ${p} ${k}`, `${p}: ${k}`, re.test(r.h.get(k) || ""), r.h.get(k) || "(missing)");
    rec(`L.cookie ${p}`, `${p}: no Set-Cookie`, !r.h.get("set-cookie"), r.h.get("set-cookie") || "");
    rec(`L.robots ${p}`, `${p}: no X-Robots-Tag that blocks`, !/noindex|noai|none/.test(r.h.get("x-robots-tag") || ""), r.h.get("x-robots-tag") || "");
    rec(`L.type ${p}`, `${p}: html content type`, /text\/html/.test(r.h.get("content-type") || ""), r.h.get("content-type"));
    rec(`L.gzip ${p}`, `${p}: compressed (br or gzip)`, /br|gzip|zstd/.test(r.h.get("content-encoding") || "") || local, r.h.get("content-encoding") || "(none)");
    rec(`L.ttfb ${p}`, `${p}: answers within 3 s`, r.ms < 3000, `${r.ms} ms`);
    const b = r.body;
    rec(`L.cfmail ${p}`, `${p}: e-mail address is not obfuscated by Cloudflare`, !/cdn-cgi\/l\/email-protection|data-cfemail/.test(b), "");
    rec(`L.cfbeacon ${p}`, `${p}: no Cloudflare Web Analytics script injected (privacy page says no trackers)`, !/cloudflareinsights\.com|beacon\.min\.js/.test(b), "");
    const ext = [...b.matchAll(/<(?:script|img|iframe|link)\b[^>]*(?:src|href)="(https?:)?\/\/([^"/]+)[^"]*"/g)].filter((m) => !/rel="canonical"/.test(m[0]) && !/rel="(?:alternate|dns-prefetch)"/.test(m[0]) && m[2] !== new URL(base).host && !/href="https?:\/\/home\./.test(m[0]));
    rec(`L.ext ${p}`, `${p}: no outside script, image, frame or style`, !ext.length, ext.map((m) => m[2]).join(","));
    if (p !== "/__no-such-page__" && p !== "/offline") {
      const canon = (b.match(/<link rel="canonical" href="([^"]+)"/) || [])[1]; const want = new URL(p === "/" ? "/" : p, "https://home.corporatetambola.com").href;
      rec(`L.canon ${p}`, `${p}: canonical is the clean home address`, canon === want, `${canon} vs ${want}`);
      rec(`L.signin ${p}`, `${p}: Sign in goes to the console, no game-site or /zc address`, /console\.corporatetambola\.com/.test(b) && !/(housie|bingo|tictactoe|snakes|luck|luckydraw)\.corporatetambola\.com|\/zc\b/.test(b), (b.match(/(housie|bingo)\.corporatetambola\.com[^"']*/) || ["console link missing"])[0]);
      for (const m of b.matchAll(/(?:₹|\bRs\.?\s?|\bINR\s?|\$\s?)\s?([\d,]{3,})/g)) { const v = Number(m[1].replace(/,/g, "")); const ok = [2399, 3499, 4699, 5899, 7099, 11799, 17699, 29499, 34, 51, 67, 84, 101, 169, 253, 421].includes(v); rec(`L.price ${p} ${m[0]}`, `${p}: ${m[0]} is in the pricing source`, ok, m[0]); }
    }
  }
  // version
  const v = await req(base + "/version.json"); let vj = {}; try { vj = JSON.parse(v.body); } catch { /* reported below */ }
  rec("L.version", "/version.json answers 200 JSON no-store with a commit", v.status === 200 && /json/.test(v.h.get("content-type") || "") && /no-store/.test(v.h.get("cache-control") || "") && /^[0-9a-f]{40}$/.test(vj.commit || ""), `${v.status} ${v.h && v.h.get("content-type")} ${v.h && v.h.get("cache-control")} ${vj.commit || ""}`);
  rec("L.live.build", "which build is live (information)", true, `commit ${vj.commit || "?"} built ${vj.builtAt || "?"} dirty=${vj.dirty}`, "INFO");
  { const sw = await req(base + "/sw.js"); const m = (sw.body || "").match(/const V = "([^"]+)"/); rec("L.live.sw", "which offline-copy version is live (information)", true, `${m ? m[1] : "?"}; /terms saved: ${/"\/terms"/.test(sw.body || "")}; static route for /api/t: ${/addRoutes/.test(sw.body || "")}`, "INFO"); }
  { const i = pages["/"] && pages["/"].body || ""; rec("L.live.home", "what the live home page carries (information)", true, `console links: ${(i.match(/console\.corporatetambola\.com/g) || []).length}; visit counter script tag: ${/\/a\.js/.test(i)}; tabbar as nav: ${/<nav class="tabbar"/.test(i)}; ItemList games: ${(i.match(/"@type": "ListItem"/g) || []).length}`, "INFO"); }
  if (expect) rec("L.version.match", "the live commit is the one expected", vj.commit === expect, `live ${String(vj.commit).slice(0, 7)} expected ${expect.slice(0, 7)}`);
  // redirects
  const redir = async (id, from, wantStatus, wantLoc, name) => { const r = await req(base + from); rec(id, name || `${from} -> ${wantLoc}`, wantStatus.includes(r.status) && (wantLoc instanceof RegExp ? wantLoc.test(r.loc || "") : r.loc === wantLoc), `${r.status} ${r.loc || ""}`); };
  await redir("L.r1", "/index.html", [301, 308], "/"); await redir("L.r2", "/privacy.html", [301, 308], "/privacy"); await redir("L.r3", "/pricing/", [301, 308, 200], /^\/pricing$|^$/ , "/pricing/ is one page, not a copy");
  { const r = await req(base + "/PRICING"); rec("L.r4", "upper-case /PRICING is not a second copy", r.status !== 200, String(r.status)); }
  await redir("L.r5", "/refund-policy", [301], "/terms#payments"); await redir("L.r6", "/privacy-policy", [301], "/terms#privacy");
  for (const p of ["/login", "/signin", "/sign-in", "/console"]) { const r = await req(base + p); rec(`L.guess ${p}`, `${p} reaches the console or shows a page with Sign in`, ([301, 302, 307, 308].includes(r.status) && /console\.corporatetambola\.com/.test(r.loc || "")) || (r.status === 404 && /console\.corporatetambola\.com/.test(r.body || "")), `${r.status} ${r.loc || ""}`); }
  // other special files
  for (const [p, re] of [["/robots.txt", /Sitemap:\s*https:\/\/home\.corporatetambola\.com\/sitemap\.xml/], ["/llms.txt", /corporate/i], ["/.well-known/security.txt", /Contact:/]]) { const r = await req(base + p); rec(`L.file ${p}`, `${p} answers 200 plain text`, r.status === 200 && /text\/plain/.test(r.h.get("content-type") || "") && re.test(r.body), `${r.status} ${r.h && r.h.get("content-type")}`); }
  { const r = await req(base + "/.well-known/security.txt"); const e = (r.body.match(/Expires:\s*(\S+)/) || [])[1]; rec("L.sectxt", "security.txt has not expired", e && new Date(e) > new Date(), `Expires ${e}`); }
  for (const p of ["/og-image.png", "/apple-touch-icon.png", "/icon-192.png", "/icon-512.png", "/favicon.svg", "/favicon.ico", "/site.webmanifest"]) { const r = await req(base + p, { method: "HEAD" }); rec(`L.asset ${p}`, `${p} answers 200`, r.status === 200, `${r.status} ${r.h && r.h.get("content-type")}`); }
  { const r = await req(base + "/site.webmanifest"); rec("L.manifest", "manifest is JSON with the right type", /manifest\+json/.test(r.h.get("content-type") || "") && !!JSON.parse(r.body || "{}").name, r.h.get("content-type")); }
  // analytics endpoints (GET only: nothing is posted)
  { const r = await req(base + "/a.js", { method: "HEAD" }); rec("L.a.js", "/a.js (visit counter script) status is recorded", true, `${r.status}`, r.status === 200 ? "PASS" : "INFO"); const t = await req(base + "/api/t"); rec("L.api.t", "GET /api/t does not store anything and does not error with 5xx", t.status < 500, `${t.status}`); }
  // sitemap addresses are the canonical ones
  for (const l of locs) { const p = new URL(l).pathname; const r = pages[p]; if (r && r.ok) { const canon = (r.body.match(/<link rel="canonical" href="([^"]+)"/) || [])[1]; rec(`L.smcanon ${p}`, `sitemap address equals page canonical: ${l}`, canon === l, `${canon}`); } }
  // old and duplicate hosts (HEAD, no redirect followed)
  if (!local) {
    const why = (r) => (r.ok ? `${r.status} ${r.loc || ""} server=${r.h.get("server") || ""} cf-mitigated=${r.h.get("cf-mitigated") || ""} body="${(r.body || "").replace(/\s+/g, " ").slice(0, 90)}"` : r.err);
    for (const h of ["corporatetambola.com", "www.corporatetambola.com"]) { const r = await req(`https://${h}/pricing?x=1`); const refused = r.ok && r.status === 403; rec(`L.host ${h}`, `${h} sends a 301 to the home address, keeping path and query${refused ? " (a script is refused with 403 here: use a browser to confirm)" : ""}`, r.status === 301 && r.loc === "https://home.corporatetambola.com/pricing?x=1", why(r), r.ok ? (refused ? "INFO" : undefined) : "BLOCKED"); }
    { const r = await req("http://home.corporatetambola.com/", { method: "HEAD" }); rec("L.http", "plain http sends a redirect to https", r.ok && [301, 302, 307, 308].includes(r.status) && /^https:\/\/home\./.test(r.loc || ""), r.ok ? `${r.status} ${r.loc}` : r.err); }
    { const r = await req("https://corporate-home.pages.dev/", { method: "HEAD" }); rec("L.pagesdev", "the *.pages.dev address does not serve a second copy (redirects or is off)", !r.ok || r.status !== 200, r.ok ? `${r.status} ${r.loc || ""}` : r.err); }
    // certificate and protocol
    await new Promise((res) => { const s = tls.connect({ host: new URL(base).hostname, port: 443, servername: new URL(base).hostname, ALPNProtocols: ["h2", "http/1.1"] }, () => { const c = s.getPeerCertificate(); const days = Math.round((new Date(c.valid_to) - Date.now()) / 86400000); rec("L.tls", "certificate has more than 14 days left, TLS 1.2 or newer", days > 14 && /TLSv1\.[23]/.test(s.getProtocol()), `${days} days, ${s.getProtocol()}, ALPN ${s.alpnProtocol}`); rec("L.h2", "HTTP/2 is offered", s.alpnProtocol === "h2", String(s.alpnProtocol)); s.end(); res(); }); s.on("error", (e) => { rec("L.tls", "TLS connection", false, e.message); res(); }); });
    // every outside address named on the live pages
    const ext = new Set(); for (const r of Object.values(pages)) if (r.ok) for (const m of r.body.matchAll(/<a\b[^>]*href="(https:\/\/[^"#]+)/g)) if (!m[1].startsWith("https://home.corporatetambola.com")) ext.add(m[1]);
    for (const u of ext) { const r = await follow(u, "GET"); const f = r.final; const good = !!f && f.ok !== false && f.status >= 200 && f.status < 300; rec(`L.out ${u}`, `outside link answers 2xx: ${u}${f && f.status === 403 ? " (a script is refused with 403 here: use a browser to confirm)" : ""}`, good, f ? why(f) : "too many redirects", good ? undefined : f && f.status === 403 ? "INFO" : undefined); }
  }
  finish();
}
function finish() {
  const pass = results.filter((r) => r.status === "PASS").length, fail = results.filter((r) => r.status === "FAIL").length, bl = results.filter((r) => r.status === "BLOCKED").length, info = results.filter((r) => r.status === "INFO").length;
  mkdirSync(out, { recursive: true });
  const summary = { when: new Date().toISOString(), base, checks: results.length, passed: pass, failed: fail, blocked: bl, info };
  writeFileSync(join(out, local ? "live-probe-local.json" : "live-probe.json"), JSON.stringify({ summary, results }, null, 1));
  let md = `# Live probe ${base}\n\n${summary.when}: ${results.length} checks, ${pass} passed, ${fail} failed, ${bl} blocked, ${info} info.\n\n`;
  for (const r of results.filter((r) => r.status !== "PASS")) md += `- **${r.status}** ${r.id}: ${r.name} (${r.detail})\n`;
  writeFileSync(join(out, local ? "live-probe-local.md" : "live-probe.md"), md);
  console.log(md.slice(0, 6000)); process.exit(fail ? 1 : 0);
}
