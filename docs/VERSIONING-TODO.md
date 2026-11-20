# Versioning to do (Corporate Games home)

Done in PR #1 (20 Nov 2026), version 2.0.0, not yet merged or deployed:
1. `version.json` source file (product, version, changes[last 20]: id, what, where, pr). The build (`tools/build.mjs`) adds commit, dirty and builtAt and writes `/version.json`. DONE.
2. First version number: the live build 7711fb0 is 1.0.0 (in CHANGELOG only); this PR is 2.0.0. DONE.
3. Footer shows `vX.Y.Z` linking to `/changes`. DONE (every page).
4. `/changes` page ("What's new", last 10 changes, user words only, no ids, no file names), built from `version.json`; the X-Robots-Tag noai headers stay; `docs/` is never published (the build refuses). DONE.
5. Every deploy bumps the version and adds a CHANGELOG entry: the build REFUSES if `version.json`, `package.json` and `CHANGELOG.md` disagree. DONE. Two audit PASS ids still to be written into the CHANGELOG entry after the audits.
6. Rollback id of the previous (live) deploy: STILL UNKNOWN; the owner reads it in the Cloudflare dashboard.
