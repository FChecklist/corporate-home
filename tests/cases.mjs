// The test cases for the home site. Every case is run against the real pages in real Chrome, and tests/falsify.mjs
// proves each one goes RED when the site is broken in the way the case is meant to catch.
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { WIDTHS, PAGES, pageUrl, openPage, checker, contrastRatio, COLOR_PROBE, LAYOUT_PROBE, listFiles, read, heightFor } from "./lib.mjs";

const OWNER_LINE = "We work closely with HR teams in organizing online events and games.";
const GAME_URLS = { Tambola: "https://housie.corporatetambola.com/", Bingo: "https://bingo.corporatetambola.com/", "Tic Tac Toe": "https://tictactoe.corporatetambola.com/", "Snakes and Ladders": "https://snakes.corporatetambola.com/", "Luck by Chance": "https://luck.corporatetambola.com/" };
const ALLOWED_EXTERNAL = [
  /^https:\/\/(housie\.)?corporatetambola\.com\/(terms|privacy|subprocessors|dpa|refund-policy|demo)?$/,
  /^https:\/\/(bingo|tictactoe|snakes|luck)\.corporatetambola\.com\/(privacy|demo)?$/,
  /^https:\/\/housie\.corporatetambola\.com\/zc(\?demo=1)?$/,
  /^https:\/\/bingo\.corporatetambola\.com\/zc\?demo=1$/,
  /^mailto:hello@corporatetambola\.com(\?subject=Grievance)?$/,
  /^tel:\+919650397480$/,
];
const text = (html) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/g, " ").replace(/<[^>]+>/g, " ").replace(/&middot;/g, "·").replace(/&rarr;/g, "→").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&copy;/g, "©").replace(/\s+/g, " ").trim();
const hrefs = (html) => [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)].map((m) => m[1]);

export const CASES = [
  { id: "T01", name: "Every link on every page works (pages, #anchors, icons, files)", async run({ base, root, c }) {
    for (const f of listFiles(root)) {
      const html = read(root, f);
      const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
      for (const m of html.matchAll(/<use\b[^>]*href="#([^"]+)"/g)) c.check(`${f}: icon #${m[1]} exists`, ids.has(m[1]), "missing symbol");
      for (const m of html.matchAll(/\b(?:href|src)="(\/[^"#?]*)(#[^"]*)?"/g)) {
        const r = await fetch(base + m[1], { redirect: "manual" });
        c.check(`${f}: ${m[1]} answers 200`, r.status === 200, "status " + r.status);
      }
      for (const h of hrefs(html)) {
        if (h.startsWith("#")) c.check(`${f}: anchor ${h} exists`, ids.has(h.slice(1)), "no such id");
        else if (h.startsWith("/") && h.includes("#")) {
          const [p, a] = h.split("#"); const tf = p === "/" ? "index.html" : p.slice(1) + ".html"; const th = existsSync(join(root, tf)) ? read(root, tf) : "";
          c.check(`${f}: ${h} anchor exists`, new RegExp(`\\bid="${a}"`).test(th), "no such id");
        }
      }
    }
    const r = await fetch(base + "/no-such-page"); c.check("unknown page gives the 404 page with status 404", r.status === 404 && (await r.text()).includes("We cannot find that page"), "status " + r.status);
  } },

  { id: "T02", name: "Outside links go only where they should; every game picture links to its game; Lucky Draw only to the contact page", async run({ root, c }) {
    for (const f of listFiles(root)) {
      const html = read(root, f);
      for (const h of hrefs(html)) if (/^(https?:|mailto:|tel:)/.test(h)) c.check(`${f}: ${h} is on the allowed list`, ALLOWED_EXTERNAL.some((re) => re.test(h)), "not allowed");
      const drawLinks = [...html.matchAll(/<a\b[^>]*>(?:(?!<\/a>)[\s\S])*?<\/a>/g)].map((m) => m[0]).filter((a) => /Lucky Draw|#i-draw/.test(a));
      c.check(`${f}: Lucky Draw links only to the contact page`, drawLinks.every((a) => /href="\/contact"/.test(a)) && !/luckydraw|lucky\./i.test(html.replace(/Lucky Draw/g, "")), drawLinks.find((a) => !/href="\/contact"/.test(a)) || "lucky draw address");
    }
    for (const f of ["index.html", "games.html"]) {
      const html = read(root, f);
      for (const [n, u] of Object.entries(GAME_URLS)) c.check(`${f}: ${n} links to ${u}`, html.includes(`href="${u}"`), "missing");
      const draw = html.match(/<article class="(?:card|row) g-draw">[\s\S]*?<\/article>/);
      c.check(`${f}: the Lucky Draw card has no status and links only to the contact page`, !!draw && !/\bsoon\b|Live now|class="tag/i.test(draw[0]) && [...draw[0].matchAll(/href="([^"#][^"]*)"/g)].every((m) => m[1] === "/contact"), draw ? draw[0].slice(0, 120) : "no card");
      c.check(`${f}: the Lucky Draw card carries no date`, !!draw && !/\d/.test(text(draw[0]).replace("Lucky Draw", "")), "digits in card");
      // every game picture is inside a link to that game's own address
      const pics = [...html.matchAll(/<a\b([^>]*)>(?:(?!<\/a>)[\s\S])*?<use href="#i-(\w+)"/g)];
      const want = { tambola: "https://housie.corporatetambola.com/", bingo: "https://bingo.corporatetambola.com/", ttt: "https://tictactoe.corporatetambola.com/", snakes: "https://snakes.corporatetambola.com/", luck: "https://luck.corporatetambola.com/", draw: "/contact" };
      const used = (html.match(/<use href="#i-\w+"/g) || []).length;
      c.check(`${f}: every game picture is a link (${pics.length} of ${used})`, used > 0 && pics.length === used, `${pics.length} of ${used}`);
      for (const m of pics) c.check(`${f}: the ${m[2]} picture links to ${want[m[2]]}`, (m[1].match(/href="([^"]*)"/) || [])[1] === want[m[2]], m[1]);
    }
    // the master console does not exist yet (console.corporatetambola.com has no address): nothing may link to it; Sign in goes to the working sign-in page
    c.check("every Sign in goes to the working sign-in page https://housie.corporatetambola.com/zc", (read(root, "index.html").match(/href="https:\/\/housie\.corporatetambola\.com\/zc"/g) || []).length >= 3, "too few");
    for (const f of listFiles(root)) c.check(`${f}: no link to console.corporatetambola.com (it does not exist yet)`, !/console\.corporatetambola\.com/.test(read(root, f)), "console link");
    // the shared bar carries its own addresses: only the home site, the five game sites and the contact page; never the old hub, never the console
    const bar = readFileSync(join(root, "gamesbar.js"), "utf8");
    const barUrls = [...bar.matchAll(/"(https:\/\/[^"]+)"/g)].map((m) => m[1]);
    c.check("gamesbar.js: at least 7 addresses, all on the allowed list", barUrls.length >= 7 && barUrls.every((u) => /^https:\/\/(home|housie|bingo|tictactoe|snakes|luck)\.corporatetambola\.com\/(contact)?$/.test(u)), barUrls.filter((u) => !/^https:\/\/(home|housie|bingo|tictactoe|snakes|luck)\.corporatetambola\.com\/(contact)?$/.test(u)).join(" "));
    c.check("gamesbar.js: first item is the home site, never the old hub or the console", bar.includes('var HOME = "https://home.corporatetambola.com/"') && !/games\.corporatetambola\.com|console\.corporatetambola\.com/.test(bar), "wrong home");
  } },

  { id: "T03", name: "No errors in the console, no failed or missing files (all pages, light and dark, phone and laptop)", async run({ base, browser, c }) {
    for (const p of PAGES) for (const scheme of ["light", "dark"]) for (const w of [390, 1280]) {
      const o = await openPage(browser, pageUrl(base, p), { w, scheme, record: { allow404: p === "404" } });
      await o.page.waitForTimeout(150);
      const e = o.events;
      c.check(`${p} ${scheme} ${w}: console clean`, e.console.length === 0, e.console.join(" | "));
      c.check(`${p} ${scheme} ${w}: no failed requests`, e.failed.length === 0, e.failed.join(" | "));
      c.check(`${p} ${scheme} ${w}: no 4xx/5xx answers`, e.bad.length === 0, e.bad.join(" | "));
      await o.close();
    }
  } },

  { id: "T04", name: "Light and dark: right colours, readable text (contrast computed from the real page)", async run({ base, browser, c }) {
    const SELS = [["body", 4.5], [".lead", 4.5], [".kicker", 4.5], [".btn.main", 4.5], [".btn:not(.main)", 4.5], [".card p", 4.5], [".hero-contact", 4.5], [".moments p", 4.5], [".six a", 4.5], [".foot li a", 4.5], [".band h2", 4.5], [".band .lead", 4.5], [".keep li", 4.5], [".cta h2", 4.5], [".cta .btn.main", 4.5], [".cta .btn:not(.main)", 4.5], [".ticks li", 4.5], [".note-line", 4.5], [".legalline p", 4.5], ["nav.main a", 4.5], [".facts li", 4.5]];
    const lum = {};
    for (const scheme of ["light", "dark"]) {
      const o = await openPage(browser, pageUrl(base, "index"), { w: 1280, scheme });
      const res = await o.page.evaluate(COLOR_PROBE, SELS.map((s) => s[0]));
      res.forEach((r, i) => { if (r.missing) return c.check(`${scheme}: ${r.sel} found`, false, "not on page"); const ratio = contrastRatio(r.fg, r.bg); c.check(`${scheme}: ${r.sel} contrast ${ratio.toFixed(1)} >= ${SELS[i][1]}`, ratio >= SELS[i][1], ratio.toFixed(2)); });
      const bg = res[0].bg; lum[scheme] = bg[0] + bg[1] + bg[2];
      c.check(`${scheme}: the page follows the device`, scheme === "dark" ? lum.dark < 200 : lum.light > 600, "page bg " + bg);
      // the button on the page beats the device
      await o.page.evaluate((s) => document.documentElement.setAttribute("data-theme", s), scheme === "dark" ? "light" : "dark");
      const bg2 = (await o.page.evaluate(COLOR_PROBE, ["body"]))[0].bg; const l2 = bg2[0] + bg2[1] + bg2[2];
      c.check(`${scheme}: data-theme overrides the device`, scheme === "dark" ? l2 > 600 : l2 < 200, "bg " + bg2);
      await o.close();
    }
    // the same checks on the inner pages (phone width, both schemes)
    for (const p of ["games", "privacy", "contact"]) for (const scheme of ["light", "dark"]) {
      const o = await openPage(browser, pageUrl(base, p), { w: 390, scheme });
      const res = await o.page.evaluate(COLOR_PROBE, ["body", ".lead", ".kicker", ".note-line", ".tag", ".tw td", ".row p"]);
      res.forEach((r) => { if (r.missing) return; const ratio = contrastRatio(r.fg, r.bg); c.check(`${p} ${scheme}: ${r.sel} contrast ${ratio.toFixed(1)}`, ratio >= 4.5, ratio.toFixed(2)); });
      await o.close();
    }
  } },

  { id: "T05", name: "Keyboard: skip link, visible focus on everything, no trap, menu opens and closes by key", async run({ base, browser, c }) {
    for (const w of [1280, 390]) {
      const o = await openPage(browser, pageUrl(base, "index"), { w });
      const p = o.page;
      await p.keyboard.press("Tab");
      const first = await p.evaluate(() => ({ cls: document.activeElement.className, top: document.activeElement.getBoundingClientRect().top }));
      c.check(`${w}: first Tab lands on the skip link, on screen`, first.cls.includes("skip") && first.top >= 0, JSON.stringify(first));
      await p.keyboard.press("Enter");
      const afterSkip = await p.evaluate(() => document.activeElement.id);
      c.check(`${w}: skip link moves focus to the main content`, afterSkip === "main", afterSkip);
      await p.evaluate(() => { document.activeElement.blur(); window.scrollTo(0, 0); });
      if (w < 900) {
        await p.focus("#menu"); await p.keyboard.press("Enter");
        c.check(`${w}: Enter opens the menu`, (await p.getAttribute("#menu", "aria-expanded")) === "true" && await p.isVisible("#nav"), "closed");
        await p.keyboard.press("Tab");
        c.check(`${w}: Tab goes into the opened menu`, await p.evaluate(() => !!document.activeElement.closest("#nav")), "outside");
        await p.keyboard.press("Escape");
        c.check(`${w}: Escape closes the menu and returns to the button`, (await p.getAttribute("#menu", "aria-expanded")) === "false" && (await p.evaluate(() => document.activeElement.id)) === "menu", "still open");
        await p.focus("#menu"); await p.keyboard.press("Enter");
      }
      // walk every stop
      await p.evaluate(() => { document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0); document.documentElement.style.scrollBehavior = "auto"; });
      if (w < 900) { // go back to the very first stop (the skip link): as many Shift+Tab as there are stops in front of the Menu button (skip link, the games bar, the name)
        const inFront = await p.evaluate(() => [...document.querySelectorAll("a[href], button")].filter((e) => e.getClientRects().length && getComputedStyle(e).visibility !== "hidden").indexOf(document.getElementById("menu")));
        await p.focus("#menu"); for (let i = 0; i < inFront; i++) await p.keyboard.press("Shift+Tab");
        const atTop = await p.evaluate(() => document.activeElement.className);
        c.check(`${w}: Shift+Tab from the Menu button goes back to the skip link first`, atTop.includes("skip"), atTop);
      }
      else { await p.goto(pageUrl(base, "index")); await p.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; }); }
      const total = await p.evaluate(() => [...document.querySelectorAll("a[href], button")].filter((e) => e.getClientRects().length && getComputedStyle(e).visibility !== "hidden").length);
      const expected = await p.evaluate(() => new Set([...document.querySelectorAll("a[href], button")].filter((e) => e.getClientRects().length && getComputedStyle(e).visibility !== "hidden" && !e.classList.contains("skip")).map((e) => e.tagName + (e.id || "") + (e.getAttribute("href") || e.textContent.trim().slice(0, 18)))).size);
      const wantKeys = await p.evaluate(() => [...new Set([...document.querySelectorAll("a[href], button")].filter((e) => e.getClientRects().length && getComputedStyle(e).visibility !== "hidden" && !e.classList.contains("skip")).map((e) => e.tagName + (e.id || "") + (e.getAttribute("href") || e.textContent.trim().slice(0, 18))))]);
      const seen = new Set(); let noRing = [], escaped = false;
      for (let i = 0; i < total + 3; i++) {
        await p.keyboard.press("Tab");
        await p.waitForTimeout(30);
        const s = await p.evaluate(() => {
          const e = document.activeElement; if (!e || e === document.body) return null;
          const t = (x) => { const cs = getComputedStyle(x); return (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== "none"; };
          const r = e.getBoundingClientRect();
          return { key: e.tagName + (e.id || "") + (e.getAttribute("href") || e.textContent.trim().slice(0, 18)), ring: t(e) || (e.closest(".card") && t(e.closest(".card"))), onscreen: r.bottom > 0 && r.top < innerHeight };
        });
        if (!s) { escaped = true; break; }
        seen.add(s.key); if (!s.ring) noRing.push(s.key); if (!s.onscreen) noRing.push("offscreen " + s.key);
      }
      c.check(`${w}: Tab reaches all ${expected} different stops (no trap); saw ${seen.size}`, seen.size >= expected, `saw ${seen.size} of ${expected}, never reached: ${wantKeys.filter((k) => !seen.has(k)).join(" , ")}; left the page: ${escaped}`);
      c.check(`${w}: every stop shows a visible focus ring`, noRing.length === 0, noRing.slice(0, 5).join(", "));
      await o.close();
    }
  } },

  { id: "T06", name: "Fits every width 320 to 1920, every page: no sideways scroll, nothing cut or overlapping, tap targets, last line not hidden", async run({ base, browser, c }) {
    for (const w of WIDTHS) for (const p of PAGES) {
      const o = await openPage(browser, pageUrl(base, p), { w, record: { allow404: p === "404" } });
      const bad = await o.page.evaluate(LAYOUT_PROBE, w);
      c.check(`${p} @${w}: layout clean`, bad.length === 0, bad.slice(0, 4).join(" ; "));
      if (w < 900) {
        const covered = await o.page.evaluate(() => { window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }); const t = document.querySelector(".tabbar"); if (!t || getComputedStyle(t).display === "none") return null; const last = [...document.querySelectorAll(".legalline p")].pop().getBoundingClientRect(); return last.bottom - t.getBoundingClientRect().top; });
        c.check(`${p} @${w}: the bottom bar does not hide the last line`, covered === null || covered <= 0, "overlap " + covered);
        await o.page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
        await o.page.click("#menu"); await o.page.waitForTimeout(60);
        const open = await o.page.evaluate((W) => { const n = document.getElementById("nav"); const r = n.getBoundingClientRect(); return { right: r.right, iw: W, bottom: r.bottom, ih: innerHeight, links: [...n.querySelectorAll("a, button")].every((e) => e.getBoundingClientRect().height >= 43.5), sx: document.documentElement.scrollWidth }; }, w);
        c.check(`${p} @${w}: the opened menu fits the width and its items are tappable`, open.right <= open.iw + 1 && open.links && open.sx <= open.iw + 1, JSON.stringify(open));
        c.check(`${p} @${w}: the opened menu stays on the screen or scrolls`, open.bottom <= open.ih + 1, JSON.stringify(open));
      }
      await o.close();
    }
  } },

  { id: "T07", name: "Phones on their side, tablets, small laptops, wide screens: same rules", async run({ base, browser, c }) {
    const SIZES = [[568, 320], [667, 375], [740, 360], [812, 375], [844, 390], [896, 414], [932, 430], [768, 1024], [1024, 768], [1366, 768], [1536, 864], [1920, 1080], [2560, 1080]];
    for (const [w, h] of SIZES) for (const p of ["index", "games", "privacy", "contact"]) {
      const o = await openPage(browser, pageUrl(base, p), { w, h });
      const bad = await o.page.evaluate(LAYOUT_PROBE, w);
      c.check(`${p} @${w}x${h}: layout clean`, bad.length === 0, bad.slice(0, 4).join(" ; "));
      if (h <= 480) {
        const s = await o.page.evaluate(() => ({ tab: getComputedStyle(document.querySelector(".tabbar")).display, head: document.querySelector(".top").getBoundingClientRect().height, pos: getComputedStyle(document.querySelector(".top")).position, ih: innerHeight }));
        c.check(`${p} @${w}x${h}: sideways phone has no bottom bar and a top bar that scrolls away`, s.tab === "none" && s.pos === "relative" && s.head <= s.ih * 0.3, JSON.stringify(s));
        const btn = await o.page.evaluate(() => { const r = [...document.querySelectorAll(".btn.main")].map((x) => x.getBoundingClientRect()).find((q) => q.width > 0 && q.height > 0); return { ok: !!r }; });
        c.check(`${p} @${w}x${h}: a main button exists on the page`, btn.ok, "none");
      }
      await o.close();
    }
  } },

  { id: "T08", name: "Two designs switch exactly at 900 px (899 is the phone design, 900 is the laptop design)", async run({ base, browser, c }) {
    for (const p of PAGES.slice(0, 6)) {
      const o899 = await openPage(browser, pageUrl(base, p), { w: 899, h: 900 });
      const a = await o899.page.evaluate(() => ({ tab: getComputedStyle(document.querySelector(".tabbar")).display, menu: getComputedStyle(document.getElementById("menu")).display, nav: getComputedStyle(document.getElementById("nav")).display, six: document.querySelector(".six") ? getComputedStyle(document.querySelector(".six")).display : "n/a", top: getComputedStyle(document.querySelector(".top")).position }));
      c.check(`${p} @899: phone design (bottom bar, Menu button, closed list)`, a.tab === "flex" && a.menu !== "none" && a.nav === "none" && (a.six === "n/a" || a.six === "none"), JSON.stringify(a));
      await o899.close();
      const o900 = await openPage(browser, pageUrl(base, p), { w: 900, h: 900 });
      const b = await o900.page.evaluate(() => ({ tab: getComputedStyle(document.querySelector(".tabbar")).display, menu: getComputedStyle(document.getElementById("menu")).display, nav: getComputedStyle(document.getElementById("nav")).display, six: document.querySelector(".six") ? getComputedStyle(document.querySelector(".six")).display : "n/a", dir: getComputedStyle(document.getElementById("nav")).flexDirection }));
      c.check(`${p} @900: laptop design (no bottom bar, no Menu button, links in a row)`, b.tab === "none" && b.menu === "none" && b.nav === "flex" && b.dir === "row" && (b.six === "n/a" || b.six === "grid"), JSON.stringify(b));
      await o900.close();
    }
    // between 900 and about 1200 the top bar is the tightest: links must stay on one line and not touch the name
    for (const w of [900, 960, 1024, 1100, 1180]) {
      const o = await openPage(browser, base + "/", { w, h: 900 });
      const t = await o.page.evaluate(() => { const links = [...document.querySelectorAll("nav.main a, nav.main .tbtn")].filter((e) => e.getClientRects().length); const br = document.querySelector(".brand").getBoundingClientRect(); const first = Math.min(...links.map((e) => e.getBoundingClientRect().left)); return { tall: Math.max(...links.map((e) => e.getBoundingClientRect().height)), head: document.querySelector(".top").getBoundingClientRect().height, gap: first - br.right, wrapW: document.querySelector(".top .wrap").scrollWidth - document.querySelector(".top .wrap").clientWidth, brandCut: document.querySelector(".brand").scrollWidth - document.querySelector(".brand").clientWidth }; });
      c.check(`top bar @${w}: one line, links clear of the name, nothing spills`, t.tall <= 56 && t.head <= 80 && t.gap >= 4 && t.wrapW <= 1 && t.brandCut <= 1, JSON.stringify(t));
      await o.close();
    }
  } },

  { id: "T09", name: "The words: required lines are there; no price, no big claim, no emoji, no customer names; short", async run({ root, c }) {
    const home = text(read(root, "index.html"));
    c.check("the owner's HR sentence is on the home page", home.includes(OWNER_LINE), "missing");
    c.check("the headline says what we do", home.includes("Which game will you use to engage your various teams this week?"), "missing");
    c.check("data deletion: 'within 24 hours after the game ends'", home.includes("erased within 24 hours after the game ends"), "missing");
    c.check("compliance: 'Designed to follow' DPDP, GDPR, CCPA", /Designed to follow India's DPDP Act, the EU GDPR and US privacy laws such as the CCPA/.test(home), "missing");
    c.check("close group: 'Your game is for the people you invite.'", home.includes("Your game is for the people you invite.") && home.includes("You decide who joins"), "missing");
    for (const n of ["Tambola", "Bingo", "Tic Tac Toe", "Snakes and Ladders", "Luck by Chance", "Lucky Draw"]) c.check(`home names ${n}`, home.includes(n), "missing");
    // the first screen carries the game picker twice (.choose on laptops, .six on phones; only one shows): count the page with the phone one, the longer, once
    const words = text(read(root, "index.html").replace(/<div class="choose">[\s\S]*?<\/ul><\/div>/, "")).split(/\s+/).length;
    c.check("home page is short (limit 850 words)", words <= 850, words + " words");
    const FORBID = [[/100\s?%/, "100%"], [/\bcompliant\b/i, "compliant"], [/\bcertified\b/i, "certified"], [/\bguarantee/i, "guarantee"], [/\bISO\b/, "ISO"], [/SOC ?2/i, "SOC 2"], [/bank-grade|military/i, "bank-grade"], [/\bsecure[ds]?\b|\bsecurely\b/i, "secure"], [/AI-powered|revolution|cutting-edge|seamless|world-class|best-in-class/i, "hype"], [/testimonial|trusted by|our customers include|case stud/i, "customers"], [/\bprivate\b/i, "the word private"], [/Live now|Coming soon/i, "status tag"], [/₹|\bRs\.? ?\d|US\$|\$ ?\d|\bUSD\b|\bINR\b/, "price"], [/(?![©®™])\p{Extended_Pictographic}/u, "emoji"], [/\bsoon in\b|\bby (Q[1-4]|\w+ 20\d\d)\b|\blaunching\b/i, "date promise"], [/we are (fully )?(GDPR|DPDP|CCPA)[- ]compliant/i, "compliance claim"]];
    for (const f of listFiles(root)) { const t = text(read(root, f)); for (const [re, label] of FORBID) c.check(`${f}: no ${label}`, !re.test(t), (t.match(re) || [""])[0]); c.check(`${f}: no test or old addresses in the source`, !/pages\.dev|corporate-home/.test(read(root, f)), "old address"); }
    c.check("the first screen shows the phone number and e-mail", /class="hero-contact"[^]*?tel:\+919650397480[^]*?mailto:hello@corporatetambola\.com/.test(read(root, "index.html")), "missing");
    const hr = text(read(root, "for-hr.html")), how = text(read(root, "how-it-works.html")), ct = text(read(root, "contact.html")), gm = text(read(root, "games.html"));
    c.check("for-hr page carries the owner's sentence", hr.includes(OWNER_LINE), "missing");
    c.check("how-it-works says player details are erased within 24 hours", how.includes("erased within 24 hours after the game ends"), "missing");
    c.check("contact page has the e-mail and the phone number", ct.includes("hello@corporatetambola.com") && ct.includes("(+91) 96503 97480"), "missing");
    c.check("games page names all six games", ["Tambola", "Bingo", "Tic Tac Toe", "Snakes and Ladders", "Luck by Chance", "Lucky Draw"].every((n) => gm.includes(n)), "missing");
    c.check("the privacy page names the Grievance Officer and 7 days", /Grievance Officer/.test(text(read(root, "privacy.html"))) && /within 7 days/.test(text(read(root, "privacy.html"))), "missing");
    c.check("the privacy page says billing records are kept", /Billing records/.test(text(read(root, "privacy.html"))), "missing");
  } },

  { id: "T10", name: "Page structure for assistive tools: one h1, heading order, lang, titles, landmarks, labels, no duplicate ids", async run({ base, browser, root, c }) {
    const titles = new Set();
    for (const p of PAGES) {
      const o = await openPage(browser, pageUrl(base, p), { w: 1280, record: { allow404: p === "404" } });
      const r = await o.page.evaluate(() => {
        const hs = [...document.querySelectorAll("h1,h2,h3,h4")].map((h) => +h.tagName[1]);
        let jump = false; for (let i = 1; i < hs.length; i++) if (hs[i] - hs[i - 1] > 1) jump = true;
        const ids = [...document.querySelectorAll("[id]")].map((e) => e.id); const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
        const unnamed = [...document.querySelectorAll("a[href], button")].filter((e) => !(e.getAttribute("aria-label") || e.textContent.trim())).length;
        const imgs = [...document.querySelectorAll("svg[role=img]")].filter((s) => !s.getAttribute("aria-label")).length;
        const decor = [...document.querySelectorAll("svg:not([role=img])")].filter((s) => s.getAttribute("aria-hidden") !== "true").length;
        const ctl = document.getElementById("menu"); const target = ctl && document.getElementById(ctl.getAttribute("aria-controls"));
        return { h1: hs.filter((x) => x === 1).length, jump, dup, unnamed, imgs, decor, lang: document.documentElement.lang, title: document.title, desc: !!document.querySelector("meta[name=description][content]"), main: document.querySelectorAll("main").length, nav: document.querySelectorAll("nav[aria-label]").length, footer: document.querySelectorAll("footer").length, header: document.querySelectorAll("header").length, current: document.querySelectorAll("[aria-current=page]").length, barHome: !!document.querySelector(".cgb-home"), ctl: !!target, expanded: ctl && ctl.getAttribute("aria-expanded") };
      });
      c.check(`${p}: exactly one h1`, r.h1 === 1, r.h1);
      c.check(`${p}: headings do not skip a level`, !r.jump, "skip");
      c.check(`${p}: no duplicate ids`, r.dup.length === 0, r.dup.join());
      c.check(`${p}: every link and button has a name`, r.unnamed === 0, r.unnamed);
      c.check(`${p}: every picture has a text alternative, decoration is hidden`, r.imgs === 0 && r.decor === 0, `${r.imgs} unlabelled, ${r.decor} undeclared decoration`);
      c.check(`${p}: language, description, one main, a header, a nav and a footer`, r.lang === "en" && r.desc && r.main === 1 && r.header === 1 && r.nav >= 1 && r.footer === 1, JSON.stringify(r));
      c.check(`${p}: the Menu button points at the list`, r.ctl && r.expanded === "false", JSON.stringify(r));
      c.check(`${p}: the title is unique`, !titles.has(r.title) && /Corporate Games/.test(r.title), r.title); titles.add(r.title);
      // one mark for the one page you are on: the bar's Corporate Games mark on the front page, the site menu on the other pages (the bar says aria-current="true" there)
      if (!["404", "offline"].includes(p)) c.check(`${p}: exactly one aria-current="page" on the page`, r.current === 1, r.current + " marks");
      else c.check(`${p}: at most one aria-current="page" on the page`, r.current <= 1, r.current + " marks");
      c.check(`${p}: the Corporate Games bar is on the page`, r.barHome, "no bar");
      await o.close();
    }
  } },

  { id: "T11", name: "Automatic accessibility scan (axe-core): no serious or critical problem, light and dark, phone and laptop", async run({ base, browser, c }) {
    const req = createRequire("C:/ct/tambola/package.json"); const axeSrc = readFileSync(req.resolve("axe-core/axe.min.js"), "utf8");
    for (const p of PAGES) for (const scheme of ["light", "dark"]) for (const w of [390, 1280]) {
      const o = await openPage(browser, pageUrl(base, p), { w, scheme, record: { allow404: p === "404" } });
      await o.page.evaluate(axeSrc);
      const res = await o.page.evaluate(async () => (await window.axe.run(document, { resultTypes: ["violations"] })).violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id + " x" + v.nodes.length + " " + (v.nodes[0] && v.nodes[0].target.join(" "))));
      c.check(`${p} ${scheme} ${w}: axe serious/critical = 0`, res.length === 0, res.join(" | "));
      await o.close();
    }
  } },

  { id: "T12", name: "Works offline: pages open again without internet; unknown page shows the offline page", async run({ base, browser, root, c }) {
    const o = await openPage(browser, base + "/", { w: 1280 });
    const p = o.page;
    await p.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    const cacheName = (read(root, "sw.js").match(/const V = "([^"]+)"/) || [])[1];
    await p.waitForFunction(async (name) => (await caches.keys()).includes(name) && (await (await caches.open(name)).keys()).length >= 12, cacheName, { timeout: 15000 }).catch(() => {});
    await p.goto(base + "/games"); await p.waitForTimeout(300);
    await o.ctx.setOffline(true);
    await p.goto(base + "/games", { waitUntil: "load" });
    c.check("offline: the saved-copy helper (service worker) is in charge of the page", await p.evaluate(() => !!navigator.serviceWorker.controller), "no controller");
    c.check("offline: a visited page opens", (await p.textContent("h1")).includes("Six games for your people"), await p.title());
    await p.goto(base + "/privacy", { waitUntil: "load" });
    c.check("offline: a page that was saved at install opens", (await p.textContent("h1")).includes("What we keep"), await p.title());
    await p.goto(base + "/never-opened-page", { waitUntil: "load" }).catch(() => {});
    c.check("offline: an unknown page shows the offline page", (await p.textContent("h1")).includes("You are offline"), await p.title());
    await o.ctx.setOffline(false);
    await o.close();
  } },

  { id: "T13", name: "No tracking: every request stays on this site, no cookies, a strict content policy", async run({ base, browser, root, headers, c }) {
    for (const f of listFiles(root)) {
      const html = read(root, f);
      const ext = [...html.matchAll(/<(?:script|img|iframe|link|source|video|audio)\b[^>]*(?:src|href)="(https?:)?\/\/[^"]*"/g)].filter((m) => !/rel="canonical"/.test(m[0]) && !/<link[^>]*rel="(?:canonical)"/.test(m[0]));
      const bad = ext.filter((m) => !/^<link[^>]*rel="canonical"/.test(m[0]));
      c.check(`${f}: no outside script, image, frame or style`, bad.length === 0, bad.map((m) => m[0].slice(0, 80)).join(" | "));
      c.check(`${f}: no inline script or style attribute (the policy forbids them)`, !/<script(?![^>]*\bsrc=)[^>]*>[^<]/.test(html) && !/\sstyle="/.test(html) && !/<style/.test(html), "inline code");
    }
    for (const p of PAGES) {
      const o = await openPage(browser, pageUrl(base, p), { w: 1280, record: { allow404: p === "404" } });
      await o.page.waitForTimeout(150);
      const off = o.events.requests.filter((u) => !u.startsWith(base) && !u.startsWith("data:"));
      c.check(`${p}: every request is to this site`, off.length === 0, off.join(" | "));
      c.check(`${p}: no cookie`, (await o.ctx.cookies()).length === 0 && (await o.page.evaluate(() => document.cookie)) === "", "cookie set");
      c.check(`${p}: nothing stored before you choose`, (await o.page.evaluate(() => localStorage.length + sessionStorage.length)) === 0, "storage used");
      await o.close();
    }
    const csp = headers["Content-Security-Policy"] || "";
    c.check("the content policy is strict (self only, no unsafe, no wildcard, no frames)", /default-src 'self'/.test(csp) && /script-src 'self'(;|$)/.test(csp) && !/unsafe-/.test(csp) && !/\*/.test(csp) && /frame-ancestors 'none'/.test(csp), csp);
  } },

  { id: "T14", name: "Light/dark button works, is remembered on this device, and the page still works when storage is blocked", async run({ base, browser, c }) {
    const o = await openPage(browser, base + "/", { w: 1280, scheme: "light" });
    const p = o.page;
    const bg = async () => (await p.evaluate(COLOR_PROBE, ["body"]))[0].bg.reduce((a, b) => a + b, 0);
    const before = await bg();
    await p.click("nav [data-theme-toggle]");
    c.check("button: page turns dark", (await p.getAttribute("html", "data-theme")) === "dark" && (await bg()) < before - 300, "no change");
    await p.goto(base + "/games");
    c.check("choice is remembered on the next page", (await p.getAttribute("html", "data-theme")) === "dark", "forgot");
    await p.reload();
    c.check("choice survives a reload", (await p.getAttribute("html", "data-theme")) === "dark", "forgot");
    await p.click("nav [data-theme-toggle]");
    c.check("button: back to light", (await p.getAttribute("html", "data-theme")) === "light", "no change");
    await o.close();
    const b = await openPage(browser, base + "/", { w: 390, scheme: "dark", extraInit: () => { Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } }); } });
    c.check("storage blocked: the page still draws", (await b.page.textContent("h1")).includes("Which game"), "no h1");
    await b.page.click("#menu"); await b.page.click("[data-theme-toggle]");
    c.check("storage blocked: the button still works for this visit", (await b.page.getAttribute("html", "data-theme")) === "light", "no change");
    c.check("storage blocked: no error on the page", b.events.console.length === 0, b.events.console.join(" | "));
    await b.close();
  } },

  { id: "T15", name: "Nothing hides behind the sticky top bar: a heading you jump to sits below it (phone and laptop)", async run({ base, browser, c }) {
    for (const w of [390, 1280]) for (const id of ["games", "game-day", "data-deletion", "compliance"]) {
      const o = await openPage(browser, pageUrl(base, "index"), { w });
      await o.page.evaluate((x) => { document.documentElement.style.scrollBehavior = "auto"; location.hash = x; }, id);
      await o.page.waitForTimeout(150);
      const r = await o.page.evaluate((x) => { const bar = document.querySelector(".top").getBoundingClientRect(); const t = document.getElementById(x).getBoundingClientRect(); return { bar: Math.round(bar.bottom), h2: Math.round(t.top), y: Math.round(scrollY) }; }, id);
      c.check(`${w}: #${id} starts below the top bar`, r.y > 0 && r.h2 >= r.bar, JSON.stringify(r));
      await o.close();
    }
  } },
];
