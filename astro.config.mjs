// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';

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
});
