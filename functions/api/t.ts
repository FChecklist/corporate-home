// POST /api/t: this site's own first-party visit beacon (collector in ../_analytics/core.ts, a byte-for-byte copy of site-analytics/src/core.ts).
// Needs the D1 binding ANALYTICS (see the comment in wrangler.toml) and the Pages secret ANALYTICS_KEY. Without the binding it answers 404 and does nothing.
import { collect, type AEnv } from "../_analytics/core";

export const onRequest = (ctx: { request: Request; env: AEnv }) => collect(ctx.request, ctx.env, Date.now());
