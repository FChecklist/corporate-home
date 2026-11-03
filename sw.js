/* Corporate Games home: pages you have opened open again without internet; anything else shows the offline page.
   Touches only this site's own files. Change V when the files change. */
const V = "home-v11";
const CORE = ["/", "/games", "/how-it-works", "/for-hr", "/virtual-team-building-games", "/games-for-hr-teams", "/privacy", "/contact", "/pricing", "/offline", "/site.css", "/theme.js", "/site.js", "/gamesbar.js", "/a.js", "/gamesbar.css", "/favicon.svg", "/fonts/Inter-normal-400.woff2", "/fonts/Fraunces-normal-500-700.woff2"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
const save = (req, res) => { if (res && res.ok && res.type === "basic" && !res.redirected) { const copy = res.clone(); caches.open(V).then((c) => c.put(req, copy)); } return res; };
const slow = (ms) => new Promise((_, no) => setTimeout(no, ms));
self.addEventListener("fetch", (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== self.location.origin) return;
  if (u.pathname === "/version.json") return; // always ask the network: the version must never be an old saved copy
  if (r.mode === "navigate") {
    // the network first (4 seconds), then the saved copy, then the offline page
    e.respondWith(Promise.race([fetch(r), slow(4000)]).then((res) => save(r, res)).catch(() => caches.match(r, { ignoreSearch: true }).then((m) => m || caches.match("/offline"))));
    return;
  }
  // files of the page: show the saved copy at once and refresh it in the background
  e.respondWith(caches.match(r).then((m) => { const net = fetch(r).then((res) => save(r, res)).catch(() => m); return m || net; }));
});
