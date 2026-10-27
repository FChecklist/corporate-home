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
  T01: [{ file: "index.html", find: 'href="/for-hr"', replace: 'href="/for-hr-gone"', why: "a menu link points at a page that does not exist" }],
  T02: [{ file: "index.html", find: '<article class="card soon">', replace: '<article class="card soon"><a href="https://luckydraw.corporatetambola.com/">x</a>', why: "Lucky Draw gets a link before it exists" }],
  T03: [{ file: "index.html", find: '<script src="/theme.js"></script>', replace: '<script src="/theme.js"></script><script src="/missing-file.js"></script>', why: "a script file is missing" }],
  T04: [{ file: "site.css", find: "--muted:#A9B5CE", replace: "--muted:#3A4660", all: true, why: "dark mode grey text becomes unreadable" }],
  T05: [{ file: "site.css", find: ":focus-visible{outline:3px solid var(--focus);outline-offset:3px;border-radius:6px}", replace: ":focus-visible{outline:none}", why: "the focus ring is removed" }],
  T06: [{ file: "site.css", find: ".brand{display:flex;", replace: ".brand{min-width:430px;display:flex;", why: "one element that is too wide for a phone" }],
  T07: [{ file: "site.css", find: "  .tabbar{display:none}\n  body{padding-bottom:0}", replace: "  body{padding-bottom:0}", why: "the bottom bar stays on a phone on its side" }],
  T08: [{ file: "site.css", find: "@media (min-width:900px){", replace: "@media (min-width:1000px){", why: "the laptop design starts at 1000 px, not 900" },
         { file: "site.css", find: "nav.main a,.top .tbtn{padding:0 9px;font-size:15px}", replace: "nav.main a,.top .tbtn{padding:0 24px;font-size:15px}", why: "top bar links too wide between 900 and 1100 px" }],
  T09: [{ file: "index.html", find: "<h2>Three steps.</h2>", replace: "<h2>100% secure, bank-grade, Rs 999 only</h2>", why: "a big claim and a price appear" }],
  T10: [{ file: "index.html", find: "<h2>Three steps.</h2>", replace: "<h1>Three steps.</h1>", why: "a second h1" }],
  T11: [{ file: "site.css", find: "--muted:#4F5B73", replace: "--muted:#B5BCCB", why: "light mode grey text is too pale" }],
  T12: [{ file: "sw.js", find: '"/privacy", ', replace: "", why: "a page is no longer saved for offline" }],
  T13: [{ file: "index.html", find: '<link rel="stylesheet" href="/site.css">', replace: '<link rel="stylesheet" href="/site.css"><script src="https://stats.example.com/a.js"></script>', why: "an outside tracker is added" }],
  T14: [{ file: "site.js", find: 'localStorage.setItem("cg-theme", next)', replace: "void next", why: "the choice is no longer remembered" }],
};

const hashDir = (d) => { const h = createHash("sha256"); const walk = (p) => { for (const f of readdirSync(p).sort()) { if (f === ".git" || f === "last-run.json") continue; const q = join(p, f); if (statSync(q).isDirectory()) walk(q); else h.update(f).update(readFileSync(q)); } }; walk(d); return h.digest("hex"); };

if (import.meta.url === "file:///" + process.argv[1].replace(/\\/g, "/")) {
  const a = process.argv.slice(2);
  const only = a.includes("--only") ? a[a.indexOf("--only") + 1].split(",") : Object.keys(MUTATIONS);
  const before = hashDir(SITE);
  const chrome = await launchChrome();
  let stayedGreen = 0, invalid = 0, red = 0;
  try {
    for (const id of only) for (const m of MUTATIONS[id]) {
      const tmp = mkdtempSync(join(tmpdir(), "home-falsify-"));
      try {
        cpSync(SITE, tmp, { recursive: true, filter: (s) => !/[\\/]\.git([\\/]|$)/.test(s) && !/[\\/]tests([\\/]|$)/.test(s) });
        const p = join(tmp, m.file); let src = readFileSync(p, "utf8").replace(/\r\n/g, "\n");
        if (!src.includes(m.find)) { console.log(`INVALID ${id}: text to break not found in ${m.file}: ${m.find.slice(0, 50)}`); invalid++; continue; }
        src = m.all ? src.split(m.find).join(m.replace) : src.replace(m.find, m.replace);
        writeFileSync(p, src);
        const [r] = await runCases([id], tmp, chrome.browser);
        if (r.failed.length) { red++; console.log(`RED (good)  ${id}  ${m.why}  -> ${r.failed.length} of ${r.checks} checks failed, e.g. "${r.failed[0].name}"`); }
        else { stayedGreen++; console.log(`STAYED GREEN (bad)  ${id}  ${m.why}`); }
      } finally { rmSync(tmp, { recursive: true, force: true }); }
    }
  } finally { await chrome.close(); }
  const after = hashDir(SITE);
  console.log(`\n${red} went red, ${stayedGreen} stayed green, ${invalid} invalid; real folder untouched: ${before === after}`);
  process.exit(stayedGreen || invalid || before !== after ? 1 : 0);
}
