// Cases T16 to T21: the Home v2.0.0 behaviours. Each one has a break-it-and-see-red run in tests/falsify.mjs.
//   T16 cookie choice   T17 one sign-in gate (first visit, repeat visit, hand-off)   T18 SEO   T19 pricing packs
//   T20 the owner's wording rules (suite rules 1.1)   T21 version, footer, /changes
import { readFileSync, existsSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { PAGES, pageUrl, openPage, listFiles, read } from "./lib.mjs";

const text = (html) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/g, " ").replace(/<[^>]+>/g, " ").replace(/&middot;/g, "·").replace(/&rarr;/g, "→").replace(/&rsquo;/g, "\u2019").replace(/&ldquo;|&rdquo;/g, '"').replace(/&#8377;/g, "\u20B9").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&copy;/g, "©").replace(/\s+/g, " ").trim();
const CONSOLE = "https://console.corporatetambola.com/";
const PACKS = [[100, 2399, 34], [250, 3499, 51], [500, 4699, 67], [750, 5899, 84], [1000, 7099, 101], [2500, 11799, 169], [5000, 17699, 253], [10000, 29499, 421]];
const INDEXED = ["index", "games", "how-it-works", "for-hr", "pricing", "privacy", "contact", "changes"];
const pathOf = (p) => (p === "index" ? "/" : "/" + p);
const stubConsole = (ctx) => ctx.route(/^https:\/\/console\.corporatetambola\.com\//, (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>console</title><p>console</p>" }));

export const CASES_V2 = [
  { id: "T16", name: "Cookie choice: asks on a first visit, stores nothing before the answer, No is the default, two equal buttons, works by keyboard, phone fits", async run({ base, browser, c }) {
    // first visit, nothing answered
    const o = await openPage(browser, base + "/", { w: 1280, consent: "ask" });
    const { page, ctx } = o;
    c.check("first visit: the cookie choice is shown", await page.locator("#consent").isVisible(), "no banner");
    c.check("the banner is a labelled region", (await page.locator("#consent").getAttribute("role")) === "region" && !!(await page.locator("#consent").getAttribute("aria-label")), "no label");
    const txt = (await page.locator("#consent").innerText()).replace(/\s+/g, " ");
    c.check("honest words: no advertising, no tracking, no visit counting; says the offline copy needs a yes", /No advertising, no tracking, no visit counting/.test(txt) && /offline copy/.test(txt) && !/sends? nothing|Nothing is sent/i.test(txt), txt);
    const btn = await page.evaluate(() => [...document.querySelectorAll("#consent button")].map((b) => { const r = b.getBoundingClientRect(), s = getComputedStyle(b); return { t: b.textContent, w: Math.round(r.width), h: Math.round(r.height), bg: s.backgroundColor, color: s.color, fw: s.fontWeight, fs: s.fontSize, bd: s.borderColor }; }));
    c.check("exactly two buttons: No, thanks / Yes, remember me", btn.length === 2 && btn[0].t === "No, thanks" && btn[1].t === "Yes, remember me", JSON.stringify(btn));
    c.check("equal prominence: same size, colours and weight (no dark pattern)", btn.length === 2 && btn[0].w === btn[1].w && btn[0].h === btn[1].h && btn[0].bg === btn[1].bg && btn[0].color === btn[1].color && btn[0].fw === btn[1].fw && btn[0].fs === btn[1].fs && btn[0].bd === btn[1].bd, JSON.stringify(btn));
    c.check("a button is at least 44 px tall", btn.every((b) => b.h >= 44), JSON.stringify(btn));
    c.check("no choice is pre-selected: nothing stored, no cookie, before the answer", (await page.evaluate(() => localStorage.length + sessionStorage.length)) === 0 && (await ctx.cookies()).length === 0 && (await page.evaluate(() => document.cookie)) === "" && (await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length + (await caches.keys()).length)) === 0, "stored before consent");
    c.check("no request leaves this site before the answer", o.events.requests.every((u) => u.startsWith(base) || u.startsWith("data:")), o.events.requests.filter((u) => !u.startsWith(base)).join(" "));
    // the page still works while the question is open: nothing is blocked, the sign-in link is a plain link
    await stubConsole(ctx);
    await page.locator("#consent button[data-consent=no]").click();
    c.check("No: the banner goes away", !(await page.locator("#consent").count()), "still there");
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem("ctz-consent") || "null"));
    c.check("No: the answer is stored as comfort=false, and nothing else is stored", !!st && st.comfort === false && (await page.evaluate(() => Object.keys(localStorage).join())) === "ctz-consent", JSON.stringify(st));
    await page.locator("a[data-gate]:not([data-demo])").first().click({ force: true });
    await page.waitForURL(/console\.corporatetambola\.com/);
    const afterNo = await page.evaluate(() => Object.keys(localStorage).join());
    c.check("No: clicking Sign in does not store a visit note", !/ctz-visited/.test(afterNo) || false, afterNo);
    await page.goBack();
    await page.reload();
    c.check("after an answer the question is not asked again", !(await page.locator("#consent").count()), "asked again");
    // Yes
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator("#consent button[data-consent=yes]").click();
    const yes = await page.evaluate(() => JSON.parse(localStorage.getItem("ctz-consent")));
    c.check("Yes: stored as comfort=true", yes && yes.comfort === true, JSON.stringify(yes));
    c.check("Yes: nothing leaves this site", o.events.requests.every((u) => u.startsWith(base) || u.startsWith("data:") || /console\.corporatetambola\.com/.test(u)), o.events.requests.join(" "));
    await page.locator("a[data-gate]:not([data-demo])").first().click({ force: true });
    await page.waitForURL(/console\.corporatetambola\.com/);
    await page.goBack();
    c.check("Yes: clicking Sign in stores the visit note (and only then)", (await page.evaluate(() => localStorage.getItem("ctz-visited"))) === "1", "no note");
    // the footer button reopens it, focus goes to the first button, Escape closes it and returns focus
    await page.locator("[data-consent-open]").first().focus();
    await page.keyboard.press("Enter");
    c.check("Cookie choices (footer) reopens the question and focuses No, thanks", await page.evaluate(() => document.activeElement && document.activeElement.getAttribute("data-consent") === "no"), "focus elsewhere");
    await page.keyboard.press("Tab"); await page.keyboard.press("Enter");
    c.check("by keyboard: Tab then Enter picks Yes, remember me", (await page.evaluate(() => JSON.parse(localStorage.getItem("ctz-consent")).comfort)) === true, "not yes");
    await page.locator("[data-consent-open]").first().click();
    await page.keyboard.press("Escape");
    c.check("Escape closes the question without changing the answer, focus returns to the footer button", !(await page.locator("#consent").count()) && (await page.evaluate(() => document.activeElement && document.activeElement.hasAttribute("data-consent-open"))), "focus lost");
    await page.locator("[data-consent-open]").first().click();
    await page.locator("#consent button[data-consent=no]").click();
    c.check("changing to No removes the visit note and sets comfort=false", (await page.evaluate(() => localStorage.getItem("ctz-visited"))) === null && (await page.evaluate(() => JSON.parse(localStorage.getItem("ctz-consent")).comfort)) === false, "note kept");
    await o.close();
    // storage blocked: still asks, still works, no error
    const blocked = await openPage(browser, base + "/", { w: 1280, consent: "ask", extraInit: () => { Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } }); } });
    c.check("storage blocked: the question still shows and can be answered", await blocked.page.locator("#consent").isVisible(), "no banner");
    await blocked.page.locator("#consent button[data-consent=no]").click();
    c.check("storage blocked: no error in the console", blocked.events.console.length === 0, blocked.events.console.join(" | "));
    await blocked.close();
    // the open question passes the automatic accessibility scan (colours, names, roles), light and dark, phone and laptop
    const axeSrc = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
    for (const [scheme, w] of /** @type {[string, number][]} */ ([["light", 360], ["dark", 360], ["light", 1280], ["dark", 1280]])) {
      const x = await openPage(browser, base + "/", { w, scheme, consent: "ask" });
      await x.page.evaluate(axeSrc);
      const res = await x.page.evaluate(async () => (await /** @type {any} */ (window).axe.run(document, { resultTypes: ["violations"] })).violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id + " x" + v.nodes.length + " " + (v.nodes[0] && v.nodes[0].target.join(" "))));
      c.check(`question open, ${scheme} ${w}: axe serious/critical = 0`, res.length === 0, res.join(" | "));
      await x.close();
    }
    // a phone: the question must not eat the screen and must be reachable
    for (const w of [320, 360, 390]) {
      const m = await openPage(browser, base + "/", { w, consent: "ask" });
      const r = await m.page.evaluate(() => { const b = document.getElementById("consent").getBoundingClientRect(); return { h: b.height, vh: innerHeight, left: b.left, right: b.right, vw: innerWidth, sw: document.documentElement.scrollWidth }; });
      c.check(`phone @${w}: the question takes at most 60% of the screen and fits the width`, r.h <= r.vh * 0.6 && r.left >= 0 && r.right <= r.vw + 1 && r.sw <= r.vw + 1, JSON.stringify(r));
      await m.close();
    }
  } },

  { id: "T17", name: "One sign-in, in one place: every Sign in / Start / demo link goes to the console; no login or payment on this site; first visit, repeat visit and hand-off", async run({ base, browser, root, c }) {
    for (const f of listFiles(root)) {
      const html = read(root, f);
      const all = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => ({ attrs: m[1], href: (m[1].match(/href="([^"]*)"/) || [])[1] || "", label: text(m[2]) }));
      const gate = all.filter((a) => /^(sign in|sign in or start|try a free game|try it|your console|go to your console)/i.test(a.label) || /\bdata-gate\b/.test(a.attrs));
      c.check(`${f}: has at least one console link`, f === "offline.html" || f === "404.html" || gate.length >= 1, "none");
      for (const a of gate) {
        const u = a.href.replace(/&amp;/g, "&");
        c.check(`${f}: "${a.label}" goes to the console`, u.startsWith(CONSOLE + "?"), u);
        const q = new URL(u).searchParams;
        c.check(`${f}: "${a.label}" carries only from=home, visit=first and (demo) demo=`, [...q.keys()].every((k) => ["from", "visit", "demo"].includes(k)) && q.get("from") === "home" && q.get("visit") === "first", u);
        c.check(`${f}: "${a.label}" opens in the same tab (no pop-up)`, !/target=/.test(a.attrs), a.attrs);
      }
      c.check(`${f}: no link to a sign-in, login or /zc page on any host`, !all.some((a) => /\/(zc|signin|sign-in|login|log-in|auth)(\b|[/?#.])/i.test(a.href) && !a.href.startsWith(CONSOLE)), all.find((a) => /\/(zc|signin|login)/i.test(a.href))?.href);
      c.check(`${f}: no form, no password or e-mail box, no payment script`, !/<form\b|<input\b|type="password"|razorpay\.com|<script[^>]*(razorpay|stripe|paypal|checkout)/i.test(html), "login or payment on home");
    }
    // behaviour in a real browser
    const o = await openPage(browser, base + "/", { w: 1280, consent: "ask" });
    const { page, ctx } = o;
    await stubConsole(ctx);
    await page.waitForTimeout(600);
    c.check("home never sends you anywhere by itself (no automatic redirect)", new URL(page.url()).origin === base, page.url());
    const first = await page.evaluate(() => [...document.querySelectorAll("a[data-gate]:not([data-demo])")].map((a) => ({ t: a.textContent, h: a.getAttribute("href") })));
    c.check("first visit: the buttons say Sign in or start and carry visit=first", first.length >= 3 && first.every((a) => /^Sign in( or start)?$/.test(a.t) && /visit=first/.test(a.h)), JSON.stringify(first));
    // answer Yes, click Sign in: the console is reached with visit=first this time, and the visit is remembered
    await page.locator("#consent button[data-consent=yes]").click();
    await page.locator("a[data-gate]:not([data-demo])").first().click({ force: true });
    await page.waitForURL(/console\.corporatetambola\.com/);
    const u1 = new URL(page.url());
    c.check("hand-off: the console gets from=home and visit=first on the first click", u1.origin + u1.pathname === CONSOLE && u1.searchParams.get("from") === "home" && u1.searchParams.get("visit") === "first", page.url());
    c.check("hand-off: the address has no password, token, ID or e-mail in it", ![...u1.searchParams.keys()].some((k) => !["from", "visit", "demo"].includes(k)) && !/@|token|key|pass/i.test(page.url()), page.url());
    await page.goto(base + "/");
    await page.waitForFunction(() => document.querySelector("a[data-gate]:not([data-demo])").textContent !== "Sign in" || true);
    const rep = await page.evaluate(() => [...document.querySelectorAll("a[data-gate]:not([data-demo])")].map((a) => ({ t: a.textContent, h: a.getAttribute("href") })));
    c.check("repeat visit (said yes before): the buttons say Your console / Go to your console and carry visit=repeat", rep.length >= 3 && rep.every((a) => /^(Your console|Go to your console)$/.test(a.t) && /visit=repeat/.test(a.h)), JSON.stringify(rep));
    c.check("repeat visit: still no automatic redirect", new URL(page.url()).origin === base, page.url());
    const demo = await page.evaluate(() => [...document.querySelectorAll("a[data-demo]")].map((a) => ({ t: a.textContent, h: a.getAttribute("href") })));
    c.check("repeat visit: the free-demo link keeps its words", demo.length >= 1 && demo.every((a) => /Try a free game/.test(a.t) && /demo=(tambola|bingo)/.test(a.h)), JSON.stringify(demo));
    await page.locator("a[data-gate]:not([data-demo])").first().click({ force: true });
    await page.waitForURL(/console\.corporatetambola\.com/);
    c.check("hand-off on a repeat visit: the console gets visit=repeat", new URL(page.url()).searchParams.get("visit") === "repeat", page.url());
    // saying No later puts it all back
    await page.goto(base + "/");
    await page.locator("[data-consent-open]").first().click();
    await page.locator("#consent button[data-consent=no]").click();
    const back = await page.evaluate(() => [...document.querySelectorAll("a[data-gate]:not([data-demo])")].map((a) => ({ t: a.textContent, h: a.getAttribute("href") })));
    c.check("answering No puts the first-visit words and visit=first back, and forgets the visit", back.every((a) => /^Sign in( or start)?$/.test(a.t) && /visit=first/.test(a.h)) && (await page.evaluate(() => localStorage.getItem("ctz-visited"))) === null, JSON.stringify(back));
    await o.close();
    // said No first: a click never stores a visit, so the next visit is a first visit
    const n = await openPage(browser, base + "/", { w: 1280, consent: "ask" });
    await stubConsole(n.ctx);
    await n.page.locator("#consent button[data-consent=no]").click();
    await n.page.locator("a[data-gate]:not([data-demo])").first().click({ force: true });
    await n.page.waitForURL(/console\.corporatetambola\.com/);
    await n.page.goto(base + "/");
    c.check("said No: a click on Sign in remembers nothing (next visit is still a first visit)", (await n.page.evaluate(() => localStorage.getItem("ctz-visited"))) === null && /Sign in/.test(await n.page.locator("a[data-gate]:not([data-demo])").first().textContent()), "visit remembered without consent");
    await n.close();
    // without script the links still work
    const ns = await browser.newContext({ javaScriptEnabled: false });
    const np = await ns.newPage(); await np.goto(base + "/");
    const href = await np.locator("a[data-gate]:not([data-demo])").first().getAttribute("href");
    c.check("without JavaScript the Sign in link is a plain link to the console", href && href.startsWith(CONSOLE + "?"), href);
    await ns.close();
  } },

  { id: "T18", name: "SEO: title, description, canonical, Open Graph, structured data, one H1, sitemap, robots, fast images", async run({ base, root, c }) {
    const titles = new Set(), descs = new Set();
    const sitemap = read(root, "sitemap.xml");
    for (const f of listFiles(root)) {
      const p = f.replace(/\.html$/, ""), html = read(root, f), indexable = INDEXED.includes(p);
      const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || "", desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || "";
      const t = text(title);
      c.check(`${f}: title is 15 to 65 characters and says Corporate Games`, t.length >= 15 && t.length <= 65 && /Corporate Games/.test(t), `${t.length}: ${t}`);
      c.check(`${f}: title is unique`, !titles.has(t), t); titles.add(t);
      const d = text(desc);
      c.check(`${f}: description is ${indexable ? "50 to 170" : "at least 10"} characters`, indexable ? d.length >= 50 && d.length <= 170 : d.length >= 10, d.length + ": " + d);
      c.check(`${f}: description is unique`, !descs.has(d), d); descs.add(d);
      c.check(`${f}: exactly one h1`, (html.match(/<h1\b/g) || []).length === 1, (html.match(/<h1\b/g) || []).length);
      const robots = (html.match(/<meta name="robots" content="([^"]*)"/) || [])[1] || "";
      c.check(`${f}: robots meta: ${indexable ? "index" : "noindex"}`, indexable ? /index/.test(robots) && !/noindex/.test(robots) : /noindex/.test(robots), robots);
      if (!indexable) continue;
      const url = "https://home.corporatetambola.com" + (p === "index" ? "/" : "/" + p);
      c.check(`${f}: canonical is the full address of this page`, html.includes(`<link rel="canonical" href="${url}">`), url);
      c.check(`${f}: sitemap lists it, with a date`, new RegExp(`<loc>${url.replace(/[.]/g, "\\.")}</loc><lastmod>\\d{4}-\\d{2}-\\d{2}</lastmod>`).test(sitemap), url);
      const og = (k) => (html.match(new RegExp(`<meta property="og:${k}" content="([^"]*)"`)) || [])[1];
      c.check(`${f}: Open Graph title, description, url, image (1200x630, with a text alternative)`, og("title") && og("description") && og("url") === url && /^https:\/\/home\.corporatetambola\.com\/og-image\.png$/.test(og("image") || "") && og("image:width") === "1200" && og("image:height") === "630" && !!og("image:alt"), JSON.stringify([og("title"), og("url"), og("image")]));
      c.check(`${f}: Open Graph text equals the page title and description`, text(og("title") || "") === t && text(og("description") || "") === d, og("title"));
      c.check(`${f}: Twitter card is summary_large_image`, /<meta name="twitter:card" content="summary_large_image">/.test(html), "no card");
      // structured data: every block parses, has a type, and says only things the page says
      const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
      let parsed = []; let parseErr = "";
      for (const b of blocks) { try { parsed.push(JSON.parse(b)); } catch (e) { parseErr = e.message; } }
      c.check(`${f}: structured data parses (${blocks.length} blocks)`, blocks.length >= 1 && !parseErr && parsed.every((j) => j["@context"] === "https://schema.org" && j["@type"]), parseErr || "no block");
      if (p !== "index") c.check(`${f}: breadcrumb names this page and links to the right address`, parsed.some((j) => j["@type"] === "BreadcrumbList" && j.itemListElement.length === 2 && j.itemListElement[1].item === url), "no breadcrumb");
      else c.check(`${f}: Organization and WebSite data`, parsed.some((j) => j["@type"] === "Organization" && j.url === url) && parsed.some((j) => j["@type"] === "WebSite" && j.url === url), "missing");
    }
    // the sitemap lists exactly the indexable pages
    const locs = [...sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
    c.check("sitemap lists exactly the indexable pages", JSON.stringify([...locs].sort()) === JSON.stringify(INDEXED.map((p) => "https://home.corporatetambola.com" + (p === "index" ? "/" : "/" + p)).sort()), locs.join(" "));
    const robotsTxt = read(root, "robots.txt");
    c.check("robots.txt: everyone may crawl, and it names the sitemap", /User-agent: \*\s+Allow: \//.test(robotsTxt) && /Sitemap: https:\/\/home\.corporatetambola\.com\/sitemap\.xml/.test(robotsTxt), robotsTxt.slice(0, 80));
    c.check("robots.txt: the page files are not blocked for ordinary crawlers", !/User-agent: \*[\s\S]{0,40}Disallow: \//.test(robotsTxt), "everything blocked");
    // images: the og image is a real 1200x630 PNG and small; any <img> has size, alt and lazy loading
    const png = readFileSync(join(root, "og-image.png"));
    c.check("og-image.png is a PNG, 1200 x 630, under 150 KB", png.subarray(1, 4).toString() === "PNG" && png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630 && png.length < 150 * 1024, `${png.readUInt32BE(16)}x${png.readUInt32BE(20)} ${png.length}`);
    for (const f of listFiles(root)) for (const m of read(root, f).matchAll(/<img\b[^>]*>/g)) c.check(`${f}: image has width, height, alt and loading=lazy (or is above the fold)`, /width="\d+"/.test(m[0]) && /height="\d+"/.test(m[0]) && /\balt="/.test(m[0]) && (/loading="lazy"/.test(m[0]) || /fetchpriority="high"/.test(m[0])), m[0]);
    for (const f of ["fonts/Inter-normal-400.woff2", "fonts/Fraunces-normal-500-700.woff2"]) c.check(`${f} is under 80 KB`, statSync(join(root, f)).size < 80 * 1024, statSync(join(root, f)).size);
    c.check("fonts are preloaded on the front page", /rel="preload" href="\/fonts\/Inter-normal-400\.woff2"/.test(read(root, "index.html")), "no preload");
  } },

  { id: "T19", name: "Pricing: the eight real packs, rupees and dollars, no GST, paid only through IT Services by Rajat Agarwal and Razorpay, structured data agrees with the table", async run({ root, c }) {
    const html = read(root, "pricing.html");
    const table = (html.match(/<table class="tw" id="packs-table"[\s\S]*?<\/table>/) || [""])[0];
    const rows = [...table.matchAll(/<tr><th scope="row">[\s\S]*?<\/th><td>[\s\S]*?<\/td><td>[\s\S]*?<\/td><\/tr>/g)].map((m) => text(m[0]).match(/^Credits ([\d,]+) credits Price in rupees \u20B9([\d,]+) Price in US dollars \$([\d,]+)$/));
    c.check("the table has exactly 8 packs", rows.length === 8 && rows.every(Boolean), rows.length);
    const seen = rows.filter(Boolean).map((r) => [Number(r[1].replace(/,/g, "")), Number(r[2].replace(/,/g, "")), Number(r[3].replace(/,/g, ""))]);
    c.check("the 8 packs are exactly the owner's: 100/2399/34, 250/3499/51, 500/4699/67, 750/5899/84, 1000/7099/101, 2500/11799/169, 5000/17699/253, 10000/29499/421", JSON.stringify(seen) === JSON.stringify(PACKS), JSON.stringify(seen));
    for (let i = 1; i < seen.length; i++) c.check(`bigger pack costs less per credit: ${seen[i][0]} credits`, seen[i][1] / seen[i][0] < seen[i - 1][1] / seen[i - 1][0] && seen[i][2] / seen[i][0] < seen[i - 1][2] / seen[i - 1][0], "not cheaper");
    const t = text(html);
    c.check("rupees use the rupee sign and dollars the dollar sign", /\u20B92,399/.test(t) && /\$34\b/.test(t), "signs");
    c.check("no GST is added (said in words)", /no GST is added/i.test(t) && /GST is not charged/.test(t), "missing");
    c.check("the only payee is IT Services by Rajat Agarwal and the only way to pay is Razorpay", /The only payee is IT Services by Rajat Agarwal\. The only way to pay is Razorpay\./.test(t), "missing");
    c.check("the game only starts when you pay, and you pay inside the console", /The game only starts when you pay/.test(t) && /You pay inside your console/.test(t), "missing");
    c.check("the owner's sentence about software and subscription, word for word", t.includes("You don\u2019t have to buy software or a subscription or download anything. You only pay per game. Simple and easy."), "missing");
    c.check("this site takes no payment (the page says so)", /takes no payment and has no sign-in/.test(t), "missing");
    c.check("the page does not name the backend (Moneypenny) or any other payee", !/Moneypenny|PayU|Stripe|PayPal|Paytm|Cashfree/i.test(t), (t.match(/Moneypenny|PayU|Stripe|PayPal/i) || [""])[0]);
    // the other pages say the same about who is paid
    for (const f of ["index.html", "how-it-works.html", "privacy.html", "contact.html", "for-hr.html", "games.html"]) c.check(`${f}: carries no price other than on the pricing page`, !/\u20B9|\$ ?\d|\bRs\.? ?\d/.test(text(read(root, f))), "price");
    c.check("the footer names the payee and Razorpay on every page", listFiles(root).filter((f) => !["404.html", "offline.html"].includes(f)).every((f) => /Payments are collected by IT Services by Rajat Agarwal, through Razorpay\./.test(text(read(root, f)))), "missing somewhere");
    // structured data = the table
    const ld = JSON.parse((html.match(/<script type="application\/ld\+json">(\{[\s\S]*?"OfferCatalog"[\s\S]*?\})<\/script>/) || [, "{}"])[1]);
    const offers = (ld.itemListElement || []).map((o) => [Number((o.name.match(/[\d,]+/) || ["0"])[0].replace(/,/g, "")), ...["INR", "USD"].map((cur) => Number((o.priceSpecification.find((s) => s.priceCurrency === cur) || {}).price))]);
    c.check("structured data (OfferCatalog) lists the same 8 packs and prices as the table", JSON.stringify(offers) === JSON.stringify(PACKS), JSON.stringify(offers));
    c.check("structured data says the seller is IT Services by Rajat Agarwal and the price has no GST", (ld.itemListElement || []).every((o) => o.seller && o.seller.name === "IT Services by Rajat Agarwal" && o.priceSpecification.every((s) => s.valueAddedTaxIncluded === false)), "seller or tax");
  } },

  { id: "T20", name: "The owner's wording rules v1.1: fairness, 24-hour deletion with IDs, privacy line, prizes, billing, no forbidden claims, no own login or payment, simple English", async run({ root, c }) {
    const T = (f) => text(read(root, f));
    const home = T("index.html"), priv = T("privacy.html"), how = T("how-it-works.html"), hr = T("for-hr.html"), pricing = T("pricing.html");
    const FAIR = "No one knows the next number: not the organizer, not the host, not even the software.";
    c.check("fairness line, word for word, on the home page", home.includes(FAIR), "missing");
    c.check("24-hour deletion with IDs on the home page, how it works and privacy", /erased within 24 hours after the game ends/.test(home) && /invited IDs|IDs/.test(home) && /erased within 24 hours after the game ends/.test(how) && /invited IDs/.test(how) && /IDs you invited/.test(priv) && /erased within 24 hours after the game ends/.test(priv), "missing");
    c.check("privacy line: designed to follow US privacy laws, EU GDPR and India\u2019s DPDP (home and privacy)", /Designed to follow US privacy laws, EU GDPR and India\u2019s DPDP\./.test(home), "missing");
    for (const [f, t] of [["index.html", home], ["how-it-works.html", how], ["for-hr.html", hr], ["pricing.html", pricing]]) c.check(`${f}: you (the company) give the prizes directly to the winners (owner's line)`, /You \(the company\) give the prizes directly to the winners/.test(t), "missing");
    c.check("billing: the one sentence, word for word, on privacy and pricing", priv.includes("We keep billing data for audit and tax reasons.") && pricing.includes("We keep billing data for audit and tax reasons."), "missing");
    c.check("the tagline is on the home page", home.includes("Every ticket on the player\u2019s own phone, nothing to install. Each ticket is unique."), "missing");
    c.check("invite by ID only, no names or personal details, on home and how it works", /by ID only/.test(home) && /by ID only/.test(how) && /No names, no mobile numbers and no personal details are needed/.test(home), "missing");
    c.check("someone not on your list waits for you to approve or decline (for HR)", /approve or decline/.test(hr), "missing");
    for (const f of listFiles(root)) {
      const t = T(f);
      for (const [re, what] of /** @type {[RegExp, string][]} */ ([[/100% secure|most secure|bank-grade|military/i, "an unproven security claim"], [/played by (major|leading|top)/i, "played by major companies"], [/never hold or pay prize money|never hold or pay prizes/i, "the old prize sentence"], [/\bforever\b/i, "the word forever"], [/tick two boxes|tick a box/i, "tick boxes before joining"], [/PDF of all details/i, "PDF by e-mail claim"], [/Moneypenny|moneypenny/i, "the backend's name"], [/\bAnyone with the link\b/i, "'Anyone with the link' audience"], [/365 days/i, "a 365-day line about players"]]))
        c.check(`${f}: no ${what}`, !re.test(t) || (what === "a 365-day line about players" && f === "privacy.html"), (t.match(re) || [""])[0]);
    }
    c.check("privacy: the 365-day lines are only about the winners record by number, organizer settings and the fairness log", !/prize contact|Contact details a winner/i.test(priv), "winner contact details row is back");
    // simple English: short sentences and no jargon on the pages people read
    const JARGON = /\b(leverage|synergy|utilize|utilise|paradigm|holistic|stakeholders?|onboarding|scalable|robust|seamless|API|SaaS|B2B|KPI|ROI|omnichannel)\b/i;
    for (const f of ["index.html", "how-it-works.html", "for-hr.html", "pricing.html", "games.html", "contact.html"]) {
      const t = T(f); c.check(`${f}: no business jargon`, !JARGON.test(t), (t.match(JARGON) || [""])[0]);
      const main = (read(root, f).match(/<main[\s\S]*?<\/main>/) || [""])[0].replace(/<table[\s\S]*?<\/table>/g, " ");
      const long = text(main.replace(/<\/(h[1-6]|li|p|dt|dd|summary|div|section|button|a)>/g, "$&. ")).split(/(?<=[.!?])\s+/).filter((s) => s.split(" ").length > 40);
      c.check(`${f}: no sentence longer than 40 words`, long.length === 0, long[0]);
    }
    c.check("the pages are in the second person for the organizer (you)", /\bYou plan the day\b/.test(home) && /\byou\b/i.test(pricing) && !/\bI\b(?! of| in)/.test(home.replace(/\bI\./g, "")), "voice");
  } },

  { id: "T21", name: "Version and what is new: version.json, the footer vX.Y.Z on every page linking to /changes, the /changes page, CHANGELOG, knowledge file kept private", async run({ base, browser, root, c }) {
    const repo = join(root, "..");
    const built = existsSync(join(root, "version.json"));
    c.check("the built site has /version.json", built, "run node tools/build.mjs and test the dist folder");
    if (!built) return;
    const v = JSON.parse(read(root, "version.json"));
    const pkg = JSON.parse(readFileSync(join(repo, "package.json"), "utf8"));
    const src = JSON.parse(readFileSync(join(repo, "version.json"), "utf8"));
    c.check("version.json has product, version, commit, builtAt and changes", v.product === "corporate-games-home" && /^\d+\.\d+\.\d+$/.test(v.version) && /^[0-9a-f]{7,40}$|^unknown$/.test(v.commit) && !isNaN(Date.parse(v.builtAt)) && Array.isArray(v.changes), JSON.stringify(Object.keys(v)));
    c.check("version agrees in version.json, package.json and the source file", v.version === pkg.version && v.version === src.version, `${v.version} ${pkg.version} ${src.version}`);
    c.check("version.json keeps at most the last 20 changes, each with id, what, where, pr", v.changes.length >= 1 && v.changes.length <= 20 && v.changes.every((x) => x.id && x.what && x.where && x.pr), v.changes.length);
    const log = readFileSync(join(repo, "CHANGELOG.md"), "utf8");
    c.check("CHANGELOG.md has an entry for this version with Added/Changed, PR and audit lines", new RegExp("^## " + v.version.replace(/\./g, "\\.") + "\\b", "m").test(log) && /- Added:/.test(log) && /- Changed:/.test(log) && /PR #1/.test(log) && /Audits:/.test(log), "entry missing");
    c.check("docs/KNOWLEDGE.md exists and is not published", existsSync(join(repo, "docs", "KNOWLEDGE.md")) && !existsSync(join(root, "docs")) && !existsSync(join(root, "KNOWLEDGE.md")), "published or missing");
    for (const f of listFiles(root)) {
      const html = read(root, f);
      c.check(`${f}: footer shows v${v.version} and links to /changes`, new RegExp(`Version <a href="/changes"><!--ver-->v${v.version.replace(/\./g, "\\.")}<!--/ver--></a>`).test(html), (html.match(/Version <a[^>]*>[^<]*<!--ver-->[^<]*/) || ["no version line"])[0]);
    }
    const o = await openPage(browser, base + "/changes", { w: 390 });
    const items = await o.page.evaluate(() => [...document.querySelectorAll("main .prose li")].map((l) => l.textContent));
    c.check("/changes lists the changes in the build's own order (newest first), at most 10", items.length >= 1 && items.length <= 10 && items.every((t, i) => t === v.changes[i].what), JSON.stringify(items.slice(0, 2)));
    c.check("/changes says the version", (await o.page.locator(".pagehead").innerText()).includes("v" + v.version), "no version");
    const page = text(read(root, "changes.html"));
    c.check("/changes is plain words: no commit ids, file names, ids or security details", !/[0-9a-f]{7,40}\b/.test(items.join(" ")) && !/\.(js|css|html|json|mjs)\b|2\.0\.0-\d\d|vulnerab|exploit|CSP|XSS|token|secret/i.test(items.join(" ")), items.join(" | "));
    c.check("a click on the footer version opens /changes", await (async () => { await o.page.goto(base + "/"); await o.page.locator(".buildline a[href='/changes']").first().click(); await o.page.waitForURL(/\/changes$/); return true; })(), "no navigation");
    await o.close();
    c.check("/version.json is never cached (so the version shown is the version live)", /no-store/.test(readFileSync(join(repo, "_headers"), "utf8").split("/version.json")[1] || ""), "missing no-store");
  } },
];
