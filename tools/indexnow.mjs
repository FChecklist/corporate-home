// Tells Bing, Yandex and other IndexNow search engines that pages changed. Run it AFTER a deploy:
//   node tools/indexnow.mjs            sends every URL in sitemap.xml
//   node tools/indexnow.mjs --dry      only prints what it would send
//   node tools/indexnow.mjs /games /pricing     sends only these paths
// The key file 397242f1fdcd3fb9374246c561915b7f.txt must already be live at the site root, or the engines reject the call.
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HOST = "home.corporatetambola.com";
const KEY = "397242f1fdcd3fb9374246c561915b7f";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const dry = args.includes("--dry");
const paths = args.filter((a) => a.startsWith("/"));
const urls = paths.length
  ? paths.map((p) => "https://" + HOST + p)
  : [...readFileSync(resolve(root, "sitemap.xml"), "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const body = { host: HOST, key: KEY, keyLocation: "https://" + HOST + "/" + KEY + ".txt", urlList: urls };
console.log((dry ? "DRY RUN. Would send " : "Sending ") + urls.length + " URLs to IndexNow");
if (dry) { console.log(JSON.stringify(body, null, 2)); process.exit(0); }
const res = await fetch("https://api.indexnow.org/IndexNow", { method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify(body) });
console.log("IndexNow answered " + res.status + " " + res.statusText + " (200 or 202 = accepted)");
if (res.status >= 400) process.exit(1);
