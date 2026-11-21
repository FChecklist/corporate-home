# Knowledge: Corporate Games home (corporate-home)

Written 20 Nov 2026, updated 21 Nov 2026 for version 2.1.0, for a future AI session that has never seen this repo (standard: marketing-ledger plans/VERSION-AND-KNOWLEDGE-STANDARD-2026-11-20.md). It describes the CURRENT state only, from the code and existing docs. Anything not found is marked "unknown". Do not publish this file on the website (the build refuses to copy `docs/`).

## 1. What this is
The one page that shows all Corporate Games products, plus the front door that sends organizers to the one sign-in on the console. Plain HTML, CSS and a little JavaScript. A small build step (`tools/build.mjs`) writes `dist/`. No framework. No cookie unless the visitor says yes (see 4).
- Live site: https://home.corporatetambola.com (Cloudflare Pages project `corporate-home`). Live version now (from `/version.json`, read 20 Nov 2026): **unknown (no version field yet)**, commit `7711fb045c149b72fa9e2f1256dbb6d55bca33a1`, built 2026-11-12 15:15 UTC.
- Version **2.1.0** (21 Nov 2026) is in PR #6, branch `claude/modest-bohr-7dphxw`, off the default branch `home-bar-qa`. It is NOT merged and NOT deployed. Version 2.0.0 (PR #1) was merged into `home-bar-qa` on 20 Nov 2026 (merge commit 772db2f); whether it was ever deployed is unknown (the live site could not be read on 21 Nov). Open PRs on other lines, not part of 2.1.0: #2 (`feat/seo-2026-10-30`: SEO pages, llms.txt, robots change) and #5 (`claude/inspiring-rubin-ab78bs` on `base/wa-home-2026-11-04`: smoke kit, visit counter, terms page). Those two disagree with this line (the counter would break "no visit counting"); the owner decides.
- Other repos and what they are for: `KNOWLEDGE-MAP.md` in the repo root.

## 2. How it connects
home.corporatetambola.com (front door, links only) -> console.corporatetambola.com (the one sign-in; set up, invite, pay) -> moneypenny.corporatetambola.com (credits; the single payment gate) -> IT Services by Rajat Agarwal -> Razorpay. Each game is its own website and takes settings from the console by API. Home never talks to any of them by script: every connection is a plain link. The console-to-game contract is `docs/CONTRACT_V1.md` in corporate-console (not in this repo). Home does not name Moneypenny to visitors (the backend stays hidden).

## 3. Map of folders and the files that matter
- Pages: index, games, how-it-works, for-hr, pricing, privacy, contact, changes (the "What's new" page, filled at build time), 404, offline (`*.html`). Pages are hand-copied; header, footer and the SVG sprite are repeated in each.
- `consent.js` cookie choice; `gate.js` the console links (first visit / repeat visit); `site.js` menu, light/dark, look; `theme.js` runs first; `sw.js` offline copy (bump `V` when files change; it saves nothing until the page says Yes, see 4); `gamesbar.js` + `gamesbar.css` the shared bar (never edit: `tests/gamesbar-checksum.mjs`).
- `version.json` hand-kept source (product, version, changes[]); the build writes `dist/version.json` = source + commit, dirty, builtAt.
- `CHANGELOG.md`, `docs/KNOWLEDGE.md` (this), `docs/SUITE_RULES.md` (owner rules v1.1), `docs/TEST_HANDOFF.md`, `docs/VERSIONING-TODO.md`.
- `tools/build.mjs`, `tools/contrast-pairs.mjs`, `tools/make-assets.mjs`; `tests/` (run.mjs, falsify.mjs, cases.mjs T01-T15, cases-v2.mjs T16-T23, lib.mjs, fixtures/sw-v11-older-worker.js = the 2.0.0 helper kept only so tests can prove an older helper cannot bring a copy back); `.github/workflows/ci.yml`.
- `_headers` strict content policy (scripts and styles from this site only; JSON-LD data blocks are allowed because they are data), `_redirects` (none on purpose), `robots.txt`, `sitemap.xml`, `site.webmanifest`.

## 4. Rules in force
- Suite rules version 1.1 (20 Nov 2026): `docs/SUITE_RULES.md`; source marketing-ledger `plans/SUITE-RULES-VERSION-2026-11-20.md`.
- One sign-in. In this PR the sign-in is on **console.corporatetambola.com** and home only links there (task from the owner's BOSS, 20 Nov). Note: `docs/SUITE_RULES.md` section 1 still says "1 login: home.corporatetambola.com"; the two disagree. Home has no login form and takes no payment either way; only the link target would change. Recorded in the PR comment for the owner.
- Links to the console look like `https://console.corporatetambola.com/?from=home&visit=first` (`visit=repeat` for a returning visitor who said yes; `&demo=tambola|bingo` for the free demo). Nothing else is ever put in the address. Home never redirects by itself.
- Cookie choice: nothing is stored before the answer. The offline copy (sw.js, cache `home-v12`) starts only after a Yes: install saves nothing, the page sends `ctz-keep` after a Yes, the helper adds files only to a copy that exists. A No (or no answer, or a privacy signal) sends `ctz-stop` (the helper deletes every `home-` copy and removes itself), unregisters every helper, deletes every `home-` copy, and, while an older helper that cannot be told still runs the page, deletes again every 0.3 s. Known limit: that older helper can write for up to 0.3 s after a No. Tests: T12, T22; "No, thanks" and "Yes, remember me" are equal buttons; yes only adds a note `ctz-visited` so the Sign in button can say "Your console". Privacy signals: Global Privacy Control or Do Not Track counts as No: no question, nothing stored; a Yes given before the signal is overridden (visit note removed); a Yes pressed while the signal is on is stored with `s:1` and wins. The footer "Cookie choices" always opens the question. The look and light/dark choices are stored only when the visitor presses those buttons. No analytics (Cloudflare Web Analytics is OFF).
- Wording (suite rules 4 and 5): console voice "you"; fairness line ("No one knows the next number: not the organizer, not the host, not even the software.", said once, on the home page, led by "Tambola and Bingo." because it is true only for the number games; never for Tic Tac Toe, Snakes and Ladders, Luck by Chance or Lucky Draw), 24-hour deletion including IDs, privacy line "Designed to follow US privacy laws, EU GDPR and India's DPDP", prizes line "You (the company) give the prizes directly to the winners.", billing sentence "We keep billing data for audit and tax reasons."; never "100% secure", "most secure", "played by major companies", "forever", tick boxes before joining.
- Prices: only on `/pricing`: 100 credits Rs 2,399 / $34; 250 Rs 3,499 / $51; 500 Rs 4,699 / $67; 750 Rs 5,899 / $84; 1,000 Rs 7,099 / $101; 2,500 Rs 11,799 / $169; 5,000 Rs 17,699 / $253; 10,000 Rs 29,499 / $421. No GST. Payee only IT Services by Rajat Agarwal, only through Razorpay.

## 5. How to run the tests
```
npm ci
npx playwright install chromium        # once
npm run build                          # writes dist/ (refuses a wrong version, a missing page, a page missing from the sitemap)
npm test                               # 23 cases, real Chromium, runs on dist/
npm run falsify                        # breaks each behaviour on purpose; every one must go red
npm run typecheck && npm run contrast && npm run links
```
On the owner's laptop `tests/lib.mjs` still uses the lock file `C:/ct/chrome-console.lock` when `C:/ct` exists (heavy-job protocol). Elsewhere there is no lock.

## 6. Deploy and roll back
Cloudflare Pages project corporate-home. **Needs a settings change (owner only):** build command `node tools/build.mjs`, output directory `dist` (before this PR: no build command, output = repo root). Domain home.corporatetambola.com, Web Analytics OFF, Email Address Obfuscation OFF. Rollback in the Cloudflare dashboard; previous deploy id: unknown. Nothing is deployed from this PR. Cloudflare only, no Vercel. Every deploy needs a version bump and a CHANGELOG entry (the build refuses otherwise).

## 7. Known issues and open points
- 360 px: T06 (every page, 320 to 1920) and T23 (360 px with the cookie question open, with the privacy-signal line, answered) both pass. SEO basics (title, description, canonical, robots, Open Graph, Twitter, structured data, sitemap, robots.txt) are complete on every page (T18).
- An older helper on a device (from the live 1.0.0 build or 2.0.0) is replaced by the 2.1.0 helper on the next visit; until then the page removes anything it saves (see 4).
- The shared bar marks both of its own "Corporate Games" links as the current page on the front page (two `aria-current="page"`). It is in the canonical bar, so it is not fixed here (T10 documents it).
- `docs/SUITE_RULES.md` says home is the login; this PR links to the console. Owner to confirm which is right.
- The privacy table no longer has the 365-day "contact details a winner confirms" row (owner rule: all participant information is deleted within 24 hours). If a game really keeps that, the game must change or the page must say so.
- `demo=tambola|bingo` in the console link: whether the console understands it is unknown.
- Game cards and the bar link to each game's own public page (housie., bingo., ...). If a game page still shows its own login, hide it there (owner rule).
- robots.txt keeps the existing AI-training block list; the stalled SEO branch (`feat/seo-2026-10-30`) wanted the opposite and was not merged.
- Pages are hand-copied; changing the header or footer means editing every page.

## 8. Owner-only steps still open
Cloudflare build settings (6), merging PR #6 (and deciding on #2 and #5), deploy, domain, Rs 1 payment test (a game/console matter), which of console or home is the login in `docs/SUITE_RULES.md`, whether to allow AI search crawlers. Secrets and keys are the owner's.
