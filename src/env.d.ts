/// <reference types="astro/client" />

/* Typed so `npm run check` can catch a renamed or missing variable rather than
   handing back `any`. Only PUBLIC_-prefixed vars can appear here: the site is
   static output with no server runtime, so nothing else is readable at all.

   Declared optional (`?`) on purpose — it genuinely can be absent, since `.env`
   is gitignored and a deploy host that hasn't been told about it will build
   without one. Typing it as a plain `string` would let the missing-key guard in
   src/components/analytics/analytics.ts look like dead code.

   There is deliberately no host variable to go with it: events are sent to this
   site's own `/ingest` path, and the region lives in the rewrites backing that
   path — see vercel.json and the dev proxy in astro.config.mjs. */
interface ImportMetaEnv {
	readonly PUBLIC_POSTHOG_KEY?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
