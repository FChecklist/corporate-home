// Information only (CI marks it non-blocking): does every outside link on the built site answer? Needs internet.
// console.corporatetambola.com may not exist yet; that shows here, and that is the point of looking.
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { liveLinks } from "./run.mjs";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const res = await liveLinks(root);
const bad = res.filter((x) => !(Number(x.status) >= 200 && Number(x.status) < 300));
console.log(`${res.length} outside links, ${bad.length} not answering`);
for (const b of bad) console.log("  - " + b.u + " " + b.status);
process.exit(bad.length ? 1 : 0);
