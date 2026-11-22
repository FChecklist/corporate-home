/* Corporate Games home: pages you have opened open again without internet; anything else shows the offline page.
   Touches only this site's own files. Change V when the files change.
   Honest rules, because this copy is kept only after a "Yes" in the cookie choice (see consent.js, site.js):
     - this worker saves nothing by itself when it starts: the page asks it to keep the copy ("ctz-keep"), and only after a Yes;
     - it adds files only to a copy that already exists. It never makes a new one, so after a No nothing comes back;
     - when the page says "ctz-stop" (a No), it deletes every home- copy, stops saving and removes itself. */
const V = "home-v12";
const CORE = ["/", "/games", "/how-it-works", "/for-hr", "/privacy", "/contact", "/pricing", "/changes", "/offline", "/site.css", "/theme.js", "/site.js", "/consent.js", "/gate.js", "/gamesbar.js", "/gamesbar.css", "/favicon.svg", "/fonts/Inter-normal-400.woff2", "/fonts/Fraunces-normal-500-700.woff2"];
let stopped = false; // set by "ctz-stop"; cleared by "ctz-keep" (a later Yes)
/** every saved copy this site ever made: names that start with "home-" */
const mine = () => caches.keys().then((ks) => ks.filter((k) => k.indexOf("home-") === 0));
self.addEventListener("install", (e) => { e.waitUntil(self.skipWaiting()); }); // saves nothing here: no Yes is known yet
self.addEventListener("activate", (e) => { e.waitUntil(mine().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("message", (e) => {
  const d = e.data || {};
  if (d.type === "ctz-keep") { stopped = false; e.waitUntil(caches.open(V).then((c) => Promise.all(CORE.map((u) => c.match(u).then((m) => m || c.add(u)))))); }
  if (d.type === "ctz-stop") { stopped = true; e.waitUntil(mine().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))).then(() => self.registration.unregister())); }
});
/** adds to the copy only when it already exists and nobody said No */
const save = (req, res) => { if (!stopped && res && res.ok && res.type === "basic" && !res.redirected) { const copy = res.clone(); caches.has(V).then((has) => { if (has && !stopped) return caches.open(V).then((c) => c.put(req, copy)); }).catch(() => {}); } return res; };
const slow = (ms) => new Promise((_, no) => setTimeout(no, ms));
self.addEventListener("fetch", (e) => {
  const r = e.request, u = new URL(r.url);
  if (stopped || r.method !== "GET" || u.origin !== self.location.origin) return;
  if (u.pathname === "/version.json") return; // always ask the network: the version must never be an old saved copy
  if (r.mode === "navigate") {
    // the network first (4 seconds), then the saved copy, then the offline page
    e.respondWith(Promise.race([fetch(r), slow(4000)]).then((res) => save(r, res)).catch(() => caches.match(r, { ignoreSearch: true }).then((m) => m || caches.match("/offline"))));
    return;
  }
  // files of the page: show the saved copy at once and refresh it in the background
  e.respondWith(caches.match(r).then((m) => { const net = fetch(r).then((res) => save(r, res)).catch(() => m); return m || net; }));
});
