// Shared helpers for the smoke matrix: a cell recorder, a browser opener with every permutation switch, and small readers.
import { createRequire } from "node:module";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export const { chromium } = createRequire(import.meta.url)("playwright");

export const VIEWPORTS = { phone: { width: 360, height: 800 }, tablet: { width: 768, height: 1024 }, laptop: { width: 1280, height: 800 } };
export const HOST = "https://home.corporatetambola.com";
export const CONSOLE = "https://console.corporatetambola.com";

/** every page the site ships: name -> path to open */
export function pageList(root) {
  const files = readdirSync(root).filter((f) => f.endsWith(".html")).map((f) => f.slice(0, -5)).sort();
  return files.map((f) => ({ name: f, path: f === "index" ? "/" : f === "404" ? "/__no-such-page__" : "/" + f, status: f === "404" ? 404 : 200, indexable: !["404", "offline"].includes(f) }));
}
export const read = (root, f) => readFileSync(join(root, f), "utf8");
export const has = (root, f) => existsSync(join(root, f));

/** The cell recorder. A cell = one test x one permutation. It passes only when every check inside it passes. */
export function makeRecorder() {
  const cells = [];
  return {
    cells,
    async cell(meta, fn) {
      const checks = []; const t = { ok: (name, cond, detail = "") => { checks.push({ name, ok: !!cond, detail: cond ? "" : String(detail).slice(0, 400) }); return !!cond; }, note: "" };
      let err = "";
      try { await fn(t); } catch (e) { err = String((e && e.stack) || e).split("\n").slice(0, 3).join(" / "); checks.push({ name: "the cell ran to the end", ok: false, detail: err.slice(0, 400) }); }
      const failed = checks.filter((c) => !c.ok);
      cells.push({ ...meta, status: failed.length ? "FAIL" : "PASS", checks: checks.length, failed: failed.map((c) => ({ name: c.name, detail: c.detail })), note: t.note });
      return !failed.length;
    },
  };
}

/** open a page in a fresh context (or in the context given) with the permutation switches */
export async function open(browser, base, path, o = {}) {
  const { vp = "laptop", scheme = "light", js = true, gpc = false, dnt = false, locale = "en-IN", blockStorage = false, referer, ctx: given, reducedMotion, init, httpCredentials, serviceWorkers = "allow", extraHTTPHeaders } = o;
  const ctx = given || (await browser.newContext({ viewport: VIEWPORTS[vp] || vp, colorScheme: scheme, javaScriptEnabled: js, locale, serviceWorkers, reducedMotion, extraHTTPHeaders, ...(VIEWPORTS[vp] && VIEWPORTS[vp].width < 900 ? { isMobile: true, hasTouch: true } : {}) }));
  if (!given) {
    if (gpc) await ctx.addInitScript("Object.defineProperty(navigator,'globalPrivacyControl',{value:true})");
    if (dnt) await ctx.addInitScript("Object.defineProperty(navigator,'doNotTrack',{value:'1'})");
    if (blockStorage) await ctx.addInitScript("for (const k of ['localStorage','sessionStorage']) Object.defineProperty(window,k,{get(){throw new DOMException('blocked','SecurityError')}})");
    if (init) await ctx.addInitScript(init);
  }
  const page = given && given._page ? given._page : await ctx.newPage();
  const ev = { console: [], errors: [], failed: [], requests: [], statuses: {} };
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) ev.console.push(m.type() + ": " + m.text()); });
  page.on("pageerror", (e) => ev.errors.push(String(e)));
  page.on("requestfailed", (r) => ev.failed.push(r.url() + " " + (r.failure() && r.failure().errorText)));
  page.on("request", (r) => ev.requests.push(r.url()));
  page.on("response", (r) => { ev.statuses[r.url()] = r.status(); });
  let resp = null;
  if (path !== null) resp = await page.goto(base + path, { waitUntil: "load", referer });
  return { ctx, page, ev, resp, close: () => ctx.close() };
}

/** wait until the page's tracker has had a chance to send, then return every beacon body parsed */
export async function flush(page, srv, ms = 250) {
  try { await page.evaluate(() => window.CA && window.CA.flush && window.CA.flush()); } catch { /* page gone */ }
  await page.waitForTimeout(ms);
  return beacons(srv);
}
export const beacons = (srv) => srv.beacons.map((b) => { try { return JSON.parse(b); } catch { return { raw: b }; } });

/** things that must never reach a server in analytics */
export const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
export const PHONE = /(?:\+?\d[\d\s().-]{8,}\d)/;
export function piiIn(value) {
  const s = typeof value === "string" ? value : JSON.stringify(value);
  const bad = [];
  if (EMAIL.test(s)) bad.push("e-mail address");
  if (PHONE.test(s.replace(/"(?:s|d|ov)":"[a-f0-9]+"/g, ""))) bad.push("phone-like number");
  return bad;
}

/** read the head of a loaded page */
export const headFacts = () => {
  const m = (sel, attr = "content") => { const e = document.querySelector(sel); return e ? e.getAttribute(attr) : null; };
  const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => { try { return JSON.parse(s.textContent); } catch (e) { return { __error: String(e) }; } });
  return {
    title: document.title, lang: document.documentElement.lang, desc: m('meta[name="description"]'), canonical: m('link[rel="canonical"]', "href"), robots: m('meta[name="robots"]'),
    viewport: m('meta[name="viewport"]'), ogTitle: m('meta[property="og:title"]'), ogDesc: m('meta[property="og:description"]'), ogUrl: m('meta[property="og:url"]'), ogImage: m('meta[property="og:image"]'),
    ogType: m('meta[property="og:type"]'), ogW: m('meta[property="og:image:width"]'), ogH: m('meta[property="og:image:height"]'), ogAlt: m('meta[property="og:image:alt"]'), twCard: m('meta[name="twitter:card"]'), twImg: m('meta[name="twitter:image"]'),
    h1: [...document.querySelectorAll("h1")].map((h) => h.textContent.trim()), h1visible: [...document.querySelectorAll("h1")].filter((h) => h.offsetParent !== null).length,
    ld, manifest: m('link[rel="manifest"]', "href"), icon: m('link[rel="icon"]', "href"),
  };
};
