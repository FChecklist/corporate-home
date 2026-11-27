// THE one place that decides which games the Home site shows (boss decision 27 Nov 2026): only Tambola, Bingo and Lucky Draw.
// HIDDEN_GAMES is the one switch. Nothing is deleted from the source pages, the shared games bar or the styles: tools/build.mjs applies this file to the
// COPY in dist/, so an empty HIDDEN_GAMES builds every page exactly as before (tests/visible-games.mjs builds both ways and compares).
// Every place that shows the six games is covered: game cards (index, games), the "Choose a game" list, the footer "The games" list on every page,
// the privacy page links, the shared games bar (gamesbar.js), search/social text (title, description, og, twitter), headings, and the unused badge drawings.

/** ids as used in the page classes (g-ttt ...) */
export const HIDDEN_GAMES = ["ttt", "snakes", "luck"];

/** everything that tells the games apart: class id, address host, shared-bar id, the name visitors read */
export const GAMES = {
  tambola: { host: "housie", bar: "tambola", name: "Tambola" },
  bingo: { host: "bingo", bar: "bingo", name: "Bingo" },
  ttt: { host: "tictactoe", bar: "tictactoe", name: "Tic Tac Toe" },
  snakes: { host: "snakes", bar: "snakes", name: "Snakes and Ladders" },
  luck: { host: "luck", bar: "luck", name: "Luck by Chance" },
  draw: { host: "luckydraw", bar: "draw", name: "Lucky Draw" },
};

/** wording that names the games or counts them. [from, to]: applied only while a game is hidden; the build fails if a "from" is no longer in the pages (so the copy can never drift). */
export const TEXT_SWAPS = [
  ["Six games for company events: Tambola, Bingo, Tic Tac Toe, Snakes and Ladders, Luck by Chance and Lucky Draw.", "Three games for company events: Tambola, Bingo and Lucky Draw."],
  ["<h1>Six games for your people.</h1>", "<h1>Three games for your people.</h1>"],
  ["<h2>Six games your people already know.</h2>", "<h2>Three games your people already know.</h2>"],
];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** the hidden ids that are really known games (a typo fails loudly) */
export function hiddenOf(list = HIDDEN_GAMES) {
  for (const id of list) if (!GAMES[id]) throw new Error("HIDDEN_GAMES: unknown game " + id);
  return list;
}

/** an HTML page with the hidden games taken out; returns the page. No hidden game = the same text back. */
export function hideInHtml(html, hidden = HIDDEN_GAMES, file = "") {
  if (!hiddenOf(hidden).length) return html;
  let s = html;
  for (const id of hidden) {
    const { host } = GAMES[id];
    s = s.replace(new RegExp('<li><a class="g-' + id + '"[^>]*>[\\s\\S]*?</a></li>\\r?\\n?', "g"), ""); // footer list and the "Choose a game" list
    s = s.replace(new RegExp('<article class="(?:card|row) g-' + id + '">[\\s\\S]*?</article>\\r?\\n?', "g"), ""); // cards and rows
    s = s.replace(new RegExp('<li><a href="https://' + esc(host) + '\\.corporatetambola\\.com/[^"]*">[^<]*</a></li>', "g"), ""); // e.g. privacy links
    s = s.replace(new RegExp('<symbol id="(?:mk|i)-' + id + '"[\\s\\S]*?</symbol>\\r?\\n?', "g"), ""); // the unused badge drawings
  }
  for (const [from, to] of TEXT_SWAPS) s = s.split(from).join(to);
  return s;
}

/** the shared games bar (canonical source, never edited) without the hidden games: the built copy only */
export function hideInGamesBar(src, hidden = HIDDEN_GAMES) {
  if (!hiddenOf(hidden).length) return src;
  let s = src;
  for (const id of hidden) {
    const re = new RegExp('^[ \\t]*\\{ id: "' + GAMES[id].bar + '",[^\\n]*\\},?\\r?\\n', "m");
    if (!re.test(s)) throw new Error('games bar: no entry for hidden game "' + id + '"');
    s = s.replace(re, "");
  }
  return s.replace(/,(\s*\n\s*\];)/, "$1"); // no comma left before the closing bracket
}

/** what must be gone from every built page while games are hidden (checked by the build, and again by the test) */
export function leftovers(text, hidden = HIDDEN_GAMES) {
  const bad = [];
  for (const id of hidden) {
    const { host, name } = GAMES[id];
    for (const [label, re] of [["its address", new RegExp("//" + esc(host) + "\\.corporatetambola\\.com")], ["its name", new RegExp(esc(name))], ["its card or list item", new RegExp('class="(?:card |row )?g-' + id + '"')], ["its badge drawing", new RegExp('id="(?:mk|i)-' + id + '"')]]) if (re.test(text)) bad.push(id + ": " + label);
  }
  if (hidden.length && /\bSix games\b|\bsix games\b/.test(text)) bad.push('the text still says "Six games"');
  return bad;
}
