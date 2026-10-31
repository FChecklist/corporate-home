// The shared Corporate Games bar: this site's copy must equal the canonical files (SHA-256 from corporate-games-bar/src/build.py). Never edit the copy here.
import { createHash } from "node:crypto"; import { readFileSync } from "node:fs";
const sha = (f) => createHash("sha256").update(readFileSync(new URL("../" + f, import.meta.url), "utf8").split("\r").join("")).digest("hex");
const want = { "gamesbar.js": "232311c5d94dc80427836fe7bea017ddda912c5ecdd1e088d268a8a0ef5a4bb1", "gamesbar.css": "d65bc37004de56b0bc1511b21116ccadf36bff27e0fcdb4f0301623d66976355" };
let bad = 0; for (const [f, h] of Object.entries(want)) { const ok = sha(f) === h; console.log((ok ? "PASS " : "FAIL ") + f); if (!ok) bad++; }
process.exit(bad ? 1 : 0);
