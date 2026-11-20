# Knowledge: Corporate Games home (corporate-home)

Written 20 Nov 2026 for a future AI session that has never seen this repo (standard: marketing-ledger plans/VERSION-AND-KNOWLEDGE-STANDARD-2026-11-20.md). It describes the CURRENT state only, from the code and existing docs. Anything not found is marked "unknown". Do not publish this file on the website.

## 1. What this is
The one page that shows all Corporate Games products, plus the single sign-in entry point. Plain HTML, CSS and a little JavaScript. No build step, no framework, no cookie.
- Live site: https://home.corporatetambola.com (Cloudflare Pages project `corporate-home`). Live version now (from `/version.json`, read 20 Nov 2026): **unknown (no version field in /version.json yet)**, commit `7711fb045c149b72fa9e2f1256dbb6d55bca33a1`, built 2026-11-12 15:15 UTC.
- Other repos and what they are for: `KNOWLEDGE-MAP.md` in the repo root.

## 2. How it connects
Players and organizers reach the suite like this: home.corporatetambola.com (login gate) -> console.corporatetambola.com (set up, invite, pay) -> moneypenny.corporatetambola.com (credits; the single payment gate) -> IT Services by Rajat Agarwal -> Razorpay. Each game is its own website and takes settings from the console by API; a game calls ONLY Moneypenny for payment, never IT Services or Razorpay. The console-to-game contract is `docs/CONTRACT_V1.md` and `contract/` in corporate-console; the pay contract is `GAME_PAY_CONTRACT.md` (in the console pay-step branch: unknown on the default branch). Moneypenny chat: moneypennychat.corporatetambola.com.

## 3. Map of folders and the files that matter
Site root files: index.html, games.html, how-it-works.html, for-hr.html, privacy.html, contact.html, 404.html, offline.html, site.css, theme.js, site.js, sw.js (offline copy), gamesbar.js and gamesbar.css (the shared games bar), fonts/, _headers (strict content policy), robots.txt, sitemap.xml; tests/ (run.mjs, falsify.mjs, serve.mjs).

Files that matter: index.html; games.html; for-hr.html; site.css; sw.js (service worker, bump when files change); gamesbar.js; _headers; tests/run.mjs; README.md.

## 4. Rules in force
- Suite rules version 1.1 (20 Nov 2026): `docs/SUITE_RULES.md` (on branch docs/suite-rules-v1-1-2026-11-20 until merged); source in the ledger `plans/SUITE-RULES-VERSION-2026-11-20.md`.
- One login (home), one console, one credit/payment system (Moneypenny), one chatbot system; no game or console has its own login, payment or chat; pay only via Moneypenny.
- Invite by ID only: one alphanumeric ID field, no names or personal details; strip every non-alphanumeric and uppercase before matching; not-on-list people need organizer/host approval; optional family invites (default 4) with approval.
- Console voice = "you", polite, simple English; privacy line "designed to follow US privacy laws, EU GDPR and India's DPDP"; all participant information including IDs deleted within 24 hours after the game; billing line only "We keep billing data for audit and tax reasons."
- Fairness wording: "No one knows the next number: not the organizer, not the host, not even the software." Prices with the rupee sign. Prizes: "You (the company) give the prizes directly to the winners."
- Do not claim "100% secure", "most secure gateway", "played by major companies".

## 5. How to run the tests
`node tests/serve.mjs 8788` to look at it. Tests need real Chrome: `node C:/ct/test-sites/console/tools/heavy-run.mjs -- node tests/run.mjs` and `tests/falsify.mjs` (one at a time, heavy lock).
RAM on the owner's laptop is tight: no full builds or browsers without the heavy lock (C:/ct/HEAVY_JOB_PROTOCOL.md).

## 6. Deploy and roll back
Cloudflare Pages project corporate-home, no build command, output folder = repo root, domain home.corporatetambola.com, Cloudflare Web Analytics OFF. Rollback in the Cloudflare dashboard; previous deploy id: unknown.
Nothing is deployed from a docs-only change. Cloudflare only, no Vercel. Every deploy needs a version bump and a CHANGELOG entry (standard section 1).

## 7. Known issues and open failures
The live commit 7711fb0 is not in the clone of this repo, so the live site cannot be matched to a branch: unknown. The default branch on GitHub is home-bar-qa. The home page is hand-written: changing the top bar or footer means editing every page. Open PR #1 is another session's work.

## 8. Owner-only steps still open
Secrets and keys are the owner's (names only in config/SECRETS_NAMES.md where present). Deploy, domain, payment live mode and the Rs 1 payment test are the owner's decisions via BOSS. Versioning work still to do in this repo: `docs/VERSIONING-TODO.md`.
