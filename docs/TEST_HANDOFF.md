# Test handoff: home site v2 (branch `feat/home-v2-2026-10-30`, cut from `origin/home-bar-qa` cdf70c1)

Coder notes. I wrote product code only. I did **not** run the test suite. To check my own work I ran the build, `tools/contrast-pairs.mjs`, and one throw-away Chromium script that loaded 8 pages at 360, 768 and 1280 px in 4 look/scheme combinations (no horizontal scroll, no console error, bar present, `data-look` applied). That script is not in the repo.

## How to see it
```
node tools/build.mjs            # writes dist/ and dist/version.json
```
Serve `dist/` (not the repo root: root has no `version.json` and the footer shows `dev`). `tests/lib.mjs` `startServer(root, port)` takes any folder, so pass `dist`. The look button is in the header next to Dark/Light (and in the footer). `localStorage.setItem("ctz-look","modern")` + reload also works.

New files: `pricing.html`, `site.webmanifest`, `_redirects`, `og-image.svg/png`, `apple-touch-icon.png`, `icon-192/512.png`, `icon-maskable-512.png`, `tools/build.mjs`, `tools/contrast-pairs.mjs`, `tools/make-assets.mjs`.

## What changed, per item

### 1. `/version.json` + footer version  (rule: honest, checkable releases)
- `tools/build.mjs:25-32` writes `dist/version.json` = `{commit, dirty, builtAt, game:"corporate-games-home"}`. `commit` = `CF_PAGES_COMMIT_SHA` if set, else `git rev-parse HEAD`. `dirty` = any uncommitted change (ignoring `dist/`). On a clean Cloudflare checkout `dirty` is false.
- Footer: `<p class="buildline">Version <a href="/version.json"><!--ver-->dev<!--/ver--></a></p>` (`index.html:157`, same line in every page). Build fills it with `abc1234` or `abc1234+dirty` (`build.mjs:34-40`). Small text: `site.css` `.buildline` (~line 432).
- No redirect: there is no redirect rule. `_redirects` is comments only (`_redirects:1-3`). `build.mjs:51-53` fails the build if a rule mentions `version.json` or points anywhere with `http(s)://`.
- Two other things that would have broken it: `sw.js:12` now lets `/version.json` go to the network (the service worker used to serve an old saved copy); `_headers:23-25` sets `no-store` and JSON type for it.
- **Deploy change:** Cloudflare Pages needs build command `node tools/build.mjs`, output folder `dist` (README updated). Until the setting is changed, the live site has no `version.json`.

### 2. Shared games bar in the built output on every page  (rule: one shared header menu)
- All 9 built pages (8 old + pricing) already had the tags; `build.mjs:42-49` now guarantees it: adds the CSS link / script (`data-game="home"`) if a page lacks them, fails if the script appears twice or the two files are missing from `dist/`.
- Cache-bust bumped to `gamesbar.js?v=3`, `gamesbar.css?v=3`.
- **Edit to the shared file (needs your decision):** `gamesbar.js:19` Lucky Draw note changed from "Tell us you want it" to "Coming soon" (item 7). README says never edit the copy. The canonical copy in `corporate-games-bar` must get the same change, or the next copy-over undoes it. I updated the expected SHA-256 in `tests/gamesbar-checksum.mjs:4` for `gamesbar.js` only (css unchanged).
- The bar is not look-aware: it stays dark navy in every look, as before.

### 3. Two looks, switcher, contrast  (rules: Retro + Modern, light/dark, contrast)
- Tokens: `site.css:9-95`. Four sets: Retro light (`:root`, default), Retro dark, Modern light (`:root[data-look=modern]`), Modern dark. Dark applies through `prefers-color-scheme` until the Dark/Light button is used (`data-theme` wins), as before.
- Early apply: `theme.js:5-7` sets `data-look` from `localStorage["ctz-look"]` (`"retro"`|`"modern"`; anything else = retro) before paint.
- Button: `site.js:23-35`; markup `<button class="tbtn lookbtn" data-look-toggle>Look: Retro</button>` right after the theme button in the header nav and in the footer. Label says the current look; the aria-label says what a click does. Between 900 and 1119 px the header buttons are hidden (existing rule `.top .tbtn`), the footer ones remain.
- Hard-coded colours moved into tokens: moment numbers (`--n1..3`), step numbers (`--step-*`), circle drawing, brand mark (`--mk-a/--mk-b`), per-game accents.
- Contrast: `node tools/contrast-pairs.mjs` reads `site.css` and prints every pair (304 pairs, text 4.5, shapes and focus rings 3). Result: **0 below minimum**. Lowest text pair per combination: Retro light 6.26 (accent on hero-b), Retro dark 5.08 (white on `--n3`), Modern light 5.11 (accent on hero-b), Modern dark 4.86 (white on `--n3`). Typical pairs:

| pair | Retro light | Retro dark | Modern light | Modern dark |
|---|---|---|---|---|
| body text on page | 17.29 | 16.95 | 17.35 | 17.01 |
| secondary text on card | 9.71 | 10.51 | 8.53 | 9.83 |
| link on page | 10.33 | 12.57 | 13.25 | 14.97 |
| kicker / footer heading on tint | 7.56 | 9.44 | 5.83 | 11.75 |
| main button text | 10.11 | 10.88 | 14.20 | 13.37 |
| dark band text / small text | 12.95 / 10.28 | 14.11 / 11.20 | 17.67 / 11.94 | 15.90 / 10.74 |
| start band text (on `--cta-a`) | 10.11 | 11.13 | 12.05 | 12.39 |
| focus ring on page (needs 3) | 5.61 | 12.57 | 6.09 | 13.84 |
| game-day number badges (lowest of 3) | 6.38 | 5.08 | 7.66 | 4.86 |
- Not computed by the tool: the shared bar (`gamesbar.css`, unchanged) and the colours inside the six detailed game badges and the hand-drawn illustrations. I did not change those.
- Print: `site.css:412` now resets all four sets (before, Modern dark would have won in print).

### 4. Per-game mark, name, accent  (rule: per-game name, logo, accent)
- Simple inline-SVG marks (`mk-tambola, mk-bingo, mk-ttt, mk-snakes, mk-luck, mk-draw`, one `currentColor` stroke) live in a sprite at the top of `<body>` on every page (`index.html:~32`). Used in the footer game list (`.gamelist`, `index.html:153`) and inside each card's "Open ..." link (`index.html:~107-113`).
- Accent per game: `site.css:174-181` (`--cl/--cd` light/dark accent, `--wl/--wd` wash). Dark accents are lighter so the marks show on dark cards (all >= 3:1, in the tool).
- Cards keep their existing detailed badge (the same art as the bar) and top stripe in the accent. I did not replace the badge with the simple mark: two different logos per game on one page would be worse. Say if you want the simple mark to replace it.
- Brand link: the brand link already had a mark. It is now `<use href="#mk-brand">`, coloured by look (Retro burgundy+gold, Modern navy+neon). `favicon.svg` redrawn in Retro colours to match.

### 5. Terms, Pricing, Refund, Sub-processors  (rules: plain English; payments only via IT Services by Rajat Agarwal through Razorpay)
- **Decision:** I did **not** write home-level Terms, Refund or Sub-processors pages. They are legal text; I cannot see the real text, and a second copy would drift. Instead the footer says plainly (`index.html:155`): "These legal pages are kept on the Corporate Tambola site. The links open housie.corporatetambola.com." Links unchanged (`/terms`, `/privacy`, `/subprocessors`, `/dpa`, `/refund-policy` on `housie.`).
- New `/pricing` (`pricing.html`): "You pay once for each game you run, before it starts", "Building a game is free", "no yearly plan", "players never pay", the free 10-person demo, "The only payee is IT Services by Rajat Agarwal. The only way to pay is Razorpay.", "GST is not charged". **No amounts anywhere**: the site never had any, and `games.html` says prices are on each game's own page; the page says the same and links the five games. Lucky Draw: "coming soon, no price yet". Linked from the footer, `index.html` note, `games.html` note, `how-it-works.html` "Paying".
- Footer legal line now ends "Payments are collected by IT Services by Rajat Agarwal, through Razorpay."
- **Open point for the owner:** the word "Razorpay" appeared nowhere on the site before. `privacy.html` and the sub-processor list on the Tambola host should name Razorpay too; I did not edit privacy claims. Also I wrote "payee" for IT Services only; Razorpay is the payment service, not a payee.

### 6. og:image, twitter, manifest, icons, JSON-LD, sitemap  (rule: findable, honest)
- Every page head: `og:image` (+ type, width 1200, height 630, alt), `twitter:card=summary_large_image` + title, description, image, `theme-color` for light and dark, `<link rel=manifest>`, `<link rel=apple-touch-icon>` (e.g. `index.html:9-11`).
- **PNG was needed and exists.** Many sharing sites (WhatsApp, LinkedIn, Facebook) ignore an SVG `og:image`, and iOS ignores an SVG touch icon. Chromium was available here, so `tools/make-assets.mjs` draws `og-image.png` (1200x630) from `og-image.svg`, plus 180/192/512 and a maskable 512 icon. The SVG is kept as the source. Re-run the tool only if the art changes (needs Playwright).
- `site.webmanifest` (name, start_url, colours, 4 icons incl. maskable); `_headers:26-29` serves it as `application/manifest+json`.
- Organization JSON-LD on the home page only (`index.html:12`): name, url, logo, address, email, phone, parent organisation "IT Services by Rajat Agarwal", contact point. A data block, so the strict CSP does not touch it.
- `sitemap.xml`: home, games, how-it-works, for-hr, pricing, privacy, contact. `404` and `offline` are left out on purpose (not pages to index). `build.mjs:54-58` fails if a page is missing.

### 7. Lucky Draw "Coming soon"  (rule: plain English)
- Hero list tile: non-link `<span class="soon-tile">` with "Coming soon" (`index.html:85`).
- Card: "Coming soon" tag, then a secondary link "Ask us about Lucky Draw" to `/contact` (`index.html:113`). Same on `games.html:53-55`; `contact.html` sentence starts "Lucky Draw is coming soon."; footer item says "Lucky Draw Coming soon". The bar tile's note is "Coming soon" (item 2). No "Tell us you want it" text is left anywhere (`grep -ri "tell us you want"` is empty).

### 8. One game list in the hero  (rule: no duplicate content)
- `.choose` removed from `index.html`. `.six` stays and is now the only list: pills below 600 px, 3-column tiles from 600 px, the panel from 900 px (`site.css:156-175`). Title text "Choose a game for your close group" ("close group", not "private"). Note: `tests/cases.mjs:221` comments on the old double list; its count logic may need a look.

### 9. Plain mailto link, visible address  (rule: works without script)
- The source already had plain `mailto:` links. The obfuscation comes from Cloudflare "Email Address Obfuscation" at serve time, which turns the link into `/cdn-cgi/l/email-protection` and needs a script the CSP blocks. Fix in two layers: every address is wrapped in `<!--email_off-->...<!--/email_off-->` (all pages, header-less footer included; e.g. `index.html:77`), and the README says to switch the Cloudflare setting off. The visible text is always the address. `build.mjs:44` fails if `data-cfemail` or `email-protection` ever appears in a built page.
- I cannot confirm on the live host from here. Test: fetch the deployed page and check the `href` still starts with `mailto:`.

### 10. 768 px tablet layout  (rule: 360, 768, 1280)
- `site.css:447-470` (600-899 px): content width 720, two-column sections (`.two`, `.band-grid`), two-column cards, second hero button visible, wider rows, bottom bar buttons centred; `:477-480` full-width buttons under 480 px. Existing 600-899 rules (`:368`) kept.
- Read for overflow: every grid column is `minmax(0,...)`; `.wrap` is `min(100% - 2*gutter, maxw)`; `body` has `overflow-wrap:break-word`; the contact `dd` uses `overflow-wrap:anywhere`; the table collapses to blocks under 900 px; the pills wrap; images and SVGs have `max-width:100%`. My Chromium pass found `scrollWidth <= clientWidth` on `/`, `/games`, `/pricing`, `/contact`, `/how-it-works`, `/for-hr`, `/privacy`, `/404` at 360, 768 and 1280, in all four combinations.

## Decisions to check
1. Default look is **Retro**. A visitor with no saved choice gets Retro in light or dark by device.
2. `ctz-look` uses the same key as the games, but `localStorage` is per host: `home.` and `housie.` cannot see each other's value. Same name, not shared state. Sharing needs a cookie on `.corporatetambola.com`, which this site avoids. I did not check which values the games accept.
3. Cache and service worker: `sw.js` is `home-v8`, `/pricing` added to the offline set, stylesheet/script query strings bumped to `v=6`.
4. The page text keeps "close group" (no "private" anywhere in the pages or the bar: `grep -i private` is empty).
5. Nothing deployed, nothing merged. `tests/` untouched except the checksum line.

## Known gaps / not done
- The old test suite is expected to need updates (new footer text, `.choose` gone, Lucky Draw wording, `data-look`, pricing page in the page list). I did not run or edit it.
- Terms, Refund, Sub-processors remain on the Tambola host (item 5).
- Pages are still hand-copied (header, footer, sprite in 9 files); only the version and the bar are checked by the build.
