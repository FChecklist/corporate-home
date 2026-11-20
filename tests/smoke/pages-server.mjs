// A small stand-in for Cloudflare Pages, used by the smoke tests. It follows the files the site ships:
//   _headers   (every block whose path matches is applied; "*" is a splat)
//   _redirects (from to status)
//   clean URLs (/x.html answers 308 to /x, /index.html to /), 404.html with status 404
//   POST /api/t is answered 204 and the body is kept (stands in for functions/api/t.ts, which needs a database)
// Anything here that is a GUESS about Cloudflare is listed in EMULATED below; tests/smoke/live-probe.mjs checks the same things on the real site.
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname, resolve } from "node:path";

export const EMULATED = ["/x.html -> 308 /x", "/index.html -> 308 /", "a path with a trailing slash -> 308 without it", "paths are case sensitive", "default Cache-Control of a page"];

const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8", ".json": "application/json", ".png": "image/png", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json" };

export function parseHeaders(text) {
  const blocks = []; let cur = null;
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith("#")) continue;
    if (/^\S/.test(raw)) { cur = { path: raw.trim(), h: {} }; blocks.push(cur); continue; }
    const m = raw.match(/^\s+([A-Za-z0-9-]+):\s*(.*)$/); if (m && cur) cur.h[m[1]] = m[2];
  }
  return blocks;
}
const matches = (pat, p) => { const re = new RegExp("^" + pat.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$"); return re.test(p); };
export function parseRedirects(text) {
  return text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map((l) => { const [from, to, code] = l.split(/\s+/); return { from, to, code: Number(code || 302) }; });
}

export function startPages(root, { port = 0 } = {}) {
  root = resolve(root);
  const hf = join(root, "_headers"), rf = join(root, "_redirects");
  const blocks = existsSync(hf) ? parseHeaders(readFileSync(hf, "utf8")) : [];
  const redirects = existsSync(rf) ? parseRedirects(readFileSync(rf, "utf8")) : [];
  const beacons = [], hits = [];
  const srv = createServer((req, res) => {
    const u = new URL(req.url, "http://x");
    hits.push({ method: req.method, path: u.pathname + u.search, referer: req.headers.referer || "", ua: req.headers["user-agent"] || "" });
    if (req.method === "POST" && u.pathname === "/api/t") {
      const chunks = []; req.on("data", (d) => chunks.push(d)); req.on("end", () => { beacons.push(Buffer.concat(chunks).toString("utf8")); res.writeHead(204); res.end(); }); return;
    }
    let p; try { p = decodeURIComponent(u.pathname); } catch { res.writeHead(400); return res.end(); }
    const hdr = (path) => { const h = {}; for (const b of blocks) if (matches(b.path, path)) Object.assign(h, b.h); return h; };
    const send = (status, file, extra = {}) => {
      const body = readFileSync(file);
      res.writeHead(status, { "Content-Type": MIME[extname(file)] || "application/octet-stream", "Cache-Control": "public, max-age=0, must-revalidate", ...hdr(p), ...extra });
      res.end(req.method === "HEAD" ? undefined : body);
    };
    const to = (code, loc) => { res.writeHead(code, { Location: loc, ...hdr(p) }); res.end(); };
    for (const r of redirects) if (r.from === p) return to(r.code, r.to);
    if (p === "/index.html") return to(308, "/" + u.search);
    if (p.endsWith(".html")) return to(308, p.slice(0, -5) + u.search);
    if (p.length > 1 && p.endsWith("/")) return to(308, p.slice(0, -1) + u.search);
    let f = join(root, p === "/" ? "index.html" : p);
    if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
    if (existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html");
    if (!existsSync(f) && existsSync(f + ".html")) f += ".html";
    if (existsSync(f) && statSync(f).isFile()) return send(200, f);
    return send(404, join(root, "404.html"));
  });
  return new Promise((ok) => srv.listen(port, "127.0.0.1", () => ok({ base: "http://127.0.0.1:" + srv.address().port, close: () => new Promise((r) => srv.close(r)), beacons, hits, blocks, redirects })));
}
