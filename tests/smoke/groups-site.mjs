// Site-wide groups: deep links and redirects, SEO on every page, headers, version.json, accessibility, dead links, prices.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { open, headFacts, HOST, CONSOLE, VIEWPORTS, read } from "./harness.mjs";
import { parseRedirects } from "./pages-server.mjs";
import { clickLook } from "./groups-visit.mjs";

const get = async (base, path, init = {}) => { const r = await fetch(base + path, { redirect: "manual", ...init }); const body = init.method === "HEAD" ? "" : await r.text(); return { status: r.status, headers: r.headers, body, loc: r.headers.get("location") }; };

// ---------- 6. DEEP LINKS ----------
export async function deepLinks(R) {
  const { base, pages, cell, root, browser } = R;
  for (const pg of pages) {
    await cell({ id: `6.DL.${pg.name}`, step: 1, group: "Deep links", perm: `${pg.name} | address variants`, name: "Direct address, .html, trailing slash, other case, query, #anchor: right page or one clean redirect" }, async (t) => {
      const clean = pg.name === "index" ? "/" : "/" + pg.name;
      if (pg.name === "404") { const r = await get(base, "/__no-such-page__"); t.ok("unknown address answers 404", r.status === 404, String(r.status)); t.ok("404 page says noindex", /noindex/.test(r.body), ""); t.ok("404 page has a way home and to the console", /href="\/"/.test(r.body) && /console\.corporatetambola\.com/.test(r.body), ""); return; }
      if (pg.name === "offline") { const r = await get(base, "/offline"); t.ok("/offline answers 200", r.status === 200, String(r.status)); return; }
      const r0 = await get(base, clean); t.ok("clean address 200", r0.status === 200, String(r0.status));
      if (pg.name !== "index") {
        const r1 = await get(base, clean + ".html"); t.ok(".html address sends one redirect to the clean address", [301, 308].includes(r1.status) && r1.loc === clean, `${r1.status} ${r1.loc}`);
        const r2 = await get(base, clean + "/"); t.ok("trailing slash redirects to the clean address (or serves the page)", ([301, 308].includes(r2.status) && r2.loc === clean) || r2.status === 200, `${r2.status} ${r2.loc}`);
        const r3 = await get(base, clean.toUpperCase()); t.ok("upper-case address is not a second copy of the page (404 or redirect)", r3.status !== 200, String(r3.status));
      } else { const r1 = await get(base, "/index.html"); t.ok("/index.html redirects to /", [301, 308].includes(r1.status) && r1.loc === "/", `${r1.status} ${r1.loc}`); }
      const o = await open(browser, base, clean + "?utm_source=x#top", { vp: "phone" });
      try { t.ok("query and #anchor still show the page", o.resp.status() === 200 && (await o.page.locator("h1:visible").count()) === 1, String(o.resp.status())); } finally { await o.close(); }
    });
  }
  await cell({ id: "6.DL.legal", step: 1, group: "Deep links", perm: "legal pages and old addresses", name: "Every old legal address sends one 301 to a section of /terms that exists; /privacy stays on home" }, async (t) => {
    const rules = parseRedirects(read(root, "_redirects")); t.ok("there are redirect rules", rules.length > 0, "");
    const terms = read(root, "terms.html");
    for (const r of rules) {
      const res = await get(base, r.from); const [path, frag] = r.to.split("#");
      t.ok(`${r.from} answers ${r.code} to ${r.to}`, res.status === r.code && res.loc === r.to, `${res.status} ${res.loc}`);
      if (frag) t.ok(`#${frag} exists in ${path}`, new RegExp(`id="${frag}"`).test(terms), "no such id");
    }
    const p = await get(base, "/privacy"); t.ok("/privacy is its own page (not redirected)", p.status === 200, String(p.status));
  });
  await cell({ id: "6.DL.signin-guesses", step: 1, group: "Deep links", perm: "addresses an organizer might type", name: "/login /signin /sign-in /console /dashboard /app: send the person to the console sign-in (or at least show a page with a Sign in button)" }, async (t) => {
    for (const p of ["/login", "/signin", "/sign-in", "/console", "/dashboard", "/app", "/admin", "/zc"]) {
      const r = await get(base, p);
      const goes = [301, 302, 307, 308].includes(r.status) && /^https:\/\/console\.corporatetambola\.com\//.test(r.loc || "");
      const page = r.status === 404 && /console\.corporatetambola\.com\//.test(r.body);
      if (["/login", "/signin", "/sign-in", "/console"].includes(p)) t.ok(`${p} reaches the console sign-in in one step (redirect)`, goes, `${r.status} ${r.loc || "(shows the 404 page, which has a Sign in link)"}`);
      t.ok(`${p} at least shows a page with a Sign in link`, goes || page, `${r.status}`);
    }
  });
  await cell({ id: "6.DL.files", step: 1, group: "Deep links", perm: "special files", name: "version.json, robots, sitemap, llms, security.txt, manifest, icons answer with the right type" }, async (t) => {
    const want = { "/version.json": /application\/json/, "/robots.txt": /text\/plain/, "/sitemap.xml": /xml/, "/llms.txt": /text\/plain/, "/llms-full.txt": /text\/plain/, "/.well-known/security.txt": /text\/plain/, "/site.webmanifest": /manifest\+json/, "/og-image.png": /image\/png/, "/favicon.svg": /svg/, "/favicon.ico": /icon/, "/apple-touch-icon.png": /image\/png/, "/icon-192.png": /image\/png/, "/icon-512.png": /image\/png/, "/icon-maskable-512.png": /image\/png/ };
    for (const [p, ct] of Object.entries(want)) { const r = await get(base, p, { method: "HEAD" }); t.ok(`${p} 200`, r.status === 200, String(r.status)); t.ok(`${p} type`, ct.test(r.headers.get("content-type") || ""), r.headers.get("content-type")); }
  });
}

// ---------- 12. SEO on every page ----------
export async function seo(R) {
  const { base, pages, cell, root, browser } = R;
  const sitemap = read(root, "sitemap.xml"); const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const seen = { title: {}, desc: {} };
  for (const pg of pages) {
    await cell({ id: `12.SEO.${pg.name}`, step: 1, group: "SEO", perm: pg.name, name: "title, description, canonical, robots, social tags, one h1, structured data, sitemap entry" }, async (t) => {
      const o = await open(browser, base, pg.path, { vp: "laptop" });
      try {
        const f = await o.page.evaluate(headFacts);
        const url = pg.name === "index" ? HOST + "/" : HOST + "/" + pg.name;
        t.ok("title present, 60 characters or fewer", !!f.title && f.title.length <= 60, `${f.title.length}: ${f.title}`);
        t.ok(pg.indexable ? "description present, 50 to 155 characters" : "description present (a short one is fine on a noindex page)", !!f.desc && f.desc.length <= 155 && (!pg.indexable || f.desc.length >= 50), `${(f.desc || "").length}`);
        (seen.title[f.title] ||= []).push(pg.name); (seen.desc[f.desc] ||= []).push(pg.name);
        t.ok('lang="en"', f.lang === "en", f.lang); t.ok("viewport meta", /width=device-width/.test(f.viewport || ""), f.viewport);
        t.ok("exactly one h1", f.h1.length === 1, String(f.h1.length));
        if (pg.indexable) {
          t.ok("canonical is the clean https address of this page", f.canonical === url, `${f.canonical} != ${url}`);
          t.ok("robots meta allows indexing", /^index/.test(f.robots || "") && !/noindex/.test(f.robots), f.robots);
          t.ok("listed in sitemap.xml", locs.includes(url), url);
          t.ok("og:title, og:description, og:url, og:image present", !!(f.ogTitle && f.ogDesc && f.ogUrl && f.ogImage), JSON.stringify([f.ogTitle, f.ogDesc, f.ogUrl, f.ogImage]));
          t.ok("og:url equals canonical", f.ogUrl === f.canonical, f.ogUrl);
          t.ok("og:image is an absolute https address on this host", /^https:\/\/home\.corporatetambola\.com\/.+\.png$/.test(f.ogImage || ""), f.ogImage);
          t.ok("og:image size says 1200 x 630 and has alt text", f.ogW === "1200" && f.ogH === "630" && !!f.ogAlt, `${f.ogW}x${f.ogH} alt:${!!f.ogAlt}`);
          t.ok("twitter card with image", f.twCard === "summary_large_image" && !!f.twImg, `${f.twCard} ${f.twImg}`);
          t.ok("structured data present and every block parses", f.ld.length > 0 && f.ld.every((x) => !x.__error), JSON.stringify(f.ld.filter((x) => x.__error)));
          const types = JSON.stringify(f.ld).match(/"@type":\s*"([A-Za-z]+)"/g) || [];
          const has = (n) => types.some((x) => x.includes(`"${n}"`));
          if (pg.name === "index") { for (const n of ["Organization", "WebSite", "ItemList", "FAQPage"]) t.ok(`home has ${n} data`, has(n), types.join(",")); }
          else t.ok("inner page has BreadcrumbList data", has("BreadcrumbList"), types.join(","));
          const urls = JSON.stringify(f.ld).match(/https?:\/\/[^"]+/g) || [];
          t.ok("every address inside structured data is https on this host (or the sister sites)", urls.every((u) => /^https:\/\/(home|console)\.corporatetambola\.com|^https:\/\/schema\.org|^https:\/\/(veridian-aios|townhall-records|dpdp\.veridian-aios)\.com/.test(u)), urls.filter((u) => !/^https:\/\/(home|console)\.corporatetambola\.com|schema\.org|veridian-aios|townhall-records/.test(u)).join(" "));
          // FAQ: the marked-up answers must be the visible answers
          const faq = f.ld.flatMap((b) => (b["@graph"] ? b["@graph"] : [b])).filter((b) => b["@type"] === "FAQPage");
          if (faq.length) {
            const vis = await o.page.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
            for (const q of faq[0].mainEntity) { t.ok(`FAQ question is visible: ${q.name.slice(0, 40)}`, vis.includes(q.name.replace(/\s+/g, " ")), "not on page"); const a = q.acceptedAnswer.text.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").slice(0, 60); t.ok(`FAQ answer is visible: ${a.slice(0, 30)}`, vis.includes(a), "answer text differs from page"); }
          }
          // the item list of games must match the games on the page
          const il = f.ld.flatMap((b) => (b["@graph"] ? b["@graph"] : [b])).find((b) => b["@type"] === "ItemList");
          if (il && pg.name === "index") { const shown = await o.page.evaluate(() => document.querySelectorAll(".cgb-tile, section.games article, .game-card, article.card").length); t.note = `ItemList has ${(il.itemListElement || []).length} items`; t.ok("ItemList lists every game the page shows (six, Lucky Draw included)", (il.itemListElement || []).length === 6, `ItemList has ${(il.itemListElement || []).length} games: ${(il.itemListElement || []).map((x) => x.name || (x.item && x.item.name)).join(", ")}`); }
        } else {
          t.ok("robots meta says noindex", /noindex/.test(f.robots || ""), f.robots);
          t.ok("not in sitemap.xml", !locs.some((l) => l.endsWith("/" + pg.name)), "listed");
        }
      } finally { await o.close(); }
    });
  }
  await cell({ id: "12.SEO.site", step: 1, group: "SEO", perm: "whole site", name: "titles and descriptions unique; sitemap, robots, llms, security.txt, social image, manifest are right" }, async (t) => {
    for (const [k, v] of Object.entries(seen.title)) t.ok(`title used once: ${k.slice(0, 50)}`, v.length === 1, v.join(","));
    for (const [k, v] of Object.entries(seen.desc)) t.ok(`description used once: ${(k || "").slice(0, 40)}`, v.length === 1, v.join(","));
    for (const l of locs) { const p = l.replace(HOST, "") || "/"; const r = await get(base, p); t.ok(`sitemap address answers 200: ${p}`, r.status === 200, String(r.status)); }
    t.ok("sitemap has lastmod in ISO form for each address", [...sitemap.matchAll(/<url>[\s\S]*?<\/url>/g)].every((u) => /<lastmod>\d{4}-\d{2}-\d{2}/.test(u[0])), "missing lastmod");
    t.ok("sitemap has no duplicate address", new Set(locs).size === locs.length, "");
    const robots = read(root, "robots.txt");
    t.ok("robots.txt names the sitemap", /Sitemap:\s*https:\/\/home\.corporatetambola\.com\/sitemap\.xml/.test(robots), "");
    t.ok("robots.txt does not block the whole site for search engines", !/User-agent:\s*\*\s*\nDisallow:\s*\/\s*$/m.test(robots) && /User-agent:\s*Googlebot/.test(robots), "");
    t.ok("robots.txt does not block css or js", !/Disallow:\s*\/.*\.(css|js)/.test(robots), "");
    const png = readFileSync(join(root, "og-image.png")); t.ok("og-image.png is 1200 x 630", png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630, `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`);
    t.ok("og-image.png is under 300 KB", png.length < 300 * 1024, `${png.length}`);
    const man = JSON.parse(read(root, "site.webmanifest")); for (const i of man.icons) t.ok(`manifest icon exists: ${i.src}`, existsSync(join(root, i.src.replace(/^\//, ""))), i.src);
    const sec = read(root, ".well-known/security.txt"); const exp = (sec.match(/Expires:\s*(\S+)/) || [])[1]; t.ok("security.txt has not expired and has >60 days left", exp && new Date(exp) - Date.now() > 60 * 86400000, `Expires ${exp}`);
    const llms = read(root, "llms.txt"); for (const u of llms.match(/https:\/\/home\.corporatetambola\.com[^\s)]*/g) || []) { const r = await get(base, u.replace(HOST, "").replace(/[.,]$/, "") || "/"); t.ok(`llms.txt link works: ${u}`, r.status === 200, String(r.status)); }
  });
}

// ---------- 13. version.json ----------
export async function version(R) {
  const { base, pages, cell, browser, root } = R;
  await cell({ id: "13.VJ.01", step: 1, group: "version.json", perm: "built copy", name: "version.json answers 200 JSON, not cached, has commit/dirty/builtAt/game; every footer shows the same short commit" }, async (t) => {
    const r = await get(base, "/version.json"); t.ok("200", r.status === 200, String(r.status));
    t.ok("JSON type", /application\/json/.test(r.headers.get("content-type") || ""), r.headers.get("content-type"));
    t.ok("Cache-Control no-store", /no-store/.test(r.headers.get("cache-control") || ""), r.headers.get("cache-control"));
    let v = {}; try { v = JSON.parse(r.body); } catch { t.ok("parses", false, r.body.slice(0, 80)); }
    t.ok("commit is a 40-hex id", /^[0-9a-f]{40}$/.test(v.commit || ""), v.commit); t.ok("builtAt is a date", !isNaN(Date.parse(v.builtAt)), v.builtAt); t.ok('game is "corporate-games-home"', v.game === "corporate-games-home", v.game); t.ok("dirty is a boolean", typeof v.dirty === "boolean", String(v.dirty));
    if (process.env.CI) t.ok("working copy was clean when built (dirty:false)", v.dirty === false, "dirty build: " + v.commit); else t.note = "dirty flag not asserted outside CI";
    t.ok("no personal data in it", !/@|\/home\/|\/Users\//.test(r.body), r.body);
    for (const pg of pages) { const html = read(root, pg.name + ".html"); const m = html.match(/<!--ver-->([^<]*)<!--\/ver-->/); t.ok(`${pg.name}: footer shows ${String(v.commit).slice(0, 7)}`, m && m[1].replace("+dirty", "") === String(v.commit).slice(0, 7), m && m[1]); }
    const o = await open(browser, base, "/", { vp: "laptop" }); try { const href = await o.page.evaluate(() => (document.querySelector('a[href="/version.json"]') || {}).href); t.ok("footer version links to /version.json", href === base + "/version.json", href); } finally { await o.close(); }
  });
}

// ---------- 14. HEADERS (as the site's own _headers file would send them) ----------
export async function headers(R) {
  const { base, cell, pages } = R;
  await cell({ id: "14.HD.01", step: 1, group: "Headers", perm: "all page classes", name: "Security and caching headers from _headers on pages, assets, version.json, manifest, robots" }, async (t) => {
    for (const p of ["/", "/pricing", "/terms", "/__no-such-page__"]) {
      const r = await get(base, p); const h = (n) => r.headers.get(n) || "";
      t.ok(`${p}: HSTS 1 year`, /max-age=31536000/.test(h("strict-transport-security")), h("strict-transport-security"));
      t.ok(`${p}: nosniff`, h("x-content-type-options") === "nosniff", "");
      t.ok(`${p}: referrer policy strict-origin-when-cross-origin`, h("referrer-policy") === "strict-origin-when-cross-origin", h("referrer-policy"));
      t.ok(`${p}: not framable`, h("x-frame-options") === "DENY" && /frame-ancestors 'none'/.test(h("content-security-policy")), "");
      t.ok(`${p}: strict content policy`, /default-src 'self'/.test(h("content-security-policy")) && !/unsafe-/.test(h("content-security-policy")), h("content-security-policy"));
      t.ok(`${p}: no X-Robots-Tag that blocks crawlers or AI search`, !/noindex|noai|none/.test(h("x-robots-tag")), h("x-robots-tag"));
      t.ok(`${p}: permissions policy`, /camera=\(\)/.test(h("permissions-policy")), "");
      t.ok(`${p}: no Set-Cookie`, !r.headers.get("set-cookie"), r.headers.get("set-cookie"));
    }
    for (const p of ["/site.css", "/site.js", "/theme.js", "/a.js", "/gamesbar.js", "/gamesbar.css", "/sw.js"]) { const r = await get(base, p, { method: "HEAD" }); t.ok(`${p}: no-cache`, /no-cache/.test(r.headers.get("cache-control") || ""), r.headers.get("cache-control")); }
    const f = await get(base, "/fonts/Inter-normal-400.woff2", { method: "HEAD" }); t.ok("fonts are cached for a year, immutable", /max-age=31536000/.test(f.headers.get("cache-control") || "") && /immutable/.test(f.headers.get("cache-control") || ""), f.headers.get("cache-control"));
    const csp = (await get(base, "/")).headers.get("content-security-policy") || ""; t.ok("content policy allows the tracker's own address only (connect-src 'self')", /connect-src 'self'/.test(csp), csp);
  });
}

// ---------- 15. ACCESSIBILITY ----------
export async function a11y(R) {
  const { base, pages, cell, browser } = R; let n = 0;
  const axeSrc = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
  for (const pg of pages) for (const vp of ["phone", "laptop"]) for (const scheme of ["light", "dark"]) for (const look of ["retro", "modern"]) {
    await cell({ id: `15.AX.${String(++n).padStart(3, "0")}`, step: 1, group: "Accessibility (axe-core)", perm: `${pg.name} | ${vp} | ${scheme} | ${look}`, name: "No serious or critical problem found by the automatic scan (includes colour contrast)" }, async (t) => {
      const o = await open(browser, base, pg.path, { vp, scheme });
      try {
        if (look === "modern") await clickLook(o.page);
        await o.page.evaluate(axeSrc);
        const v = await o.page.evaluate(async () => (await window.axe.run(document, { resultTypes: ["violations"] })).violations.filter((x) => x.impact === "serious" || x.impact === "critical" || x.impact === "moderate").map((x) => `${x.impact}:${x.id} x${x.nodes.length} ${x.nodes.slice(0, 2).map((nd) => nd.target.join(" ")).join(" ; ")}`));
        t.ok("no serious, critical or moderate violation", !v.length, v.join(" || "));
      } finally { await o.close(); }
    });
  }
  await cell({ id: "15.KB.01", step: 1, group: "Accessibility basics", perm: "index | phone+laptop | keyboard", name: "Skip link is the first stop, focus is visible, menu opens and closes by keyboard, 320 px reflow" }, async (t) => {
    for (const vp of ["phone", "laptop"]) {
      const o = await open(browser, base, "/", { vp });
      try {
        await o.page.keyboard.press("Tab"); const first = await o.page.evaluate(() => ({ t: document.activeElement.textContent.trim(), h: document.activeElement.getAttribute("href") }));
        t.ok(`${vp}: first Tab is the skip link`, /skip/i.test(first.t) && first.h === "#main", JSON.stringify(first));
        let invisible = 0;
        for (let i = 0; i < 12; i++) { await o.page.keyboard.press("Tab"); const ok = await o.page.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return true; const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); const ring = (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 2) || cs.boxShadow !== "none"; return ring || r.width === 0; }); if (!ok) invisible++; }
        t.ok(`${vp}: the first 12 focus stops show a ring`, invisible === 0, String(invisible));
        if (vp === "phone") {
          await o.page.locator("#menu").focus(); await o.page.keyboard.press("Enter"); t.ok("Enter opens the menu", (await o.page.getAttribute("#menu", "aria-expanded")) === "true", "");
          await o.page.keyboard.press("Escape"); t.ok("Escape closes it and puts focus back on the button", (await o.page.getAttribute("#menu", "aria-expanded")) === "false" && (await o.page.evaluate(() => document.activeElement.id)) === "menu", "");
        }
      } finally { await o.close(); }
    }
    for (const pg of pages) {
      const o = await open(browser, base, pg.path, { vp: { width: 320, height: 640 } });
      try { const w = await o.page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]); t.ok(`${pg.name}: 320 px wide (200% zoom on a phone) has no sideways scroll`, w[0] <= w[1] + 1, w.join(">")); } finally { await o.close(); }
    }
  });
}

// ---------- 16. DEAD LINKS (inside this site) ----------
export async function deadLinks(R) {
  const { base, pages, cell, root } = R;
  await cell({ id: "16.DL.01", step: 1, group: "Dead links", perm: "all pages | internal links, anchors, files", name: "Every internal link, #anchor, image, script, style, font and icon exists; mailto and tel are well formed; outside links open safely" }, async (t) => {
    const ids = {}; const htmls = readdirSync(root).filter((f) => f.endsWith(".html"));
    for (const f of htmls) ids[f.slice(0, -5)] = new Set([...read(root, f).matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    const seenUrl = new Set(); const external = new Set();
    for (const f of htmls) {
      const html = read(root, f); const name = f.slice(0, -5);
      for (const m of html.matchAll(/<(?:a|link|script|img|source)\b[^>]*?\b(?:href|src)="([^"]*)"[^>]*>/g)) {
        const url = m[1]; if (!url || url.startsWith("data:")) continue;
        if (/^mailto:/.test(url)) { t.ok(`${name}: mailto well formed (${url})`, /^mailto:[^@\s?]+@[^@\s?]+\.[a-z]{2,}(\?[^\s]*)?$/i.test(url), url); continue; }
        if (/^tel:/.test(url)) { t.ok(`${name}: tel well formed (${url})`, /^tel:\+\d{8,15}$/.test(url), url); continue; }
        if (/^https?:\/\//.test(url) && !url.startsWith(HOST)) { external.add(url); if (/<a\b/.test(m[0]) && /target="_blank"/.test(m[0])) t.ok(`${name}: _blank link has rel=noopener (${url})`, /rel="[^"]*noopener/.test(m[0]), m[0].slice(0, 100)); t.ok(`${name}: outside link is https (${url})`, url.startsWith("https://"), url); continue; }
        const local = url.replace(HOST, ""); const [pathq, frag] = local.split("#"); const path = pathq.split("?")[0];
        if (path === "" && frag !== undefined) { if (!/^(mk|i)-/.test(frag) && frag) t.ok(`${name}: #${frag} exists on this page`, ids[name].has(frag), "no such id"); continue; }
        const key = path + "#" + (frag || ""); if (seenUrl.has(name + key)) continue; seenUrl.add(name + key);
        const target = path === "/" ? "/" : path;
        const r = await get(base, target);
        t.ok(`${name}: ${url} answers 200`, r.status === 200, String(r.status));
        if (frag && /\.html?$|^[^.]*$/.test(path) && path !== "/") { const tn = path.replace(/^\//, "") || "index"; if (ids[tn]) t.ok(`${name}: ${url} anchor exists`, ids[tn].has(frag), "no such id"); }
        if (frag && path === "/") t.ok(`${name}: ${url} anchor exists`, ids.index.has(frag), "no such id");
      }
    }
    R.external = [...external];
    t.note = `${external.size} outside addresses (checked by the live probe on the runner)`;
  });
}

// ---------- 17. PRICES ----------
const PRICE_SOURCE = [[100, 2399, 34], [250, 3499, 51], [500, 4699, 67], [750, 5899, 84], [1000, 7099, 101], [2500, 11799, 169], [5000, 17699, 253], [10000, 29499, 421]];
export async function prices(R) {
  const { cell, root, pages } = R;
  await cell({ id: "17.PR.01", step: 1, group: "Prices", perm: "all pages + llms + JSON-LD", name: "Any rupee or dollar amount on the site is in the pricing source; the rupee sign is used (no Rs/INR); no GST claim contradicts 'no GST'" }, async (t) => {
    const okR = new Set(PRICE_SOURCE.map((p) => p[1])), okD = new Set(PRICE_SOURCE.map((p) => p[2])), okC = new Set(PRICE_SOURCE.map((p) => p[0]));
    const files = [...pages.map((p) => p.name + ".html"), "llms.txt", "llms-full.txt", "gamesbar.js"];
    let amounts = 0;
    for (const f of files) {
      const s = read(root, f).replace(/<script[^>]*src=[^>]*><\/script>/g, "");
      for (const m of s.matchAll(/(?:₹|&#8377;|\bRs\.?\s?|\bINR\s?)\s?([\d,]+(?:\.\d+)?)/gi)) { amounts++; const v = Number(m[1].replace(/,/g, "")); t.ok(`${f}: ${m[0]} is a price in the source`, okR.has(v), `${m[0]} is not in the pricing table`); t.ok(`${f}: rupee amounts use the rupee sign, not "${m[0].split(/\d/)[0].trim()}"`, /^(₹|&#8377;)/.test(m[0]), m[0]); }
      for (const m of s.matchAll(/(?:\$|US\$|\bUSD\s?)\s?([\d,]+(?:\.\d+)?)/g)) { if (/\$\{|\$\(|\$[a-z_]/i.test(m[0]) && f.endsWith(".js")) continue; amounts++; const v = Number(m[1].replace(/,/g, "")); t.ok(`${f}: ${m[0]} is a price in the source`, okD.has(v), `${m[0]} is not in the pricing table`); }
      for (const m of s.matchAll(/(?<![\d.])(\d[\d,]*)\s*credits?\b/gi)) { amounts++; t.ok(`${f}: "${m[0]}" is a pack size in the source`, okC.has(Number(m[1].replace(/,/g, ""))), m[0]); }
      t.ok(`${f}: GST is not claimed as charged (source says no GST)`, !/\+\s?GST|plus GST|inclusive of GST|GST (extra|applies|will be added)/i.test(s), "");
    }
    t.note = `${amounts} price amounts found on home`;
    const pricing = read(root, "pricing.html");
    t.ok('pricing page says "GST is not charged" in the footer line', /GST is not charged/.test(pricing), "");
    // The wording promises each game's own page shows the price, but every game link goes to the same create page.
    const sect = (pricing.match(/<h2>The price of each game<\/h2>[\s\S]*?<ul class="plainlist">([\s\S]*?)<\/ul>/) || [, ""])[1];
    const links = [...sect.matchAll(/href="([^"]+)"/g)].map((x) => x[1]);
    t.ok("the six game links on the pricing page go to six different game pages (they are said to be each game's own page)", new Set(links).size === links.length && links.length === 6, `${links.length} links, ${new Set(links).size} different address(es): ${[...new Set(links)].join(", ")}`);
  });
}
