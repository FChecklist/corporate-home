// node tests/falsify.mjs [--only T05]
// A test that cannot fail proves nothing. For each case this breaks a temporary COPY of the site in the exact way the case
// is meant to catch, runs that one case, and passes only if the case goes RED. The real folder is never touched (checked at the end).
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { launchChrome, isMain } from "./lib.mjs";
import { runCases } from "./run.mjs";

const HERE = dirname(fileURLToPath(import.meta.url)), SITE = resolve(HERE, "..");

export const MUTATIONS = {
  T01: [{ file: "index.html", find: 'href="/for-hr"', replace: 'href="/for-hr-gone"', why: "a menu link points at a page that does not exist" }],
  T02: [{ file: "index.html", find: '<article class="card g-draw">', replace: '<article class="card g-draw"><a href="https://luckydraw.corporatetambola.com/">x</a>', why: "Lucky Draw gets a link before it exists" },
         { file: "index.html", find: '<li><a class="g-bingo" href="https://bingo.corporatetambola.com/" aria-label="Corporate Bingo">', replace: '<li><a class="g-bingo" aria-label="Corporate Bingo">', why: "a game picture is no longer a link" },
         { file: "index.html", find: '<a class="btn main" href="https://console.corporatetambola.com/?from=home&amp;visit=first" data-gate>Sign in</a>', replace: '<a class="btn main" href="https://housie.corporatetambola.com/zc">Sign in</a>', why: "Sign in goes to a game's own login again" },
         { file: "gamesbar.js", find: 'var HOME = "https://home.corporatetambola.com/";', replace: 'var HOME = "https://games.corporatetambola.com/";', why: "the bar's first item goes to the old hub" }],
  T03: [{ file: "index.html", find: '<script src="/theme.js?v=6"></script>', replace: '<script src="/theme.js?v=6"></script><script src="/missing-file.js"></script>', why: "a script file is missing" }],
  T04: [{ file: "site.css", find: "--muted:#DDC4B2", replace: "--muted:#4A2A33", all: true, why: "dark mode grey text becomes unreadable" }],
  T05: [{ file: "gamesbar.js", find: "var skip = skipLink();", replace: "var skip = null;", why: "the bar goes in front of the skip link, so the first Tab lands on the bar" },
         { file: "gamesbar.css", find: ".cgb{position:relative;", replace: ".cgb{position:relative;z-index:900;", why: "the bar covers the skip link when it is focused" },
         { file: "site.css", find: ":focus-visible{outline:3px solid var(--focus);outline-offset:3px;border-radius:8px}", replace: ":focus-visible{outline:none}", why: "the focus ring is removed" }],
  T06: [{ file: "gamesbar.css", find: ".cgb-corp{font-size:12.5px;", replace: ".cgb-corp{font-size:8.5px;", why: "the small CORPORATE line in the bar is tiny again" },
         { file: "site.css", find: ".gn i{font-style:normal;font-size:12.5px;", replace: ".gn i{font-style:normal;font-size:.6em;", why: "the small CORPORATE line on the game badges is tiny again" },
         { file: "site.css", find: ".wrap{width:min(100% - 2*var(--gutter),var(--maxw));margin-inline:auto}", replace: ".wrap{width:min(100% - 2*var(--gutter),var(--maxw));margin-inline:auto;min-width:420px}", why: "one block that is too wide for a phone" }],
  T07: [{ file: "site.css", find: "@media (max-height:480px){\n  .tabbar{display:none}", replace: "@media (max-height:480px){", why: "the bottom bar stays on a phone on its side" }],
  T08: [{ file: "site.css", find: "@media (max-width:899.98px){", replace: "@media (max-width:999.98px){", all: true, why: "the phone design runs up to 999 px, so 900 is still a phone" },
         { file: "site.css", find: "nav.main a,.top .tbtn{padding:0 9px;font-size:15px}", replace: "nav.main a,.top .tbtn{padding:0 24px;font-size:15px}", why: "top bar links too wide between 900 and 1100 px" }],
  T09: [{ file: "index.html", find: "<h2>Ready to start?</h2>", replace: "<h2>100% secure, bank-grade, Rs 999 only</h2>", why: "a big claim and a price appear" },
         { file: "games.html", find: "<i>Corporate</i> Bingo</span></h2>", replace: "<i>Corporate</i> Bingo</span></h2><span class=\"tag\">Live now</span>", why: "a status tag comes back" },
         { file: "index.html", find: "<h2>Ready to start?</h2>", replace: "<h2>Ready to start? Our team is private.</h2>", why: "the word the owner does not want appears" },
         { file: "index.html", find: "<h2>Ready to start?</h2>", replace: "<h2>Ready to start? " + "Many more words that are not needed on this page. ".repeat(40) + "</h2>", why: "the home page grows by hundreds of words" }],
  T10: [{ file: "index.html", find: "<h2>Ready to start?</h2>", replace: "<h1>Ready to start?</h1>", why: "a second h1" },
         { file: "gamesbar.js", find: 'a.setAttribute("aria-current", here(url) ? "page" : "true");', replace: 'a.setAttribute("aria-current", "page");', why: "the bar marks the front page as the current page on every page, next to the menu's own mark" }],
  T11: [{ file: "index.html", find: 'aria-label="Corporate Bingo"><svg class="gb"', replace: 'aria-label="Open Bingo"><svg class="gb"', why: "a link's spoken name no longer contains the words you can see" },
         { file: "site.css", find: "--muted:#5C3B43", replace: "--muted:#C9B7A5", why: "light mode grey text is too pale" }],
  T12: [{ file: "sw.js", find: '"/privacy", ', replace: "", why: "a page is no longer saved for offline" }],
  T13: [{ file: "index.html", find: '<link rel="stylesheet" href="/site.css?v=7">', replace: '<link rel="stylesheet" href="/site.css?v=7"><script src="https://stats.example.com/a.js"></script>', why: "an outside tracker is added" }],
  T15: [{ file: "site.css", find: "scroll-padding-top:calc(var(--bar) + 20px)", replace: "scroll-padding-top:0", why: "a heading jumped to hides behind the sticky top bar" }],
  T14: [{ file: "site.js", find: 'localStorage.setItem("cg-theme", next)', replace: "void next", why: "the choice is no longer remembered" }],
  // ---- Home v2.0.0 (T16 to T21) ----
  T16: [{ file: "consent.js", find: "if (!read()) open(false);", replace: "if (!read()) { write(true); open(false); }", why: "the site stores 'yes' before anyone has answered" },
        { file: "consent.js", find: 'el("button", "btn", "Yes, remember me")', replace: 'el("button", "btn main", "Yes, remember me")', why: "the Yes button is made more eye-catching than No (dark pattern)" },
        { file: "consent.js", find: "if (!comfort) { try { localStorage.removeItem(VISIT); } catch (e) { /* nothing to remove */ } }", replace: "", why: "saying No later does not forget the visit note" },
        { file: "consent.js", find: 'if (e.key === "Escape")', replace: 'if (e.key === "F24")', why: "Escape no longer closes the question" },
        { file: "site.css", find: ".consent-row{display:flex;flex-wrap:wrap;gap:10px}", replace: ".consent-row{display:flex;flex-wrap:wrap;gap:10px;padding-bottom:60vh}", why: "the question swallows the phone screen" },
        { file: "index.html", find: '<script src="/theme.js?v=6"></script>', replace: '<script src="/theme.js?v=6"></script><script src="https://stats.example.com/a.js"></script>', why: "a tracker loads before anyone has answered" }],
  T17: [{ file: "index.html", find: '<a class="btn main" href="https://console.corporatetambola.com/?from=home&amp;visit=first" data-gate>Sign in</a>', replace: '<a class="btn main" href="https://housie.corporatetambola.com/zc" data-gate>Sign in</a>', why: "the top Sign in goes to a game's own login" },
        { file: "gate.js", find: "if (a && ok()) {", replace: "if (a) {", why: "a click stores the visit even when you said No" },
        { file: "gate.js", find: "document.addEventListener(\"ctz-consent\", apply);", replace: "document.addEventListener(\"ctz-consent\", apply); if (isRepeat()) location.assign(links()[0].href);", why: "a repeat visitor is pushed to the console without clicking" },
        { file: "gate.js", find: 'var REPEAT_TEXT = { "Sign in": "Your console", "Sign in or start": "Go to your console" };', replace: "var REPEAT_TEXT = {};", why: "a repeat visitor sees the first-visit words" },
        { file: "index.html", find: '<h2>Ready to start?</h2>', replace: '<h2>Ready to start?</h2><input type="password" aria-label="Password">', why: "the home page grows its own password box" },
        { file: "pricing.html", find: 'https://console.corporatetambola.com/?from=home&amp;visit=first&amp;demo=tambola', replace: 'https://console.corporatetambola.com/?from=home&amp;visit=first&amp;demo=tambola&amp;token=abc123', why: "a secret-looking value rides along in the hand-off address" }],
  T18: [{ file: "index.html", find: '<link rel="canonical" href="https://home.corporatetambola.com/">', replace: "", why: "the home page loses its canonical address" },
        { file: "games.html", find: "<h1", replace: "<h1 data-x=1>Second heading</h1><h1", why: "a second H1 on the games page" },
        { file: "contact.html", find: '<meta property="og:image" content="https://home.corporatetambola.com/og-image.png">', replace: "", why: "the share picture is gone from the contact page" },
        { file: "sitemap.xml", find: "<url><loc>https://home.corporatetambola.com/pricing</loc><lastmod>2026-11-21</lastmod></url>\n", replace: "", why: "the pricing page falls out of the sitemap" },
        { file: "index.html", find: '"@type": "Organization",', replace: '"@type": "Organization"', why: "the structured data on the home page is broken (missing comma)" },
        { file: "robots.txt", find: "User-agent: *\nAllow: /", replace: "User-agent: *\nDisallow: /", why: "robots.txt blocks every crawler" },
        { file: "privacy.html", find: '<meta name="description" content="What is erased and when', replace: '<meta name="description" content="Erased', why: "the privacy description is far too short" }],
  T19: [{ file: "pricing.html", find: "&#8377;3,499", replace: "&#8377;3,449", why: "a pack price is wrong on the page (and no longer agrees with the data)" },
        { file: "pricing.html", find: '"price": 4699,', replace: '"price": 4690,', why: "the structured data price differs from the table" },
        { file: "pricing.html", find: "<tr><th scope=\"row\"><span class=\"lab\">Credits</span>750 credits</th><td><span class=\"lab\">Price in rupees</span>&#8377;5,899</td><td><span class=\"lab\">Price in US dollars</span>$84</td></tr>\n", replace: "", why: "the 750 pack is missing" },
        { file: "pricing.html", find: "The only way to pay is Razorpay.", replace: "You can pay through Moneypenny.", why: "the payment chain is described wrongly and the backend is named" },
        { file: "pricing.html", find: "no GST is added", replace: "GST is extra", why: "GST appears" }],
  T20: [{ file: "index.html", find: "No one knows the next number: not the organizer, not the host, not even the software.", replace: "Fair play, always.", why: "the fairness line is gone" },
        { file: "index.html", find: "Designed to follow US privacy laws, EU GDPR and India&rsquo;s DPDP.", replace: "Designed to be 100% secure.", why: "an unproven security claim replaces the privacy line" },
        { file: "privacy.html", find: "We keep billing data for audit and tax reasons.", replace: "We keep billing records forever.", why: "the billing sentence says forever" },
        { file: "how-it-works.html", find: "You (the company) give the prizes directly to the winners.", replace: "We never hold or pay prize money.", why: "the old prize sentence comes back" },
        { file: "index.html", find: "You invite people by ID only. No names, no mobile numbers and no personal details are needed.", replace: "Players tick two boxes before they join.", why: "tick boxes come back, ID-only invite is gone" },
        { file: "index.html", find: "<b>Tambola and Bingo. No one knows the next number:", replace: "<b>No one knows the next number:", why: "the fairness line is claimed for every game again, not only the number games" },
        { file: "how-it-works.html", find: "<h2>Ready to start?</h2>", replace: "<h2>Ready to start?</h2><p>No one knows the next number: not the organizer, not the host, not even the software.</p>", why: "the fairness line is repeated on a page about games that draw no numbers" },
        { file: "privacy.html", find: "The winners record: who won which prize, by number</td>", replace: "Contact details a winner confirms to receive a prize</td>", why: "the 365-day prize-contact line is back" }],
  T21: [{ file: "tools/build.mjs", find: '"<!--ver-->" + shortV + "<!--/ver-->");\n  if (f === "changes.html")', replace: '"<!--ver-->v9.9.9<!--/ver-->");\n  if (f === "changes.html")', why: "the footer shows a different version than version.json" },
        { file: "version.json", find: '"version": "2.1.0",', replace: '"version": "2.1.1",', why: "version bumped in version.json only (build must refuse)" },
        { file: "CHANGELOG.md", find: "## 2.1.0 (21 Nov 2026)", replace: "## 1.9.9 (21 Nov 2026)", why: "no CHANGELOG entry for this version (build must refuse)" },
        { file: "_headers", find: "/version.json\n  Cache-Control: no-store", replace: "/version.json\n  Cache-Control: public, max-age=86400", why: "version.json may be cached for a day" },
        { file: "changes.html", find: "<!--changes-->", replace: "<!--changes-gone-->", why: "the /changes page loses its list marker (build must refuse)" },
        { file: "version.json", find: '"what": "If your browser sends a privacy signal', replace: '"what": "Fixed a CSP token leak in gate.js (commit 5df73d2a328e); If your browser sends a privacy signal', why: "internal details leak into the public What's new list" }],

  // ---- 2.1.0: honest offline copy, privacy signal, 360 px (T22, T23) ----
  T22: [{ file: "sw.js", find: 'self.addEventListener("install", (e) => { e.waitUntil(self.skipWaiting()); });', replace: 'self.addEventListener("install", (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())); });', why: "the helper starts saving by itself when installed, before any Yes" },
        { file: "sw.js", find: "caches.has(V).then((has) => { if (has && !stopped) return", replace: "Promise.resolve().then(() => { if (!stopped) return", why: "the helper makes a new saved copy by itself, so a No cannot keep it away" },
        { file: "site.js", find: "if (sw.controller && !watching) watching = window.setInterval(", replace: "if (false && !watching) watching = window.setInterval(", why: "nobody removes the files an older helper saves after a No" },
        { file: "site.js", find: "rs.forEach(function (r) { [r.active, r.waiting, r.installing].forEach(function (w) { if (w) w.postMessage({ type: \"ctz-stop\" }); }); r.unregister(); });", replace: "void rs;", why: "a No leaves the helper registered" },
        { file: "site.js", find: 'if (r.active && yes()) r.active.postMessage({ type: "ctz-keep" });', replace: "void r;", why: "a Yes never starts the offline copy" },
        { file: "consent.js", find: "if (signal()) { // a privacy signal counts as No: do not ask", replace: "if (false) { // a privacy signal counts as No: do not ask", why: "the question is asked even when the browser sends a privacy signal" },
        { file: "consent.js", find: "if (signal() && (!o || (o.comfort && !o.s))) return { v: VERSION, comfort: false };", replace: "", why: "an old Yes still beats the browser's privacy signal" },
        { file: "consent.js", find: "if (comfort && signal()) o.s = 1;", replace: "", why: "a Yes pressed with the signal on is not recognised as the visitor's own word" },
        { file: "consent.js", find: 'n.globalPrivacyControl === true || n.doNotTrack === "1" || w.doNotTrack === "1" || n.msDoNotTrack === "1"', replace: 'n.doNotTrack === "1"', why: "Global Privacy Control is ignored" },
        { file: "privacy.html", find: "if your browser sends Global Privacy Control (or Do Not Track), it counts as No.", replace: "your browser may send a signal.", why: "the privacy page no longer tells people about the signal" }],
  T23: [{ file: "site.css", find: ".consent-row{display:flex;flex-wrap:wrap;gap:10px}", replace: ".consent-row{display:flex;flex-wrap:wrap;gap:10px;min-width:420px}", why: "the cookie question is wider than a 360 px phone" },
        { file: "site.css", find: ".consent-text{margin:0 auto 12px;font-size:15.5px;line-height:1.5;color:var(--ink)}", replace: ".consent-text{margin:0 auto 12px;font-size:15.5px;line-height:1.5;color:var(--ink);white-space:nowrap}", why: "the cookie question text cannot wrap, so a phone scrolls sideways" }],
};

const hashDir = (d) => { const h = createHash("sha256"); const walk = (p) => { for (const f of readdirSync(p).sort()) { if (f === ".git" || f === "last-run.json" || f === "node_modules" || f === "dist") continue; const q = join(p, f); if (statSync(q).isDirectory()) walk(q); else h.update(f).update(readFileSync(q)); } }; walk(d); return h.digest("hex"); };

if (isMain(import.meta.url)) {
  const a = process.argv.slice(2);
  const only = a.includes("--only") ? a[a.indexOf("--only") + 1].split(",") : Object.keys(MUTATIONS);
  execFileSync(process.execPath, [join(SITE, "tools", "build.mjs")], { cwd: SITE, stdio: "inherit" });
  const before = hashDir(SITE);
  const chrome = await launchChrome();
  let stayedGreen = 0, invalid = 0, red = 0; const baselines = {};
  try {
    for (const id of only) for (const m of MUTATIONS[id]) {
      const tmp = mkdtempSync(join(tmpdir(), "home-falsify-"));
      try {
        cpSync(SITE, tmp, { recursive: true, filter: (s) => !/[\\/]\.git([\\/]|$)/.test(s) && !/[\\/]tests([\\/]|$)/.test(s) && !/[\\/](node_modules|dist)([\\/]|$)/.test(s) });
        const p = join(tmp, m.file); let src = readFileSync(p, "utf8").replace(/\r\n/g, "\n");
        if (!src.includes(m.find)) { console.log(`INVALID ${id}: text to break not found in ${m.file}: ${m.find.slice(0, 50)}`); invalid++; continue; }
        src = m.all ? src.split(m.find).join(m.replace) : src.replace(m.find, m.replace);
        writeFileSync(p, src);
        // build the broken copy the way production does; a build that refuses is a red result too (that is the gate doing its job)
        let refused = "";
        try { execFileSync(process.execPath, [join(tmp, "tools", "build.mjs")], { cwd: tmp, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); } catch (e) { refused = String(e.stderr || e.message).split("\n")[0]; }
        if (refused) { red++; console.log(`RED (good)  ${id}  ${m.why}  -> the build refused: ${refused}`); continue; }
        if (!baselines[id]) { const [b] = await runCases([id], join(SITE, "dist"), chrome.browser); baselines[id] = new Set(b.failed.map((f) => f.name)); if (b.failed.length) console.log(`note ${id}: the clean site already fails ${b.failed.length} check(s) (${[...baselines[id]].slice(0, 2).join(" ; ")}); a mutation counts only if it adds a NEW failure`); }
        const [r0] = await runCases([id], join(tmp, "dist"), chrome.browser);
        const r = { ...r0, failed: r0.failed.filter((f) => !baselines[id].has(f.name)) };
        if (r.failed.length) { red++; console.log(`RED (good)  ${id}  ${m.why}  -> ${r.failed.length} of ${r.checks} checks failed, e.g. "${r.failed[0].name}"`); }
        else { stayedGreen++; console.log(`STAYED GREEN (bad)  ${id}  ${m.why}`); }
      } finally { rmSync(tmp, { recursive: true, force: true }); }
    }
  } finally { await chrome.close(); }
  const after = hashDir(SITE);
  console.log(`\n${red} went red, ${stayedGreen} stayed green, ${invalid} invalid; real folder untouched: ${before === after}`);
  process.exit(stayedGreen || invalid || before !== after ? 1 : 0);
}
