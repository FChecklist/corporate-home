/* First-party visit tracking for our own pages (CANONICAL SOURCE: C:\ct\test-sites\site-analytics; each site carries a byte-for-byte copy). Read src/core.ts for what the server keeps.
   Sends to this site's OWN address (/api/t). No third party, no cookie, no typed text, no query string, no mobile number or name. The visitor id lives in this browser's storage only.
   Global Privacy Control / Do Not Track: no visitor id is made or stored, the server only adds to anonymous counters.
   Records: page views (also for in-page route changes), which sections of a page were really on screen and for how long, how far the visitor scrolled, how long the page was visible,
   clicks (a tag you set with data-t="name", else the link's destination or the button's id), forms sent (no values), and the exit. Events are sent every ~15 s, when the page is hidden, and at once for key actions.
   Optional on the script tag: data-cv-hosts="a.example,b.example" puts this visitor's code after the # of links to those sites (only when the link is used), so one journey can run from site to site. */
(function () {
  var nav = navigator, doc = document, win = window, MAX_PAGE_EVENTS = 150, BATCH = 20;
  if (win.CA || win.CA_OFF) return;
  var gpc = nav.globalPrivacyControl === true || nav.doNotTrack === "1" || win.doNotTrack === "1" || nav.msDoNotTrack === "1";
  function rnd(n) { var a = new Uint8Array(n); (win.crypto || crypto).getRandomValues(a); var s = ""; for (var i = 0; i < a.length; i++) s += (a[i] < 16 ? "0" : "") + a[i].toString(16); return s; }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) {} return null; }
  var me = doc.currentScript || doc.querySelector('script[src$="/a.js"],script[src*="/a.js?"]');
  var cvHosts = ((me && me.getAttribute("data-cv-hosts")) || "").toLowerCase().split(",").map(function (x) { return x.trim(); }).filter(Boolean);

  var vid = "", sid = "", fresh = true, oldVid = "";
  if (!gpc) {
    vid = ls("ca_vid") || "";
    // a visitor code handed over by one of our other sites (#cv=<32 hex>): taken once, then removed from the address bar
    var hm = /(?:^#|&)cv=([a-f0-9]{32})(?:&|$)/.exec(location.hash || "");
    if (hm) {
      if (vid && vid !== hm[1]) oldVid = vid;
      vid = hm[1];
      try { var h2 = (location.hash || "").replace(/(^#|&)cv=[a-f0-9]{32}(&|$)/, function (m, a, b) { return b ? a : ""; }); history.replaceState(history.state, "", location.pathname + location.search + (h2 && h2 !== "#" ? h2 : "")); } catch (e) {}
    }
    if (!/^[a-f0-9]{32}$/.test(vid)) vid = rnd(16);
    ls("ca_vid", vid);
    // one session = one browsing visit: it ends after 30 minutes of nothing
    var last = Number(ss("ca_t") || 0), now0 = Date.now();
    sid = ss("ca_sid") || "";
    if (/^[a-f0-9]{24}$/.test(sid) && now0 - last < 30 * 60000) fresh = ss("ca_sent") !== "1"; else { sid = rnd(12); ss("ca_sid", sid); ss("ca_sent", ""); }
    ss("ca_t", String(now0));
  } else sid = rnd(12);
  win.CA = { vid: vid, sid: sid, gpc: gpc };

  var q = [], total = 0, path = "", sections = {}, inView = [], curSec = "", maxScroll = 0, visSince = Date.now(), visMs = 0, exits = 0, io = null;
  function pathNow() { var p = (location.pathname || "/").toLowerCase().replace(/\.html$/, "").replace(/\/index$/, "/") || "/"; return p.length > 1 ? p.replace(/\/+$/, "") : p; }
  function push(e) { if (total >= MAX_PAGE_EVENTS * 4) return; e.p = e.p || path; q.push(e); total++; if (q.length >= BATCH) flush(); }
  function push2(e) { if (total >= MAX_PAGE_EVENTS * 4) return; e.p = e.p || path; q.push(e); total++; }
  function send(body) {
    var t = JSON.stringify(body);
    try { if (nav.sendBeacon && nav.sendBeacon("/api/t", new Blob([t], { type: "text/plain" }))) return; } catch (e) {}
    try { fetch("/api/t", { method: "POST", body: t, keepalive: true, headers: { "content-type": "text/plain" } }).catch(function () {}); } catch (e) {}
  }
  var firstPath = "";
  function flush() {
    collect();
    while (q.length) {
      var b = { s: sid, g: gpc ? 1 : 0, dv: innerWidth < 700 ? "mobile" : innerWidth < 1100 ? "tablet" : "desktop", l: (nav.language || "").slice(0, 12), e: q.splice(0, BATCH) };
      if (!gpc) b.d = vid;
      if (fresh) { // what only the first message of a visit needs: where it came from
        b.lp = firstPath || path; fresh = false; ss("ca_sent", "1");
        try { b.r = doc.referrer ? new URL(doc.referrer).hostname : ""; } catch (e) { b.r = ""; }
        var sp = new URLSearchParams(location.search);
        b.u = { s: sp.get("utm_source") || "", m: sp.get("utm_medium") || "", c: sp.get("utm_campaign") || "" };
        var pc = sp.get("ref") || ""; if (/^[A-Za-z2-9]{8}$/.test(pc)) b.pc = pc;
        if (oldVid) { b.ov = oldVid; oldVid = ""; }
      }
      send(b);
    }
  }
  // ---- sections: which parts of the page were really on screen, and for how long ----
  function nameOf(el) { return (el.getAttribute("data-sec") || el.id || "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 24); }
  function touch(name, on) {
    var s = sections[name] || (sections[name] = { since: 0, total: 0, sent: 0, told: false, p: path });
    var t = Date.now();
    if (on && !s.since) s.since = t; else if (!on && s.since) { s.total += t - s.since; s.since = 0; }
  }
  function collect() { // turns the running clocks into events (only what is new since the last message)
    var t = Date.now();
    Object.keys(sections).forEach(function (n) {
      var s = sections[n]; if (s.since) { s.total += t - s.since; s.since = t; }
      if (s.total > s.sent || (!s.told && s.viewed)) { push2({ k: "sec", p: s.p, n: n, m: s.total - s.sent }); s.sent = s.total; s.told = true; }
    });
  }
  function watch() {
    var els = doc.querySelectorAll("[data-sec], header[id], main section[id], section[id], footer[id]"), seen = {};
    if (!win.IntersectionObserver) return;
    if (io) { try { io.disconnect(); } catch (e) {} }
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var n = nameOf(en.target); if (!n) return;
        var big = en.rootBounds ? en.intersectionRect.height >= en.rootBounds.height * 0.4 : false;
        var on = en.isIntersecting && (en.intersectionRatio >= 0.35 || big);
        var s = sections[n] || (sections[n] = { since: 0, total: 0, sent: 0, told: false, p: path });
        if (on) { s.viewed = true; curSec = n; if (inView.indexOf(n) < 0) inView.push(n); } else { var i = inView.indexOf(n); if (i >= 0) inView.splice(i, 1); }
        if (doc.visibilityState !== "hidden") touch(n, on); else if (!on) touch(n, false);
      });
    }, { threshold: [0, 0.2, 0.35, 0.5, 0.75, 1] });
    for (var i = 0; i < els.length; i++) { var n = nameOf(els[i]); if (n && !seen[n]) { seen[n] = 1; io.observe(els[i]); } }
  }
  function scroll() { var h = Math.max(doc.documentElement.scrollHeight, 1), y = (win.scrollY || win.pageYOffset || 0) + innerHeight; maxScroll = Math.max(maxScroll, Math.min(100, Math.round((y / h) * 100))); }
  function pageStart() {
    path = pathNow(); if (!firstPath) firstPath = path;
    sections = {}; inView = []; curSec = ""; maxScroll = 0; visMs = 0; visSince = doc.visibilityState === "hidden" ? 0 : Date.now(); exits = 0;
    push({ k: "pv" }); watch(); scroll();
  }
  function pageEnd() { // the exit of the page that is being left (or hidden): visible time and how far it was read
    if (!visSince && exits > 0) { flush(); return; } // already counted when the page was hidden
    var t = Date.now(); if (visSince) { visMs += t - visSince; visSince = 0; }
    Object.keys(sections).forEach(function (n) { touch(n, false); });
    if (exits < 3) { exits++; push2({ k: "exit", n: inView.length ? inView[inView.length - 1] : curSec, m: visMs, x: maxScroll }); }
    flush();
  }
  doc.addEventListener("visibilitychange", function () {
    if (doc.visibilityState === "hidden") pageEnd();
    else { visSince = Date.now(); inView.forEach(function (n) { touch(n, true); }); }
  });
  addEventListener("pagehide", pageEnd);
  addEventListener("scroll", scroll, { passive: true });
  // pages that change without a reload (single-page sites): the old page ends, the new one starts
  function routed() { if (pathNow() === path) return; pageEnd(); setTimeout(pageStart, 0); }
  ["pushState", "replaceState"].forEach(function (m) { var o = history[m]; if (typeof o !== "function") return; history[m] = function () { var r = o.apply(this, arguments); try { routed(); } catch (e) {} return r; }; });
  addEventListener("popstate", routed);

  // ---- clicks and forms: a name, never what was typed ----
  function slug(s, n) { return String(s || "").toLowerCase().replace(/[^a-z0-9_:.\/-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, n); }
  function act(n, v, z, now) { if (!n) return; push({ k: "act", n: n, v: v || "", z: z == null ? null : z }); if (now) flush(); }
  win.CA.act = function (n, v, z) { act(slug(n, 40), v, z, true); };
  function hostOf(a) { try { return new URL(a.href, location.href); } catch (e) { return null; } }
  doc.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target : null; if (!t) return;
    var tag = t.closest("[data-t]"), a = t.closest("a[href]"), btn = t.closest("button,[role=button],input[type=submit],input[type=button]");
    var u = a ? hostOf(a) : null;
    if (u && cvHosts.length && !gpc && vid && cvHosts.indexOf(u.hostname.toLowerCase()) >= 0 && !u.hash) { try { a.href = u.href + "#cv=" + vid; } catch (x) {} }
    if (tag) { var tv = a && u ? (u.hostname === location.hostname ? u.pathname : u.hostname) : ""; return act(slug(tag.getAttribute("data-t"), 40), tv.slice(0, 40), null, true); }
    if (a && u) {
      if (u.protocol === "mailto:" || u.protocol === "tel:") return act(u.protocol.slice(0, -1) + ":click", "", null, false);
      if (u.hostname === location.hostname) return act(slug("go:" + u.pathname.toLowerCase(), 40), u.pathname.slice(0, 40), null, false);
      return act(slug("out:" + u.hostname, 40), u.hostname.slice(0, 40), null, true);
    }
    if (btn) act(slug("btn:" + (btn.id || btn.getAttribute("aria-label") || (btn.textContent || "").trim().slice(0, 24)), 40), "", null, false);
  }, true);
  doc.addEventListener("submit", function (e) { var f = e.target; if (!f) return; var n = f.getAttribute && (f.getAttribute("data-t") || f.id); if (n) act(slug("form:" + n, 40), "", null, true); }, true);

  setInterval(function () { if (doc.visibilityState !== "hidden") flush(); }, 15000);
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", pageStart); else pageStart();
  win.CA.flush = flush;
})();
