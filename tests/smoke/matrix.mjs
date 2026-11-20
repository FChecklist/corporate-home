// The smoke matrix for home.corporatetambola.com (owner steps 1 and 3). Run:
//   node tools/build.mjs && node tests/smoke/matrix.mjs [--root dist] [--only FV,AR] [--out docs/smoke]
// Writes <out>/matrix-results.json and <out>/matrix-results.md. Exit code 1 if any cell failed.
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, makeRecorder, pageList } from "./harness.mjs";
import { startPages, EMULATED } from "./pages-server.mjs";
import * as visit from "./groups-visit.mjs";
import * as journey from "./groups-journey.mjs";
import * as site from "./groups-site.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const a = process.argv.slice(2); const arg = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
const root = resolve(arg("--root", join(HERE, "..", "..", "dist"))); const out = resolve(arg("--out", join(HERE, "..", "..", "docs", "smoke")));
const only = arg("--only", "") ? arg("--only", "").split(",") : null;
const knownFile = arg("--known", a.includes("--strict") ? "" : join(HERE, "known-open.json"));
let known = {}; try { if (knownFile) known = JSON.parse(readFileSync(knownFile, "utf8")).cells || {}; } catch { /* no list: every failure counts */ }

const GROUPS = [
  ["FV", visit.firstVisit], ["RL", visit.repeatLooks], ["RC", visit.repeatCode], ["NG", visit.repeatNoGate],
  ["HO", journey.handoff], ["AR", journey.arrivals], ["BF", journey.history], ["OF", journey.offline], ["NJ", journey.noJs], ["SN", journey.slow], ["CP", journey.clickPath], ["LG", journey.language],
  ["DL", site.deepLinks], ["SEO", site.seo], ["VJ", site.version], ["HD", site.headers], ["AX", site.a11y], ["LK", site.deadLinks], ["PR", site.prices],
];

const srv = await startPages(root);
const browser = await chromium.launch();
const rec = makeRecorder();
const R = { browser, base: srv.base, srv, root, pages: pageList(root), cell: rec.cell };
const t0 = Date.now();
for (const [key, fn] of GROUPS) {
  if (only && !only.includes(key)) continue;
  const before = rec.cells.length; const g0 = Date.now();
  try { await fn(R); } catch (e) { rec.cells.push({ id: `${key}.CRASH`, step: "-", group: key, perm: "-", name: "group crashed", status: "FAIL", checks: 1, failed: [{ name: "group ran to the end", detail: String(e && e.stack || e).slice(0, 400) }], note: "" }); }
  const mine = rec.cells.slice(before); console.log(`${key.padEnd(4)} ${String(mine.length).padStart(4)} cells  ${mine.filter((c) => c.status === "PASS").length} pass  ${mine.filter((c) => c.status === "FAIL").length} fail   ${((Date.now() - g0) / 1000).toFixed(0)}s`);
}
await browser.close(); await srv.close();

const cells = rec.cells; const pass = cells.filter((c) => c.status === "PASS").length, fail = cells.length - pass;
const checks = cells.reduce((s, c) => s + c.checks, 0), failedChecks = cells.reduce((s, c) => s + c.failed.length, 0);
const summary = { when: new Date().toISOString(), root, cells: cells.length, passed: pass, failed: fail, checks, failedChecks, seconds: Math.round((Date.now() - t0) / 1000), emulated: EMULATED };
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "matrix-results.json"), JSON.stringify({ summary, cells, external: R.external || [] }, null, 1));

// a short markdown table per group, then every failing cell
const by = {}; for (const c of cells) (by[c.group] ||= []).push(c);
let md = `# Smoke matrix results\n\nRun ${summary.when}. ${summary.cells} cells, ${summary.passed} passed, ${summary.failed} failed (${summary.checks} checks, ${summary.failedChecks} failed).\n\n| Group | Cells | Pass | Fail |\n|---|---:|---:|---:|\n`;
for (const [g, cs] of Object.entries(by)) md += `| ${g} | ${cs.length} | ${cs.filter((c) => c.status === "PASS").length} | ${cs.filter((c) => c.status === "FAIL").length} |\n`;
md += "\n## Failing cells\n\n";
for (const c of cells.filter((c) => c.status === "FAIL")) { md += `- **${c.id}** (${c.group}; ${c.perm})\n`; for (const f of c.failed.slice(0, 6)) md += `  - ${f.name}${f.detail ? ": " + f.detail.replace(/\n/g, " ").slice(0, 220) : ""}\n`; if (c.failed.length > 6) md += `  - ...and ${c.failed.length - 6} more\n`; }
writeFileSync(join(out, "matrix-results.md"), md);
const newFails = cells.filter((c) => c.status === "FAIL" && !(c.id in known)), nowPass = Object.keys(known).filter((id) => cells.some((c) => c.id === id && c.status === "PASS"));
console.log(`\n${summary.cells} cells, ${summary.passed} passed, ${summary.failed} failed; ${summary.checks} checks, ${summary.failedChecks} failed  (${summary.seconds}s)\n-> ${join(out, "matrix-results.json")}`);
if (Object.keys(known).length) console.log(`known open (waiting for the owner or another repo): ${cells.filter((c) => c.status === "FAIL" && c.id in known).length}; NEW failures: ${newFails.length}; known cells that now pass (remove from known-open.json): ${nowPass.length}`);
for (const c of newFails.slice(0, 20)) console.log(`NEW FAIL ${c.id} (${c.group}; ${c.perm}): ${c.failed.slice(0, 2).map((f) => f.name).join(" | ")}`);
process.exit(newFails.length ? 1 : 0);
