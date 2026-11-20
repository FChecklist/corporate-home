// One regression test for each fix made after the 20 Nov 2026 smoke test (docs/SMOKE-20NOV-HOME.md, section "Fixes").
//   node tools/build.mjs && node tests/smoke-regress.mjs [--root dist] [--only R1,R3]
// Each test reads a BUILT copy of the site (dist). tests/smoke-falsify.mjs breaks a copy of dist one way per test and checks that the test then fails.
import { mkdtempSync, cpSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { chromium, open, beacons } from "./smoke/harness.mjs";
import { startPages } from "./smoke/pages-server.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (root, f) => readFileSync(join(root, f), "utf8");
const PAGES = ["index", "games", "how-it-works", "for-hr", "pricing", "privacy", "contact", "terms", "virtual-team-building-games", "games-for-hr-teams", "404", "offline"];

export const TESTS = {
  // R1: the offline-copy worker must not swallow the visit counter's last message of a page
  R1: { name: "returning visitor (offline copy active): every page view reaches the visit counter", async run(root, browser) {
    const sw = read(root, "sw.js"); const out = [];
    out.push(["sw.js sends /api/t straight to the network (static route)", /addRoutes\(\{\s*condition:\s*\{\s*urlPattern:\s*"\/api\/t"\s*\}\s*,\s*source:\s*"network"\s*\}\)/.test(sw)]);
    const srv = await startPages(root); let lost = 0, total = 0;
    try {
      for (let rep = 0; rep < 3; rep++) {
        srv.beacons.length = 0;
        const o = await open(browser, srv.base, "/", { vp: "laptop", serviceWorkers: "allow" });
        await o.page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 8000 }).catch(() => {}); await o.page.waitForTimeout(500);
        for (const href of ["/games", "/how-it-works", "/privacy"]) { await o.page.locator(`a[href="${href}"]:visible`).first().click(); await o.page.waitForURL("**" + href); await o.page.waitForTimeout(250); }
        await o.page.evaluate(() => window.CA.flush()); await o.page.waitForTimeout(300);
        const pv = beacons(srv).flatMap((b) => (b.e || []).filter((e) => e.k === "pv").map((e) => e.p)); total += 4; lost += 4 - pv.length; await o.close();
      }
    } finally { await srv.close(); }
    out.push([`no page view lost in 3 walks of 4 pages (lost ${lost} of ${total})`, lost === 0]); return out;
  } },
  // R2: a returning visitor can read the legal page offline
  R2: { name: "the Terms page is in the offline copy and the copy version moved on", async run(root, browser) {
    const sw = read(root, "sw.js"); const out = [];
    out.push(['"/terms" is in the saved list', /const CORE = \[[^\]]*"\/terms"/.test(sw)]);
    out.push(["the copy version is not the old home-v12", !/const V = "home-v12"/.test(sw)]);
    const srv = await startPages(root);
    try {
      const o = await open(browser, srv.base, "/", { vp: "laptop" });
      await o.page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 8000 }).catch(() => {}); await o.page.waitForTimeout(800);
      await o.ctx.setOffline(true); await o.page.goto(srv.base + "/terms").catch(() => {});
      const t = await o.page.evaluate(() => ({ h1: (document.querySelector("h1") || {}).textContent || "", title: document.title }));
      out.push(["offline: /terms opens from the saved copy, not the offline page", !!t.h1 && !/offline/i.test(t.title + t.h1)]); await o.close();
    } finally { await srv.close(); }
    return out;
  } },
  // R3: the games list in the search-engine data must be the games on the page
  R3: { name: "JSON-LD ItemList on the home page lists all six games, Lucky Draw included", async run(root) {
    const html = read(root, "index.html"); const out = [];
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    const il = blocks.flatMap((b) => (b["@graph"] || [b])).find((b) => b["@type"] === "ItemList");
    const names = ((il && il.itemListElement) || []).map((x) => x.name);
    out.push(["an ItemList exists", !!il]);
    out.push([`six items (found ${names.length}: ${names.join(", ")})`, names.length === 6]);
    out.push(["Lucky Draw is one of them", names.includes("Corporate Lucky Draw")]);
    out.push(["positions run 1..6 without a gap", JSON.stringify(((il && il.itemListElement) || []).map((x) => x.position)) === "[1,2,3,4,5,6]"]);
    const shown = ["Tambola", "Bingo", "Tic Tac Toe", "Snakes and Ladders", "Luck by Chance", "Lucky Draw"].every((g) => html.includes("Corporate " + g));
    out.push(["the page itself shows all six game names", shown]); return out;
  } },
  // R4: the phone bottom bar sits inside a landmark
  R4: { name: "phone bottom bar is a labelled navigation landmark (axe 'region' rule) on every page", async run(root, browser) {
    const axeSrc = readFileSync(createRequire(join(HERE, "smoke", "package.json")).resolve("axe-core/axe.min.js"), "utf8"); const out = [];
    const srv = await startPages(root);
    try {
      for (const p of PAGES) {
        const o = await open(browser, srv.base, p === "index" ? "/" : p === "404" ? "/__x__" : "/" + p, { vp: "phone" });
        await o.page.evaluate(axeSrc);
        const v = await o.page.evaluate(async () => (await window.axe.run(document, { runOnly: ["region", "landmark-unique", "aria-allowed-role"] })).violations.map((x) => x.id + " " + x.nodes.map((n) => n.target.join(" ")).join(";")));
        const tag = await o.page.evaluate(() => { const e = document.querySelector(".tabbar"); return e ? e.tagName + "|" + e.getAttribute("aria-label") : "none"; });
        out.push([`${p}: no landmark problem (${v.join(" / ") || "clean"}), bar is ${tag}`, !v.length && /^NAV\|.+/.test(tag)]); await o.close();
      }
    } finally { await srv.close(); }
    return out;
  } },
  // R5: an organizer who types /login, /signin, /sign-in or /console lands on the console sign-in; the build still refuses any other way out
  R5: { name: "/login /signin /sign-in /console go to the console sign-in (302); the build refuses other outside redirects", async run(root) {
    const out = []; const srv = await startPages(root);
    try {
      for (const p of ["/login", "/signin", "/sign-in", "/console"]) { const r = await fetch(srv.base + p, { redirect: "manual" }); out.push([`${p} -> 302 https://console.corporatetambola.com/`, r.status === 302 && r.headers.get("location") === "https://console.corporatetambola.com/"]); }
      const r = await fetch(srv.base + "/refund-policy", { redirect: "manual" }); out.push(["the legal redirects still work", r.status === 301]);
      const v = await fetch(srv.base + "/version.json", { redirect: "manual" }); out.push(["/version.json is still answered by the site", v.status === 200]);
    } finally { await srv.close(); }
    // the build check, run on a throw-away copy of the source
    const repo = resolve(HERE, ".."); const tmp = mkdtempSync(join(tmpdir(), "home-r5-"));
    try {
      cpSync(repo, tmp, { recursive: true, filter: (src) => !/[\\/](\.git|node_modules|dist|docs)([\\/]|$)/.test(src) });
      const build = () => { try { execFileSync("node", [join(tmp, "tools", "build.mjs")], { cwd: tmp, stdio: "pipe" }); return true; } catch { return false; } };
      const base = read(tmp, "_redirects");
      out.push(["the build accepts the shipped _redirects", build()]);
      writeFileSync(join(tmp, "_redirects"), base + "\n/old https://evil.example/ 302\n"); out.push(["the build refuses a redirect to another host", !build()]);
      writeFileSync(join(tmp, "_redirects"), base + "\n/login https://console.corporatetambola.com/ 301\n"); out.push(["the build refuses the console address with a 301 (sign-in guesses stay 302)", !build()]);
      writeFileSync(join(tmp, "_redirects"), base + "\n/version.json /x 302\n"); out.push(["the build refuses any rule on /version.json", !build()]);
    } finally { rmSync(tmp, { recursive: true, force: true }); }
    return out;
  } },
};

export async function runAll(root, only, browser) {
  const res = [];
  for (const [id, t] of Object.entries(TESTS)) {
    if (only && !only.includes(id)) continue;
    let checks; try { checks = await t.run(root, browser); } catch (e) { checks = [[`ran to the end: ${String(e.stack || e).split("\n")[0]}`, false]]; }
    res.push({ id, name: t.name, checks });
  }
  return res;
}

if (pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const a = process.argv.slice(2); const root = resolve(a.includes("--root") ? a[a.indexOf("--root") + 1] : join(HERE, "..", "dist")); const only = a.includes("--only") ? a[a.indexOf("--only") + 1].split(",") : null;
  if (!existsSync(join(root, "index.html"))) { console.error("no built site at " + root + " (run node tools/build.mjs first)"); process.exit(2); }
  const browser = await chromium.launch(); let bad = 0, n = 0;
  try { for (const r of await runAll(root, only, browser)) { const f = r.checks.filter((c) => !c[1]); n += r.checks.length; bad += f.length; console.log(`${f.length ? "FAIL" : "ok  "} ${r.id} ${r.name}  [${r.checks.length} checks]`); for (const c of f) console.log("       - " + c[0]); } } finally { await browser.close(); }
  console.log(`\nsmoke-regress: ${n} checks, ${bad} failed`); process.exit(bad ? 1 : 0);
}
