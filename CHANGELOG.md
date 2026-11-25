# Changelog: Corporate Games home

Reconstructed on 20 Nov 2026 from git history, tags and the live `/version.json` (https://home.corporatetambola.com/version.json). Before this file there was no changelog and no version policy; entries below the live one are approximate (dates from tags and commits). Unknown values are written "unknown", not guessed. From now on follow the standard: marketing-ledger plans/VERSION-AND-KNOWLEDGE-STANDARD-2026-11-20.md section 2.2 (newest first; Added/Changed/Fixed; what, where, PR, two audit PASS ids, rollback id).

## 2.1.1 (25 Nov 2026) - not committed, not deployed, not merged
Owner order of 25 Nov 2026: the small mark १३९ at the very top centre of every page. Commit: none yet (patch applied by a human).
- Added: `<div class="mark139">` as the first element of body on all 10 pages (404, changes, contact, for-hr, games, how-it-works, index, offline, pricing, privacy); its CSS once in site.css (cache mark `?v=8`); the same mark as SVG text with the thin red line in og-image.svg. Absolute at the top, no clicks, hidden from screen readers and copy, no layout change.
- Added: test T24 (exactly one mark per page, approved CSS and colours, share picture) with a break-it run in tests/falsify.mjs.
- Not done: raster pictures og-image.png, apple-touch-icon.png, icon-192.png, icon-512.png, icon-maskable-512.png (not touched by order; icons are not marked).

## 2.1.0 (21 Nov 2026) - PR #6, NOT deployed, NOT merged
Honest cookie and offline behaviour, a privacy signal, fairness wording only where true. One writer, one branch (`claude/modest-bohr-7dphxw`), off `home-bar-qa` at 772db2f (2.0.0). The older open PRs (#2 SEO pass, #5 smoke test) are on other lines and are NOT part of this change.
- Fixed: a "No" did not stop an older offline helper (service worker) from saving files again while the page was still open. Found by test: after No, a page that asked for more files brought the saved copy (`home-v11`) back, and it stayed until the next page was opened. Now the page tells the helper to stop and delete, removes the helper, deletes every `home-` copy, and, while an older helper that cannot be told still runs the page, deletes again every 0.3 seconds. Where: site.js, sw.js.
- Fixed: the offline helper started saving files the moment it was installed. Now install saves nothing; the page asks for the copy (`ctz-keep`) only after a Yes, and the helper adds files only to a copy that already exists, so it can never make a new one after a No. Cache name is now `home-v12`; older `home-` copies are deleted when the new helper takes over. Where: sw.js, site.js.
- Added: privacy signals. Global Privacy Control (and the older Do Not Track) counts as No: the question is not shown, nothing is stored (not even an answer), an old Yes given before the signal is forgotten (visit note removed, offline copy removed). The footer "Cookie choices" still opens the question, which then says the signal counts as No until you press Yes; a Yes pressed with the signal on is your own word and wins (stored with `s:1`). Where: consent.js, privacy.html (#this-website), types.d.ts.
- Changed: wording. The fairness line "No one knows the next number: not the organizer, not the host, not even the software." now appears once, on the home page, led by "Tambola and Bingo." (the two number games) and nowhere else; it is not claimed for Tic Tac Toe, Snakes and Ladders, Luck by Chance or Lucky Draw. The cookies-and-device section of the privacy page is shorter and plainer, adds the privacy-signal line and an update date (21 Nov 2026). Payment wording is unchanged (only IT Services by Rajat Agarwal, only through Razorpay; Moneypenny is not named). Where: index.html, privacy.html.
- Changed: sitemap dates to 2026-11-21; script version marks (consent.js v3, site.js v10) so browsers fetch the new files; version 2.1.0 in version.json, package.json, package-lock.json, the footer (built) and /changes (built).
- Added: tests T22 (offline copy and privacy signal: this helper, an older helper kept as a fixture in tests/fixtures, Yes after No, GPC, Do Not Track, old Yes loses to the signal, install saves nothing) and T23 (360 px wide: every page, light and dark, question open, with the signal line, answered). Both have break-it-and-see-red runs in tests/falsify.mjs. T20 now also checks the fairness line is scoped and not repeated elsewhere.
- SEO: checked and found complete on every page (title, description, canonical, robots, Open Graph with image, Twitter card, structured data, sitemap, robots.txt); only the sitemap dates changed. Layout at 360 px: checked, no sideways scroll (T06 already ran 360; T23 adds the open question).
- Not done here, on purpose: nothing deployed, merged or changed in Cloudflare/Vercel; PR #2 (new SEO pages, llms.txt, robots change) and PR #5 (smoke kit, analytics line) not absorbed; no payment or money setting exists on this site. Known limit: an older helper on a visitor's device can write for up to 0.3 seconds after a No before the page removes it again.
- Audits: two independent audits requested on the exact commit; PASS ids: pending. Rollback id (previous deploy): unknown (owner reads it in the Cloudflare dashboard).

## 2.0.0 (20 Nov 2026) - PR #1, merged into home-bar-qa on 20 Nov 2026 UTC (merge commit 772db2f), not deployed as far as known
First version number for this repo. The live build (commit 7711fb0) is taken as 1.0.0 in this file only; the live /version.json still has no version field.
- Added: cookie choice banner (consent.js): nothing stored before the answer, two equal buttons, No by default; "Cookie choices" in every footer. Where: consent.js, site.css, privacy.html (#this-website).
- Added: one sign-in gate (gate.js): every Sign in / Start / demo link goes to https://console.corporatetambola.com/ (query: from=home, visit=first|repeat). No login or payment on this site. Where: all pages.
- Added: pricing page with the real credit packs (100 to 10,000 credits, rupees and US dollars, no GST) and OfferCatalog JSON-LD. Where: pricing.html.
- Added: version.json source (version 2.0.0, last changes), footer vX.Y.Z linking to /changes, /changes page built from version.json. Where: version.json, tools/build.mjs, changes.html.
- Added: CI (typecheck, build, tests, link check) in .github/workflows/ci.yml; new tests T16 to T22 with a break-it-and-see-red run (tests/falsify.mjs).
- Changed: wording to the owner's suite rules v1.1: fairness line, 24-hour deletion including IDs, "You (the company) give the prizes directly to the winners", billing sentence, privacy line order, no "tick two boxes". The 365-day line for prize contact details is removed from the privacy table (owner rule: all participant information is deleted within 24 hours).
- Changed: SEO: WebSite and BreadcrumbList JSON-LD, sitemap with lastmod and /changes, robots.txt unchanged in policy, one H1 per page checked by test.
- Merged into this branch: Home v2 (Retro and Modern looks, version.json build), suite rules v1.1 docs, KNOWLEDGE.md and CHANGELOG.md docs.
- Audits: two independent audits requested, PASS ids: pending. Rollback id (previous deploy): unknown.

## Live now
(Last read 20 Nov 2026; not re-read on 21 Nov because the network here could not reach the live site.) Version unknown (no version field in /version.json yet); commit `7711fb045c149b72fa9e2f1256dbb6d55bca33a1`; built 2026-11-12 15:15 UTC.

## History (newest first)
- Live version: unknown (no version field). Live commit 7711fb045c14 built 2026-11-12 15:15 UTC: not in this repo clone, so what changed in it is unknown.
- 2026-11-14: docs/knowledge map (#3) (head of home-bar-qa).
- 2026-10-29 (cdf70c1): shared Corporate Games bar v2 and QA fixes; sign-in buttons to the working console (79a507c); "CORPORATE" above game names; "For HR teams and managers"; "What you can count on". Where: index.html, for-hr.html, gamesbar.js/css.
- 2026-10-28: home redesign, hero wording, versioned css/js links, service worker v5 (7f7fc54, 9187f0d).
- 2026-10-27: first version of the pages (8a294e5), clean URLs, HR sentence.
- Tags: home-release-2026-10-31 (6d23e6d), home-privacy-2026-10-31, home-cache-2026-10-31, home-text/cta/legal-2026-11-01 (6cf2ab6 latest).
