// Journey groups: hand-off to the console, arrival sources, back/forward, offline, JS blocked, slow network, analytics click path.
import { open, flush, beacons, piiIn, VIEWPORTS, CONSOLE, HOST } from "./harness.mjs";
import { clickLook } from "./groups-visit.mjs";

const hex32 = /^[a-f0-9]{32}$/;
const ALLOWED_HREF = new Set([CONSOLE + "/", CONSOLE + "/#/create"]);

// ---------- 2. HAND-OFF to console.corporatetambola.com ----------
export async function handoff(R) {
  const { browser, base, pages, cell } = R;
  for (const pg of pages) {
    await cell({ id: `2.HO.${pg.name}`, step: "1+3", group: "Hand-off links", perm: `${pg.name} | all console links`, name: "Every link to the console is the exact address, https, no query, no personal data, same CTA text goes to the same place" }, async (t) => {
      const o = await open(browser, base, pg.path, { vp: "laptop" });
      try {
        const links = await o.page.evaluate(() => [...document.querySelectorAll("a[href]")].filter((a) => a.hostname === "console.corporatetambola.com").map((a) => ({ href: a.getAttribute("href"), text: (a.textContent || "").trim(), aria: a.getAttribute("aria-label") || "" })));
        t.ok("page has at least one way to the console (except offline)", links.length > 0 || pg.name === "offline", "none");
        for (const l of links) t.ok(`exact console address: ${l.href}`, ALLOWED_HREF.has(l.href), l.href);
        const byText = {};
        for (const l of links) if (l.text) (byText[l.text.toLowerCase()] ||= new Set()).add(l.href);
        for (const [txt, set] of Object.entries(byText)) t.ok(`label "${txt}" always goes to one place`, set.size === 1, [...set].join(" and "));
        for (const l of links) if (/sign in/i.test(l.text)) t.ok('a "Sign in" link goes to the console root, not to /#/create', l.href === CONSOLE + "/", l.href);
        for (const l of links) if (/^create/i.test(l.text)) t.ok(`a "Create" link goes to /#/create: ${l.text}`, l.href === CONSOLE + "/#/create", l.href);
        for (const l of links) if (l.aria && l.text) t.ok(`visible words are inside the accessible name (${l.text})`, l.aria.toLowerCase().includes(l.text.toLowerCase().replace(/[→\s]+$/, "")), `aria="${l.aria}" text="${l.text}"`);
      } finally { await o.close(); }
    });
  }
  // real clicks, with the console host answered by a stub so the exact navigation can be read
  const CLICKS = [
    { key: "hero-create", sel: "main a.btn.main", expectHash: "#/create" },
    { key: "signin", sel: 'a[href="https://console.corporatetambola.com/"]', expectHash: "" },
    { key: "game-card", sel: 'main a[href="https://console.corporatetambola.com/#/create"]:not(.btn)', expectHash: "#/create" },
    { key: "bar-tile", sel: '.cgb a[href^="https://console.corporatetambola.com"]', expectHash: "#/create" },
  ];
  let n = 0;
  for (const vp of ["phone", "laptop"]) for (const ck of CLICKS) for (const gpc of [false, true]) for (const src of ["direct", "whatsapp+utm"]) {
    await cell({ id: `2.HC.${String(++n).padStart(2, "0")}`, step: "1+3", group: "Hand-off click", perm: `${vp} | ${ck.key} | ${gpc ? "decline signal" : "normal"} | ${src}`, name: "Click goes to console; nothing personal or campaign-related is in the address; only the origin is sent as referrer" }, async (t) => {
      R.srv.beacons.length = 0;
      const o = await open(browser, base, null, { vp, gpc });
      const reqs = [];
      await o.ctx.route("https://console.corporatetambola.com/**", (r) => { reqs.push({ url: r.request().url(), referer: r.request().headers()["referer"] || "" }); r.fulfill({ status: 200, contentType: "text/html", body: "<title>console stub</title>" }); });
      try {
        await o.page.goto(base + "/" + (src === "direct" ? "" : "?utm_source=whatsapp&utm_medium=social&utm_campaign=nov-launch&fbclid=AbC123"));
        let link = o.page.locator(ck.sel).filter({ visible: true }).first();
        if (!(await link.count()) && ck.key === "signin") { await o.page.locator("#menu").click(); link = o.page.locator(ck.sel).filter({ visible: true }).first(); }
        if (!(await link.count()) && ck.key === "bar-tile") { await o.page.locator(".cgb-all").first().click(); link = o.page.locator(ck.sel).filter({ visible: true }).first(); }
        if (!(await link.count())) { t.ok(`a visible ${ck.key} link exists at ${vp}`, false, "not found"); return; }
        await link.click(); await o.page.waitForURL(/console\.corporatetambola\.com/, { timeout: 8000 });
        const u = new URL(o.page.url());
        t.ok("goes to the console host over https", u.origin === CONSOLE, u.origin);
        t.ok("no query string in the address (no utm, no fbclid, no data)", u.search === "", u.search);
        const hash = u.hash.replace(/^#cv=[a-f0-9]{32}$/, "#cv");
        t.ok(`address ends ${ck.expectHash || "(nothing, or the visitor code)"}`, hash === ck.expectHash || (ck.expectHash === "" && hash === "#cv"), u.hash);
        if (gpc) t.ok("decline signal: no visitor code is added", !/cv=/.test(u.hash), u.hash);
        else if (ck.key !== "signin") t.ok("the visitor code travels with the Create / game links (one journey from home to console)", /#cv=[a-f0-9]{32}/.test(u.hash) || /cv=[a-f0-9]{32}/.test(u.hash), `console address was ${u.href}: the tracker adds its code only to links with no # part, and every Create/game link has #/create`);
        t.ok("address has no personal data", !piiIn(u.href).length, u.href);
        const ref = reqs[0] && reqs[0].referer;
        t.ok("referrer sent to the console is the origin only (no page path, no query)", !ref || /^https?:\/\/[^/]+\/?$/.test(ref), ref);
      } finally { await o.close(); }
    });
  }
}

// ---------- 7. ARRIVALS: WhatsApp, LinkedIn, others, with and without UTM ----------
const REFERRERS = { direct: undefined, "whatsapp (no referrer)": undefined, linkedin: "https://www.linkedin.com/feed/update/urn:li:activity:123/", "lnkd.in": "https://lnkd.in/abc", facebook: "https://l.facebook.com/l.php?u=x&h=y", google: "https://www.google.com/search?q=corporate+games" };
const QUERIES = {
  none: "", utm: "?utm_source=whatsapp&utm_medium=social&utm_campaign=nov-launch", "utm+click ids": "?utm_source=linkedin&utm_medium=post&utm_campaign=hr-event&fbclid=IwAR0abc&gclid=Cj0KCQ&li_fat_id=zz",
  "utm with e-mail inside": "?utm_source=raajat.agarwal%40gmail.com&utm_medium=email", "partner code": "?ref=ABCDEFGH", "bad partner code": "?ref=%3Cscript%3E", "utm with angle brackets": "?utm_source=%3Cscript%3Ealert(1)%3C%2Fscript%3E&utm_campaign=%22%3E%3Cimg%20src%3Dx%3E",
};
export async function arrivals(R) {
  const { browser, base, srv, cell } = R; let n = 0;
  for (const [rname, ref] of Object.entries(REFERRERS)) for (const [qname, q] of Object.entries(QUERIES)) for (const path of ["/", "/pricing"]) {
    await cell({ id: `7.AR.${String(++n).padStart(3, "0")}`, step: 1, group: "Arrival source", perm: `from ${rname} | query: ${qname} | page ${path}`, name: "Page opens clean; canonical stays clean; tracker sends only host + path + campaign words; nothing personal; no injected markup" }, async (t) => {
      srv.beacons.length = 0;
      const o = await open(browser, base, null, { vp: "phone" });
      try {
        const resp = await o.page.goto(base + path + q, { referer: ref });
        t.ok("status 200", resp.status() === 200, String(resp.status()));
        t.ok("no console error", !o.ev.console.length && !o.ev.errors.length, [...o.ev.console, ...o.ev.errors].join("|"));
        const f = await o.page.evaluate(() => ({ canon: document.querySelector('link[rel=canonical]').href, og: document.querySelector('meta[property="og:url"]').content, h1: document.querySelectorAll("h1").length, inj: document.querySelectorAll("script:not([src]):not([type]),img[src=x]").length, text: document.body.innerText.includes("alert(1)") }));
        t.ok("canonical has no query", !f.canon.includes("?"), f.canon);
        t.ok("og:url has no query", !f.og.includes("?"), f.og);
        t.ok("campaign words are not echoed into the page", !f.inj && !f.text, JSON.stringify(f));
        const bs = await flush(o.page, srv);
        const first = bs.find((b) => b.lp !== undefined);
        t.ok("first message of the visit exists", !!first, "none");
        if (first) {
          t.ok("landing path has no query", !/[?#]/.test(first.lp), first.lp);
          let host = ""; try { host = ref ? new URL(ref).hostname : ""; } catch { /* none */ }
          t.ok("referrer is the host only", first.r === host, `${first.r} != ${host}`);
          t.ok("campaign words are taken from utm_source / utm_medium / utm_campaign only", !q.includes("utm_source") || typeof first.u.s === "string", JSON.stringify(first.u));
          t.ok("partner code is 8 safe characters or absent", first.pc === undefined || /^[A-Za-z2-9]{8}$/.test(first.pc), String(first.pc));
        }
        t.ok("no e-mail address or phone number leaves the browser", !piiIn(bs).length, piiIn(bs).join(",") + " in " + JSON.stringify(bs.map((b) => b.u)));
        t.ok("no full URL (with ?) in any event path", bs.every((b) => b.e.every((e) => !/[?]/.test(e.p || ""))), "");
        const cvLinks = await o.page.evaluate(() => [...document.querySelectorAll('a[href*="console."]')].filter((a) => /utm_|fbclid|ref=/.test(a.href)).length);
        t.ok("console links do not copy campaign words", cvLinks === 0, String(cvLinks));
      } finally { await o.close(); }
    });
  }
}

// ---------- 8. BACK / FORWARD ----------
export async function history(R) {
  const { browser, base, srv, cell } = R; let n = 0;
  for (const vp of ["phone", "tablet", "laptop"]) for (const look of ["retro", "modern"]) {
    await cell({ id: `8.BF.${String(++n).padStart(2, "0")}`, step: 3, group: "Back / forward", perm: `${vp} | ${look}`, name: "Home > Games > Pricing, then back, back, forward: right page each time, choices kept, menu shut, one page-view per page load" }, async (t) => {
      srv.beacons.length = 0;
      const o = await open(browser, base, "/", { vp });
      try {
        if (look === "modern") await clickLook(o.page);
        const where = async () => o.page.evaluate(() => ({ p: location.pathname, h1: (document.querySelector("h1") || {}).textContent || "", look: document.documentElement.getAttribute("data-look"), open: !!document.querySelector("#nav.open") }));
        await o.page.goto(base + "/games"); await o.page.goto(base + "/pricing");
        if (vp !== "laptop") { await o.page.locator("#menu").click(); }
        await o.page.goBack(); let w = await where(); t.ok("back 1 shows /games", w.p === "/games" && /game/i.test(w.h1), JSON.stringify(w)); t.ok("look kept", w.look === look, w.look); t.ok("menu is shut", !w.open, "menu open");
        await o.page.goBack(); w = await where(); t.ok("back 2 shows /", w.p === "/", JSON.stringify(w));
        await o.page.goForward(); w = await where(); t.ok("forward shows /games", w.p === "/games", JSON.stringify(w));
        const bs = await flush(o.page, srv);
        const pv = bs.flatMap((b) => b.e).filter((e) => e.k === "pv").map((e) => e.p);
        t.ok("the tracker saw each page load once, in order (/, /games, /pricing, /games, /, /games)", JSON.stringify(pv) === JSON.stringify(["/", "/games", "/pricing", "/games", "/", "/games"]), JSON.stringify(pv));
        const sids = new Set(bs.map((b) => b.s)); t.ok("one session for the whole walk", sids.size === 1, String(sids.size));
      } finally { await o.close(); }
    });
  }
  await cell({ id: "8.BF.hash", step: 3, group: "Back / forward", perm: "laptop | in-page anchors", name: "In-page jumps (#links) and back do not count as new page views and do not break the page" }, async (t) => {
    srv.beacons.length = 0;
    const o = await open(browser, base, "/terms", { vp: "laptop" });
    try {
      const anchors = await o.page.evaluate(() => [...new Set([...document.querySelectorAll('main a[href^="#"]')].map((a) => a.getAttribute("href")).filter((h) => h.length > 1 && !h.startsWith("#mk") && !h.startsWith("#i-")))].slice(0, 3));
      for (const a of anchors) { await o.page.evaluate((h) => { location.hash = h; }, a); }
      await o.page.goBack(); await o.page.goForward();
      const bs = await flush(o.page, srv); const pv = bs.flatMap((b) => b.e).filter((e) => e.k === "pv");
      t.ok("one page view only", pv.length === 1, String(pv.length));
      t.ok("still the same page with its one h1", (await o.page.evaluate(() => document.querySelectorAll("h1").length)) === 1, "");
      t.ok("the page had anchors to try", anchors.length > 0, "none found");
    } finally { await o.close(); }
  });
}

// ---------- 9. OFFLINE then ONLINE ----------
export async function offline(R) {
  const { browser, base, cell } = R;
  for (const vp of ["phone", "laptop"]) {
    await cell({ id: `9.OF.${vp}`, step: 3, group: "Offline then online", perm: vp, name: "After one visit the pages open again without internet; an unvisited page shows the offline page; back online everything works" }, async (t) => {
      const o = await open(browser, base, "/", { vp });
      try {
        await o.page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
        await o.page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 8000 }).catch(() => {});
        t.ok("the offline copy (service worker) is in charge", await o.page.evaluate(() => !!navigator.serviceWorker.controller), "no controller");
        await o.page.waitForTimeout(600);
        await o.ctx.setOffline(true);
        for (const p of ["/", "/games", "/pricing", "/privacy", "/how-it-works", "/for-hr", "/contact", "/virtual-team-building-games", "/games-for-hr-teams"]) {
          await o.page.goto(base + p).catch(() => {});
          const h = await o.page.evaluate(() => ({ h1: (document.querySelector("h1") || {}).textContent || "", t: document.title }));
          t.ok(`offline: ${p} opens from the saved copy`, h.h1 && !/offline|no internet|not connected/i.test(h.t + h.h1), JSON.stringify(h));
        }
        await o.page.goto(base + "/terms").catch(() => {});
        const tt = await o.page.evaluate(() => ({ h1: (document.querySelector("h1") || {}).textContent || "", t: document.title }));
        t.ok("offline: /terms (the legal page) also opens for a returning visitor", !/offline|no internet|not connected/i.test(tt.t + tt.h1), `shows the offline page: ${JSON.stringify(tt)}`);
        await o.page.goto(base + "/never-visited-xyz").catch(() => {});
        const un = await o.page.evaluate(() => document.title + " " + ((document.querySelector("h1") || {}).textContent || ""));
        t.ok("offline: an unknown page shows the friendly offline page", /offline|internet|connect/i.test(un), un);
        await o.ctx.setOffline(false);
        const r = await o.page.goto(base + "/pricing"); t.ok("online again: the page loads", r.status() === 200, String(r && r.status()));
        t.ok("online again: no error shown", (await o.page.locator("h1:visible").count()) === 1, "");
      } finally { await o.close(); }
    });
  }
}

// ---------- 4. JAVASCRIPT BLOCKED ----------
export async function noJs(R) {
  const { browser, base, pages, cell } = R; let n = 0;
  for (const pg of pages) for (const vp of ["phone", "tablet", "laptop"]) {
    await cell({ id: `4.NJ.${String(++n).padStart(2, "0")}`, step: 1, group: "JavaScript blocked", perm: `${pg.name} | ${vp}`, name: "Page still readable: h1, menu links reachable, a way to the console, no sideways scroll" }, async (t) => {
      const o = await open(browser, base, pg.path, { vp, js: false });
      try {
        t.ok(`status ${pg.status}`, o.resp.status() === pg.status, String(o.resp.status()));
        const f = await o.page.evaluate(() => {
          const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none"; };
          const nav = [...document.querySelectorAll("#nav a")]; const menu = document.getElementById("menu");
          return { h1: [...document.querySelectorAll("h1")].filter(vis).length, navVisible: nav.filter(vis).length, navTotal: nav.length, menuVisible: menu ? vis(menu) : false, consoleVisible: [...document.querySelectorAll('a[href^="https://console.corporatetambola.com"]')].filter(vis).length, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, jsClass: document.documentElement.classList.contains("js") };
        });
        t.ok("one visible h1", f.h1 === 1, String(f.h1));
        t.ok("every menu link is visible, or there is a menu button that works without script", f.navVisible === f.navTotal || (f.menuVisible && false), `${f.navVisible}/${f.navTotal} nav links visible, menu button visible: ${f.menuVisible} (the button needs script to open)`);
        t.ok("a way to the console is visible", f.consoleVisible > 0, "none visible");
        t.ok("no sideways scroll", f.sw <= f.cw + 1, `${f.sw} > ${f.cw}`);
        t.ok("the page does not claim script is running", !f.jsClass, "js class set");
      } finally { await o.close(); }
    });
  }
}

// ---------- 5. SLOW NETWORK ----------
const PROFILES = { "Slow 3G": { latency: 400, down: (400 * 1024) / 8, up: (400 * 1024) / 8, loadMs: 20000 }, "Fast 3G": { latency: 150, down: (1.6 * 1024 * 1024) / 8, up: (750 * 1024) / 8, loadMs: 8000 } };
export async function slow(R) {
  const { browser, base, cell } = R; let n = 0;
  for (const [pname, pr] of Object.entries(PROFILES)) for (const path of ["/", "/games", "/pricing", "/privacy", "/terms", "/__no-such-page__"]) {
    await cell({ id: `5.SN.${String(++n).padStart(2, "0")}`, step: 1, group: "Slow network", perm: `${pname} | ${path}`, name: "Readable text arrives in time, nothing breaks; page weight recorded" }, async (t) => {
      const o = await open(browser, base, null, { vp: "phone", serviceWorkers: "block" });
      try {
        const cdp = await o.ctx.newCDPSession(o.page); await cdp.send("Network.enable");
        await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: pr.latency, downloadThroughput: pr.down, uploadThroughput: pr.up });
        let bytes = 0; cdp.on("Network.loadingFinished", (e) => { bytes += e.encodedDataLength || 0; });
        const t0 = Date.now(); await o.page.goto(base + path, { waitUntil: "commit" });
        await o.page.waitForSelector("h1", { state: "visible", timeout: 60000 }); const tH1 = Date.now() - t0;
        await o.page.waitForLoadState("load", { timeout: 90000 }); const tLoad = Date.now() - t0;
        t.note = `h1 at ${(tH1 / 1000).toFixed(1)}s, load at ${(tLoad / 1000).toFixed(1)}s, ${(bytes / 1024).toFixed(0)} KB`;
        t.ok(`page fully loaded within ${pr.loadMs / 1000}s`, tLoad <= pr.loadMs, t.note);
        t.ok("no script error", !o.ev.errors.length, o.ev.errors.join("|"));
        t.ok("no failed request", !o.ev.failed.length, o.ev.failed.join("|"));
      } finally { await o.close(); }
    });
  }
  await cell({ id: "5.SN.sw", step: 3, group: "Slow network", perm: "Slow 3G | repeat visit with offline copy", name: "A returning visitor on a slow line sees the page within the 4-second wait (saved copy) without errors" }, async (t) => {
    const o = await open(browser, base, "/", { vp: "phone" });
    try {
      await o.page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 8000 }).catch(() => {}); await o.page.waitForTimeout(800);
      const cdp = await o.ctx.newCDPSession(o.page); await cdp.send("Network.enable");
      await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 2500, downloadThroughput: 5 * 1024, uploadThroughput: 5 * 1024 });
      const t0 = Date.now(); await o.page.goto(base + "/games", { waitUntil: "commit" }); await o.page.waitForSelector("h1", { state: "visible", timeout: 30000 });
      const ms = Date.now() - t0; t.note = `h1 after ${(ms / 1000).toFixed(1)}s on a 5 KB/s line`;
      t.ok("the saved copy appears after the 4 second wait at the latest (about 6 s)", ms < 7500, t.note);
    } finally { await o.close(); }
  });
}

// ---------- 11. COOKIES, STORAGE, CLICK PATH ----------
const STATES = { normal: {}, "decline signal (GPC)": { gpc: true }, "do not track": { dnt: true }, "storage blocked": { blockStorage: true } };
export async function clickPath(R) {
  const { browser, base, srv, cell } = R; let n = 0;
  for (const [sname, st] of Object.entries(STATES)) for (const vp of ["phone", "laptop"]) {
    await cell({ id: `11.CP.${String(++n).padStart(2, "0")}`, step: "1+3", group: "Cookies and click path", perm: `${sname} | ${vp}`, name: "Walk Home > Games > How it works > Pricing > click Create: no cookie; path recorded as paths and click names only; nothing personal; decline honoured" }, async (t) => {
      srv.beacons.length = 0;
      const o = await open(browser, base, "/", { vp, ...st });
      await o.ctx.route("https://console.corporatetambola.com/**", (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<title>console</title>" }));
      try {
        for (const p of ["/games", "/how-it-works", "/pricing"]) { await o.page.goto(base + p); await o.page.waitForTimeout(60); }
        const link = o.page.locator('main a[href^="https://console.corporatetambola.com"]').filter({ visible: true }).first();
        await link.click(); await o.page.waitForURL(/console\.corporatetambola\.com/, { timeout: 8000 });
        await o.page.waitForTimeout(300);
        t.ok("no cookie set by this site", (await o.ctx.cookies()).length === 0, JSON.stringify(await o.ctx.cookies()));
        const bs = beacons(srv);
        const evs = bs.flatMap((b) => b.e || []);
        const pv = evs.filter((e) => e.k === "pv").map((e) => e.p);
        if (sname === "storage blocked" || sname === "normal") t.ok("page views recorded in order", JSON.stringify(pv) === JSON.stringify(["/", "/games", "/how-it-works", "/pricing"]), JSON.stringify(pv));
        const act = evs.filter((e) => e.k === "act");
        if (sname === "normal" || sname === "storage blocked") t.ok("the click on the console link is recorded by name (out:console...)", act.some((e) => /^out:console/.test(e.n)), JSON.stringify(act.map((e) => e.n)));
        t.ok("no e-mail, phone number or typed text in anything sent", !piiIn(bs).length, piiIn(bs).join(","));
        t.ok("every recorded path is a path (no ?, no http)", evs.every((e) => !/[?]|https?:/.test(e.p || "") && !/[?]|https?:/.test(e.v || "")), JSON.stringify(evs.filter((e) => /[?]|https?:/.test((e.p || "") + (e.v || "")))));
        if (st.gpc || st.dnt) {
          t.ok("decline: no visitor code sent", bs.every((b) => !b.d), "");
          t.ok("decline: nothing about the navigation is sent (the privacy page says no navigation data is collected)", evs.length === 0, `${evs.length} events sent, e.g. ${JSON.stringify(evs.slice(0, 3))}`);
        } else if (sname === "normal") {
          t.ok("one visitor code for the whole walk", new Set(bs.map((b) => b.d)).size === 1 && hex32.test(bs[0].d || ""), JSON.stringify([...new Set(bs.map((b) => b.d))]));
          t.ok("one session for the whole walk", new Set(bs.map((b) => b.s)).size === 1, "");
        }
      } finally { await o.close(); }
    });
  }
}

// ---------- 10. LANGUAGE OF CTAs ----------
export async function language(R) {
  const { browser, base, pages, cell } = R;
  for (const loc of ["en-IN", "en-US", "en-GB", "hi-IN", "ar-AE"]) {
    await cell({ id: `10.LG.${loc}`, step: 1, group: "Language", perm: `browser language ${loc}`, name: "Page stays English and complete; tracker records the language code only" }, async (t) => {
      R.srv.beacons.length = 0;
      const o = await open(browser, base, "/", { vp: "laptop", locale: loc });
      try {
        const f = await o.page.evaluate(() => ({ lang: document.documentElement.lang, dir: document.documentElement.dir || getComputedStyle(document.documentElement).direction, h1: document.querySelectorAll("h1").length, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
        t.ok('lang="en" and left-to-right', f.lang === "en" && f.dir === "ltr", JSON.stringify(f));
        t.ok("h1 and no sideways scroll", f.h1 === 1 && f.sw <= f.cw + 1, JSON.stringify(f));
        const bs = await flush(o.page, R.srv); t.ok("language code sent is only the code", bs.every((b) => /^[a-zA-Z]{2,3}([-_][a-zA-Z0-9]{2,8})?$/.test(b.l || "")), JSON.stringify(bs.map((b) => b.l)));
      } finally { await o.close(); }
    });
  }
  await cell({ id: "10.LG.words", step: 1, group: "Language", perm: "all pages | link and button words", name: "Call-to-action words: short, plain, no jargon, no we/our/us, same label never means two things" }, async (t) => {
    const JARGON = /\b(leverage|synergy|utili[sz]e|onboard(ing)?|stakeholders?|robust|cutting-edge|best-in-class|revolutionary|paradigm|ecosystem|turnkey|seamless(ly)?)\b/i;
    const all = {};
    for (const pg of pages) {
      const o = await open(browser, base, pg.path, { vp: "laptop" });
      try {
        const items = await o.page.evaluate(() => [...document.querySelectorAll("a.btn, button, .tabbar a, .signin-small, a.cta")].map((e) => ({ text: (e.textContent || "").replace(/\s+/g, " ").trim(), href: e.getAttribute("href") || "" })).filter((x) => x.text));
        for (const it of items) {
          t.ok(`${pg.name}: "${it.text}" is 7 words or fewer`, it.text.split(" ").length <= 7, it.text);
          t.ok(`${pg.name}: "${it.text}" has no jargon`, !JARGON.test(it.text), it.text);
          t.ok(`${pg.name}: "${it.text}" has no we/our/us`, !/(?<![\w-])(we|our|us)(?![\w-])/i.test(it.text), it.text);
          if (it.href) (all[it.text] ||= new Set()).add(it.href.replace(/^\/$/, "/"));
        }
      } finally { await o.close(); }
    }
    for (const [txt, set] of Object.entries(all)) t.ok(`label "${txt}" means one thing on every page`, set.size === 1, [...set].join(" | "));
  });
}
