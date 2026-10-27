// Helpers for the home site's real-browser tests: a tiny static server that sends the same headers as production,
// one Chrome at a time (same lock file as the console's kit), and in-page checks.
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, writeFileSync, rmSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join, extname, resolve } from "node:path";

export const WIDTHS = [320, 360, 390, 414, 600, 768, 1024, 1280, 1440, 1920];
export const heightFor = (w) => (w < 700 ? 800 : w < 1100 ? 900 : 1000);
export const PAGES = ["index", "games", "how-it-works", "for-hr", "privacy", "contact", "404", "offline"];
export const pageUrl = (base, p) => base + (p === "index" ? "/" : "/" + p);

const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8", ".json": "application/json" };

/** serve a folder like Cloudflare Pages does: clean URLs, 404.html with status 404, headers from _headers for "/*" */
export function startServer(root, port = 0) {
  root = resolve(root);
  let csp = "";
  const hf = join(root, "_headers");
  const extra = {};
  if (existsSync(hf)) {
    const block = readFileSync(hf, "utf8").split(/\r?\n(?=\S)/)[0];
    for (const l of block.split(/\r?\n/).slice(1)) { const m = l.match(/^\s+([A-Za-z-]+):\s*(.*)$/); if (m) extra[m[1]] = m[2]; }
  }
  const srv = createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p.endsWith("/")) p += "index.html";
    let f = join(root, p);
    if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
    if (!existsSync(f) || statSync(f).isDirectory()) { if (existsSync(f + ".html")) f += ".html"; }
    let status = 200;
    if (!existsSync(f) || statSync(f).isDirectory()) { f = join(root, "404.html"); status = 404; }
    res.writeHead(status, { "Content-Type": MIME[extname(f)] || "application/octet-stream", "Cache-Control": "no-store", ...extra });
    res.end(readFileSync(f));
  });
  return new Promise((ok) => srv.listen(port, "127.0.0.1", () => ok({ base: "http://127.0.0.1:" + srv.address().port, close: () => new Promise((r) => srv.close(r)), headers: extra })));
}

// ---- one Chrome at a time ----
const LOCK = "C:/ct/chrome-console.lock";
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return !!e && e.code === "EPERM"; } };
export async function launchChrome() {
  if (existsSync(LOCK)) { const o = Number(readFileSync(LOCK, "utf8").trim()); if (o && o !== process.pid && alive(o)) throw new Error(`another Chrome test is running (pid ${o}): one at a time`); }
  writeFileSync(LOCK, String(process.pid));
  const release = () => { try { if (Number(readFileSync(LOCK, "utf8").trim()) === process.pid) rmSync(LOCK); } catch { /* gone */ } };
  try {
    const pw = createRequire("C:/ct/ct/dpdp-app/package.json")("playwright");
    const exe = "C:/Program Files/Google/Chrome/Application/chrome.exe";
    const browser = await pw.chromium.launch({ headless: true, ...(existsSync(exe) ? { executablePath: exe } : {}), args: ["--no-sandbox", "--disable-gpu", "--disable-extensions", "--no-first-run"] });
    return { browser, close: async () => { try { await browser.close(); } finally { release(); } } };
  } catch (e) { release(); throw e; }
}

export async function openPage(browser, url, { w, h, scheme = "light", extraInit, record } = {}) {
  const mobile = w < 900;
  const ctx = await browser.newContext({ viewport: { width: w, height: h ?? heightFor(w) }, colorScheme: scheme, deviceScaleFactor: 1, ...(mobile ? { isMobile: true, hasTouch: true } : {}) });
  if (extraInit) await ctx.addInitScript(extraInit);
  const page = await ctx.newPage();
  const events = { console: [], requests: [], failed: [], bad: [] };
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") events.console.push(m.type() + ": " + m.text()); });
  page.on("pageerror", (e) => events.console.push("pageerror: " + e.message));
  page.on("request", (r) => events.requests.push(r.url()));
  page.on("requestfailed", (r) => events.failed.push(r.url() + " " + (r.failure()?.errorText || "")));
  page.on("response", (r) => { if (r.status() >= 400 && !(record && record.allow404)) events.bad.push(r.status() + " " + r.url()); });
  await page.goto(url, { waitUntil: "load" });
  return { page, ctx, events, close: () => ctx.close() };
}

/** collects named checks; a case passes when none failed */
export function checker() {
  const list = [];
  return {
    list,
    check(name, ok, detail = "") { list.push({ name, ok: !!ok, detail: ok ? "" : String(detail).slice(0, 400) }); return !!ok; },
    get failed() { return list.filter((c) => !c.ok); },
    get count() { return list.length; },
  };
}

// ---------- colours ----------
export function contrastRatio(a, b) {
  const lum = ([r, g, bl]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl); };
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** runs inside the page: returns [{sel, fg:[r,g,b], bg:[r,g,b], size}] for the first visible match of each selector */
export const COLOR_PROBE = (sels) => {
  const cv = document.createElement("canvas"); cv.width = cv.height = 1; const cx = cv.getContext("2d", { willReadFrequently: true });
  const rgba = (s) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = "#000"; cx.fillStyle = s; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const bgOf = (el) => { let layers = []; for (let e = el; e; e = e.parentElement) { const c = rgba(getComputedStyle(e).backgroundColor); if (c[3] > 0) { layers.push(c); if (c[3] >= 1) break; } } let base = [255, 255, 255]; for (const c of layers.reverse()) base = base.map((v, i) => Math.round(c[i] * c[3] + v * (1 - c[3]))); return base; };
  const out = [];
  for (const sel of sels) {
    const el = [...document.querySelectorAll(sel)].find((e) => e.getClientRects().length && getComputedStyle(e).visibility !== "hidden");
    if (!el) { out.push({ sel, missing: true }); continue; }
    const cs = getComputedStyle(el); const fg = rgba(cs.color);
    const bg = bgOf(el); const fgb = fg.slice(0, 3).map((v, i) => Math.round(v * fg[3] + bg[i] * (1 - fg[3])));
    out.push({ sel, fg: fgb, bg, size: parseFloat(cs.fontSize) });
  }
  return out;
};

/** runs inside the page: the layout rules a person would notice. Returns a list of problems. */
export const LAYOUT_PROBE = () => {
  const iw = window.innerWidth, ih = window.innerHeight, de = document.documentElement;
  const bad = [];
  const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none"; };
  const skip = (e) => e.closest(".skip, .sprite, thead, [hidden]");
  const name = (e) => e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + (e.className && typeof e.className === "string" ? "." + e.className.split(" ")[0] : "") + " '" + (e.textContent || "").trim().slice(0, 22) + "'";
  if (de.scrollWidth > iw + 1) bad.push(`sideways scroll: page ${de.scrollWidth} wide, screen ${iw}`);
  if (document.body.scrollWidth > iw + 1) bad.push(`sideways scroll: body ${document.body.scrollWidth} wide, screen ${iw}`);
  const all = [...document.querySelectorAll("body *")].filter((e) => vis(e) && !skip(e));
  for (const e of all) {
    const r = e.getBoundingClientRect();
    if (r.right > iw + 1 || r.left < -1) { bad.push(`off the edge: ${name(e)} ${Math.round(r.left)}..${Math.round(r.right)} of ${iw}`); if (bad.length > 12) break; }
  }
  for (const e of all) {
    const cs = getComputedStyle(e);
    if (cs.overflow !== "visible" || cs.overflowX !== "visible" || cs.overflowY !== "visible") {
      if (e.scrollWidth > e.clientWidth + 1 && cs.overflowX !== "visible" && cs.overflowX !== "auto" && cs.overflowX !== "scroll") bad.push(`clipped sideways: ${name(e)}`);
      if (e.scrollHeight > e.clientHeight + 1 && (cs.overflowY === "hidden" || cs.overflowY === "clip")) bad.push(`clipped down: ${name(e)}`);
    }
  }
  // text that does not fit its own box (long words)
  for (const e of all) { if (e.children.length === 0 && e.textContent.trim() && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).display !== "inline") bad.push(`text wider than its box: ${name(e)} ${e.scrollWidth}>${e.clientWidth}`); }
  // overlaps between text blocks (the bars that stick to the screen are checked on their own)
  const blocks = all.filter((e) => /^(H1|H2|H3|P|LI|A|BUTTON|DT|DD|TD|TH|SUMMARY)$/.test(e.tagName) || e.classList.contains("tag") || e.classList.contains("big"))
    .filter((e) => !e.closest(".top, .tabbar") && !(e.tagName === "A" && e.classList.contains("go")) && !e.closest(".circle"));
  const rects = blocks.map((e) => [e, e.getBoundingClientRect()]);
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
    const [a, ra] = rects[i], [b, rb] = rects[j];
    if (a.contains(b) || b.contains(a)) continue;
    const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (ox > 3 && oy > 3) { bad.push(`overlap: ${name(a)} and ${name(b)}`); if (bad.length > 14) return bad; }
  }
  // tap targets: things you press must be at least 44 px; links inside sentences at least 24 px tall
  const big = "button, .btn, nav a, .tabbar a, .card .go, .row .acts a, .foot li a, .foot p a, .more, .contactline a, .brand";
  for (const e of document.querySelectorAll("a[href], button")) {
    if (!vis(e) || skip(e)) continue;
    if (getComputedStyle(e).display === "inline") continue;
    const r = e.getBoundingClientRect(); const strict = e.matches(big);
    const minH = strict ? 43.5 : 23.5, minW = strict ? 43.5 : 0;
    if (r.height < minH || r.width < minW) bad.push(`small tap target: ${name(e)} ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  // type size
  for (const e of all) { if (e.children.length === 0 && e.textContent.trim().length > 1 && parseFloat(getComputedStyle(e).fontSize) < 12.5) bad.push(`tiny text: ${name(e)} ${getComputedStyle(e).fontSize}`); }
  return bad.slice(0, 20);
};

export function listFiles(root) { return readdirSync(root).filter((f) => f.endsWith(".html")); }
export const read = (root, f) => readFileSync(join(root, f), "utf8");
