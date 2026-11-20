# Smoke matrix results

Run 2026-11-20T13:17:20.478Z. 493 cells, 397 passed, 96 failed (5804 checks, 101 failed).

| Group | Cells | Pass | Fail |
|---|---:|---:|---:|
| First visit | 144 | 144 | 0 |
| Repeat visit: choices remembered | 12 | 12 | 0 |
| Repeat visit: tracker | 4 | 2 | 2 |
| Single login rule | 4 | 2 | 2 |
| Hand-off links | 12 | 12 | 0 |
| Hand-off click | 32 | 20 | 12 |
| Arrival source | 84 | 72 | 12 |
| Back / forward | 7 | 1 | 6 |
| Offline then online | 2 | 0 | 2 |
| JavaScript blocked | 36 | 36 | 0 |
| Slow network | 13 | 13 | 0 |
| Cookies and click path | 8 | 0 | 8 |
| Language | 6 | 6 | 0 |
| Deep links | 15 | 14 | 1 |
| SEO | 13 | 11 | 2 |
| version.json | 1 | 1 | 0 |
| Headers | 1 | 1 | 0 |
| Accessibility (axe-core) | 96 | 48 | 48 |
| Accessibility basics | 1 | 1 | 0 |
| Dead links | 1 | 1 | 0 |
| Prices | 1 | 0 | 1 |

## Failing cells

- **3.RC.gpc** (Repeat visit: tracker; phone | gpc | first then repeat)
  - nothing stored: 1
  - with a decline signal the page sends NO navigation data at all (privacy page wording): 3 messages sent with paths ["pv:/","exit:/","pv:/games","exit:/games","pv:/"]
- **3.RC.dnt** (Repeat visit: tracker; phone | dnt | first then repeat)
  - nothing stored: 1
  - with a decline signal the page sends NO navigation data at all (privacy page wording): 3 messages sent with paths ["pv:/","exit:/","pv:/games","exit:/games","pv:/"]
- **3.NG.02** (Single login rule; first vs repeat | laptop)
  - a returning visitor is offered a way straight to the console ('Continue to console'): no returning-visitor link exists: home keeps no signed-in state, so a returning organizer sees the same 'Sign in' / 'Create' links
- **3.NG.04** (Single login rule; phone | 360 px)
  - a visible Sign in link without opening the menu: the only Sign in link sits inside the closed menu: a returning organizer needs two taps (Menu, then Sign in)
- **2.HC.01** (Hand-off click; phone | hero-create | normal | direct)
  - the visitor code travels with the Create / game links (one journey from home to console): console address was https://console.corporatetambola.com/#/create: the tracker adds its code only to links with no # part, and every Create/game link has #/create
- **2.HC.02** (Hand-off click; phone | hero-create | normal | whatsapp+utm)
  - the visitor code travels with the Create / game links (one journey from home to console): console address was https://console.corporatetambola.com/#/create: the tracker adds its code only to links with no # part, and every Create/game link has #/create
- **2.HC.09** (Hand-off click; phone | game-card | normal | direct)
  - the visitor code travels with the Create / game links (one journey from home to console): console address was https://console.corporatetambola.com/#/create: the tracker adds its code only to links with no # part, and every Create/game link has #/create
- **2.HC.10** (Hand-off click; phone | game-card | normal | whatsapp+utm)
  - the visitor code travels with the Create / game links (one journey from home to console): console address was https://console.corporatetambola.com/#/create: the tracker adds its code only to links with no # part, and every Create/game link has #/create
- **2.HC.13** (Hand-off click; phone | bar-tile | normal | direct)
  - the visitor code travels with the Create / game links (one journey from home to console): console address was https://console.corporatetambola.com/#/create: the tracker adds its code only to links with no # part, and every Create/game link has #/create
- **2.HC.14** (Hand-off click; phone | bar-tile | normal | whatsapp+utm)
  - the visitor code travels with the Create / game links (one journey from home to console): console address was https://console.corporatetambola.com/#/create: the tracker adds its code only to links with no # part, and every Create/game link has #/create
- **2.HC.17** (Hand-off click; laptop | hero-create | normal | direct)
  - the visitor code travels with the Create / game links (one journey from home to console): console address was https://console.corporatetambola.com/#/create: the tracker adds its code only to links with no # part, and every Create/game link has #/create
- **2.HC.18** (Hand-off click; laptop | hero-create | normal | whatsapp+utm)
  - the visitor code travels with the Create / game links (one journey from home to console): console address was https://console.corporatetambola.com/#/create: the tracker adds its code only to links with no # part, and every Create/game link has #/create
- **2.HC.25** (Hand-off click; laptop | game-card | normal | direct)
  - the visitor code travels with the Create / game links (one journey from home to console): console address was https://console.corporatetambola.com/#/create: the tracker adds its code only to links with no # part, and every Create/game link has #/create
- **2.HC.26** (Hand-off click; laptop | game-card | normal | whatsapp+utm)
  - the visitor code travels with the Create / game links (one journey from home to console): console address was https://console.corporatetambola.com/#/create: the tracker adds its code only to links with no # part, and every Create/game link has #/create
- **2.HC.29** (Hand-off click; laptop | bar-tile | normal | direct)
  - the visitor code travels with the Create / game links (one journey from home to console): console address was https://console.corporatetambola.com/#/create: the tracker adds its code only to links with no # part, and every Create/game link has #/create
- **2.HC.30** (Hand-off click; laptop | bar-tile | normal | whatsapp+utm)
  - the visitor code travels with the Create / game links (one journey from home to console): console address was https://console.corporatetambola.com/#/create: the tracker adds its code only to links with no # part, and every Create/game link has #/create
- **7.AR.007** (Arrival source; from direct | query: utm with e-mail inside | page /)
  - no e-mail address or phone number leaves the browser: e-mail address in [{"s":"raajat.agarwal@gmail.com","m":"email","c":""}]
- **7.AR.008** (Arrival source; from direct | query: utm with e-mail inside | page /pricing)
  - no e-mail address or phone number leaves the browser: e-mail address in [{"s":"raajat.agarwal@gmail.com","m":"email","c":""}]
- **7.AR.021** (Arrival source; from whatsapp (no referrer) | query: utm with e-mail inside | page /)
  - no e-mail address or phone number leaves the browser: e-mail address in [{"s":"raajat.agarwal@gmail.com","m":"email","c":""}]
- **7.AR.022** (Arrival source; from whatsapp (no referrer) | query: utm with e-mail inside | page /pricing)
  - no e-mail address or phone number leaves the browser: e-mail address in [{"s":"raajat.agarwal@gmail.com","m":"email","c":""}]
- **7.AR.035** (Arrival source; from linkedin | query: utm with e-mail inside | page /)
  - no e-mail address or phone number leaves the browser: e-mail address in [{"s":"raajat.agarwal@gmail.com","m":"email","c":""}]
- **7.AR.036** (Arrival source; from linkedin | query: utm with e-mail inside | page /pricing)
  - no e-mail address or phone number leaves the browser: e-mail address in [{"s":"raajat.agarwal@gmail.com","m":"email","c":""}]
- **7.AR.049** (Arrival source; from lnkd.in | query: utm with e-mail inside | page /)
  - no e-mail address or phone number leaves the browser: e-mail address in [{"s":"raajat.agarwal@gmail.com","m":"email","c":""}]
- **7.AR.050** (Arrival source; from lnkd.in | query: utm with e-mail inside | page /pricing)
  - no e-mail address or phone number leaves the browser: e-mail address in [{"s":"raajat.agarwal@gmail.com","m":"email","c":""}]
- **7.AR.063** (Arrival source; from facebook | query: utm with e-mail inside | page /)
  - no e-mail address or phone number leaves the browser: e-mail address in [{"s":"raajat.agarwal@gmail.com","m":"email","c":""}]
- **7.AR.064** (Arrival source; from facebook | query: utm with e-mail inside | page /pricing)
  - no e-mail address or phone number leaves the browser: e-mail address in [{"s":"raajat.agarwal@gmail.com","m":"email","c":""}]
- **7.AR.077** (Arrival source; from google | query: utm with e-mail inside | page /)
  - no e-mail address or phone number leaves the browser: e-mail address in [{"s":"raajat.agarwal@gmail.com","m":"email","c":""}]
- **7.AR.078** (Arrival source; from google | query: utm with e-mail inside | page /pricing)
  - no e-mail address or phone number leaves the browser: e-mail address in [{"s":"raajat.agarwal@gmail.com","m":"email","c":""}]
- **8.BF.01** (Back / forward; phone | retro)
  - the tracker saw each page load once, in order (/, /games, /pricing, /games, /, /games): ["/","/games"]
- **8.BF.02** (Back / forward; phone | modern)
  - the tracker saw each page load once, in order (/, /games, /pricing, /games, /, /games): ["/games"]
- **8.BF.03** (Back / forward; tablet | retro)
  - the tracker saw each page load once, in order (/, /games, /pricing, /games, /, /games): ["/","/games"]
- **8.BF.04** (Back / forward; tablet | modern)
  - the tracker saw each page load once, in order (/, /games, /pricing, /games, /, /games): ["/games"]
- **8.BF.05** (Back / forward; laptop | retro)
  - the tracker saw each page load once, in order (/, /games, /pricing, /games, /, /games): ["/","/pricing","/games"]
- **8.BF.06** (Back / forward; laptop | modern)
  - the tracker saw each page load once, in order (/, /games, /pricing, /games, /, /games): ["/","/games"]
- **9.OF.phone** (Offline then online; phone)
  - offline: /terms (the legal page) also opens for a returning visitor: shows the offline page: {"h1":"You are offline.","t":"You are offline | Corporate Games"}
- **9.OF.laptop** (Offline then online; laptop)
  - offline: /terms (the legal page) also opens for a returning visitor: shows the offline page: {"h1":"You are offline.","t":"You are offline | Corporate Games"}
- **11.CP.01** (Cookies and click path; normal | phone)
  - page views recorded in order: ["/","/games","/pricing"]
- **11.CP.02** (Cookies and click path; normal | laptop)
  - page views recorded in order: ["/","/games","/pricing"]
- **11.CP.03** (Cookies and click path; decline signal (GPC) | phone)
  - decline: nothing about the navigation is sent (the privacy page says no navigation data is collected): 4 events sent, e.g. [{"k":"pv","p":"/"},{"k":"exit","n":"","m":75,"x":5,"p":"/"},{"k":"pv","p":"/pricing"}]
- **11.CP.04** (Cookies and click path; decline signal (GPC) | laptop)
  - decline: nothing about the navigation is sent (the privacy page says no navigation data is collected): 6 events sent, e.g. [{"k":"pv","p":"/"},{"k":"exit","n":"","m":180,"x":8,"p":"/"},{"k":"pv","p":"/games"}]
- **11.CP.05** (Cookies and click path; do not track | phone)
  - decline: nothing about the navigation is sent (the privacy page says no navigation data is collected): 4 events sent, e.g. [{"k":"pv","p":"/"},{"k":"exit","n":"","m":92,"x":5,"p":"/"},{"k":"pv","p":"/pricing"}]
- **11.CP.06** (Cookies and click path; do not track | laptop)
  - decline: nothing about the navigation is sent (the privacy page says no navigation data is collected): 8 events sent, e.g. [{"k":"pv","p":"/"},{"k":"exit","n":"","m":184,"x":8,"p":"/"},{"k":"pv","p":"/games"}]
- **11.CP.07** (Cookies and click path; storage blocked | phone)
  - page views recorded in order: ["/","/pricing"]
- **11.CP.08** (Cookies and click path; storage blocked | laptop)
  - page views recorded in order: ["/","/games","/pricing"]
- **6.DL.signin-guesses** (Deep links; addresses an organizer might type)
  - /login reaches the console sign-in in one step (redirect): 404 (shows the 404 page, which has a Sign in link)
  - /signin reaches the console sign-in in one step (redirect): 404 (shows the 404 page, which has a Sign in link)
  - /sign-in reaches the console sign-in in one step (redirect): 404 (shows the 404 page, which has a Sign in link)
  - /console reaches the console sign-in in one step (redirect): 404 (shows the 404 page, which has a Sign in link)
- **12.SEO.for-hr** (SEO; for-hr)
  - description present, 50 to 155 characters: 169
- **12.SEO.index** (SEO; index)
  - ItemList lists every game the page shows (six, Lucky Draw included): ItemList has 5 games: Corporate Tambola, Corporate Bingo, Corporate Tic Tac Toe, Corporate Snakes and Ladders, Corporate Luck by Chance
- **15.AX.001** (Accessibility (axe-core); 404 | phone | light | retro)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.002** (Accessibility (axe-core); 404 | phone | light | modern)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.003** (Accessibility (axe-core); 404 | phone | dark | retro)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.004** (Accessibility (axe-core); 404 | phone | dark | modern)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.009** (Accessibility (axe-core); contact | phone | light | retro)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.010** (Accessibility (axe-core); contact | phone | light | modern)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.011** (Accessibility (axe-core); contact | phone | dark | retro)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.012** (Accessibility (axe-core); contact | phone | dark | modern)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.017** (Accessibility (axe-core); for-hr | phone | light | retro)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.018** (Accessibility (axe-core); for-hr | phone | light | modern)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.019** (Accessibility (axe-core); for-hr | phone | dark | retro)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.020** (Accessibility (axe-core); for-hr | phone | dark | modern)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.025** (Accessibility (axe-core); games | phone | light | retro)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.026** (Accessibility (axe-core); games | phone | light | modern)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.027** (Accessibility (axe-core); games | phone | dark | retro)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.028** (Accessibility (axe-core); games | phone | dark | modern)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.033** (Accessibility (axe-core); games-for-hr-teams | phone | light | retro)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.034** (Accessibility (axe-core); games-for-hr-teams | phone | light | modern)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.035** (Accessibility (axe-core); games-for-hr-teams | phone | dark | retro)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.036** (Accessibility (axe-core); games-for-hr-teams | phone | dark | modern)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.041** (Accessibility (axe-core); how-it-works | phone | light | retro)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.042** (Accessibility (axe-core); how-it-works | phone | light | modern)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.043** (Accessibility (axe-core); how-it-works | phone | dark | retro)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.044** (Accessibility (axe-core); how-it-works | phone | dark | modern)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.049** (Accessibility (axe-core); index | phone | light | retro)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.050** (Accessibility (axe-core); index | phone | light | modern)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.051** (Accessibility (axe-core); index | phone | dark | retro)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.052** (Accessibility (axe-core); index | phone | dark | modern)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.057** (Accessibility (axe-core); offline | phone | light | retro)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.058** (Accessibility (axe-core); offline | phone | light | modern)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.059** (Accessibility (axe-core); offline | phone | dark | retro)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.060** (Accessibility (axe-core); offline | phone | dark | modern)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.065** (Accessibility (axe-core); pricing | phone | light | retro)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.066** (Accessibility (axe-core); pricing | phone | light | modern)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.067** (Accessibility (axe-core); pricing | phone | dark | retro)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.068** (Accessibility (axe-core); pricing | phone | dark | modern)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.073** (Accessibility (axe-core); privacy | phone | light | retro)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.074** (Accessibility (axe-core); privacy | phone | light | modern)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.075** (Accessibility (axe-core); privacy | phone | dark | retro)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.076** (Accessibility (axe-core); privacy | phone | dark | modern)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.081** (Accessibility (axe-core); terms | phone | light | retro)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.082** (Accessibility (axe-core); terms | phone | light | modern)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.083** (Accessibility (axe-core); terms | phone | dark | retro)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.084** (Accessibility (axe-core); terms | phone | dark | modern)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.089** (Accessibility (axe-core); virtual-team-building-games | phone | light | retro)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.090** (Accessibility (axe-core); virtual-team-building-games | phone | light | modern)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.091** (Accessibility (axe-core); virtual-team-building-games | phone | dark | retro)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **15.AX.092** (Accessibility (axe-core); virtual-team-building-games | phone | dark | modern)
  - no serious, critical or moderate violation: moderate:region x1 .tabbar
- **17.PR.01** (Prices; all pages + llms + JSON-LD)
  - the six game links on the pricing page go to six different game pages (they are said to be each game's own page): 6 links, 1 different address(es): https://console.corporatetambola.com/#/create
