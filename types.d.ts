// Names the cookie-choice object that consent.js puts on the window, so gate.js and site.js can be checked against it.
interface Window { ctzConsent?: { get(): { v: number, comfort: boolean, on?: string, s?: number } | null, allows(what: "comfort"): boolean, open(): void } }
