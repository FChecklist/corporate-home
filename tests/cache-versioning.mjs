// Written from the release-safety rule (31 Oct 2026), not from the build code:
//   "A page must never run an old cached script against new HTML."
// Builds the site into dist/, then checks what would be uploaded:
//   1. every local script and stylesheet address in every HTML page carries ?v=<the commit that was built> (so a release means new addresses);
//   2. _headers stays within the Cloudflare Pages limit of 100 rules (more are silently ignored).
// Run: node tests/cache-versioning.mjs   (exit code 1 on any failure). Add --no-build to read an existing dist/.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "dist");
let failed = 0, checks = 0;
const check = (name, ok, detail = "") => { checks++; if (!ok) { failed++; console.log("FAIL " + name + (detail ? ": " + detail : "")); } };
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));

/** every local (starts with "/") script or stylesheet address in a page, as written */
const localRefs = (html) => {
  const out = [];
  for (const m of html.matchAll(/<script\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/gi)) out.push(m[1]);
  for (const m of html.matchAll(/<link\b[^>]*?\bhref\s*=\s*["']([^"']+)["']/gi)) if (/\.css(\?|#|$)/i.test(m[1])) out.push(m[1]);
  return out.filter((u) => u.startsWith("/") && !u.startsWith("//"));
};
/** the addresses that do not carry v=<a prefix (7 or more characters) of the commit> */
const unversioned = (html, commit) => localRefs(html).filter((u) => { const v = new URLSearchParams((u.split("?")[1] || "").split("#")[0]).getAll("v"); return !v.some((x) => x.length >= 7 && commit.startsWith(x)); });

// the checker itself must catch an unversioned address, or a pass means nothing
const C = "abc123def4567890abc123def4567890abc123de";
check("checker: catches an unversioned script", unversioned('<script src="/site.js"></script>', C).length === 1);
check("checker: catches an old ?v=6 stylesheet", unversioned('<link rel="stylesheet" href="/site.css?v=6">', C).length === 1);
check("checker: accepts the commit", unversioned('<script src="/site.js?v=abc123def456"></script><link rel="stylesheet" href="/site.css?v=abc123def456">', C).length === 0);
check("checker: ignores outside addresses", unversioned('<script src="https://static.cloudflareinsights.com/beacon.min.js"></script>', C).length === 0);

if (!process.argv.includes("--no-build")) execFileSync(process.execPath, [join(ROOT, "tools/build.mjs")], { cwd: ROOT, stdio: "pipe" });
check("dist exists", existsSync(OUT));
const commit = JSON.parse(readFileSync(join(OUT, "version.json"), "utf8")).commit;
check("version.json carries a commit", /^[0-9a-f]{7,40}$/.test(commit), commit);
const pages = walk(OUT).filter((f) => f.endsWith(".html"));
check("dist has pages", pages.length >= 10, String(pages.length));
let refs = 0;
for (const f of pages) {
  const html = readFileSync(f, "utf8"); refs += localRefs(html).length;
  for (const u of unversioned(html, commit)) check(`${relative(OUT, f)}: ${u} carries ?v=<commit>`, false, "not versioned");
}
check("pages reference local scripts and styles (so the check looked at something)", refs >= 30, String(refs));
const rules = readFileSync(join(OUT, "_headers"), "utf8").replace(/\r/g, "").split("\n").filter((l) => l.startsWith("/"));
check("_headers stays within the 100-rule limit of Cloudflare Pages", rules.length <= 100, String(rules.length));

console.log(`cache-versioning: ${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
