// node tests/readability.mjs : colour pairs of both themes (contrast) and a reading-level count per page. No browser needed.
import { readFileSync, readdirSync } from "node:fs";
import { contrastRatio } from "./lib.mjs";
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const css = readFileSync(new URL("../site.css", import.meta.url), "utf8");
const grab = (block) => Object.fromEntries([...block.matchAll(/--([a-z-]+):(#[0-9A-Fa-f]{6})/g)].map((m) => [m[1], m[2]]));
const light = grab(css.match(/:root\{\s*color-scheme[\s\S]*?--serif/)[0]);
const dark = grab(css.match(/:root\[data-theme=dark\]\{[\s\S]*?\}/)[0]);
const pairs = [["ink", "bg"], ["ink", "paper"], ["ink", "tint"], ["muted", "bg"], ["muted", "paper"], ["muted", "tint"], ["link", "bg"], ["link", "paper"], ["link", "tint"], ["goldt", "bg"], ["goldt", "tint"], ["on-action", "action"], ["on-band", "band"], ["band-muted", "band"], ["band-gold", "band"], ["cta-on", "cta-bg"], ["cta-btn-on", "cta-btn"], ["focus", "bg"], ["focus", "paper"]];
for (const [n, t] of [["light", light], ["dark", dark]]) {
  const merged = n === "dark" ? { ...light, ...dark } : t;
  console.log("== " + n);
  for (const [a, b] of pairs) { const r = contrastRatio(rgb(merged[a]), rgb(merged[b])); console.log(`${a} on ${b}: ${r.toFixed(2)} ${r >= 4.5 ? "" : (r >= 3 ? "(ok for big/graphics only)" : "FAIL")}`); }
}
// reading level
const strip = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/g, " ").replace(/<\/(p|li|h[1-6]|td|dd|div)>/g, ". ").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ");
for (const f of readdirSync(new URL("..", import.meta.url)).filter((x) => x.endsWith(".html"))) {
  const t = strip(readFileSync(new URL("../" + f, import.meta.url), "utf8"));
  const sents = t.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.split(" ").length > 2);
  const long = sents.filter((s) => s.split(" ").length > 25);
  const words = t.split(" ").filter(Boolean); const syl = (w) => Math.max(1, (w.toLowerCase().replace(/[^a-z]/g, "").match(/[aeiouy]+/g) || []).length);
  const S = sents.length, W = words.length, Y = words.reduce((a, w) => a + syl(w), 0);
  const fk = 206.835 - 1.015 * (W / S) - 84.6 * (Y / W);
  console.log(`${f}: ${W} words, ${S} sentences, avg ${(W / S).toFixed(1)} words, Flesch ${fk.toFixed(0)}, ${long.length} over 25 words`);
  for (const l of long) console.log("    LONG: " + l.slice(0, 160));
}
