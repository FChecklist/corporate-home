// node tests/run.mjs [--only T01,T05] [--root <folder>] [--live]
// One Chrome, one server. Prints every case and the number of checks that ran. Exit code 1 if anything failed.
// Heavy: run it under the shared lock:  node C:/ct/test-sites/console/tools/heavy-run.mjs -- node tests/run.mjs
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { startServer, launchChrome, checker } from "./lib.mjs";
import { CASES } from "./cases.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

export async function runCases(ids, root, browser) {
  const srv = await startServer(root);
  const out = [];
  try {
    for (const cs of CASES.filter((x) => !ids || ids.includes(x.id))) {
      const c = checker(); const t0 = Date.now(); let err = "";
      try { await cs.run({ base: srv.base, root, browser, headers: srv.headers, c }); } catch (e) { err = String(e && e.stack || e).split("\n").slice(0, 3).join(" / "); c.check("the case ran to the end", false, err); }
      out.push({ id: cs.id, name: cs.name, checks: c.count, failed: c.failed, ms: Date.now() - t0 });
    }
  } finally { await srv.close(); }
  return out;
}

/** every outside link answers (needs internet): fails on anything that is not 2xx after redirects */
export async function liveLinks(root) {
  const { readdirSync, readFileSync } = await import("node:fs");
  const urls = new Set();
  for (const f of readdirSync(root).filter((x) => x.endsWith(".html"))) for (const m of readFileSync(resolve(root, f), "utf8").matchAll(/<a\b[^>]*\bhref="(https:\/\/[^"]+)"/g)) urls.add(m[1]);
  const res = [];
  for (const u of urls) { try { const r = await fetch(u, { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(20000) }); res.push({ u, status: r.status }); } catch (e) { res.push({ u, status: String(e.cause?.code || e.message) }); }
  }
  return res;
}

if (import.meta.url === "file:///" + process.argv[1].replace(/\\/g, "/")) {
  const a = process.argv.slice(2);
  const only = a.includes("--only") ? a[a.indexOf("--only") + 1].split(",") : null;
  const root = resolve(a.includes("--root") ? a[a.indexOf("--root") + 1] : resolve(HERE, ".."));
  const chrome = await launchChrome();
  let code = 0;
  try {
    const res = await runCases(only, root, chrome.browser);
    let total = 0, bad = 0;
    for (const r of res) {
      total += r.checks; bad += r.failed.length;
      console.log(`${r.failed.length ? "FAIL" : "ok  "} ${r.id} ${r.name}  [${r.checks} checks, ${(r.ms / 1000).toFixed(1)}s]`);
      for (const f of r.failed.slice(0, 8)) console.log(`       - ${f.name}: ${f.detail}`);
      if (r.failed.length > 8) console.log(`       ... and ${r.failed.length - 8} more`);
    }
    console.log(`\n${res.length} cases, ${total} checks, ${bad} failed`);
    writeFileSync(resolve(HERE, "last-run.json"), JSON.stringify({ when: new Date().toISOString(), cases: res.length, checks: total, failed: bad, perCase: res.map((r) => ({ id: r.id, checks: r.checks, failed: r.failed.length })) }, null, 1));
    if (bad) code = 1;
    if (a.includes("--live")) {
      const live = await liveLinks(root); const nope = live.filter((x) => !(x.status >= 200 && x.status < 300));
      console.log(`\nlive outside links: ${live.length} checked, ${nope.length} not answering`); for (const n of nope) console.log("   - " + n.u + " " + n.status);
      if (nope.length) code = 1;
    }
  } finally { await chrome.close(); }
  process.exit(code);
}
