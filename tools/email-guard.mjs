// Cloudflare "Email Address Obfuscation" rewrites every e-mail address it finds in page text and in mailto links, unless it sits between
// <!--email_off--> and <!--/email_off-->. The rewritten text needs a script that the site's content policy blocks, so the visitor sees "[email protected]".
// 20 Nov 2026 smoke test: the live /terms and /contact pages had addresses outside the guard and came out scrambled.
// findUnguarded(html): the addresses Cloudflare could touch. wrapEmails(html): adds the guard around them (used by tools/make-terms.mjs).
const ADDR = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const ADDR_G = new RegExp(ADDR.source, "g");
const OPEN = "<!--email_off-->", CLOSE = "<!--/email_off-->";

export function findUnguarded(html) {
  const found = []; const parts = html.split(/(<!--[\s\S]*?-->|<script\b[\s\S]*?<\/script>|<[^>]+>)/); let off = false;
  for (const p of parts) {
    if (p === OPEN) { off = true; continue; } if (p === CLOSE) { off = false; continue; }
    if (/^<!--/.test(p) || /^<script\b/i.test(p) || off) continue;
    if (/^<a\b[^>]*href="mailto:/i.test(p)) { found.push(p.match(/mailto:[^"?]+/i)[0]); continue; }
    if (!p.startsWith("<")) for (const m of p.matchAll(ADDR_G)) found.push(m[0]);
  }
  return found;
}

export function wrapEmails(html) {
  const parts = html.split(/(<!--[\s\S]*?-->|<script\b[\s\S]*?<\/script>|<[^>]+>)/); let off = false; let inMailto = false; const out = [];
  for (const p of parts) {
    if (p === OPEN) { off = true; out.push(p); continue; } if (p === CLOSE) { off = false; out.push(p); continue; }
    if (/^<!--/.test(p) || /^<script\b/i.test(p)) { out.push(p); continue; }
    if (off) { out.push(p); continue; }
    if (/^<a\b[^>]*href="mailto:/i.test(p)) { inMailto = true; out.push(OPEN + p); continue; }
    if (inMailto && /^<\/a>/i.test(p)) { inMailto = false; out.push(p + CLOSE); continue; }
    if (!p.startsWith("<") && !inMailto) { out.push(p.replace(ADDR_G, (m) => OPEN + m + CLOSE)); continue; }
    out.push(p);
  }
  return out.join("");
}
