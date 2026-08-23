/// <reference types="astro/client" />

/* Typed so `npm run check` can catch a renamed or missing variable rather than
   handing back `any`. Only PUBLIC_-prefixed vars can appear here: the site is
   static output with no server runtime, so nothing else is readable at all.

   Declared optional (`?`) on purpose — the var genuinely can be absent, since
   `.env` is gitignored and a deploy host that hasn't been told about it will
   build without one. Typing it as a plain `string` would let the missing-key
   guard in src/components/analytics/analytics.ts look like dead code. */
interface ImportMetaEnv {
	readonly PUBLIC_AMPLITUDE_API_KEY?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
