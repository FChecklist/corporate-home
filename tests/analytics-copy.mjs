// Visitor analytics on home (3 Nov 2026): the tracker files are byte-for-byte copies of site-analytics (C:/ct/test-sites/site-analytics; line endings ignored), every page except the offline and 404 pages
// loads the tracker once and hands the visitor code only to the console address, and the page that answers /api/t is the shared collector. No browser needed: node tests/analytics-copy.mjs
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
const here = (f) => new URL("../" + f, import.meta.url);
const sha = (f) => createHash("sha256").update(readFileSync(here(f), "utf8").split("\r").join("")).digest("hex");
let bad = 0, n = 0;
const check = (name, ok, detail = "") => { n++; if (!ok) { bad++; console.log("FAIL " + name + (detail ? ": " + detail : "")); } };

const side = JSON.parse(readFileSync(here("functions/_analytics/SOURCE.json"), "utf8"));
check("the sidecar lists the three copied files", Object.keys(side.files).sort().join() === ["a.js", "functions/_analytics/core.ts", "functions/api/t.ts"].sort().join(), Object.keys(side.files).join());
for (const [f, h] of Object.entries(side.files)) check(`${f} equals the canonical source`, existsSync(here(f)) && sha(f) === h);
check("/api/t uses the shared collector and nothing else", /from "\.\.\/_analytics\/core"/.test(readFileSync(here("functions/api/t.ts"), "utf8")) && /collect\(ctx\.request, ctx\.env, Date\.now\(\)\)/.test(readFileSync(here("functions/api/t.ts"), "utf8")));

const pages = readdirSync(here("")).filter((f) => f.endsWith(".html"));
check("the site has pages to look at", pages.length >= 10, String(pages.length));
for (const f of pages) {
  const html = readFileSync(here(f), "utf8"), tags = [...html.matchAll(/<script\b[^>]*\bsrc="\/a\.js[^"]*"[^>]*>/g)].map((m) => m[0]);
  if (f === "offline.html" || f === "404.html") { check(`${f}: no tracker (offline page and unknown page are not visits)`, tags.length === 0); continue; }
  check(`${f}: loads a.js exactly once`, tags.length === 1, String(tags.length));
  check(`${f}: hands the visitor code to the console address only`, tags.length === 1 && /data-cv-hosts="console\.corporatetambola\.com"/.test(tags[0]) && /\bdefer\b/.test(tags[0]), tags[0] ?? "");
}
const headers = readFileSync(here("_headers"), "utf8");
check("_headers: the CSP still allows scripts and requests from this site only", /script-src 'self'/.test(headers) && /connect-src 'self'/.test(headers) && !/unsafe-/.test(headers));
check("the service worker keeps an offline copy of the tracker script", /"\/a\.js"/.test(readFileSync(here("sw.js"), "utf8")));
check("the build leaves functions/ out of the uploaded files", /"functions"/.test(readFileSync(here("tools/build.mjs"), "utf8")));
console.log(`analytics-copy: ${n} checks, ${bad} failed`);
process.exit(bad ? 1 : 0);
