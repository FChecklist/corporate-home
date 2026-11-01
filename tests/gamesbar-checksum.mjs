// HOME VARIANT of the shared bar (1 Nov 2026, owner order: no game-site links on home): gamesbar.js carries the console create address for every game; gamesbar.css is still the canonical file. This site's copy must equal these hashes; the canonical files (SHA-256 from corporate-games-bar/src/build.py). Never edit the copy here.
import { createHash } from "node:crypto"; import { readFileSync } from "node:fs";
const sha = (f) => createHash("sha256").update(readFileSync(new URL("../" + f, import.meta.url), "utf8").split("\r").join("")).digest("hex");
const want = { "gamesbar.js": "6fa606a0f97db5c7ab6b365ce67334bcf87e7e31b6731baa60fbbe12f4d4f593", "gamesbar.css": "d65bc37004de56b0bc1511b21116ccadf36bff27e0fcdb4f0301623d66976355" };
let bad = 0; for (const [f, h] of Object.entries(want)) { const ok = sha(f) === h; console.log((ok ? "PASS " : "FAIL ") + f); if (!ok) bad++; }
process.exit(bad ? 1 : 0);
