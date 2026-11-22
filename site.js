/* Menu on the phone design, the light/dark button, the look button (Retro or Modern), and the offline copy (only after a Yes). Nothing here talks to any other website. */
(function () {
  var d = document.documentElement;
  var btn = /** @type {HTMLElement} */ (document.getElementById("menu")), nav = /** @type {HTMLElement} */ (document.getElementById("nav")); // used only when both exist (see the if below)
  /** @param {boolean} o */
  function setOpen(o) { nav.classList.toggle("open", o); btn.setAttribute("aria-expanded", o ? "true" : "false"); }
  if (btn && nav) {
    window.matchMedia("(min-width: 900px)").addEventListener("change", function (e) { if (e.matches) setOpen(false); });
    btn.addEventListener("click", function () { setOpen(!nav.classList.contains("open")); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && nav.classList.contains("open")) { setOpen(false); btn.focus(); } });
    nav.addEventListener("click", function (e) { if (/** @type {Element} */ (e.target).closest("a[href^='#']")) setOpen(false); });
  }
  function dark() { var t = d.getAttribute("data-theme"); return t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches; }
  function label() { var n = dark() ? "Light" : "Dark"; document.querySelectorAll("[data-theme-toggle]").forEach(function (b) { b.textContent = n; b.setAttribute("aria-label", "Switch to " + n.toLowerCase() + " colours"); }); }
  document.querySelectorAll("[data-theme-toggle]").forEach(function (b) {
    b.addEventListener("click", function () {
      var next = dark() ? "light" : "dark";
      d.setAttribute("data-theme", next);
      try { localStorage.setItem("cg-theme", next); } catch (e) { /* blocked: the choice lasts until the page is closed */ }
      label();
    });
  });
  label();
  /* the look: Retro (burgundy + gold) or Modern (night navy + neon). Saved as ctz-look, the same name the games use. */
  function look() { return d.getAttribute("data-look") === "modern" ? "modern" : "retro"; }
  function lookLabel() { var cur = look(), next = cur === "modern" ? "Retro" : "Modern"; document.querySelectorAll("[data-look-toggle]").forEach(function (b) { b.textContent = "Look: " + (cur === "modern" ? "Modern" : "Retro"); b.setAttribute("aria-label", "Look: " + (cur === "modern" ? "Modern" : "Retro") + ". Switch to the " + next + " look"); }); }
  document.querySelectorAll("[data-look-toggle]").forEach(function (b) {
    b.addEventListener("click", function () {
      var next = look() === "modern" ? "retro" : "modern";
      d.setAttribute("data-look", next);
      try { localStorage.setItem("ctz-look", next); } catch (e) { /* blocked: the choice lasts until the page is closed */ }
      lookLabel();
    });
  });
  lookLabel();
  /* The offline copy of the pages is kept only after a "Yes" in the cookie choice. After a "No" (or while nothing is answered, or your browser sends a privacy signal) any copy is removed and none is made.
     The helper (sw.js) is told to stop and removes itself. An older helper cannot be told, so while one still runs this page, the saved files are removed again every 0.3 seconds. */
  /** @type {number} */
  var watching = 0;
  function yes() { return !!(window.ctzConsent && window.ctzConsent.allows("comfort")); }
  /** removes every saved copy this site made (their names start with "home-") */
  function wipe() {
    if (window.caches) caches.keys().then(function (ks) { ks.forEach(function (k) { if (k.indexOf("home-") === 0) caches.delete(k); }); }).catch(function () { /* nothing to remove */ });
  }
  /** asks the helper to keep the offline copy (only ever called after a Yes) */
  function keep() {
    navigator.serviceWorker.ready.then(function (r) { if (r.active && yes()) r.active.postMessage({ type: "ctz-keep" }); }).catch(function () { /* no offline copy: the site still works online */ });
  }
  function offline() {
    if (!("serviceWorker" in navigator) || !(location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) return;
    var sw = navigator.serviceWorker;
    if (yes()) {
      if (watching) { clearInterval(watching); watching = 0; }
      sw.register("/sw.js").then(keep).catch(function () { /* no offline copy: the site still works online */ });
      return;
    }
    if (sw.controller) sw.controller.postMessage({ type: "ctz-stop" });
    sw.getRegistrations().then(function (rs) {
      rs.forEach(function (r) { [r.active, r.waiting, r.installing].forEach(function (w) { if (w) w.postMessage({ type: "ctz-stop" }); }); r.unregister(); });
    }).catch(function () { /* nothing to remove */ }).then(wipe);
    wipe();
    if (sw.controller && !watching) watching = window.setInterval(function () { if (yes()) { clearInterval(watching); watching = 0; } else wipe(); }, 300);
  }
  if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("controllerchange", function () { if (yes()) keep(); });
  document.addEventListener("ctz-consent", offline);
  offline();
})();
