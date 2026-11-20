# SEO test handoff: home.corporatetambola.com (branch `feat/seo-2026-10-30`)

Cut from `origin/feat/home-v2-2026-10-30`; on 20 Nov 2026 that branch was merged into this one (v2.0.0, credit-pack pricing, cookie choice, /changes). SEO tags were re-applied on top of the new pages, `site.css?v=8`, service worker cache `home-v10`. Coder note: I wrote product files only. I did not write or run tests. I ran `node tools/build.mjs` and a throw-away script that parsed every page head and every JSON-LD block.

## Changed files
- All older pages (`index, games, how-it-works, for-hr, pricing, privacy, contact, changes, 404, offline`): new title (main phrase first, 60 chars or fewer with suffix), description (155 or fewer), `og:locale`, `twitter:image:alt`, robots meta with `max-image-preview:large`, `favicon.ico` link, `site.css?v=7`, two new footer links.
- `index.html`: Organization, WebSite and ItemList JSON-LD (one block each) and one short link line to the use-case pages and the FAQ. T09 caps the home page at 950 words and it had about 26 words of room, so the 7-question visible FAQ lives on its own page `/faq` (home is now 946 words).
- Inner pages: BreadcrumbList JSON-LD (Home > page).
- NEW `faq.html` (7 Q&As incl. the three owner questions), `virtual-team-building-games.html`, `games-for-hr-teams.html`: unique copy, own FAQ (5 and 6 Q&As, visible, with matching FAQPage), game links, breadcrumb.
- `games.html`, `for-hr.html`: one link line each to the two new pages.
- `robots.txt`: reversed. Allows Googlebot, Bingbot, Applebot, DuckDuckBot, OAI-SearchBot, ChatGPT-User, GPTBot, ClaudeBot, Claude-User, Claude-SearchBot, anthropic-ai, Google-Extended, PerplexityBot, Perplexity-User, GrokBot, xAI-Bot and `*`. Blocks only CCBot, Bytespider, Diffbot, omgili, img2dataset, PetalBot, Timpibot. No rule blocks .js or .css.
- `_headers`: **removed `X-Robots-Tag: noai, noimageai`** (it told AI crawlers to stay away and contradicted robots.txt). Added content types and cache for llms, robots, sitemap, security.txt, IndexNow key.
- `sitemap.xml`: 10 URLs with `lastmod` 2026-11-20 (adds the 2 new pages; includes `/changes`).
- NEW `llms.txt`, `llms-full.txt`, `.well-known/security.txt` (Expires 2027-10-30), `397242f1fdcd3fb9374246c561915b7f.txt` (IndexNow key), `tools/indexnow.mjs`, `favicon.ico` (16/32/48).
- `sw.js` (cache v9, two new pages), `site.css` (`.faq` rules only), `site.webmanifest` (`lang`).
- No change to `gamesbar.js/css`, `_redirects`, the five game repos.

## What a tester checks
1. `node tools/build.mjs` passes (it checks the sitemap lists every page). Serve `dist/`.
2. Every indexable page: one H1, `lang="en"`, canonical = `https://home.corporatetambola.com/...` (no `.html`), title <= 60, description <= 155, OG and Twitter tags present, `og:image` is an absolute https PNG 1200x630 (74 KB), alt present.
3. JSON-LD parses (Google Rich Results Test / schema validator): home has Organization, WebSite, ItemList; `/faq` and the two use-case pages have FAQPage, and its text equals the visible FAQ text. Inner pages have BreadcrumbList.
4. `/404` for a bad URL shows the friendly page with `noindex`. `/offline` is noindex.
5. `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/llms-full.txt`, `/.well-known/security.txt`, `/397242f1fdcd3fb9374246c561915b7f.txt` all answer 200 as plain text or XML (this needs the Cloudflare deploy; the `_headers` file sets the types).
6. Response headers no longer contain `X-Robots-Tag`.
7. Links: every game subdomain is linked from the home page, `/games` and every footer.
8. Layout: new FAQ blocks and the two new pages at 360, 768, 1280 px, Retro and Modern, light and dark; no horizontal scroll; contrast of FAQ headings.
9. Existing test suite (`tests/`) may assert old titles or the `?v=6` cache-bust. I did not run it; failures there are expected to be wording only.
10. After deploy: `node tools/indexnow.mjs --dry`, then without `--dry` (needs the key file live first).

## Notes and decisions
- The FAQ question wording came from the owner's spec ("best online games..."). The answers make no ranking claim and no capacity claim for 200 players: the site does not say how many players a game supports. Owner should confirm before claiming it.
- `*.pages.dev` -> custom domain 301: this repo has no such rule by design (`tools/build.mjs` forbids host redirects in `_redirects`). Not changed. If `corporate-home.pages.dev` is live, the redirect must be set in Cloudflare (Bulk Redirects), or it can serve duplicate pages.
- The shared bar (`gamesbar.js`) is untouched.

- Cost wording in FAQ, llms files and the pricing meta description follows the new credit-pack pricing page ("you pay only for the games you run", no subscription). No prices are repeated in the SEO text.

## Existing tests that need a tester's update (I did not touch tests)
- `tests/cases-v2.mjs` T18: `INDEXED` (line 12) lists the 8 old pages; the sitemap now also has `faq`, `virtual-team-building-games` and `games-for-hr-teams`, so "sitemap lists exactly the indexable pages" will fail until those two are added.
- T18 `robots.txt` checks should still hold (`User-agent: *` then `Allow: /`, Sitemap line). If a check looks for blocked AI bots, it is out of date: the owner decision is to allow them.
- JSON-LD is written as one block per item (each with `@context` and `@type`) so T18's parser accepts it.
