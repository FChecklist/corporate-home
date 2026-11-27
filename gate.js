/* One sign-in, in one place: console.corporatetambola.com. This site has no login of its own and takes no payment.
   Every "Sign in" / "Start" / "demo" link on a page is a plain link to the console (it works without this script).
   What this file adds, and only for people who said "Yes, remember me" in the cookie choice (see consent.js):
     - a repeat visitor sees "Your console" / "Go to your console" instead of "Sign in" / "Sign in or start";
     - the link says visit=repeat instead of visit=first, so the console knows to sign a returning person in straight away if it can.
   It never sends you anywhere by itself, never reads or passes a password, token or ID, and stores one word ("1") only after a yes.
   Staying signed in (2.2.0): on load, ONE plain question goes to the console: "am I signed in?" (GET /api/me, cookies included by the browser, never read here).
   The console answers {"signedIn":true,...} or {"signedIn":false}; only that one true/false is used. If true, the Sign in buttons say "Open console" and the front page says "Signed in".
   The answer lives in a variable while the page is open: it is never written to localStorage, a cookie or anywhere else. Any error, a block, a slow answer (4 seconds) or an odd answer counts as "not signed in" and nothing is shown or logged. */
(function () {
  var VISIT = "ctz-visited";
  var ME = "https://console.corporatetambola.com/api/me";
  var signedIn = false; // memory only, never stored
  /** @type {Record<string, string>} */
  var REPEAT_TEXT = { "Sign in": "Your console", "Sign in or start": "Go to your console" };
  function ok() { return !!(window.ctzConsent && window.ctzConsent.allows("comfort")); }
  function isRepeat() { try { return ok() && localStorage.getItem(VISIT) === "1"; } catch (e) { return false; } }
  function links() { return document.querySelectorAll("a[data-gate]"); }
  /** "Open console"; in the top bar of a small laptop (see site.css) only "Console" shows, so the bar keeps its width */
  /** @param {Element} a */
  function openConsole(a) {
    if (!a.closest("nav.main")) { a.textContent = "Open console"; return; }
    a.textContent = "";
    var o = document.createElement("span"); o.className = "oc-open"; o.textContent = "Open ";
    var c = document.createElement("span"); c.className = "oc-c"; c.textContent = "console";
    a.appendChild(o); a.appendChild(c);
  }
  function apply() {
    var rep = signedIn || isRepeat();
    links().forEach(function (a) {
      a.setAttribute("href", (a.getAttribute("href") || "").replace(/visit=(first|repeat)/, "visit=" + (rep ? "repeat" : "first")));
      if (a.hasAttribute("data-demo")) return;
      if (!a.hasAttribute("data-first-text")) a.setAttribute("data-first-text", a.textContent || "");
      var first = a.getAttribute("data-first-text") || "";
      if (signedIn) openConsole(a); else a.textContent = rep && REPEAT_TEXT[first] ? REPEAT_TEXT[first] : first;
      if (signedIn) a.setAttribute("aria-label", "Signed in. Open console"); else a.removeAttribute("aria-label");
    });
    var note = document.getElementById("signed-note");
    if (note) note.textContent = signedIn ? "Signed in" : "";
  }
  /** @param {boolean} v */
  function set(v) { if (v !== signedIn) { signedIn = v; apply(); } }
  /** asks the console once; every failure is silent and leaves the page as it is */
  function ask() {
    try {
      if (!window.fetch) return;
      var ctl = window.AbortController ? new AbortController() : null;
      var timer = window.setTimeout(function () { if (ctl) ctl.abort(); }, 4000);
      fetch(ME, { method: "GET", mode: "cors", credentials: "include", cache: "no-store", referrerPolicy: "no-referrer", signal: ctl ? ctl.signal : undefined })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { window.clearTimeout(timer); if (j && j.signedIn === true) set(true); else if (j && j.signedIn === false) set(false); })
        .catch(function () { window.clearTimeout(timer); /* blocked, offline, slow or odd: the page stays as it is */ });
    } catch (e) { /* nothing to do */ }
  }
  document.addEventListener("click", function (e) {
    var a = /** @type {Element} */ (e.target).closest("a[data-gate]");
    if (a && ok()) { try { localStorage.setItem(VISIT, "1"); } catch (err) { /* blocked: nothing is remembered */ } }
  }, true);
  document.addEventListener("ctz-consent", apply);
  window.addEventListener("pageshow", function (e) { if (e.persisted) ask(); }); // back button: ask again
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply); else apply();
  ask();
})();
