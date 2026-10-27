/* Runs first, before the page is drawn: marks the page as script-capable and applies the saved light or dark choice. The choice lives on this device only. */
(function () {
  var d = document.documentElement;
  d.classList.add("js");
  try { var t = localStorage.getItem("cg-theme"); if (t === "dark" || t === "light") d.setAttribute("data-theme", t); } catch (e) { /* storage blocked: follow the device */ }
})();
