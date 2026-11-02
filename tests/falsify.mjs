// node tests/falsify.mjs [--only T05]
// A test that cannot fail proves nothing. For each case this breaks a temporary COPY of the site in the exact way the case
// is meant to catch, runs that one case, and passes only if the case goes RED. The real folder is never touched (checked at the end).
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { launchChrome } from "./lib.mjs";
import { runCases } from "./run.mjs";

const HERE = dirname(fileURLToPath(import.meta.url)), SITE = resolve(HERE, "..");

export const MUTATIONS = {
  T01: [{ file: "index.html", find: 'href="/for-hr"', replace: 'href="/for-hr-gone"', why: "a menu link points at a page that does not exist" },
         { file: "404.html", find: "That page could not be found.", replace: "Nothing here.", why: "the 404 page loses its heading" }],
  T02: [{ file: "index.html", find: '<article class="card g-draw">', replace: '<article class="card g-draw"><a href="https://luckydraw.corporatetambola.com/">x</a>', why: "Lucky Draw gets a link to a game site of its own" },
         { file: "index.html", find: '<a class="g-bingo" href="https://console.corporatetambola.com/#/create" data-game="bingo" aria-label="Corporate Bingo">', replace: '<a class="g-bingo" aria-label="Corporate Bingo">', why: "a game picture is no longer a link" },
         { file: "index.html", find: '<a class="g-bingo" href="https://console.corporatetambola.com/#/create" data-game="bingo" aria-label="Corporate Bingo">', replace: '<a class="g-bingo" href="https://bingo.corporatetambola.com/" data-game="bingo" aria-label="Corporate Bingo">', why: "a game picture points at a game site again" },
         { file: "index.html", find: '<a class="signin-small" href="https://console.corporatetambola.com/">Sign in', replace: '<a class="signin-small" href="https://housie.corporatetambola.com/zc">Sign in', why: "Sign in points at a game site instead of the console" },
         { file: "index.html", find: '<a class="signin-small" href="https://console.corporatetambola.com/">Sign in', replace: '<a class="signin-small" href="https://console.corporatetambola.com/elsewhere.html">Sign in', why: "Sign in points at some other console page" },
         { file: "gamesbar.js", find: 'var HOME = "https://home.corporatetambola.com/";', replace: 'var HOME = "https://games.corporatetambola.com/";', why: "the bar's first item goes to the old hub" }],
  T03: [{ file: "index.html", find: '<script src="/theme.js?v=5"></script>', replace: '<script src="/theme.js?v=5"></script><script src="/missing-file.js"></script>', why: "a script file is missing" }],
  T04: [{ file: "site.css", find: "--muted:#C9C3EA", replace: "--muted:#3A4660", all: true, why: "dark mode grey text becomes unreadable" }],
  T05: [{ file: "gamesbar.js", find: "var skip = skipLink();", replace: "var skip = null;", why: "the bar goes in front of the skip link, so the first Tab lands on the bar" },
         { file: "gamesbar.css", find: ".cgb{position:relative;", replace: ".cgb{position:relative;z-index:900;", why: "the bar covers the skip link when it is focused" },
         { file: "site.css", find: ":focus-visible{outline:3px solid var(--focus);outline-offset:3px;border-radius:8px}", replace: ":focus-visible{outline:none}", why: "the focus ring is removed" }],
  T06: [{ file: "gamesbar.css", find: ".cgb-corp{font-size:12.5px;", replace: ".cgb-corp{font-size:8.5px;", why: "the small CORPORATE line in the bar is tiny again" },
         { file: "site.css", find: ".gn i{font-style:normal;font-size:12.5px;", replace: ".gn i{font-style:normal;font-size:.6em;", why: "the small CORPORATE line on the game badges is tiny again" },
         { file: "site.css", find: ".wrap{width:min(100% - 2*var(--gutter),var(--maxw));margin-inline:auto}", replace: ".wrap{width:min(100% - 2*var(--gutter),var(--maxw));margin-inline:auto;min-width:420px}", why: "one block that is too wide for a phone" }],
  T07: [{ file: "site.css", find: "  .tabbar{display:none}\n  body{padding-bottom:0}", replace: "  body{padding-bottom:0}", why: "the bottom bar stays on a phone on its side" }],
  T08: [{ file: "site.css", find: "@media (min-width:900px){", replace: "@media (min-width:1000px){", why: "the laptop design starts at 1000 px, not 900" },
         { file: "site.css", find: "nav.main a,.top .tbtn{padding:0 9px;font-size:15px}", replace: "nav.main a,.top .tbtn{padding:0 24px;font-size:15px}", why: "top bar links too wide between 900 and 1100 px" }],
  T09: [{ file: "index.html", find: "<h2>Ready to start?</h2>", replace: "<h2>100% secure, bank-grade, Rs 999 only</h2>", why: "a big claim and a price appear" },
         { file: "games.html", find: "<i>Corporate</i> Bingo</span></h2>", replace: "<i>Corporate</i> Bingo</span></h2><span class=\"tag\">Live now</span>", why: "a status tag comes back" },
         { file: "index.html", find: "<h2>Ready to start?</h2>", replace: "<h2>Ready to start? Our team is private.</h2>", why: "the word the owner does not want appears" },
         { file: "terms.html", find: "keep the data confidential and secure", replace: "keep the data confidential and highly secure", why: "the legal text says more than the one approved sentence with the word secure" },
         { file: "for-hr.html", find: '<p class="lead">Corporate Games works closely with HR teams in organizing online events and games.</p>', replace: '<p class="lead">Corporate Games helps HR teams.</p>', why: "the HR page loses the owner's sentence" },
         { file: "index.html", find: "<p class=\"lead\">The organizer chooses and invites the people.", replace: "<p class=\"lead\">Players open one link.", why: "the close-group lead loses its sentence" },
         { file: "terms.html", find: "<h1", replace: "<p>" + "Many more words that are not needed in the legal document. ".repeat(80) + "</p><h1", why: "the legal document grows by hundreds of words" },
         { file: "index.html", find: "<h2>Ready to start?</h2>", replace: "<h2>Ready to start? " + "Many more words that are not needed on this page. ".repeat(40) + "</h2>", why: "the home page grows by hundreds of words" }],
  T10: [{ file: "index.html", find: "<h2>Ready to start?</h2>", replace: "<h1>Ready to start?</h1>", why: "a second h1" },
         { file: "gamesbar.js", find: 'a.setAttribute("aria-current", here(url) ? "page" : "true");', replace: 'a.setAttribute("aria-current", "page");', why: "the bar marks the front page as the current page on every page, next to the menu's own mark" }],
  T11: [{ file: "index.html", find: 'aria-label="Corporate Bingo"><svg class="gb"', replace: 'aria-label="Open Bingo"><svg class="gb"', why: "a link's spoken name no longer contains the words you can see" },
         { file: "site.css", find: "--muted:#4D4870", replace: "--muted:#B5BCCB", why: "light mode grey text is too pale" }],
  T12: [{ file: "sw.js", find: '"/privacy", ', replace: "", why: "a page is no longer saved for offline" }],
  T13: [{ file: "index.html", find: '<link rel="stylesheet" href="/site.css?v=5">', replace: '<link rel="stylesheet" href="/site.css?v=5"><script src="https://stats.example.com/a.js"></script>', why: "an outside tracker is added" }],
  T15: [{ file: "site.css", find: "scroll-padding-top:calc(var(--bar) + 20px)", replace: "scroll-padding-top:0", why: "a heading jumped to hides behind the sticky top bar" }],
  T14: [{ file: "site.js", find: 'localStorage.setItem("cg-theme", next)', replace: "void next", why: "the choice is no longer remembered" }],
};

const hashDir = (d) => { const h = createHash("sha256"); const walk = (p) => { for (const f of readdirSync(p).sort()) { if (f === ".git" || f === "last-run.json") continue; const q = join(p, f); if (statSync(q).isDirectory()) walk(q); else h.update(f).update(readFileSync(q)); } }; walk(d); return h.digest("hex"); };

if (import.meta.url === "file:///" + process.argv[1].replace(/\\/g, "/")) {
  const a = process.argv.slice(2);
  const only = a.includes("--only") ? a[a.indexOf("--only") + 1].split(",") : Object.keys(MUTATIONS);
  const before = hashDir(SITE);
  const chrome = await launchChrome();
  let stayedGreen = 0, invalid = 0, red = 0; const baselines = {};
  try {
    for (const id of only) for (const m of MUTATIONS[id]) {
      const tmp = mkdtempSync(join(tmpdir(), "home-falsify-"));
      try {
        cpSync(SITE, tmp, { recursive: true, filter: (s) => !/[\\/]\.git([\\/]|$)/.test(s) && !/[\\/]tests([\\/]|$)/.test(s) });
        const p = join(tmp, m.file); let src = readFileSync(p, "utf8").replace(/\r\n/g, "\n");
        if (!src.includes(m.find)) { console.log(`INVALID ${id}: text to break not found in ${m.file}: ${m.find.slice(0, 50)}`); invalid++; continue; }
        src = m.all ? src.split(m.find).join(m.replace) : src.replace(m.find, m.replace);
        writeFileSync(p, src);
        if (!baselines[id]) { const [b] = await runCases([id], SITE, chrome.browser); baselines[id] = new Set(b.failed.map((f) => f.name)); if (b.failed.length) console.log(`note ${id}: the clean site already fails ${b.failed.length} check(s) (${[...baselines[id]].slice(0, 2).join(" ; ")}); a mutation counts only if it adds a NEW failure`); }
        const [r0] = await runCases([id], tmp, chrome.browser);
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
