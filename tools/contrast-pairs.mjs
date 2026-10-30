// Prints the text/background pairs of every look x scheme straight from the tokens in site.css, with their WCAG contrast ratio.
// node tools/contrast-pairs.mjs         (exit code 1 if any pair is below its minimum: 4.5 for text, 3 for shapes and focus rings)
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "..", "site.css"), "utf8");

// token blocks: every "selector{ ... }" that defines --bg
const blocks = {};
for (const m of css.matchAll(/([^{}]+)\{([^{}]*--bg:[^{}]*)\}/g)) {
  const sel = m[1].trim().split("\n").pop().trim();
  const o = {};
  for (const d of m[2].matchAll(/(--[\w-]+):\s*([^;]+);/g)) o[d[1]] = d[2].trim();
  blocks[sel] = o;
}
const pick = (s) => { if (!blocks[s]) throw new Error("no token block: " + s); return blocks[s]; };
const sets = {
  "retro light": { ...pick(":root") },
  "retro dark": { ...pick(":root"), ...pick(":root[data-theme=dark]") },
  "modern light": { ...pick(":root"), ...pick(":root[data-look=modern]") },
  "modern dark": { ...pick(":root"), ...pick(":root[data-theme=dark]"), ...pick(":root[data-look=modern]"), ...pick(":root[data-look=modern][data-theme=dark]") },
};
// games: --cl --cd --wl --wd
const games = {};
for (const m of css.matchAll(/\.g-(\w+)\{--cl:(#\w+);--cd:(#\w+);--wl:(#\w+);--wd:(#\w+)\}/g)) games[m[1]] = { cl: m[2], cd: m[3], wl: m[4], wd: m[5] };

const rgb = (c) => { c = c.trim(); let m; if ((m = c.match(/^#([\da-f]{6})$/i))) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).concat(1); if ((m = c.match(/^rgba?\(([^)]+)\)$/))) { const p = m[1].split(",").map(Number); return [p[0], p[1], p[2], p[3] ?? 1]; } throw new Error("colour? " + c); };
const over = (fg, bg) => { const f = rgb(fg), b = rgb(bg); return f.slice(0, 3).map((v, i) => v * f[3] + b[i] * (1 - f[3])); };
const lum = (c) => { const [r, g, b] = (Array.isArray(c) ? c : rgb(c)).slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

let bad = 0;
const rows = [];
for (const [name, t] of Object.entries(sets)) {
  const dark = name.endsWith("dark");
  const P = [];
  const text = (fg, bg, what) => P.push([what, fg, bg, 4.5]);
  const shape = (fg, bg, what) => P.push([what, fg, bg, 3]);
  const v = (k) => t[k];
  for (const bg of ["--bg", "--paper", "--tint", "--wash-gold", "--wash-rose", "--wash-teal", "--hero-a", "--hero-b"]) text(v("--ink"), v(bg), `body text (--ink) on ${bg}`);
  for (const bg of ["--bg", "--paper", "--tint", "--wash-gold", "--wash-rose", "--wash-teal"]) text(v("--muted"), v(bg), `secondary text (--muted) on ${bg}`);
  for (const bg of ["--bg", "--paper", "--tint", "--wash-gold", "--wash-rose", "--wash-teal", "--hero-a", "--hero-b"]) text(v("--link"), v(bg), `links (--link) on ${bg}`);
  for (const bg of ["--bg", "--paper", "--tint", "--wash-gold", "--wash-rose", "--wash-teal", "--hero-a", "--hero-b"]) text(v("--accent"), v(bg), `kickers, footer headings (--accent) on ${bg}`);
  text(v("--on-action"), v("--action"), "main button text on --action");
  text(v("--link"), v("--bg"), "outline button text on --bg");
  text(v("--on-band"), v("--band"), "dark band text"); text(v("--band-muted"), v("--band"), "dark band small text"); text(v("--band-gold"), v("--band"), "dark band big number / dots");
  for (const bg of ["--cta-bg", "--cta-a", "--cta-b"]) text(v("--cta-on"), v(bg), `start band text on ${bg}`);
  text(v("--cta-btn-on"), v("--cta-btn"), "start band button text");
  for (const k of ["--n1", "--n2", "--n3"]) text("#FFFFFF", v(k), `numbers in "How a game day feels" on ${k}`);
  for (const k of ["--step-1", "--step-2", "--step-3"]) text(v("--step-on"), v(k), `step numbers on ${k}`);
  P.push(["highlighted words in the headline (--ink on --hl over --hero-b)", v("--ink"), over(v("--hl"), v("--hero-b")), 4.5]);
  for (const [g, c] of Object.entries(games)) {
    const w = dark ? c.wd : c.wl, a = dark ? c.cd : c.cl;
    text(v("--ink"), w, `game name on ${g} tile`); text(v("--muted"), w, `"Corporate" / "Coming soon" on ${g} tile`);
    shape(a, v("--paper"), `${g} accent mark on card`); shape(a, v("--tint"), `${g} accent mark in footer`);
  }
  shape(v("--focus"), v("--bg"), "focus ring on --bg"); shape(v("--focus"), v("--paper"), "focus ring on --paper"); shape(v("--focus"), v("--tint"), "focus ring on --tint");
  shape(v("--action"), v("--bg"), "button outline on --bg");
  shape(v("--mk-b"), v("--mk-a"), "brand mark dots on brand tile"); shape(v("--mk-a"), v("--bg"), "brand tile on header");
  for (const [what, fg, bg, min] of P) {
    const r = ratio(fg, bg), ok = r >= min; if (!ok) bad++;
    rows.push([name, what, Array.isArray(fg) ? "-" : fg, Array.isArray(bg) ? "blend" : bg, r.toFixed(2), min, ok ? "pass" : "FAIL"]);
  }
}
console.log("look scheme | pair | fg | bg | ratio | min | result");
for (const r of rows) console.log(r.join(" | "));
console.log(`\n${rows.length} pairs, ${bad} below minimum`);
process.exit(bad ? 1 : 0);
