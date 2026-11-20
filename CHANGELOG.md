# Changelog: Corporate Games home

Reconstructed on 20 Nov 2026 from git history, tags and the live `/version.json` (https://home.corporatetambola.com/version.json). Before this file there was no changelog and no version policy; entries below the live one are approximate (dates from tags and commits). Unknown values are written "unknown", not guessed. From now on follow the standard: marketing-ledger plans/VERSION-AND-KNOWLEDGE-STANDARD-2026-11-20.md section 2.2 (newest first; Added/Changed/Fixed; what, where, PR, two audit PASS ids, rollback id).

## 2.0.0 (20 Nov 2026) - PR #1, NOT deployed, NOT merged
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
Version unknown (no version field in /version.json yet); commit `7711fb045c149b72fa9e2f1256dbb6d55bca33a1`; built 2026-11-12 15:15 UTC.

## History (newest first)
- Live version: unknown (no version field). Live commit 7711fb045c14 built 2026-11-12 15:15 UTC: not in this repo clone, so what changed in it is unknown.
- 2026-11-14: docs/knowledge map (#3) (head of home-bar-qa).
- 2026-10-29 (cdf70c1): shared Corporate Games bar v2 and QA fixes; sign-in buttons to the working console (79a507c); "CORPORATE" above game names; "For HR teams and managers"; "What you can count on". Where: index.html, for-hr.html, gamesbar.js/css.
- 2026-10-28: home redesign, hero wording, versioned css/js links, service worker v5 (7f7fc54, 9187f0d).
- 2026-10-27: first version of the pages (8a294e5), clean URLs, HR sentence.
- Tags: home-release-2026-10-31 (6d23e6d), home-privacy-2026-10-31, home-cache-2026-10-31, home-text/cta/legal-2026-11-01 (6cf2ab6 latest).
