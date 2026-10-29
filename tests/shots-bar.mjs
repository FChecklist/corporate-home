// Screenshots of the home site (with the shared bar) at 5 widths, light + dark, plus bar probes. Run under the heavy lock.
import { mkdirSync } from "node:fs";
import { startServer, launchChrome, openPage, LAYOUT_PROBE } from "./lib.mjs";
const OUT = "C:/ct/test-sites/data/ui/home-bar"; mkdirSync(OUT, { recursive: true });
const srv = await startServer("C:/ct/test-sites/home");
const chrome = await launchChrome();
const only = process.argv[2] ? process.argv[2].split(",").map(Number) : null;
try {
  for (const [w, h] of [[360, 800], [390, 844], [768, 1024], [900, 800], [1100, 800], [1280, 800], [1920, 1080]]) {
    if (only && !only.includes(w)) continue;
    for (const scheme of ["light", "dark"]) {
      const o = await openPage(chrome.browser, srv.base + "/", { w, h, scheme });
      await o.page.waitForTimeout(250);
      const m = await o.page.evaluate(() => {
        const bar = document.querySelector(".cgb"), i = document.querySelector(".cgb-in");
        const corp = [...document.querySelectorAll(".cgb-corp")].filter((e) => e.getClientRects().length).map((e) => getComputedStyle(e).fontSize);
        return { barH: Math.round(bar.getBoundingClientRect().height), rowScroll: i.scrollWidth > i.clientWidth + 1, pageX: document.documentElement.scrollWidth > innerWidth, corp: [...new Set(corp)].join("/"), beforeSkip: !!document.querySelector(".skip") && !!(document.querySelector(".skip").compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_PRECEDING) };
      });
      const bad = await o.page.evaluate(LAYOUT_PROBE, w);
      console.log(w, scheme, JSON.stringify(m), "layout:", bad.length ? bad.slice(0, 3).join(" ; ") : "clean");
      await o.page.screenshot({ path: `${OUT}/home-${w}-${scheme}.png`, clip: { x: 0, y: 0, width: w, height: Math.min(h, 640) } });
      if (w < 900 && scheme === "light") {
        await o.page.click(".cgb-all"); await o.page.waitForTimeout(150);
        await o.page.screenshot({ path: `${OUT}/home-${w}-sheet-open.png` });
      }
      await o.close();
    }
  }
} finally { await chrome.close(); await srv.close(); }
