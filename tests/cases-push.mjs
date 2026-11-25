// Case T25: "Notify me" (the corporate-push opt-in), shipped DARK in Home 2.3.0.
// Dark means: push-config.json holds one value, "api", and it is empty. While it is empty the front page has no block, the two
// opt-in files are not published, nothing is requested and nobody is asked anything. When it holds a plain https address the build puts
// the block on the front page, loads the two files there, and refuses unless _headers lists that address (the one connect-src entry).
// The configured half is checked with a REAL build of a temporary copy of the site (the same tools/build.mjs), never by editing dist/ by hand.
import { readFileSync, existsSync, cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { openPage, startServer, ME_URL } from "./lib.mjs";

const PUSH = "https://push.example.test";
const PINNED = "f1e93f59f45444711edbb66e632fe1333bf8f9cb";
const flat = (html) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/g, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const tmpCopy = (src) => {
  const d = mkdtempSync(join(tmpdir(), "home-push-"));
  cpSync(src, d, { recursive: true, filter: (s) => !/[\\/](\.git|node_modules|dist|tests)([\\/]|$)/.test(s) });
  return d;
};
const build = (d) => execFileSync(process.execPath, [join(d, "tools", "build.mjs")], { cwd: d, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const setApi = (d, api) => writeFileSync(join(d, "push-config.json"), JSON.stringify({ api }, null, 2) + "\n");
const allowInHeaders = (d, host) => {
  const p = join(d, "_headers");
  writeFileSync(p, readFileSync(p, "utf8").replace("connect-src 'self' https://console.corporatetambola.com;", "connect-src 'self' https://console.corporatetambola.com " + host + ";"));
};
/** the build must refuse: returns the first line of what it said, or "" if it did not refuse */
const refused = (d) => { try { build(d); return ""; } catch (e) { return String(e.stderr || e.message).split("\n")[0]; } };

export const CASES_PUSH = [
  { id: "T25", name: "Notify me, shipped dark: nothing shows or loads while the address is empty; with an address the block, its Stop button and its privacy link appear, and no prompt and no request happen on load; sw.js has both handlers and still its caching; privacy wording", async run({ root, base, browser, c }) {
    const src = resolve(root, "..");
    const rd = (f) => readFileSync(join(root, f), "utf8");

    // ---- 1. dark: the live build ----
    const cfg = JSON.parse(readFileSync(join(src, "push-config.json"), "utf8"));
    c.check("the one config value, push-config.json api, is empty today", Object.keys(cfg).join() === "api" && cfg.api === "", JSON.stringify(cfg));
    const idx = rd("index.html");
    c.check("dark: the front page has no notify block, no notify words and no opt-in file", !/data-push-optin|push-optin|id="notify"|notify me/i.test(idx), "found");
    c.check("dark: the two opt-in files are not published, and the config file is not published either", !existsSync(join(root, "push-optin.js")) && !existsSync(join(root, "push-optin.css")) && !existsSync(join(root, "push-config.json")), "published");
    c.check("both opt-in files are in the site root of the source, with the pinned corporate-push 0.2.0 header", /corporate-push client 0\.2\.0/.test(readFileSync(join(src, "push-optin.js"), "utf8")) && /^\.cp-optin \{|\/\* corporate-push opt-in block/.test(readFileSync(join(src, "push-optin.css"), "utf8")), "missing or changed");
    c.check("docs/KNOWLEDGE.md records the pinned corporate-push commit", readFileSync(join(src, "docs", "KNOWLEDGE.md"), "utf8").includes(PINNED), "pinned sha not recorded");
    const headers = rd("_headers");
    const csp = (headers.match(/Content-Security-Policy:[^\n]*/) || [""])[0];
    c.check("dark: the strict content policy is unchanged (connect-src lists only this site and the console)", /connect-src 'self' https:\/\/console\.corporatetambola\.com;/.test(csp) && !/push/i.test(csp), csp);
    const o = await openPage(browser, base + "/", { w: 1280, extraInit: () => { /** @type {any} */ (window).__perm = 0; try { /** @type {any} */ (window).__perm0 = Notification.permission; const orig = Notification.requestPermission; Notification.requestPermission = function () { /** @type {any} */ (window).__perm++; return orig.apply(this, /** @type {any} */ (arguments)); }; } catch (e) { /* no Notification here */ } } });
    await o.page.waitForTimeout(800);
    c.check("dark: no notify block in the page, no permission asked, no request except this site and the console's plain question", (await o.page.locator(".cp-optin, [data-push-optin]").count()) === 0 && (await o.page.evaluate(() => /** @type {any} */ (window).__perm)) === 0 && o.events.requests.every((u) => u.startsWith(base) || u.startsWith("data:") || u === ME_URL), JSON.stringify(o.events.requests.filter((u) => !u.startsWith(base) && u !== ME_URL)));
    c.check("dark: the page raised no error", o.events.console.length === 0, JSON.stringify(o.events.console));
    await o.close();

    // ---- 2. the service worker: both handlers, and its own caching and fetch code still there ----
    const sw = rd("sw.js");
    c.check("sw.js has the push handler and the notificationclick handler at the top level", /^self\.addEventListener\('push', function \(event\)/m.test(sw) && /^self\.addEventListener\('notificationclick', function \(event\)/m.test(sw), "handler missing");
    c.check("sw.js still has its caching and fetch code, its keep and stop messages, and a new cache name", /self\.addEventListener\("fetch"/.test(sw) && /caches\.open\(V\)/.test(sw) && /"ctz-keep"/.test(sw) && /"ctz-stop"/.test(sw) && /const V = "home-v13";/.test(sw) && /const save = /.test(sw), "caching code changed");
    c.check("sw.js shows a notification for every push and links only to this site or the company hosts", /showNotification\(title, options\)/.test(sw) && /CP_ALLOWED_HOSTS/.test(sw) && /openWindow\(target\)/.test(sw), "snippet incomplete");

    // ---- 3. privacy wording ----
    const priv = flat(rd("privacy.html"));
    c.check("privacy page says: a browser address, not your name, e-mail or phone", priv.includes("a browser address, not your name, e-mail or phone"), "missing");
    c.check("privacy page says: kept until you tap Stop notifications or your browser drops it", priv.includes("kept until you tap Stop notifications or your browser drops it"), "missing");
    c.check("privacy page never says the address is not personal data, and says it is optional and starts only after a tap", !/not personal data/i.test(priv) && /optional/i.test(priv) && /only when you tap the notify button/i.test(priv), "wrong wording");

    // ---- 4. the build refuses an unsafe or incomplete setting ----
    const bad = [];
    for (const [label, api, headersToo] of [["an address that _headers does not list", PUSH, false], ["plain http", "http://push.example.test", true], ["an address with a path", PUSH + "/x", true], ["words, not an address", "not an address", true]]) {
      const d = tmpCopy(src);
      try { setApi(d, api); if (headersToo) allowInHeaders(d, api); if (!refused(d)) bad.push(label); } finally { rmSync(d, { recursive: true, force: true }); }
    }
    c.check("the build refuses: an address _headers does not list, plain http, a path, a non-address", bad.length === 0, "not refused: " + bad.join(", "));

    // ---- 5. configured: a real build of a temporary copy, served like production ----
    const d = tmpCopy(src);
    let srv;
    try {
      setApi(d, PUSH);
      allowInHeaders(d, PUSH);
      build(d);
      const dist = join(d, "dist");
      c.check("configured: both opt-in files are published and the config file is not", existsSync(join(dist, "push-optin.js")) && existsSync(join(dist, "push-optin.css")) && !existsSync(join(dist, "push-config.json")), "files");
      const pi = readFileSync(join(dist, "index.html"), "utf8");
      c.check("configured: the front page loads each opt-in file once, with data-push-site home, the one address, and the privacy link", (pi.match(/push-optin\.js/g) || []).length === 1 && (pi.match(/push-optin\.css/g) || []).length === 1 && pi.includes('data-push-site="home"') && pi.includes('data-push-api="' + PUSH + '"') && pi.includes('data-push-privacy="/privacy"') && !pi.includes("@PUSH_API@") && !/<section id="notify"[^>]* hidden/.test(pi), "markup");
      c.check("configured: only the front page carries the opt-in", ["games", "how-it-works", "for-hr", "pricing", "privacy", "contact", "changes"].every((f) => !/push-optin/.test(readFileSync(join(dist, f + ".html"), "utf8"))), "another page loads it");
      srv = await startServer(dist);
      const p = await openPage(browser, srv.base + "/", { w: 1280, extraInit: () => { /** @type {any} */ (window).__perm = 0; try { /** @type {any} */ (window).__perm0 = Notification.permission; const orig = Notification.requestPermission; Notification.requestPermission = function () { /** @type {any} */ (window).__perm++; return orig.apply(this, /** @type {any} */ (arguments)); }; } catch (e) { /* no Notification here */ } } });
      await p.page.waitForTimeout(1200);
      const blk = await p.page.evaluate(() => { const r = document.querySelector("[data-push-optin]"); const q = (s) => { const e = r && r.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { t: (e.textContent || "").trim(), vis: !(/** @type {HTMLElement} */ (e)).hidden && b.width > 0 && b.height > 0, h: Math.round(b.height), href: e.getAttribute("href") }; }; return { site: r && r.getAttribute("data-push-site"), api: r && r.getAttribute("data-push-api"), btn: q(".cp-optin__btn:not(.cp-optin__keep)"), stop: q(".cp-optin__stop"), link: q(".cp-optin__privacy a"), perm: /** @type {any} */ (window).__perm, before: /** @type {any} */ (window).__perm0, state: Notification.permission }; });
      c.check("configured: the block shows the home wording on a visible button", !!blk.btn && blk.btn.t === "Yes, notify me about new games and offers" && blk.btn.vis, JSON.stringify(blk));
      c.check("configured: the Stop notifications button is visible at once, and tall enough to tap (44 px)", !!blk.stop && blk.stop.t === "Stop notifications" && blk.stop.vis && blk.stop.h >= 44, JSON.stringify(blk.stop));
      c.check("configured: the privacy link sits in the block and goes to /privacy", !!blk.link && blk.link.t === "Privacy" && blk.link.href === "/privacy" && blk.site === "home" && blk.api === PUSH, JSON.stringify(blk));
      c.check("configured: on page load the browser permission is not asked (0 asks, permission state unchanged) and not a single request goes to the notification service", blk.perm === 0 && blk.state === blk.before && !p.events.requests.some((u) => u.startsWith(PUSH)), JSON.stringify([blk.perm, blk.before, blk.state, p.events.requests.filter((u) => u.startsWith(PUSH))]));
      c.check("configured: the page raised no error of its own", p.events.console.length === 0, JSON.stringify(p.events.console));
      await p.page.locator(".cp-optin__btn:not(.cp-optin__keep)").click();
      await p.page.waitForTimeout(400);
      c.check("configured: the prompt is asked once, and only by the tap", (await p.page.evaluate(() => /** @type {any} */ (window).__perm)) === 1, "not once");
      c.check("configured: Stop notifications is still visible after the tap", await p.page.locator(".cp-optin__stop").isVisible(), "hidden");
      await p.close();
    } finally { if (srv) await srv.close(); rmSync(d, { recursive: true, force: true }); }
  } },
];
