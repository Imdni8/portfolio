import { fileURLToPath } from 'node:url';
import { mergeConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
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
			// The vendored shadcn components (ui/button.tsx, badge.tsx,
			// alert.tsx) are Tailwind utilities, and Astro registers this
			// plugin in its own config, which Storybook never reads.
			plugins: [tailwindcss()],
			resolve: {
				// Astro and Storybook must not each resolve their own React copy.
				dedupe: ['react', 'react-dom'],
				// tsconfig.json's `@/*` path, which the shadcn files import
				// through. Astro resolves it from tsconfig; Storybook's Vite
				// needs it spelled out.
				alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) },
			},
		}),
};

export default config;
