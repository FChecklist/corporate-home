# home.corporatetambola.com

The one page that shows all Corporate Games products. Plain HTML, CSS and a little JavaScript. One small build step (`tools/build.mjs`, plain Node, no packages) copies the site to `dist/` and writes `version.json`. No framework, no outside request, no cookie. Design brief and the list of every claim with its source: `C:\ct\test-sites\docs-games\HOME_SITE_DESIGN.md`.

## Files
- `index.html`, `games.html`, `how-it-works.html`, `for-hr.html`, `pricing.html`, `privacy.html`, `contact.html`, `404.html`, `offline.html`
- `site.css` (one stylesheet; two looks, Retro and Modern, each light and dark, as token sets at the top; phone design below 900 px with a tablet layer at 600-899 px, laptop design from 900 px), `theme.js` (runs first: look and light/dark), `site.js` (menu, light/dark button, look button, offline copy), `gamesbar.js/css` (the shared Corporate Games bar: never edit here, copy from the canonical folder), `sw.js` (offline copy)
- `fonts/` Fraunces and Inter, the same files the other Corporate sites carry
- `_headers` (strict content policy, same file Cloudflare Pages reads), `robots.txt`, `sitemap.xml`, `favicon.svg`, `site.webmanifest`, `og-image.svg/png`, icons (`tools/make-assets.mjs` redraws the PNGs)

The pages are written by hand; to change the top bar or the footer, change it in every page (the footer carries `<!--ver-->...<!--/ver-->`, which the build fills with the version).

## Build
```
node tools/build.mjs        # writes dist/ (pages, assets, version.json)
node tools/contrast-pairs.mjs   # text contrast of every look x light/dark, from site.css
```

## Look at it
```
node tests/serve.mjs 8788
```
then open http://127.0.0.1:8788/ (clean URLs and a 404 page, like Cloudflare Pages).

## Tests (real Chrome, one at a time because the laptop has little RAM)
```
node C:/ct/test-sites/console/tools/heavy-run.mjs -- node tests/run.mjs        # the 14 cases
node C:/ct/test-sites/console/tools/heavy-run.mjs -- node tests/falsify.mjs    # breaks a copy of the site 14 ways; every case must go red
node tests/run.mjs --live                                                      # also checks that every outside link answers (needs internet)
```
Playwright and axe-core are read from `C:\ct\ct\dpdp-app` and `C:\ct\tambola` (see `tests/lib.mjs`).

## Deploy (free plan only; not done yet)
Cloudflare Pages project `corporate-home`, build command `node tools/build.mjs`, output folder `dist`, custom domain `home.corporatetambola.com`. Keep Cloudflare Web Analytics OFF for this project (the privacy page says no advertising cookies and no third-party trackers are used; the site's own first-party visit counter is described there too). Also switch Email Address Obfuscation OFF (Security > Settings); the pages already carry `<!--email_off-->` around every address as a second guard. There must be no redirect for `/version.json` (`_redirects` has none; the build fails if one is added).

## Visitor analytics (branch feat/visitor-analytics-2026-11-03, NOT live)
Every page except the offline and 404 pages loads `/a.js` (a byte-for-byte copy of `C:/ct/test-sites/site-analytics/public/a.js`) and sends to this site's own `/api/t` (`functions/api/t.ts` plus `functions/_analytics/core.ts`, also copies; `node tools/sync.mjs pages <this folder> .` in site-analytics refreshes them, `tests/analytics-copy.mjs` checks them). Numbers go to the central D1 `site-analytics`, bound to this Pages project as `ANALYTICS`, with the secret `ANALYTICS_KEY`; without that binding `/api/t` answers 404 and nothing is stored. This folder has no wrangler.toml on purpose (adding one would make it the source of truth for the Pages project's settings), so the binding and the secret are set in the Cloudflare Pages project (Settings, Functions). The visitor code travels to the console address only, in the `#` part of a link used by the visitor (never sent to a server). **Before this goes live the owner must approve the privacy page wording: it still says the site sets no cookies, runs no trackers and sends nothing anywhere.**
