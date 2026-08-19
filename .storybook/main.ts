import { mergeConfig } from 'vite';
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
	// Scoped to src/stories, not src/**. A broader glob swallows the case-study
	// MDX in src/content/work and lists it as if it were documentation.
	// Add '../src/stories/**/*.mdx' here when there are prose docs pages to
	// pick up; listing it while none exist just warns on every start.
	stories: ['../src/stories/**/*.stories.@(ts|tsx)'],

	framework: {
		name: '@storybook/react-vite',
		options: {},
	},

	core: {
		// Storybook phones home on every start by default. Off.
		disableTelemetry: true,
	},

	viteFinal: async (config) =>
		mergeConfig(config, {
			// React 19's CJS entry has no ESM default export. Under Vite 8 the
			// dep optimizer has to be told explicitly to pre-bundle it, or
			// Storybook's own preview modules fail to import React at runtime.
			optimizeDeps: {
				include: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
			},
			// Astro and Storybook must not each resolve their own React copy.
			resolve: { dedupe: ['react', 'react-dom'] },
		}),
};

export default config;
