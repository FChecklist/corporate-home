/* Cookie and storage choice. Plain words, two equal buttons, nothing stored before you answer (the offline copy of the pages waits for a Yes too).
   What this site keeps on your device:
     - always (it is the thing you asked for): your light/dark and Retro/Modern choice, only when you press those buttons;
     - your answer to this question (so we do not ask on every page);
     - only if you say "Yes, remember me": a small note that you have visited, so the Sign in button can take you straight to your console.
   No advertising, no tracking, no visit counting. Nothing is sent anywhere.
   Privacy signals: if your browser sends Global Privacy Control (or the older Do Not Track), that counts as "No" until you press "Yes" yourself, and nothing is asked or stored before then.
   Other code asks window.ctzConsent.allows("comfort") before it stores anything that is not essential. */
(function () {
  var KEY = "ctz-consent", VISIT = "ctz-visited", VERSION = 1;
  /** @type {HTMLElement | null} */
  var banner = null;
  /** @type {HTMLElement | null} */
  var opener = null;

  /** true when the browser sends a privacy signal: Global Privacy Control, or the older Do Not Track */
  function signal() {
    try {
      var n = /** @type {any} */ (navigator), w = /** @type {any} */ (window);
      return n.globalPrivacyControl === true || n.doNotTrack === "1" || w.doNotTrack === "1" || n.msDoNotTrack === "1";
    } catch (e) { return false; }
  }
  function read() {
    try { var o = JSON.parse(localStorage.getItem(KEY) || "null"); if (o && o.v === VERSION && typeof o.comfort === "boolean") return o; } catch (e) { /* blocked or damaged: treat as not answered */ }
    return null;
  }
  /** @param {boolean} comfort */
  function write(comfort) {
    /** @type {{ v: number, comfort: boolean, on?: string, s?: number }} */
    var o = { v: VERSION, comfort: comfort, on: new Date().toISOString().slice(0, 10) };
    if (comfort && signal()) o.s = 1; // a Yes pressed while the signal is on is your own word, so it beats the signal
    try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* blocked: the choice lasts until the page is closed */ }
    if (!comfort) { try { localStorage.removeItem(VISIT); } catch (e) { /* nothing to remove */ } }
    return o;
  }
  /** @type {{ v: number, comfort: boolean, on?: string, s?: number } | null} */
  var memory = null; // when storage is blocked, the answer still counts for this page
  /** The answer that counts now. Your own answer first; a Yes given before the signal was on loses to the signal; no answer plus a signal is a No (stored nowhere). */
  function current() {
    var o = read() || memory;
    if (signal() && (!o || (o.comfort && !o.s))) return { v: VERSION, comfort: false };
    return o;
  }

  function announce() { document.dispatchEvent(new CustomEvent("ctz-consent", { detail: current() })); }

  /** @param {boolean} returnFocus */
  function close(returnFocus) {
    if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
    banner = null;
    if (returnFocus && opener) opener.focus();
    opener = null;
  }
  /** @param {boolean} comfort */
  function answer(comfort) { memory = write(comfort); close(true); announce(); }

  /** @param {string} tag @param {string} cls @param {string} [text] */
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }

  /** @param {boolean} focus */
  function open(focus) {
    if (banner) return;
    var b = el("section", "consent");
    b.id = "consent"; b.setAttribute("role", "region"); b.setAttribute("aria-label", "Your choice about cookies and storage");
    var t = el("p", "consent-title", "Your choice about cookies");
    var p = el("p", "consent-text", "No advertising, no tracking, no visit counting. Say yes and your device keeps a small visit note and an offline copy of these pages. Say no and it keeps only this answer. ");
    if (signal()) p.appendChild(document.createTextNode("Your browser asks sites not to track you, so this counts as No until you press Yes. "));
    var a = /** @type {HTMLAnchorElement} */ (el("a", "", "Read the details")); a.href = "/privacy#this-website"; p.appendChild(a); p.appendChild(document.createTextNode("."));
    var row = el("div", "consent-row");
    var no = /** @type {HTMLButtonElement} */ (el("button", "btn", "No, thanks")); no.type = "button"; no.setAttribute("data-consent", "no");
    var yes = /** @type {HTMLButtonElement} */ (el("button", "btn", "Yes, remember me")); yes.type = "button"; yes.setAttribute("data-consent", "yes");
    no.addEventListener("click", function () { answer(false); });
    yes.addEventListener("click", function () { answer(true); });
    b.addEventListener("keydown", function (/** @type {KeyboardEvent} */ e) { if (e.key === "Escape") { e.stopPropagation(); if (!current()) memory = { v: VERSION, comfort: false }; close(true); } });
    row.appendChild(no); row.appendChild(yes);
    b.appendChild(t); b.appendChild(p); b.appendChild(row);
    document.body.appendChild(b);
    banner = b;
    if (focus) no.focus();
  }

  window.ctzConsent = {
    get: function () { return current(); },
    allows: /** @param {"comfort"} what */ function (what) { var o = current(); return !!(o && o[what] === true); },
    open: function () { open(true); }
  };

  function start() {
    document.addEventListener("click", function (e) {
      var o = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest("[data-consent-open]"));
      if (o) { e.preventDefault(); opener = o; open(true); }
    });
    if (signal()) { // a privacy signal counts as No: do not ask, store nothing; a Yes you gave before the signal is forgotten here too
      var o = read();
      if (o && o.comfort && !o.s) { try { localStorage.removeItem(VISIT); } catch (e) { /* nothing to remove */ } }
      return;
    }
    if (!read()) open(false); // first visit: ask, change nothing, store nothing
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
