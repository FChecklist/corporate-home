# home.corporatetambola.com

The one page that shows all Corporate Games products. Plain HTML, CSS and a little JavaScript. No build step, no framework, no outside request, no cookie. Design brief and the list of every claim with its source: `C:\ct\test-sites\docs-games\HOME_SITE_DESIGN.md`.

## Files
- `index.html`, `games.html`, `how-it-works.html`, `for-hr.html`, `privacy.html`, `contact.html`, `404.html`, `offline.html`
- `site.css` (one stylesheet; the phone design below 900 px, the laptop design from 900 px), `theme.js` (runs first: light/dark), `site.js` (menu, light/dark button, offline copy), `sw.js` (offline copy)
- `fonts/` Fraunces and Inter, the same files the other Corporate sites carry
- `_headers` (strict content policy, same file Cloudflare Pages reads), `robots.txt`, `sitemap.xml`, `favicon.svg`

The pages are written by hand; to change the top bar or the footer, change it in every page.

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
Cloudflare Pages project `corporate-home`, no build command, output folder = this folder, custom domain `home.corporatetambola.com`. Keep Cloudflare Web Analytics OFF for this project (the privacy page says there are no trackers).


See [KNOWLEDGE-MAP.md](KNOWLEDGE-MAP.md) for what this repository is for and what the other repositories are for (updated 14 Nov 2026).

## Owner rules, 20 Nov 2026

The owner's decisions for every Corporate Games product. Full text: `plans/ID-INVITE-AND-ARCHITECTURE-RULES-2026-11-20.md` in the private `marketing-ledger` repository (FChecklist/marketing-ledger). If this README and that file disagree, that file wins.

- **One login.** home.corporatetambola.com is the only login gate. No game or page has its own login: if one exists it is hidden or redirects there. Players joining by game link are not "logged in".
- **One console for all games.** console.corporatetambola.com, for organizers and hosts only: set up, invite, pay, approve, monitor. Settings flow console to game by API; the game keeps no copy of the rules.
- **One credit and payment system, one chatbot.** Payment and credits through moneypenny.corporatetambola.com; chat through moneypennychat.corporatetambola.com. All systems are independent and joined by API. An AI helper uses only the limited AI key and never confirms an irreversible step itself.
- **Console and game are separate.** The console is for set-up and running; the game is for playing, each game with its own website and rules.
- **Invite by ID only.** The ID is ONE alphanumeric field (employee, associate, vendor or customer ID are the same thing, wording only), with no choice menu and no names or mobile numbers. The organizer pastes or uploads one ID per line; a person who opens the game link and enters a listed ID joins and plays; an unlisted ID waits for the organizer or host to approve or decline. "Anyone with the link" is not offered. Family invite is optional (each listed person may invite 1 to 10, default 4, with approval). Only the organizer and hosts see the list, the invite chain and the log of joins, approvals and declines.
- **ID normalisation and deletion.** Every character that is not a letter or digit is removed and the rest is upper case, so A-1101, A 1101 and A/1101 are all A1101, at upload, join, approval and matching. The list and all IDs are deleted within 24 hours after the game ends.
- **Console voice.** The organizer console speaks to the organizer as "you", never "I" or "my", in simple words. Start wording: "The game starts by itself" / "You start the game"; numbers (Tambola and Bingo only): "Numbers come by themselves" / "You call the numbers". Rules and examples: the console repo file docs/CONSOLE_VOICE.md. Ledger notes: `plans/ID-INVITE-AND-ARCHITECTURE-RULES-2026-11-20.md` in the private `marketing-ledger` repo.


suiteRulesVersion: 1.1 (20 Nov 2026). Owner rules copy: docs/SUITE_RULES.md. Source: marketing-ledger plans/SUITE-RULES-VERSION-2026-11-20.md.
