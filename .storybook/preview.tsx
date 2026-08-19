import type { Preview } from '@storybook/react-vite';
import '../src/styles/tokens.css';
import '../src/styles/components.css';
import './preview.css';

/**
 * Dark is the product default, so it is the default here too.
 *
 * Two separate jobs, deliberately not merged:
 *
 * 1. `data-theme` goes on <html>, because that is the switch the shipped
 *    tokens key off (`:root[data-theme=...]`). Setting it anywhere else would
 *    mean changing tokens.css to suit Storybook, which is backwards.
 *
 * 2. A wrapper paints `--bg`. Storybook applies its own canvas background to
 *    the preview body, which wins over anything we put on `body` — so rather
 *    than escalating specificity, the story draws its own ground. This also
 *    matches reality: on the site it is a page element that carries the
 *    background, not the user agent.
 *
 * Setting the attribute explicitly (rather than leaving it unset) keeps the
 * preview off the developer's OS preference, so a story looks the same on
 * every machine.
 */
const preview: Preview = {
	parameters: {
		controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
		// Storybook's stock black/white swatches would misrepresent every
		// contrast decision in this palette. The theme toolbar is the control.
		backgrounds: { disable: true },
		layout: 'fullscreen',
	},
	globalTypes: {
		theme: {
			description: 'Colour theme',
			toolbar: {
				title: 'Theme',
				icon: 'contrast',
				items: [
					{ value: 'dark', title: 'Dark', icon: 'moon' },
					{ value: 'light', title: 'Light', icon: 'sun' },
				],
				dynamicTitle: true,
			},
		},
	},
	initialGlobals: { theme: 'dark' },
	decorators: [
		(Story, context) => {
			const theme = context.globals.theme ?? 'dark';
			document.documentElement.setAttribute('data-theme', theme);
			return (
				<div
					style={{
						background: 'var(--bg)',
						color: 'var(--text-body)',
						fontFamily: 'var(--font-sans)',
						minHeight: '100vh',
						padding: 'var(--spacing-4xl)',
						boxSizing: 'border-box',
					}}
				>
					<Story />
				</div>
			);
		},
	],
};

export default preview;
