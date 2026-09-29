import type { Meta, StoryObj } from '@storybook/react-vite';
import { GradientBlinds } from '../components/ui/GradientBlinds';
import { BLINDS } from '../components/ui/gradient-blinds';

/**
 * The homepage background: straight bands of light across the top of the
 * screen, coloured from the `--blinds-*` stops and hard-lit onto
 * `--home-ground` — which is why the decorator paints that ground rather than
 * the page's `--bg`. Move the pointer over it to steer the spotlight.
 *
 * `maskEnd` and the spotlight decide how bright the ground under the
 * homepage headline can get — re-measure its contrast after changing either.
 */
const meta = {
	title: 'Components/Gradient blinds',
	component: GradientBlinds,
	parameters: { layout: 'fullscreen' },
	argTypes: {
		blindCount: { control: { type: 'range', min: 1, max: 64, step: 1 } },
		blindMinWidth: { control: { type: 'range', min: 10, max: 160, step: 2 } },
		spotlightRadius: { control: { type: 'range', min: 0.1, max: 1.5, step: 0.01 } },
		spotlightSoftness: { control: { type: 'range', min: 0.2, max: 4, step: 0.05 } },
		spotlightOpacity: { control: { type: 'range', min: 0, max: 2, step: 0.05 } },
		maskEnd: { control: { type: 'range', min: 0.1, max: 1, step: 0.01 } },
		interactive: { control: 'boolean' },
	},
	args: {
		blindCount: BLINDS.blindCount,
		blindMinWidth: BLINDS.blindMinWidth,
		spotlightRadius: BLINDS.spotlightRadius,
		spotlightSoftness: BLINDS.spotlightSoftness,
		spotlightOpacity: BLINDS.spotlightOpacity,
		maskEnd: BLINDS.maskEnd,
		interactive: true,
	},
	decorators: [
		(Story) => (
			<div
				style={{
					position: 'relative',
					isolation: 'isolate',
					height: '48rem',
					background: 'var(--home-ground)',
				}}
			>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof GradientBlinds>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
