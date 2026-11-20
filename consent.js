/* Cookie and storage choice. Plain words, two equal buttons, nothing stored before you answer.
   What this site keeps on your device:
     - always (it is the thing you asked for): your light/dark and Retro/Modern choice, only when you press those buttons;
     - your answer to this question (so we do not ask on every page);
     - only if you say "Yes, remember me": a small note that you have visited, so the Sign in button can take you straight to your console.
   No advertising, no tracking, no visit counting. Nothing is sent anywhere.
   Other code asks window.ctzConsent.allows("comfort") before it stores anything that is not essential. */
(function () {
  var KEY = "ctz-consent", VISIT = "ctz-visited", VERSION = 1;
  var banner = null, opener = null;

  function read() {
    try { var o = JSON.parse(localStorage.getItem(KEY) || "null"); if (o && o.v === VERSION && typeof o.comfort === "boolean") return o; } catch (e) { /* blocked or damaged: treat as not answered */ }
    return null;
  }
  function write(comfort) {
    var o = { v: VERSION, comfort: comfort, on: new Date().toISOString().slice(0, 10) };
    try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* blocked: the choice lasts until the page is closed */ }
    if (!comfort) { try { localStorage.removeItem(VISIT); } catch (e) { /* nothing to remove */ } }
    return o;
  }
  var memory = null; // when storage is blocked, the answer still counts for this page
  function current() { return read() || memory; }

  function announce() { document.dispatchEvent(new CustomEvent("ctz-consent", { detail: current() })); }

  function close(returnFocus) {
    if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
    banner = null;
    if (returnFocus && opener) opener.focus();
    opener = null;
  }
  function answer(comfort) { memory = write(comfort); close(true); announce(); }

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }

  function open(focus) {
    if (banner) return;
    var b = el("section", "consent");
    b.id = "consent"; b.setAttribute("role", "region"); b.setAttribute("aria-label", "Your choice about cookies and storage");
    var t = el("p", "consent-title", "Your choice about cookies");
    var p = el("p", "consent-text", "This site has no advertising, no tracking and no visit counting. It keeps only what it needs: your light or dark and Retro or Modern choice, and this answer. If you say yes, it also keeps a small note on your device that you have visited, so the Sign in button can take you straight to your console next time. Nothing is sent anywhere. ");
    var a = el("a", "", "Read the details"); a.href = "/privacy#this-website"; p.appendChild(a); p.appendChild(document.createTextNode("."));
    var row = el("div", "consent-row");
    var no = el("button", "btn", "No, thanks"); no.type = "button"; no.setAttribute("data-consent", "no");
    var yes = el("button", "btn", "Yes, remember me"); yes.type = "button"; yes.setAttribute("data-consent", "yes");
    no.addEventListener("click", function () { answer(false); });
    yes.addEventListener("click", function () { answer(true); });
    b.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.stopPropagation(); if (!current()) memory = { v: VERSION, comfort: false }; close(true); } });
    row.appendChild(no); row.appendChild(yes);
    b.appendChild(t); b.appendChild(p); b.appendChild(row);
    document.body.appendChild(b);
    banner = b;
    if (focus) no.focus();
  }

  window.ctzConsent = {
    get: function () { return current(); },
    allows: function (what) { var o = current(); return !!(o && o[what] === true); },
    open: function () { open(true); }
  };

  function start() {
    document.addEventListener("click", function (e) {
      var o = e.target && e.target.closest && e.target.closest("[data-consent-open]");
      if (o) { e.preventDefault(); opener = o; open(true); }
    });
    if (!read()) open(false); // first visit: ask, change nothing, store nothing
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
