/* Corporate Games home: pages you have opened open again without internet; anything else shows the offline page.
   Touches only this site's own files. Change V when files change. */
const V = "home-v1";
const CORE = ["/", "/index.html", "/games.html", "/how-it-works.html", "/for-hr.html", "/privacy.html", "/contact.html", "/offline.html", "/site.css", "/theme.js", "/site.js", "/favicon.svg", "/fonts/Inter-normal-400.woff2", "/fonts/Fraunces-normal-500-700.woff2"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
const save = (req, res) => { if (res && res.ok && res.type === "basic") { const copy = res.clone(); caches.open(V).then((c) => c.put(req, copy)); } return res; };
self.addEventListener("fetch", (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== self.location.origin) return;
  if (r.mode === "navigate") { e.respondWith(fetch(r).then((res) => save(r, res)).catch(() => caches.match(r, { ignoreSearch: true }).then((m) => m || caches.match(u.pathname.endsWith("/") ? "/index.html" : u.pathname + ".html") || caches.match("/offline.html")))); return; }
  e.respondWith(caches.match(r).then((m) => m || fetch(r).then((res) => save(r, res))));
});
