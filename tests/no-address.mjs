// Written from the owner's order (1 Nov 2026), not from the page code:
//   "No city, state or street address anywhere: only India. And no line about age, gambling status, taking consent or deciding who plays:
//    the provider is not in that business; the organizer chooses and invites the people."
// Reads every shipped page and the llms files. Run: node tests/no-address.mjs   (exit code 1 on any failure)
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0, checks = 0;
const check = (name, ok, detail = "") => { checks++; if (!ok) { failed++; console.log("FAIL " + name + (detail ? ": " + detail : "")); } };
const files = readdirSync(ROOT).filter((f) => f.endsWith(".html") || f.endsWith(".txt") || f.endsWith(".xml") || f.endsWith(".webmanifest"));
check("the check looked at the pages", files.length >= 12, String(files.length));

const PLACE = /ghaziabad|uttar pradesh|indirapuram|shipra|krishna vista|B-1105|\b201014\b|streetAddress|addressLocality|addressRegion|postalCode|\bU\.?P\.?,? India\b/i;
const AGE = /\b18 or older\b|\b18\+|adult family|\bover 18\b|gambl|stake money|tick a box|lottery/i; // "betting" is not listed: the document's acceptable-use rule says the Organizer links no game to betting (an obligation of the Organizer, not a status claim)
check("checker: catches a city", PLACE.test("Indirapuram, Ghaziabad"));
check("checker: catches an age line", AGE.test("Participants are 18 or older"));
check("checker: ignores plain India and the number 18 in a drawing", !PLACE.test("a sole proprietorship in India") && !AGE.test('text-anchor="middle">18</text>'));

for (const f of files) {
  const t = readFileSync(join(ROOT, f), "utf8");
  const p = t.match(PLACE), a = t.match(AGE);
  check(`${f}: no city, state or address`, !p, p ? p[0] : "");
  check(`${f}: no age, gambling, consent or who-plays line`, !a, a ? a[0] : "");
}
console.log(`no-address: ${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
