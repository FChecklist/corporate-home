/* Runs first, before the page is drawn: marks the page as script-capable and applies the saved look (Retro or Modern) and light or dark choice. The choices live on this device only. */
(function () {
  var d = document.documentElement;
  d.classList.add("js");
  d.setAttribute("data-look", "retro");
  try { var t = localStorage.getItem("cg-theme"); if (t === "dark" || t === "light") d.setAttribute("data-theme", t); } catch (e) { /* storage blocked: follow the device */ }
  try { if (localStorage.getItem("ctz-look") === "modern") d.setAttribute("data-look", "modern"); } catch (e) { /* storage blocked: Retro */ }
})();
