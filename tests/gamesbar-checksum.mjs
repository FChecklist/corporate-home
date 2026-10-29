// The shared Corporate Games bar: this site's copy must equal the canonical files (SHA-256 from corporate-games-bar/src/build.py). Never edit the copy here.
import { createHash } from "node:crypto"; import { readFileSync } from "node:fs";
const sha = (f) => createHash("sha256").update(readFileSync(new URL("../" + f, import.meta.url), "utf8").split("\r").join("")).digest("hex");
const want = { "gamesbar.js": "16f02208af3c84cef63d81cdfcbc788f1baf23957ed71e912d44cafd4f881b98", "gamesbar.css": "6b0311de98525de646e637a28102163dfecf9fde35b8befe0344a5e16fff8b5b" };
let bad = 0; for (const [f, h] of Object.entries(want)) { const ok = sha(f) === h; console.log((ok ? "PASS " : "FAIL ") + f); if (!ok) bad++; }
process.exit(bad ? 1 : 0);
