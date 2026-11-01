// Written from the owner's rules (1 Nov 2026), not from the page code:
//   1. Third person only: the words we, our, us never appear on the home pages (text, meta, Open Graph, JSON-LD) or in llms.txt / llms-full.txt.
//   2. Home links to no game site: every game address (housie, bingo, tictactoe, snakes, luck, luckydraw) is absent from the pages, except the shared
//      legal and rules pages that live on the Tambola address (terms, privacy, subprocessors, dpa, refund-policy, fair).
//   3. Lucky Draw is a normal entry (no "Coming soon"), and no sentence says players tick boxes before they join.
// Run: node tests/wording-links.mjs   (exit code 1 on any failure)
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0, checks = 0;
const check = (name, ok, detail = "") => { checks++; if (!ok) { failed++; console.log("FAIL " + name + (detail ? ": " + detail : "")); } };
const files = readdirSync(ROOT).filter((f) => f.endsWith(".html") || f === "llms.txt" || f === "llms-full.txt");
check("the check looked at the pages", files.length >= 12, String(files.length));

const WORD = /(?<![\w-])(we|We|our|Our|us|Us|ours|Ours)(?![\w-])|\b[Ww]e[’'](?:ll|re|ve|d)\b/g;
const GAMEHOST = /https:\/\/(?:housie|bingo|tictactoe|snakes|luck|luckydraw)\.corporatetambola\.com([^"'\s<)]*)/g;
const LEGAL_OK = new Set(["terms", "privacy", "subprocessors", "dpa", "refund-policy", "fair"]);

// the checkers themselves must catch a bad case, or a pass means nothing
check("checker: catches 'write to us'", /(?<![\w-])us(?![\w-])/.test("write to us"));
check("checker: ignores 'focus' and 'US$'", !new RegExp(WORD.source).test("focus on US$ 5"));

for (const f of files) {
  const t = readFileSync(join(ROOT, f), "utf8");
  const bad = [...t.matchAll(WORD)].map((m) => t.slice(Math.max(0, m.index - 40), m.index + 30).replace(/\s+/g, " "));
  check(`${f}: no we/our/us`, bad.length === 0, bad.slice(0, 3).join(" || "));
  const sites = [...t.matchAll(GAMEHOST)].filter((m) => !LEGAL_OK.has(m[1].replace(/^\//, "").split(/[?#/]/)[0]));
  check(`${f}: no link to a game site`, sites.length === 0, sites.slice(0, 3).map((m) => m[0]).join(" "));
  check(`${f}: Lucky Draw is not "coming soon"`, !/coming soon/i.test(t));
  check(`${f}: no "tick two boxes"`, !/tick two boxes/i.test(t));
}

// the "What you can count on" block is exactly the owner's list (1 Nov 2026), in this order
const FACTS = ["Nothing to install, no app to download.", "Players need no account. No e-mail address and no mobile number is asked for.", "Participant data is auto-deleted within 24 hours.", "The organizer pays per game, with no recurring charges.", "The organizer has complete control over who plays and who does not.", "Closed-group engagement for team activities.", "Invite employees, their friends and their families.", "Include vendors, customers and other guests."];
{
  const t = readFileSync(join(ROOT, "index.html"), "utf8");
  const block = (t.match(/<ul class="facts">([\s\S]*?)<\/ul>/) || [, ""])[1];
  const items = [...block.matchAll(/<li><b>([^<]*)<\/b><\/li>/g)].map((m) => m[1]);
  check("index: the count-on block is the owner's list, in order", JSON.stringify(items) === JSON.stringify(FACTS), items.join(" | ").slice(0, 200));
  const ll = readFileSync(join(ROOT, "llms-full.txt"), "utf8");
  check("llms-full: the count-on sentence carries the same eight claims", FACTS.every((x) => ll.toLowerCase().includes(x.replace(/\.$/, "").toLowerCase())));
  check("the old count-on lines are gone from the block", !/extended families|Close group online engagement|Designed to follow the EU GDPR/.test(block));
}

// the shared bar's home copy (menu and tiles on every page) links to no game site either, and Lucky Draw is live
{
  const bar = readFileSync(join(ROOT, "gamesbar.js"), "utf8");
  const hosts = [...bar.matchAll(GAMEHOST)].map((m) => m[0]);
  check("gamesbar.js: no game-site address", hosts.length === 0, hosts.slice(0, 3).join(" "));
  check("gamesbar.js: every game goes to the console create page", (bar.match(/url: "https:\/\/console\.corporatetambola\.com\/#\/create"/g) || []).length === 6);
  check("gamesbar.js: Lucky Draw is not 'coming soon'", !/soon: true|note: "Coming soon"/.test(bar));
}
console.log(`wording-links: ${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
