// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	site: 'https://tousifrahaman.com',
	integrations: [mdx(), react()],
	image: {
		// Screenshots are the payload of every case study — keep them sharp.
		responsiveStyles: true,
	},
	// <ClientRouter /> (SiteNav's Work<->About transition) turns this on by
	// default via `prefetch.prefetchAll`. Off: it raced the click-triggered
	// navigation and threw "InvalidStateError: Transition was aborted" from
	// a second, overlapping view transition — and the two pages are static
	// HTML anyway, with nothing prefetching would meaningfully speed up.
	prefetch: false,
	// Tailwind v4 has no PostCSS config of its own on Astro — it's a Vite
	// plugin. shadcn/ui components (starting with the nav) are styled with
	// Tailwind utilities; src/styles/tailwind.css is where its @theme maps
	// onto tokens.css's existing custom properties, not a parallel palette.
	vite: {
		plugins: [tailwindcss()],
		// Mirrors vercel.json's rewrites, so `api_host: '/ingest'` resolves in
		// dev exactly as it does on the deployed site. Without it every event
		// 404s against the dev server and analytics looks broken locally while
		// working in production — which is the confusing direction for that
		// failure to point. The two rule sets have to be edited together.
		server: {
			proxy: {
				// Ordered: the more specific prefix has to match first, since
				// Vite tests these as plain prefixes in insertion order.
				'/ingest/static': {
					target: 'https://eu-assets.i.posthog.com',
					changeOrigin: true,
					rewrite: (path) => path.replace(/^\/ingest\/static/, '/static'),
				},
				'/ingest': {
					target: 'https://eu.i.posthog.com',
					changeOrigin: true,
					rewrite: (path) => path.replace(/^\/ingest/, ''),
				},
			},
		},
	},
});
