/* Menu on the phone design, the light/dark button, the look button (Retro or Modern), and the offline copy. Nothing here talks to any other website. */
(function () {
  var d = document.documentElement;
  var btn = document.getElementById("menu"), nav = document.getElementById("nav");
  function setOpen(o) { nav.classList.toggle("open", o); btn.setAttribute("aria-expanded", o ? "true" : "false"); }
  if (btn && nav) {
    window.matchMedia("(min-width: 900px)").addEventListener("change", function (e) { if (e.matches) setOpen(false); });
    btn.addEventListener("click", function () { setOpen(!nav.classList.contains("open")); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && nav.classList.contains("open")) { setOpen(false); btn.focus(); } });
    nav.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("a[href^='#']")) setOpen(false); });
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
  function lookLabel() { var cur = look(), next = cur === "modern" ? "Retro" : "Modern"; document.querySelectorAll("[data-look-toggle]").forEach(function (b) { b.textContent = "Look: " + (cur === "modern" ? "Modern" : "Retro"); b.setAttribute("aria-label", "Look is " + cur + ". Switch to the " + next + " look"); }); }
  document.querySelectorAll("[data-look-toggle]").forEach(function (b) {
    b.addEventListener("click", function () {
      var next = look() === "modern" ? "retro" : "modern";
      d.setAttribute("data-look", next);
      try { localStorage.setItem("ctz-look", next); } catch (e) { /* blocked: the choice lasts until the page is closed */ }
      lookLabel();
    });
  });
  lookLabel();
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    navigator.serviceWorker.register("/sw.js").catch(function () { /* no offline copy: the site still works online */ });
  }
})();
