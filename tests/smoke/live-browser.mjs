// Real-Chromium walk of the LIVE site as a first-time and then a returning organizer. Read-only: it clicks links and looks, types nothing, signs in nowhere,
// and cancels the visit counter's own messages (/api/t) so a smoke test adds nothing to the owner's visitor numbers.
//   node tests/smoke/live-browser.mjs [--base https://home.corporatetambola.com] [--out docs/smoke]
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, VIEWPORTS } from "./harness.mjs";

const a = process.argv.slice(2); const arg = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
const base = arg("--base", "https://home.corporatetambola.com").replace(/\/$/, ""); const out = resolve(arg("--out", join(dirname(fileURLToPath(import.meta.url)), "..", "..", "docs", "smoke")));
const results = []; const rec = (id, name, ok, detail = "", status) => results.push({ id, name, status: status || (ok ? "PASS" : "FAIL"), detail: String(detail).slice(0, 500) });
const browser = await chromium.launch();
for (const vp of ["phone", "laptop"]) { try {
  const ctx = await browser.newContext({ viewport: VIEWPORTS[vp], locale: "en-IN", ...(vp === "phone" ? { isMobile: true, hasTouch: true } : {}) });
  let beaconTries = 0; await ctx.route(/\/api\/t$/, (r) => { beaconTries++; r.abort(); });
  const page = await ctx.newPage(); const msgs = [], other = [], setCookie = [];
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) msgs.push(m.text()); });
  page.on("pageerror", (e) => msgs.push(String(e)));
  page.on("request", (r) => { const u = new URL(r.url()); if (u.host !== new URL(base).host && !/^data:|^blob:/.test(r.url()) && !/console\.corporatetambola\.com/.test(u.host)) other.push(r.url()); });
  page.on("response", async (r) => { const h = await r.allHeaders().catch(() => ({})); if (h["set-cookie"]) setCookie.push(r.url()); });
  // 1. first visit
  const r1 = await page.goto(base + "/?utm_source=whatsapp&utm_medium=social&utm_campaign=smoke", { waitUntil: "load" });
  rec(`B.first ${vp}`, `${vp}: first visit opens (200) with one h1`, r1.status() === 200 && (await page.locator("h1:visible").count()) === 1, `${r1.status()}`);
  rec(`B.errors ${vp}`, `${vp}: no console error or warning`, !msgs.length, msgs.join(" | "));
  rec(`B.own ${vp}`, `${vp}: every request goes to this site only`, !other.length, other.join(" | "));
  rec(`B.cookie ${vp}`, `${vp}: no cookie set, no Set-Cookie header`, (await ctx.cookies()).length === 0 && !setCookie.length, JSON.stringify((await ctx.cookies()).map((c) => c.name)) + " " + setCookie.join(","));
  const canon = await page.evaluate(() => (document.querySelector("link[rel=canonical]") || {}).href || null);
  const mit = r1.headers()["cf-mitigated"] || ""; const ttl = await page.title().catch(() => "");
  rec(`B.what ${vp}`, `${vp}: the page the browser got is the site's own page (not a security check page)`, !mit && !/just a moment|attention required|access denied/i.test(ttl) && !!canon, `status ${r1.status()} title="${ttl}" cf-mitigated="${mit}" server="${r1.headers()["server"] || ""}"`);
  rec(`B.canon ${vp}`, `${vp}: canonical has no campaign words`, canon === base + "/" || canon === "https://home.corporatetambola.com/", String(canon));
  await page.evaluate(() => window.CA && window.CA.flush && window.CA.flush()); await page.waitForTimeout(400);
  rec(`B.counter ${vp}`, `${vp}: the visit counter script ran and tried to send (cancelled here)`, true, `${beaconTries} message(s) tried`, beaconTries > 0 ? "PASS" : "INFO");
  // 2. mail links must not be scrambled
  for (const p of ["/contact", "/terms", "/privacy"]) { await page.goto(base + p); const m = await page.evaluate(() => ({ hrefs: [...document.querySelectorAll('a[href*="mailto"],a[href*="email-protection"]')].map((x) => x.getAttribute("href")), scrambled: /\[email.protected\]/i.test(document.body.innerText) })); rec(`B.mail ${vp} ${p}`, `${vp}: ${p} shows readable e-mail, mailto links intact`, !m.scrambled && m.hrefs.every((h) => /^mailto:/.test(h)), JSON.stringify(m)); }
  // 3. hand-off to the console
  for (const [key, finder] of [["signin", "sign"], ["create", "create"]]) {
    await page.goto(base + "/");
    const link = finder === "sign" ? page.locator('a[href="https://console.corporatetambola.com/"]') : page.locator('main a[href="https://console.corporatetambola.com/#/create"]');
    let target = link.filter({ visible: true }).first(); if (!(await target.count()) && finder === "sign") { await page.locator("#menu").click(); target = link.filter({ visible: true }).first(); }
    const [nav] = await Promise.all([page.waitForNavigation({ timeout: 25000 }).catch(() => null), target.click()]);
    await page.waitForLoadState("load").catch(() => {});
    const u = new URL(page.url()); const body = ((await page.evaluate(() => document.body && document.body.innerText).catch(() => "")) || "").replace(/\s+/g, " ").slice(0, 160);
    rec(`B.console.${key} ${vp}`, `${vp}: ${key} link lands on a working console page`, nav && nav.status() < 400 && u.host === "console.corporatetambola.com", `${nav ? nav.status() : "no navigation"} ${u.origin}${u.pathname}${u.hash.replace(/cv=[a-f0-9]{32}/, "cv=<code>")} title="${await page.title().catch(() => "")}" text="${body}"`);
    rec(`B.console.url ${vp} ${key}`, `${vp}: ${key} address carries no query and no personal data`, u.search === "" && !/@|utm_|fbclid/.test(u.href), u.href.replace(/cv=[a-f0-9]{32}/, "cv=<code>"));
    rec(`B.console.login ${vp} ${key}`, `${vp}: the console shows its own sign-in (information for the single-login rule)`, true, /sign ?in|log ?in|password|email|mobile/i.test(body) ? "console page text mentions sign in / login" : "no sign-in words in the first 160 characters", "INFO");
  }
  // 4. returning visit and offline
  await page.goto(base + "/"); await page.evaluate(() => navigator.serviceWorker.ready.then(() => true)).catch(() => {});
  await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(800);
  rec(`B.sw ${vp}`, `${vp}: returning visitor has the offline copy in charge`, await page.evaluate(() => !!navigator.serviceWorker.controller), "");
  await ctx.setOffline(true); await page.goto(base + "/pricing").catch(() => {});
  rec(`B.offline ${vp}`, `${vp}: offline, a visited page still opens`, /pricing|pay/i.test((await page.locator("h1").first().textContent().catch(() => "")) || ""), await page.title().catch(() => ""));
  await page.goto(base + "/terms").catch(() => {}); rec(`B.offline.terms ${vp}`, `${vp}: offline, the Terms page opens (needs the fixed copy list; fails on the old live copy)`, !/offline/i.test(await page.title().catch(() => "offline")), await page.title().catch(() => ""));
  await ctx.setOffline(false);
  const keys = await page.evaluate(() => Object.keys(localStorage).concat(Object.keys(sessionStorage))); rec(`B.storage ${vp}`, `${vp}: what this site stored in the browser`, true, keys.join(","), "INFO");
  await ctx.close();
 } catch (e) { rec(`B.crash ${vp}`, `${vp}: the walk ran to the end`, false, String(e && e.message || e).split("\n")[0]); } }
await browser.close();
const pass = results.filter((r) => r.status === "PASS").length, fail = results.filter((r) => r.status === "FAIL").length, info = results.filter((r) => r.status === "INFO").length;
mkdirSync(out, { recursive: true }); writeFileSync(join(out, "live-browser.json"), JSON.stringify({ summary: { when: new Date().toISOString(), base, checks: results.length, passed: pass, failed: fail, info }, results }, null, 1));
let md = `# Live browser walk ${base}\n\n${results.length} checks, ${pass} passed, ${fail} failed, ${info} info.\n\n`; for (const r of results) md += `- **${r.status}** ${r.id}: ${r.name} (${r.detail})\n`;
writeFileSync(join(out, "live-browser.md"), md); console.log(md); process.exit(fail ? 1 : 0);
