// Build for home.corporatetambola.com: node tools/build.mjs  ->  dist/
// What it does (no framework, no download, no outside request):
//   1. copies the site files into dist/ (not tests, tools, docs, package files)
//   2. writes dist/version.json from the hand-kept version.json (product, version, changes) plus commit, dirty and builtAt
//   3. puts vX.Y.Z in the footer of every page (between <!--ver--> and <!--/ver-->, links to /changes) and fills the /changes page with the last 10 changes
//   4. makes sure every page loads the shared Corporate Games bar (gamesbar.css + gamesbar.js data-game="home"), adding the two tags if a page lacks them
//   5. checks: version agrees in version.json, package.json and CHANGELOG.md; _redirects never touches /version.json or leaves the site; every page is in sitemap.xml (except 404 and offline); no obfuscated e-mail; docs/ and tests/ are not published
// Cloudflare Pages: build command  node tools/build.mjs   build output directory  dist
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "dist");
const SKIP = new Set([".git", ".gitignore", ".github", "node_modules", "dist", "tests", "tools", "docs", "package.json", "package-lock.json", "README.md", "KNOWLEDGE-MAP.md", "CHANGELOG.md", "tsconfig.json", "version.json"]);
const fail = (m) => { console.error("BUILD FAILED: " + m); process.exit(1); };
const git = (...a) => { try { return execFileSync("git", a, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return null; } };

// 1. copy
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const name of readdirSync(root)) if (!SKIP.has(name)) cpSync(join(root, name), join(out, name), { recursive: true });

// 2. version
const src = JSON.parse(readFileSync(join(root, "version.json"), "utf8"));
if (!/^\d+\.\d+\.\d+$/.test(src.version || "")) fail("version.json: version must look like 1.2.3");
if (!Array.isArray(src.changes) || !src.changes.length || src.changes.length > 20) fail("version.json: changes must hold 1 to 20 entries");
for (const c of src.changes) for (const k of ["id", "what", "where", "pr"]) if (!c[k]) fail("version.json: a change has no " + k);
if (new Set(src.changes.map((c) => c.id)).size !== src.changes.length) fail("version.json: change ids must be unique");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
if (pkg.version !== src.version) fail(`package.json version ${pkg.version} is not version.json version ${src.version}`);
const changelog = existsSync(join(root, "CHANGELOG.md")) ? readFileSync(join(root, "CHANGELOG.md"), "utf8") : "";
if (!new RegExp("^## " + src.version.replace(/\./g, "\\.") + "\\b", "m").test(changelog)) fail(`CHANGELOG.md has no "## ${src.version}" entry`);
const commit = process.env.CF_PAGES_COMMIT_SHA || git("rev-parse", "HEAD") || "unknown";
const status = git("status", "--porcelain", "--untracked-files=normal");
const dirty = status === null ? true : status.split("\n").filter((l) => l && !/^\?\? (dist|node_modules)\/?$/.test(l)).length > 0;
const epoch = process.env.SOURCE_DATE_EPOCH ? Number(process.env.SOURCE_DATE_EPOCH) * 1000 : Date.now();
const version = { product: src.product, version: src.version, commit, dirty, builtAt: new Date(epoch).toISOString(), game: "corporate-games-home", changes: src.changes };
writeFileSync(join(out, "version.json"), JSON.stringify(version, null, 2) + "\n");
const shortV = "v" + src.version;
const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const changesHtml = '<ul class="plainlist">' + src.changes.slice(0, 10).map((c) => "<li>" + esc(c.what) + "</li>").join("") + "</ul>";

// 3 + 4. pages
const pages = readdirSync(out).filter((f) => f.endsWith(".html"));
for (const f of pages) {
  let s = readFileSync(join(out, f), "utf8");
  if (!/<!--ver-->[^<]*<!--\/ver-->/.test(s)) fail(f + " has no <!--ver--> marker in the footer");
  s = s.replace(/<!--ver-->[^<]*<!--\/ver-->/g, "<!--ver-->" + shortV + "<!--/ver-->");
  if (f === "changes.html") { if (!/<!--changes-->[\s\S]*<!--\/changes-->/.test(s)) fail("changes.html has no <!--changes--> marker"); s = s.replace(/<!--changes-->[\s\S]*<!--\/changes-->/, "<!--changes-->" + changesHtml + "<!--/changes-->"); }
  if (!/<link[^>]+href="\/gamesbar\.css[^"]*"/.test(s)) s = s.replace("</head>", '<link rel="stylesheet" href="/gamesbar.css">\n</head>');
  if (!/<script[^>]+src="\/gamesbar\.js[^"]*"[^>]*data-game="home"/.test(s)) s = s.replace("</body>", '<script src="/gamesbar.js" data-game="home" defer></script>\n</body>');
  if ((s.match(/src="\/gamesbar\.js/g) || []).length !== 1) fail(f + " must load gamesbar.js exactly once");
  if (/cdn-cgi\/l\/email-protection|data-cfemail/.test(s)) fail(f + " has an obfuscated e-mail");
  writeFileSync(join(out, f), s);
}
for (const f of ["gamesbar.js", "gamesbar.css"]) if (!existsSync(join(out, f))) fail(f + " is missing from the output");

// 5. checks
const redirects = existsSync(join(root, "_redirects")) ? readFileSync(join(root, "_redirects"), "utf8") : "";
for (const line of redirects.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")))
  if (/version\.json/.test(line) || /https?:\/\//.test(line)) fail("_redirects rule not allowed: " + line);
const sitemap = readFileSync(join(out, "sitemap.xml"), "utf8");
for (const f of pages) {
  if (f === "404.html" || f === "offline.html") continue;
  const loc = f === "index.html" ? "https://home.corporatetambola.com/" : "https://home.corporatetambola.com/" + f.replace(/\.html$/, "");
  if (!sitemap.includes("<loc>" + loc + "</loc>")) fail("sitemap.xml does not list " + loc);
}
if (!statSync(join(out, "version.json")).size) fail("version.json is empty");
for (const bad of ["docs", "tests", "tools", "KNOWLEDGE.md", "CHANGELOG.md", "node_modules"]) if (existsSync(join(out, bad))) fail(bad + " must not be published");
console.log("built " + pages.length + " pages -> dist/   version " + shortV + " (" + commit.slice(0, 7) + ")" + (dirty ? " (working copy has changes)" : "") + "   " + version.builtAt);
