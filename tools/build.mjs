// Build for home.corporatetambola.com: node tools/build.mjs  ->  dist/
// What it does (no framework, no download, no outside request):
//   1. copies the site files into dist/ (not tests, tools, docs, package files)
//   2. writes dist/version.json  { commit, dirty, builtAt, game: "corporate-games-home" }
//   3. puts the short version in the footer of every page (between <!--ver--> and <!--/ver-->)
//   4. makes sure every page loads the shared Corporate Games bar (gamesbar.css + gamesbar.js data-game="home"), adding the two tags if a page lacks them
//   5. checks: _redirects never touches /version.json or leaves the site, every page is in sitemap.xml (except 404 and offline), no obfuscated e-mail
// Cloudflare Pages: build command  node tools/build.mjs   build output directory  dist
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { versionRefs } from "./cache-bust.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "dist");
const SKIP = new Set([".git", ".gitignore", ".github", "node_modules", "dist", "tests", "tools", "docs", "package.json", "package-lock.json", "README.md"]);
const fail = (m) => { console.error("BUILD FAILED: " + m); process.exit(1); };
const git = (...a) => { try { return execFileSync("git", a, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return null; } };

// 1. copy
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const name of readdirSync(root)) if (!SKIP.has(name)) cpSync(join(root, name), join(out, name), { recursive: true });

// 2. version
const commit = process.env.CF_PAGES_COMMIT_SHA || git("rev-parse", "HEAD") || "unknown";
const status = git("status", "--porcelain", "--untracked-files=normal");
const dirty = status === null ? true : status.split("\n").filter((l) => l && !/^\?\? dist\/?$/.test(l)).length > 0;
const epoch = process.env.SOURCE_DATE_EPOCH ? Number(process.env.SOURCE_DATE_EPOCH) * 1000 : Date.now();
const version = { commit, dirty, builtAt: new Date(epoch).toISOString(), game: "corporate-games-home" };
writeFileSync(join(out, "version.json"), JSON.stringify(version, null, 2) + "\n");
const shortV = (commit === "unknown" ? "unknown" : commit.slice(0, 7)) + (dirty ? "+dirty" : "");

// 3 + 4. pages
const pages = readdirSync(out).filter((f) => f.endsWith(".html"));
for (const f of pages) {
  let s = readFileSync(join(out, f), "utf8");
  if (!/<!--ver-->[^<]*<!--\/ver-->/.test(s)) fail(f + " has no <!--ver--> marker in the footer");
  s = s.replace(/<!--ver-->[^<]*<!--\/ver-->/, "<!--ver-->" + shortV + "<!--/ver-->");
  if (!/<link[^>]+href="\/gamesbar\.css[^"]*"/.test(s)) s = s.replace("</head>", '<link rel="stylesheet" href="/gamesbar.css">\n</head>');
  if (!/<script[^>]+src="\/gamesbar\.js[^"]*"[^>]*data-game="home"/.test(s)) s = s.replace("</body>", '<script src="/gamesbar.js" data-game="home" defer></script>\n</body>');
  if ((s.match(/src="\/gamesbar\.js/g) || []).length !== 1) fail(f + " must load gamesbar.js exactly once");
  if (/cdn-cgi\/l\/email-protection|data-cfemail/.test(s)) fail(f + " has an obfuscated e-mail");
  writeFileSync(join(out, f), s);
}
// every local script and stylesheet address carries ?v=<commit> (tools/cache-bust.mjs): a returning visitor never runs an old script on a new page, whatever cache time the zone adds (the zone setting Browser Cache TTL replaces a no-cache header on the custom domain, so the address itself must change)
if (/^[0-9a-f]{7,40}$/.test(commit)) versionRefs(out, commit.slice(0, 12));
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
console.log("built " + pages.length + " pages -> dist/   version " + shortV + (dirty ? " (working copy has changes)" : "") + "   " + version.builtAt);
