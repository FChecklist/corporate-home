// Writes terms.html: the ONE legal document (owner order, 1 Nov 2026), rendered from the common wording in corporate-game-core
// (branch feat/common-legal-2026-11-01: packages/wording DOCUMENT + packages/ui renderDocument). The page is a generated file: change the words in game-core, then run
//   bun tools/make-terms.mjs     (needs C:/ct/test-sites/game-core on that branch) and commit terms.html and document.css.
// The page uses the same header, menu and footer as privacy.html.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const CORE = process.env.GAME_CORE || "C:/ct/test-sites/game-core";
const { renderDocument } = await import(`${CORE}/packages/ui/src/legal.ts`);
const { TERMS_VERSION, TERMS_DATE, DOC_URL } = await import(`${CORE}/packages/wording/src/documents.ts`);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tpl = readFileSync(join(root, "privacy.html"), "utf8").replace(/\r\n/g, "\n");
const i = tpl.indexOf('<main id="main" tabindex="-1">'), j = tpl.indexOf("</main>");
if (i < 0 || j < 0) throw new Error("privacy.html has no <main> block to use as the template");
const TITLE = "Terms, Policies and Game Rules", DESC = `Terms and Conditions, Privacy and Data and Game rules in one document. Version ${TERMS_VERSION}, ${TERMS_DATE}.`;
let head = tpl.slice(0, i)
  .replace(/<title>[^<]*<\/title>/, `<title>${TITLE} | Corporate Games</title>`)
  .replace(/(<meta name="description" content=")[^"]*(")/, `$1${DESC}$2`)
  .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${DESC}$2`)
  .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${DESC}$2`)
  .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${TITLE} | Corporate Games$2`)
  .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${TITLE} | Corporate Games$2`)
  .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${DOC_URL}$2`)
  .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${DOC_URL}$2`)
  .replace(/(<link rel="stylesheet" href="\/site\.css[^"]*">)/, `$1<link rel="stylesheet" href="/document.css">`);
if (!head.includes("/document.css")) throw new Error("could not add document.css");
const page = head + `<main id="main" tabindex="-1">\n<div class="wrap">${renderDocument()}</div>\n` + tpl.slice(j);
writeFileSync(join(root, "terms.html"), page);
console.log("terms.html written", page.length, "bytes, version", TERMS_VERSION);
