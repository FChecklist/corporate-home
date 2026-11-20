# Smoke test: home.corporatetambola.com, owner steps 1 and 3 (20 Nov 2026)

Step 1 is the first visit of an organizer. Step 3 is the repeat visit, including the hand-off to the console and the "one login" rule.
Tester: Claude Code session for BOSS. Nothing was deployed, merged or switched. Branch `claude/inspiring-rubin-ab78bs`, pull request [corporate-home#5](https://github.com/FChecklist/corporate-home/pull/5) (draft).

## 1. The answer in six lines

1. **493 cells run.** Before the fixes 397 passed and 96 failed. After the fixes 460 pass and 33 fail. So 63 cells are fixed and 33 are open.
2. **Fixed in this repo (8):** returning visitors' page views were being lost; Terms did not open offline; the games list in the search data had 5 of 6 games; the phone bottom bar sat outside a landmark (48 cells); `/login` gave a 404; the HR description was too long; e-mail addresses on Terms and Contact came out scrambled on the live site; the repo's own test suite could not run outside the owner's Windows laptop.
3. **Open (7), none can be fixed inside this repo alone:** the visitor code does not travel on "Create" links (12 cells); a campaign link with an e-mail address in it is sent to the counter (12); a decline signal still sends page counts (6); one login at home is not built (1); Sign in takes two taps on a phone (1); the pricing page wording points to pages that do not exist (1); `ca_sent` is stored under a decline signal (2, shared with the decline-signal cells).
4. **Live site:** probed read-only from a GitHub runner (this build sandbox cannot reach the site). Results in section 7.
5. **Tests:** repo's own browser suite 15 cases, 1,922 checks, 0 failed. Six regression tests (49 checks). Nine deliberate breaks, nine went red, `dist` untouched.
6. **One thing BOSS must decide first:** PR #1 is not the release line. It has 0 links to the console and 168 links to game sites. The line that has the console links is `base/wa-home-2026-11-04`, which already contains PR #1's v2 commit. I tested that line with PR #1's head merged in.

## 2. What was tested

| | |
|---|---|
| Code | `base/wa-home-2026-11-04` (release candidate, 42 commits ahead of PR #1) + merge of `feat/home-v2-2026-10-30` (PR #1 head). Merge commit `4284620`. |
| Why not PR #1 alone | PR #1 head: 0 console links, 168 game-site links (`housie.../zc`), no Terms page, no visit counter. Testing it alone would only repeat what the later commits already fixed. This PR targets `base/wa-home-2026-11-04` so the diff is only the smoke work. |
| Browser | Real Chromium through Playwright 1.63 (the same Chromium as the CI runner). Not tested: Safari, Firefox, real phones, the console, Moneypenny, Razorpay. |
| Server | `tests/smoke/pages-server.mjs`: a small stand-in for Cloudflare Pages that reads the site's own `_headers` and `_redirects`. What it guesses about Cloudflare is listed at the top of that file and is checked again by the live probe. The visit counter's database is replaced by a stub that keeps what the page sent. |
| Runner | `.github/workflows/smoke-home.yml`: `matrix` job (build, static checks, repo suite, regression, falsification, matrix) and `live-probe` job (HTTP probe and browser walk of the live site). |
| Rerun | `node tools/build.mjs && node tests/smoke/matrix.mjs` (about 4 minutes). Needs `npm install --prefix tests/smoke`. |

## 3. The matrix

A cell is one test on one combination. A cell passes only if every check inside it passes (5,808 checks in total). Cell numbers look like `1.FV.017`: step, group, running number. All cells are in `docs/smoke/after/matrix-results.json` and `docs/smoke/before/matrix-results.json`; the before run uses the final test code against the code before the fixes.

Combinations used: 12 pages (home, games, how it works, for HR, pricing, privacy, contact, terms, two use-case pages, 404, offline) × 3 widths (360, 768, 1280) × Retro or Modern × light or dark; JS blocked; Slow 3G and Fast 3G; direct, WhatsApp, LinkedIn, lnkd.in, Facebook and Google arrivals × 7 kinds of link (none, UTM, UTM plus click ids, e-mail inside UTM, partner code, bad partner code, script text in UTM) × 2 pages; decline signal on or off, do-not-track, storage blocked, storage cleared; offline then online; back and forward; five browser languages.

| Step | Group | Cells | Pass before | Fail before | Pass after | Fail after |
|---|---|---:|---:|---:|---:|---:|
| 1 | First visit (page × width × light/dark × look) | 144 | 144 | 0 | 144 | 0 |
| 3 | Repeat visit: look and colour remembered | 12 | 12 | 0 | 12 | 0 |
| 3 | Repeat visit: tracker code, sessions, decline | 4 | 2 | 2 | 2 | 2 |
| 3 | Single login rule | 4 | 2 | 2 | 2 | 2 |
| 1+3 | Hand-off links (every console address) | 12 | 12 | 0 | 12 | 0 |
| 1+3 | Hand-off click (real clicks, console answered by a stub) | 32 | 20 | 12 | 20 | 12 |
| 1 | Arrival source (WhatsApp, LinkedIn, UTM…) | 84 | 72 | 12 | 72 | 12 |
| 3 | Back / forward | 7 | 1 | 6 | 7 | 0 |
| 3 | Offline then online | 2 | 0 | 2 | 2 | 0 |
| 1 | JavaScript blocked | 36 | 36 | 0 | 36 | 0 |
| 1 | Slow network | 13 | 13 | 0 | 13 | 0 |
| 1+3 | Cookies and click path | 8 | 0 | 8 | 4 | 4 |
| 1 | Language of the browser | 6 | 6 | 0 | 6 | 0 |
| 1 | Deep links and redirects | 15 | 14 | 1 | 15 | 0 |
| 1 | SEO on every page | 13 | 11 | 2 | 13 | 0 |
| 1 | version.json | 1 | 1 | 0 | 1 | 0 |
| 1 | Headers | 1 | 1 | 0 | 1 | 0 |
| 1 | Accessibility, automatic scan (serious, critical, moderate) | 96 | 48 | 48 | 96 | 0 |
| 1 | Accessibility, keyboard and 320 px | 1 | 1 | 0 | 1 | 0 |
| 1 | Dead links inside the site | 1 | 1 | 0 | 1 | 0 |
| 1 | Prices | 1 | 0 | 1 | 0 | 1 |
| | **Total** | **493** | **397** | **96** | **460** | **33** |

Besides the matrix: repo static tests 160 checks (0 failed); repo browser suite 1,922 checks (0 failed, ran for the first time off the owner's laptop); regression 49 checks; live probe and live browser walk in section 7.

Numbers worth knowing (all pass): Slow 3G, home page: first heading at 4.2 s, fully loaded at 5.9 s, 269 KB (uncompressed, from the local server). Fast 3G: 1.5 s. A returning visitor on a 5 KB/s line sees the saved copy in 0.1 s. With JavaScript blocked all 36 cells pass: every page is readable, the menu links are visible and a way to the console is shown. No cookie is set in any state (normal, decline signal, do-not-track, storage blocked, storage cleared). No page has a form, a password box, a dialog or a cookie wall. `version.json` answers 200, `no-store`, with a 40-character commit that matches every footer. Every price amount on the site is in your pricing table, because there are none: the home site prints no price at all (`grep` over the pages, `llms*.txt` and the bar found 0 amounts, so none can disagree with 100 / ₹2,399 / $34 and the rest).

## 4. Failure map

Each row: what was seen, what was expected, the cause (read in the code and proven), and the state. "Cells" are the matrix cells that showed it.

### Fixed in this repo

| ID | Step | Permutation | Observed vs expected | Root cause (proof) | State |
|---|---|---|---|---|---|
| **F-01** | 3 | Returning visitor (offline copy active), any width or look, moving by clicking links, Chromium. Cells: 8.BF.01-06, 11.CP.01-04 (10) | Page views lost: 18 of 24 in the test. Expected: every page seen once, in order. | `sw.js` controls the page. When the visit counter sends its last message of a page (`a.js` `pagehide`), Chromium loses it if a worker with a fetch handler controls the page. Proof by three runs of the same walk: worker on = 6 of 24 arrive; worker blocked = 24 of 24; worker on with a static route for `/api/t` = 24 of 24. The worker takes control a moment after the first page of a first visit, so this hits every later page of a first visit and every page of a repeat visit: the returning organizer most of all. | **Fixed** `sw.js:6` (`addRoutes`, source network). Chromium only; Firefox and Safari not tested. Regression R1. |
| **F-02** | 3 | Returning visitor, offline, Terms. Cells 9.OF.phone, 9.OF.laptop | Terms showed "You are offline". Expected: a legal page read before opens again. | `sw.js` `CORE` list did not contain `/terms` (page added later than the list). | **Fixed** `sw.js:4`, copy version v12 to v13. R2. |
| **F-03** | 1 | Search-engine data, home page. Cell 12.SEO.index | List of games had 5 items; the page shows 6 (Lucky Draw is a normal entry since 1 Nov). | `index.html:53` `ItemList` written before Lucky Draw became a normal entry. | **Fixed** (6th item). R3. |
| **F-04** | 1 | Phone width, all 12 pages, light/dark, both looks. 48 cells (15.AX.*) | axe "region": the sticky bottom bar is outside every landmark. Screen-reader users on phones get an orphan control group. | `<div class="tabbar">` on every page. The repo's own scan (T11) only fails serious and critical, so it never saw this moderate rule. | **Fixed** `<nav class="tabbar" aria-label="Create a game or contact">` on 12 pages. R4. |
| **F-05** | 1 | Deep link: organizer types `/login`, `/signin`, `/sign-in` or `/console`. Cell 6.DL.signin-guesses | 404 page. Expected: the console sign-in. | No rule. `tools/build.mjs` refused every redirect that leaves the site. | **Fixed** four 302 rules in `_redirects`; the build now allows only that one outside address with a 302 and still refuses anything else and any rule on `/version.json`. R5. |
| **F-06** | 1 | SEO, `/for-hr`. Cell 12.SEO.for-hr | Meta description 169 characters (limit 155; search results cut it). | `for-hr.html` description (also in the Open Graph and Twitter tags). | **Fixed**, 149 characters, the owner's HR sentence kept word for word. |
| **F-07** | 1+3 | Live site, `/contact` and `/terms` (live probe L.cfmail). Repo: `contact.html` 1 address, `terms.html` 3 addresses | The live page contains Cloudflare's scrambled form (`/cdn-cgi/l/email-protection`, `data-cfemail`). The visible text becomes "[email protected]" and the script that would restore it is blocked by the site's own content policy. Expected: a readable address. | These four addresses sit outside `<!--email_off-->`. `/`, `/privacy` and the others have none outside the guard and are clean live. The exact match between "pages with an unguarded address" and "pages scrambled live" proves the cause. `terms.html` is generated by `tools/make-terms.mjs` from another repo, so a hand edit alone would be lost at the next generation. | **Fixed** in `contact.html`, `terms.html`, **and** `make-terms.mjs` (wraps every address). New `tools/email-guard.mjs`; the build now fails on any address outside the guard. R6. **Live stays scrambled until a deploy.** |
| **F-08** | - | Any CI runner or Linux machine | The repo's browser suite could not start: paths such as `C:/ct/...` and a Windows-only "am I the main file" test. | `tests/lib.mjs`, `tests/cases.mjs`, `tests/run.mjs`, `tests/falsify.mjs`. | **Fixed** with environment overrides and a portable check. The old Windows values still work. Suite now: 15 cases, 1,922 checks, 0 failed on Linux and on the runner. |

### Open (need the owner, or a change in another repo)

| ID | Step | Permutation | Observed vs expected | Root cause (proof) | Fix needed, and who |
|---|---|---|---|---|---|
| **O-01** | 1→3 | Click "Create your closed-group game", a game card or a bar tile. Cells 2.HC (12) | The visitor code is not added to the console address. Only the small "Sign in" link carries `#cv=…`. 145 of 157 console links are `…/#/create`. Expected (comment in `a.js`): one journey from home to console. | `a.js:126` adds the code only to links with no `#` part (`!u.hash`). Every Create link has `#/create`. So home→console for the main button cannot be joined. | Cross-repo: `site-analytics` canonical `a.js` plus the console's router (it must read a code placed after a hash route, for example `#/create?cv=`). Do not edit the copy here: `tests/analytics-copy.mjs` requires a byte-for-byte copy. **Owner / console team.** |
| **O-02** | 1 | Campaign link with an e-mail address in `utm_source`. Cells 7.AR (12, 6 sources × 2 pages) | The address leaves the browser in the first message to `/api/t`. Expected: no personal data in the click path. | `a.js:56` sends `utm_source`, `utm_medium`, `utm_campaign` unchanged. The server (`core.ts` `clean`) removes symbols but keeps the letters (`raajat.agarwal@gmail.com` is stored as `raajat.agarwalgmail.com`). Needs a marketer to paste an address into a campaign link, so low. | Canonical `a.js`: drop any value that looks like an e-mail or a phone number. **site-analytics.** |
| **O-03** | 3 | Decline signal (Global Privacy Control) or do-not-track, after the first message. Cells 3.RC.gpc, 3.RC.dnt | `sessionStorage` gets `ca_sent=1`. The repo test (T13) says nothing is stored. Value is only "1", no identifier, gone when the tab closes. | `a.js:53` `ss("ca_sent","1")` runs in `flush()` even when the signal is on. T13 looks at 150 ms, before the first message. | Canonical `a.js`: skip when the signal is on. Low. **site-analytics.** |
| **O-04** | 1+3 | Decline signal on. Cells 11.CP (4), plus the same check inside 3.RC.gpc and 3.RC.dnt | The page still sends page views, clicks and exits (flagged `g:1`, no visitor code). `privacy.html:79` says "A Global Privacy Control signal … is respected: no navigation data is collected" and, a sentence later, "a visitor who sends the signal is counted only in anonymous daily totals". The server (`core.ts:258`) keeps per-page, per-source and per-country daily totals for them. The two sentences disagree. | Wording versus behaviour. No identifier is kept, so this is a wording problem more than a data problem. | **Owner decides** (the privacy wording is the owner's). Option A: change `a.js` to send nothing under the signal (matches the first sentence). Option B: drop "no navigation data is collected" and keep the daily-totals sentence. I would pick A: it is the stronger promise and costs a few lines. |
| **O-05** | 3 | Returning organizer. Cell 3.NG.02 | No "Continue to console". Home has no sign-in and remembers nothing, so a returning organizer sees the same Sign in and Create links as a stranger. The 20 Nov rule says home is the single login gate; the 1 Nov rule and the code (`e5a30f0`) send every Sign in to the console. **No second login prompt exists anywhere on home (cells 3.NG.01 pass, 12 pages, first and repeat visit, phone and laptop).** | Design gap, not a bug: the two rules point to two different designs. | **Owner decision.** Either home builds a sign-in (large) or the rule is reworded to "console is the one sign-in, reached from home". |
| **O-06** | 3 | Phone, returning organizer. Cell 3.NG.04 | "Sign in" is only inside the closed Menu: two taps. The bottom bar has "Create…" and "Contact". | `index.html:180` (`signin-small` inside `nav#nav`). The bottom bar wording was set by the owner (one main action plus a small Contact link). | Owner OK needed: add a small "Sign in" text link beside Contact in the bar (about 10 lines of HTML and CSS, 12 pages). |
| **O-07** | 1 | Pricing page. Cell 17.PR.01 | Says "The price is shown on each game's own page", then lists six games that all go to the same console create page. | `pricing.html:57-60`. Game pages no longer exist on home; the six links share one address. | Owner wording. Suggested: "The price is shown in the console for each game, before you pay." |

### Facts that are not failures but the owner should know

- The visit counter keeps a shortened network address, a keyed hash of the full address, city, network name, browser and a random code for up to one year, and shows no banner. `privacy.html` says so in plain words. Whether DPDP wants a choice box before that is a legal question for the owner, not a test result.
- There is no on-page "decline" control. The only decline is the browser's Global Privacy Control or do-not-track, which the counter honours (no code is made).
- `README.md` on the release line still says the visit counter is "NOT live". The live probe tells which is true (section 7).
- The existing test T13 would not have caught O-03 or F-01. The new matrix does.

## 5. Fixes and their tests

One regression test per fix: `tests/smoke-regress.mjs` (49 checks). `tests/smoke-falsify.mjs` breaks a copy of `dist` nine ways and requires the matching test to go red, and the untouched copy to stay green. Result: 9 of 9 red, 0 stayed green, `dist` unchanged.

| Fix | Test | How it was broken | Result |
|---|---|---|---|
| F-01 | R1 | remove the `addRoutes` line from `sw.js` | red (the static check and the 3-walk page-view count) |
| F-02 | R2 | take `/terms` out of `CORE`; put back `home-v12` | red, red |
| F-03 | R3 | drop the 6th list item | red |
| F-04 | R4 | turn the bar back into a `div` on every page | red (12 pages) |
| F-05 | R5 | remove the four redirects; send `/login` to `/#/create` | red, red. Also: the build still refuses an outside host, a 301 to the console and a rule on `/version.json`. |
| F-07 | R6 | unguard one address in `/terms`; unguard every address in `/contact` | red, red. Also: the build refuses a page with a bare address. |
| F-06, F-08 | covered by the matrix (12.SEO.for-hr) and by the suite itself | | |

## 6. What passed (so nobody re-tests it)

First visit on all 12 pages at 360, 768 and 1280 px, both looks, light and dark: status, no console message, only own-site requests, no sideways scroll, one h1, `lang="en"`, look applied, bar drawn, no form. Colours remembered after reload, on another page, after back and in a new tab (12 cells). Visitor code stable across pages, reloads and later visits; new session after 30 minutes; new code after storage is cleared. Hand-off: every one of the 157 console links is exactly `https://console.corporatetambola.com/` or `…/#/create`, https, no query, no personal data; a label never means two places; "Sign in" always goes to the root; real clicks end at the console with no query and the browser sends only the origin as referrer. Arrivals from WhatsApp, LinkedIn, lnkd.in, Facebook and Google, with and without UTM, click ids, bad partner codes and script text: pages open, canonical and `og:url` stay clean, the counter records host and path only. SEO on every indexable page: title ≤ 60, description 50–155, canonical, robots, Open Graph, Twitter card, 1200×630 PNG under 300 KB, structured data parses, FAQ marked up equals FAQ shown, breadcrumbs, all pages in the sitemap and nothing else, `robots.txt` names the sitemap and blocks no CSS or JS, `security.txt` valid for more than 60 days. Headers: HSTS, nosniff, referrer policy, not framable, strict content policy, no `X-Robots-Tag`, no Set-Cookie. No dead link inside the site, every `#anchor` exists, `mailto` and `tel` well formed. Language: five browser languages leave the page English and left-to-right.

## 7. Live site (read-only, from a GitHub runner)

This build sandbox cannot reach `corporatetambola.com` (its proxy answers 403 for those hosts), so the live checks run on the GitHub runner: `.github/workflows/smoke-home.yml`, job `live-probe`. Only GET and HEAD; nothing is posted; the browser walk cancels the counter's own messages so no visit is added to the owner's numbers.

LIVE_RESULTS_PLACEHOLDER

## 8. Limits of this test, plainly

- The Cloudflare stand-in is a guess for four behaviours (`.html` redirect, trailing slash, letter case, default cache header). The live probe covers them.
- F-01 is proven for Chromium. A static route is a Chromium feature; other browsers keep the old behaviour. They were not tested here.
- Nothing past the console's front door was tested: sign-in, create, invite, Moneypenny, Razorpay.
- The counter's database was replaced by a stub, so what the server stores was read from `core.ts`, not observed.
- Cells that encode an owner rule (O-05, O-06, O-07) are not defects in the code: they show where the build and the rules differ.
