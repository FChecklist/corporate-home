// Falsification of tests/smoke-regress.mjs: break a copy of the built site one way per fix, and require the matching test to go red.
// Also requires the unbroken copy to stay green, and the original dist to be untouched (hash before = hash after).
//   node tools/build.mjs && node tests/smoke-falsify.mjs [--root dist]
import { mkdtempSync, cpSync, readFileSync, writeFileSync, rmSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { chromium } from "./smoke/harness.mjs";
import { runAll } from "./smoke-regress.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const hashDir = (d) => { const h = createHash("sha256"); const walk = (p) => { for (const f of readdirSync(p).sort()) { const q = join(p, f); if (statSync(q).isDirectory()) walk(q); else h.update(f).update(readFileSync(q)); } }; walk(d); return h.digest("hex"); };
const edit = (dir, file, fn) => { const p = join(dir, file); const s = readFileSync(p, "utf8"); const t = fn(s); if (t === s) throw new Error("the break did not change " + file); writeFileSync(p, t); };

// each mutation: which test must go red, and how to break the copy
export const BREAKS = [
  { test: "R1", name: "remove the static route for /api/t from sw.js", run: (d) => edit(d, "sw.js", (s) => s.replace(/try \{ if \(e\.addRoutes\)[^\n]*?\} catch \(x\) \{[^}]*\} /, "")) },
  { test: "R2", name: "take /terms out of the saved list", run: (d) => edit(d, "sw.js", (s) => s.replace('"/terms", ', "")) },
  { test: "R2", name: "put the old copy version back", run: (d) => edit(d, "sw.js", (s) => s.replace('const V = "home-v13"', 'const V = "home-v12"')) },
  { test: "R3", name: "drop Lucky Draw from the ItemList", run: (d) => edit(d, "index.html", (s) => s.replace(/,\s*\{\s*"@type": "ListItem",\s*"position": 6,[^}]*\}/, "")) },
  { test: "R4", name: "make the phone bottom bar a plain div again (every page)", run: (d) => { for (const f of readdirSync(d).filter((x) => x.endsWith(".html"))) edit(d, f, (s) => s.replace(/<nav class="tabbar"[^>]*>(.*?)<\/nav>/, '<div class="tabbar">$1</div>')); } },
  { test: "R5", name: "remove the four sign-in redirects", run: (d) => edit(d, "_redirects", (s) => s.replace(/^\/(login|signin|sign-in|console) .*$/gm, "")) },
  { test: "R5", name: "send /login to the wrong place", run: (d) => edit(d, "_redirects", (s) => s.replace("/login https://console.corporatetambola.com/ 302", "/login https://console.corporatetambola.com/#/create 302")) },
];

if (pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const a = process.argv.slice(2); const root = resolve(a.includes("--root") ? a[a.indexOf("--root") + 1] : join(HERE, "..", "dist"));
  const before = hashDir(root); const browser = await chromium.launch(); let stayedGreen = 0, red = 0, invalid = 0;
  try {
    const base = await runAll(root, null, browser); const baseBad = base.flatMap((r) => r.checks.filter((c) => !c[1]).map((c) => r.id + ": " + c[0]));
    console.log(baseBad.length ? `BASELINE NOT GREEN:\n  ${baseBad.join("\n  ")}` : `baseline: unbroken site is green (${base.reduce((n, r) => n + r.checks.length, 0)} checks)`); if (baseBad.length) process.exit(2);
    for (const b of BREAKS) {
      const tmp = mkdtempSync(join(tmpdir(), "home-fals-"));
      try {
        cpSync(root, tmp, { recursive: true });
        try { b.run(tmp); } catch (e) { invalid++; console.log(`INVALID  ${b.test} "${b.name}": ${e.message}`); continue; }
        const r = (await runAll(tmp, [b.test], browser))[0]; const failed = r.checks.filter((c) => !c[1]);
        if (failed.length) { red++; console.log(`red   ${b.test} "${b.name}"  (${failed.length} check(s) failed, e.g. ${failed[0][0]})`); } else { stayedGreen++; console.log(`GREEN ${b.test} "${b.name}"  <- the test did NOT notice the break`); }
      } finally { rmSync(tmp, { recursive: true, force: true }); }
    }
  } finally { await browser.close(); }
  const after = hashDir(root);
  console.log(`\nfalsify: ${BREAKS.length} breaks, ${red} went red, ${stayedGreen} stayed green, ${invalid} invalid; dist untouched: ${before === after}`);
  process.exit(stayedGreen || invalid || before !== after ? 1 : 0);
}
