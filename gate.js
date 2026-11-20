/* One sign-in, in one place: console.corporatetambola.com. This site has no login of its own and takes no payment.
   Every "Sign in" / "Start" / "demo" link on a page is a plain link to the console (it works without this script).
   What this file adds, and only for people who said "Yes, remember me" in the cookie choice (see consent.js):
     - a repeat visitor sees "Your console" / "Go to your console" instead of "Sign in" / "Sign in or start";
     - the link says visit=repeat instead of visit=first, so the console knows to sign a returning person in straight away if it can.
   It never sends you anywhere by itself, never reads or passes a password, token or ID, and stores one word ("1") only after a yes. */
(function () {
  var VISIT = "ctz-visited";
  var REPEAT_TEXT = { "Sign in": "Your console", "Sign in or start": "Go to your console" };
  function ok() { return !!(window.ctzConsent && window.ctzConsent.allows("comfort")); }
  function isRepeat() { try { return ok() && localStorage.getItem(VISIT) === "1"; } catch (e) { return false; } }
  function links() { return document.querySelectorAll("a[data-gate]"); }
  function apply() {
    var rep = isRepeat();
    links().forEach(function (a) {
      a.setAttribute("href", (a.getAttribute("href") || "").replace(/visit=(first|repeat)/, "visit=" + (rep ? "repeat" : "first")));
      if (a.hasAttribute("data-demo")) return;
      if (!a.hasAttribute("data-first-text")) a.setAttribute("data-first-text", a.textContent || "");
      var first = a.getAttribute("data-first-text");
      a.textContent = rep && REPEAT_TEXT[first] ? REPEAT_TEXT[first] : first;
    });
  }
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest && e.target.closest("a[data-gate]");
    if (a && ok()) { try { localStorage.setItem(VISIT, "1"); } catch (err) { /* blocked: nothing is remembered */ } }
  }, true);
  document.addEventListener("ctz-consent", apply);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply); else apply();
})();
