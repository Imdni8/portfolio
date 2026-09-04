/// <reference types="astro/client" />

/* Typed so `npm run check` can catch a renamed or missing variable rather than
   handing back `any`. Only PUBLIC_-prefixed vars can appear here: the site is
   static output with no server runtime, so nothing else is readable at all.

   Both declared optional (`?`) on purpose — they genuinely can be absent, since
   `.env` is gitignored and a deploy host that hasn't been told about them will
   build without them. Typing the key as a plain `string` would let the
   missing-key guard in src/components/analytics/analytics.ts look like dead
   code; typing the host as one would do the same to its `??` fallback. */
interface ImportMetaEnv {
	readonly PUBLIC_POSTHOG_KEY?: string;
	readonly PUBLIC_POSTHOG_HOST?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
