# Smoke matrix results

Run 2026-11-20T13:13:23.057Z. 493 cells, 460 passed, 33 failed (5808 checks, 35 failed).

| Group | Cells | Pass | Fail |
|---|---:|---:|---:|
| First visit | 144 | 144 | 0 |
| Repeat visit: choices remembered | 12 | 12 | 0 |
| Repeat visit: tracker | 4 | 2 | 2 |
| Single login rule | 4 | 2 | 2 |
| Hand-off links | 12 | 12 | 0 |
| Hand-off click | 32 | 20 | 12 |
| Arrival source | 84 | 72 | 12 |
| Back / forward | 7 | 7 | 0 |
| Offline then online | 2 | 2 | 0 |
| JavaScript blocked | 36 | 36 | 0 |
| Slow network | 13 | 13 | 0 |
| Cookies and click path | 8 | 4 | 4 |
| Language | 6 | 6 | 0 |
| Deep links | 15 | 15 | 0 |
| SEO | 13 | 13 | 0 |
| version.json | 1 | 1 | 0 |
| Headers | 1 | 1 | 0 |
| Accessibility (axe-core) | 96 | 96 | 0 |
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
- **11.CP.03** (Cookies and click path; decline signal (GPC) | phone)
  - decline: nothing about the navigation is sent (the privacy page says no navigation data is collected): 9 events sent, e.g. [{"k":"pv","p":"/"},{"k":"exit","n":"","m":106,"x":5,"p":"/"},{"k":"pv","p":"/games"}]
- **11.CP.04** (Cookies and click path; decline signal (GPC) | laptop)
  - decline: nothing about the navigation is sent (the privacy page says no navigation data is collected): 9 events sent, e.g. [{"k":"pv","p":"/"},{"k":"exit","n":"","m":183,"x":8,"p":"/"},{"k":"pv","p":"/games"}]
- **11.CP.05** (Cookies and click path; do not track | phone)
  - decline: nothing about the navigation is sent (the privacy page says no navigation data is collected): 9 events sent, e.g. [{"k":"pv","p":"/"},{"k":"exit","n":"","m":114,"x":5,"p":"/"},{"k":"pv","p":"/games"}]
- **11.CP.06** (Cookies and click path; do not track | laptop)
  - decline: nothing about the navigation is sent (the privacy page says no navigation data is collected): 9 events sent, e.g. [{"k":"pv","p":"/"},{"k":"exit","n":"","m":201,"x":8,"p":"/"},{"k":"pv","p":"/games"}]
- **17.PR.01** (Prices; all pages + llms + JSON-LD)
  - the six game links on the pricing page go to six different game pages (they are said to be each game's own page): 6 links, 1 different address(es): https://console.corporatetambola.com/#/create
