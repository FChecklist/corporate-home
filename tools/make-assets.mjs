// Draws og-image.png (1200x630), apple-touch-icon.png (180), icon-192.png, icon-512.png and icon-maskable-512.png from the SVG files in this folder.
// Run once after the artwork changes: node tools/make-assets.mjs   (needs Playwright with Chromium; not part of the site build)
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const { chromium } = createRequire(import.meta.url)("playwright");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const url = (f) => "file://" + resolve(root, f);
const fonts = `@font-face{font-family:Inter;src:url(${url("fonts/Inter-normal-400.woff2")}) format("woff2");font-weight:100 900}@font-face{font-family:Fraunces;src:url(${url("fonts/Fraunces-normal-500-700.woff2")}) format("woff2");font-weight:500 700}`;
const icon = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%"><rect width="64" height="64" fill="#7A1022"/><g transform="translate(${pad} ${pad}) scale(${(64 - 2 * pad) / 64})"><circle cx="32" cy="32" r="22" fill="none" stroke="#F2C14E" stroke-width="2.5" stroke-dasharray="2 5" stroke-linecap="round"/><g fill="#F2C14E"><circle cx="32" cy="19" r="4.2"/><circle cx="43.3" cy="25.5" r="4.2"/><circle cx="43.3" cy="38.5" r="4.2"/><circle cx="32" cy="45" r="4.2"/><circle cx="20.7" cy="38.5" r="4.2"/><circle cx="20.7" cy="25.5" r="4.2"/></g><circle cx="32" cy="32" r="5.5" fill="#FFF6DC"/></g></svg>`;
const jobs = [
  ["og-image.png", 1200, 630, readFileSync(resolve(root, "og-image.svg"), "utf8")],
  ["apple-touch-icon.png", 180, 180, icon(4)], // iOS rounds the corners itself, so the square is full-bleed
  ["icon-192.png", 192, 192, icon(4)],
  ["icon-512.png", 512, 512, icon(4)],
  ["icon-maskable-512.png", 512, 512, icon(12)], // extra margin: the safe zone for maskable icons
];
const browser = await chromium.launch();
for (const [file, w, h, svg] of jobs) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.setContent(`<style>${fonts}html,body{margin:0;background:#fff}svg{display:block;width:${w}px;height:${h}px}</style>${svg.replace(/<svg /, `<svg width="${w}" height="${h}" `)}`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: resolve(root, file), clip: { x: 0, y: 0, width: w, height: h } });
  await page.close();
  console.log("wrote", file);
}
await browser.close();
