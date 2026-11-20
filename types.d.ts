// Names the cookie-choice object that consent.js puts on the window, so gate.js can be checked against it.
interface Window { ctzConsent?: { get(): { v: number, comfort: boolean, on?: string } | null, allows(what: "comfort"): boolean, open(): void } }
