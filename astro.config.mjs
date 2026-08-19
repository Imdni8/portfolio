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
});
