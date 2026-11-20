// Owner step 1 (first visit) and step 3 (repeat visit): the browser groups of the smoke matrix.
import { open, flush, beacons, piiIn, VIEWPORTS, CONSOLE, HOST } from "./harness.mjs";

const SCHEMES = ["light", "dark"], LOOKS = ["retro", "modern"], VPS = ["phone", "tablet", "laptop"];
const lum = (rgb) => { const m = rgb.match(/[\d.]+/g).map(Number); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
const hex32 = /^[a-f0-9]{32}$/;

/** click the first look button that can be seen (the header one is hidden on phones, the footer one is not) */
export async function clickLook(page) {
  const b = page.locator("[data-look-toggle]:visible").first();
  if (!(await b.count())) return false;
  await b.click(); return true;
}
export async function clickTheme(page) {
  const b = page.locator("[data-theme-toggle]:visible").first();
  if (!(await b.count())) return false;
  await b.click(); return true;
}

// ---------- 1. FIRST VISIT: page x width x light/dark x look ----------
export async function firstVisit(R) {
  const { browser, base, pages, cell } = R; let n = 0;
  for (const pg of pages) for (const vp of VPS) for (const scheme of SCHEMES) for (const look of LOOKS) {
    await cell({ id: `1.FV.${String(++n).padStart(3, "0")}`, step: 1, group: "First visit", perm: `${pg.name} | ${vp} | ${scheme} | ${look}`, name: "Opens clean: status, no errors, one h1, no sideways scroll, own site only, look and colours applied" }, async (t) => {
      const o = await open(browser, base, pg.path, { vp, scheme });
      try {
        t.ok(`status ${pg.status}`, o.resp.status() === pg.status, "got " + o.resp.status());
        if (look === "modern") t.ok("a look button can be reached and used", await clickLook(o.page), "no visible look button");
        await o.page.waitForTimeout(120);
        const f = await o.page.evaluate(() => ({
          lang: document.documentElement.lang, look: document.documentElement.getAttribute("data-look"), h1: [...document.querySelectorAll("h1")].filter((h) => h.offsetParent).length,
          sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, bg: getComputedStyle(document.body).backgroundColor,
          bar: !!document.querySelector(".cgb"), forms: document.querySelectorAll("form,input,textarea,select").length,
          lookLabel: (document.querySelector("[data-look-toggle]:not([hidden])") || {}).textContent || "",
        }));
        const cons = o.ev.console.filter((m) => !(pg.status === 404 && /status of 404/.test(m))); // the browser logs the 404 of the 404 page itself
        t.ok("no console error or warning, no script error", !cons.length && !o.ev.errors.length, [...cons, ...o.ev.errors].join(" | "));
        t.ok("no failed request", !o.ev.failed.length, o.ev.failed.join(" | "));
        const off = o.ev.requests.filter((u) => !u.startsWith(base) && !u.startsWith("data:") && !u.startsWith("blob:"));
        t.ok("every request is to this site only", !off.length, off.join(" | "));
        t.ok("no sideways scroll", f.sw <= f.cw + 1, `${f.sw} > ${f.cw}`);
        t.ok("exactly one visible h1", f.h1 === 1, String(f.h1));
        t.ok('lang="en"', f.lang === "en", f.lang);
        t.ok(`look is ${look}`, f.look === look, f.look);
        if (pg.name !== "404" && pg.name !== "offline") t.ok("the shared Corporate Games bar is drawn", f.bar, "no .cgb");
        const L = lum(f.bg);
        t.ok(`background is ${scheme}`, scheme === "dark" ? L < 0.35 : L > 0.6, `luminance ${L.toFixed(2)}`);
        t.ok("no form, no input, no login box on the page", f.forms === 0, String(f.forms));
        if (pg.name === "index") {
          const above = await o.page.evaluate(() => [...document.querySelectorAll('a[href^="https://console.corporatetambola.com"]')].some((a) => { const r = a.getBoundingClientRect(); return a.offsetParent && r.top >= 0 && r.top < innerHeight && r.width > 0; }));
          t.ok("a way into the console is visible without scrolling", above, "no console link in the first screen");
        }
      } finally { await o.close(); }
    });
  }
}

// ---------- 3a. REPEAT VISIT: looks and colours are remembered ----------
export async function repeatLooks(R) {
  const { browser, base, cell } = R; let n = 0;
  for (const vp of VPS) for (const scheme of SCHEMES) for (const look of LOOKS) {
    await cell({ id: `3.RL.${String(++n).padStart(2, "0")}`, step: 3, group: "Repeat visit: choices remembered", perm: `${vp} | ${scheme} start | choose ${look} + ${scheme === "light" ? "dark" : "light"}`, name: "Look and light/dark survive reload, other pages, back and a new tab" }, async (t) => {
      const o = await open(browser, base, "/", { vp, scheme });
      try {
        if (look === "modern") await clickLook(o.page);
        await clickTheme(o.page); // flips the device colour
        const want = scheme === "light" ? "dark" : "light";
        const state = () => o.page.evaluate(() => ({ look: document.documentElement.getAttribute("data-look"), theme: document.documentElement.getAttribute("data-theme"), menu: (document.getElementById("nav") || { classList: { contains: () => false } }).classList.contains("open") }));
        let s = await state(); t.ok("choice applied now", s.look === look && s.theme === want, JSON.stringify(s));
        await o.page.reload(); s = await state(); t.ok("kept after reload", s.look === look && s.theme === want, JSON.stringify(s));
        await o.page.goto(base + "/pricing"); s = await state(); t.ok("kept on another page", s.look === look && s.theme === want, JSON.stringify(s));
        await o.page.goto(base + "/privacy"); await o.page.goBack(); s = await state(); t.ok("kept after back", s.look === look && s.theme === want, JSON.stringify(s));
        t.ok("menu is closed after back", !s.menu, "menu open");
        const p2 = await o.ctx.newPage(); await p2.goto(base + "/games");
        s = await p2.evaluate(() => ({ look: document.documentElement.getAttribute("data-look"), theme: document.documentElement.getAttribute("data-theme") }));
        t.ok("kept in a new tab", s.look === look && s.theme === want, JSON.stringify(s));
        const lbl = await p2.evaluate(() => [...document.querySelectorAll("[data-look-toggle]")].map((b) => b.textContent));
        t.ok("look button label tells the current look", lbl.every((x) => x === "Look: " + (look === "modern" ? "Modern" : "Retro")), lbl.join(","));
        const keys = await p2.evaluate(() => Object.keys(localStorage));
        t.ok("only ctz-look, cg-theme and the tracker's own code are stored", keys.every((k) => /^(ctz-look|cg-theme|ca_vid)$/.test(k)), keys.join(","));
      } finally { await o.close(); }
    });
  }
}

// ---------- 3b. REPEAT VISIT: visitor code, sessions, cleared storage ----------
export async function repeatCode(R) {
  const { browser, base, srv, cell } = R;
  await cell({ id: "3.RC.01", step: 3, group: "Repeat visit: tracker", perm: "phone | normal", name: "Same visitor code on every page and every later visit; new session after 30 minutes; new code after storage is cleared" }, async (t) => {
    srv.beacons.length = 0;
    const o = await open(browser, base, "/", { vp: "phone" });
    try {
      const code = () => o.page.evaluate(() => ({ vid: localStorage.getItem("ca_vid"), sid: sessionStorage.getItem("ca_sid") }));
      const a = await code(); t.ok("a visitor code is made (32 hex)", hex32.test(a.vid || ""), JSON.stringify(a));
      await o.page.goto(base + "/games"); const b = await code(); t.ok("same code on the next page", b.vid === a.vid && b.sid === a.sid, JSON.stringify([a, b]));
      await o.page.reload(); const c = await code(); t.ok("same code after reload", c.vid === a.vid, JSON.stringify(c));
      await o.page.evaluate(() => sessionStorage.setItem("ca_t", String(Date.now() - 31 * 60000)));
      await o.page.reload(); const d = await code(); t.ok("31 minutes later: new session, same visitor", d.sid !== a.sid && d.vid === a.vid, JSON.stringify([a, d]));
      await flush(o.page, srv);
      const bs = beacons(srv); const fresh = bs.filter((x) => x.lp);
      t.ok("each session sends where it came from once (lp)", fresh.length === 2, "sessions with lp: " + fresh.length);
      t.ok("beacons carry the same visitor code", new Set(bs.map((x) => x.d).filter(Boolean)).size === 1, [...new Set(bs.map((x) => x.d))].join(","));
      await o.page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
      await o.page.reload(); const e = await code(); t.ok("storage cleared: a new visitor code", hex32.test(e.vid || "") && e.vid !== a.vid, JSON.stringify([a, e]));
      t.ok("storage cleared: the look is back to Retro", (await o.page.evaluate(() => document.documentElement.getAttribute("data-look"))) === "retro", "");
    } finally { await o.close(); }
  });
  for (const mode of ["gpc", "dnt", "blockStorage"]) {
    await cell({ id: `3.RC.${mode}`, step: 3, group: "Repeat visit: tracker", perm: `phone | ${mode} | first then repeat`, name: mode === "blockStorage" ? "Storage blocked: pages still work twice, no script error" : "Decline signal: no visitor code stored or sent, on the first and the repeat visit" }, async (t) => {
      srv.beacons.length = 0;
      const o = await open(browser, base, "/", { vp: "phone", [mode]: true });
      try {
        await o.page.goto(base + "/games"); await o.page.goto(base + "/");
        t.ok("no script error", !o.ev.errors.length, o.ev.errors.join("|"));
        t.ok("h1 shown", (await o.page.locator("h1:visible").count()) === 1, "");
        if (mode !== "blockStorage") {
          const st = await o.page.evaluate(() => localStorage.length + sessionStorage.length);
          t.ok("nothing stored", st === 0, String(st));
          const bs = await flush(o.page, srv);
          t.ok("no visitor code (d) in any message", bs.every((x) => !x.d), JSON.stringify(bs.map((x) => x.d)));
          t.ok("messages say the visitor declined (g:1)", bs.length === 0 || bs.every((x) => x.g === 1), JSON.stringify(bs.map((x) => x.g)));
          // PRIVACY WORDING: privacy.html says that with a decline signal "no navigation data is collected".
          t.ok("with a decline signal the page sends NO navigation data at all (privacy page wording)", bs.length === 0, `${bs.length} messages sent with paths ${JSON.stringify(bs.flatMap((x) => x.e.map((e) => e.k + ":" + e.p)).slice(0, 6))}`);
        }
        t.ok("no cookie", (await o.ctx.cookies()).length === 0, "");
      } finally { await o.close(); }
    });
  }
}

// ---------- 3c. REPEAT VISIT: no login prompt, no second gate, same way in ----------
export async function repeatNoGate(R) {
  const { browser, base, pages, cell } = R;
  await cell({ id: "3.NG.01", step: 3, group: "Single login rule", perm: "all pages | phone+laptop", name: "Home asks for no login anywhere: no form, no password box, no dialog, no cookie wall, no redirect" }, async (t) => {
    for (const vp of ["phone", "laptop"]) {
      const ctx = await browser.newContext({ viewport: VIEWPORTS[vp] });
      try {
        for (const round of ["first", "repeat"]) for (const pg of pages) {
          const page = await ctx.newPage(); const resp = await page.goto(base + pg.path);
          const f = await page.evaluate(() => ({ pw: document.querySelectorAll('input[type=password],input[type=email],input[type=tel],form').length, dlg: document.querySelectorAll('dialog[open],[role=dialog],[aria-modal=true]').length, wall: [...document.querySelectorAll("*")].filter((e) => /cookie|consent|banner|modal|overlay/i.test(e.className && e.className.baseVal === undefined ? e.className : "")).length, url: location.pathname }));
          t.ok(`${vp} ${round} ${pg.name}: no login or consent box`, f.pw === 0 && f.dlg === 0 && f.wall === 0, JSON.stringify(f));
          t.ok(`${vp} ${round} ${pg.name}: stays on this page (no redirect to a sign-in)`, new URL(page.url()).origin === new URL(base).origin && resp.status() === pg.status, page.url());
          await page.close();
        }
      } finally { await ctx.close(); }
    }
  });
  await cell({ id: "3.NG.02", step: 3, group: "Single login rule", perm: "first vs repeat | laptop", name: "A returning visitor sees the same ways in as a first-time visitor (nothing says 'Continue to console'; owner rule says one login gate)" }, async (t) => {
    const ctx = await browser.newContext({ viewport: VIEWPORTS.laptop });
    try {
      const ways = async () => { const p = await ctx.newPage(); await p.goto(base + "/"); const r = await p.evaluate(() => [...document.querySelectorAll('a[href^="https://console.corporatetambola.com"]')].filter((a) => a.offsetParent).map((a) => (a.textContent || "").trim() + " -> " + a.getAttribute("href"))); await p.close(); return r; };
      const first = await ways(); const again = await ways();
      t.ok("same links on the repeat visit", JSON.stringify(first) === JSON.stringify(again), "differ");
      const hasContinue = again.some((x) => /continue|dashboard|my games|go to (the )?console|open (the )?console/i.test(x));
      t.ok("a returning visitor is offered a way straight to the console ('Continue to console')", hasContinue, "no returning-visitor link exists: home keeps no signed-in state, so a returning organizer sees the same 'Sign in' / 'Create' links");
    } finally { await ctx.close(); }
  });
  await cell({ id: "3.NG.03", step: 3, group: "Single login rule", perm: "static | all pages + bar", name: "Every Sign in goes to the one console address; no other login address anywhere (pages, bar, llms files)" }, async (t) => {
    const { readFileSync, readdirSync } = await import("node:fs"); const { join } = await import("node:path");
    const files = readdirSync(R.root).filter((f) => /\.(html|js|txt)$/.test(f) && f !== "sw.js");
    let signins = 0;
    for (const f of files) {
      const s = readFileSync(join(R.root, f), "utf8");
      for (const m of s.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([^<]*)</g)) if (/^sign in$/i.test(m[2].trim())) { signins++; t.ok(`${f}: Sign in -> console root`, m[1] === CONSOLE + "/", m[1]); }
      t.ok(`${f}: no game-site or old sign-in address`, !/https:\/\/(housie|bingo|tictactoe|snakes|luck|luckydraw)\.corporatetambola\.com|\/zc\b|\/login\b|\/signin\b|\/sign-in\b/.test(s), (s.match(/https:\/\/(housie|bingo|tictactoe|snakes|luck|luckydraw)\.corporatetambola\.com[^"' )]*|\/zc\b|\/login\b|\/signin\b|\/sign-in\b/) || [""])[0]);
    }
    t.ok("at least one Sign in link exists", signins > 0, "none");
  });
  await cell({ id: "3.NG.04", step: 3, group: "Single login rule", perm: "phone | 360 px", name: "On a phone, Sign in is reachable in one tap (not only inside the closed menu)" }, async (t) => {
    const o = await open(browser, base, "/", { vp: "phone" });
    try {
      const visible = await o.page.evaluate(() => [...document.querySelectorAll('a[href="https://console.corporatetambola.com/"]')].filter((a) => a.offsetParent && a.getBoundingClientRect().width > 0).length);
      t.ok("a visible Sign in link without opening the menu", visible > 0, "the only Sign in link sits inside the closed menu: a returning organizer needs two taps (Menu, then Sign in)");
    } finally { await o.close(); }
  });
}
