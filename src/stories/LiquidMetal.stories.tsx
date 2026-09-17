import type { Meta, StoryObj } from '@storybook/react-vite';
import { LiquidMetal } from '../components/ui/LiquidMetal';

/**
 * The homepage background. The shader draws a colourless chrome diamond; the
 * amber comes from soft-lighting it onto `--home-ground`, which is why the
 * decorator paints that ground rather than the page's `--bg`. On a cool
 * ground the same shader comes out grey — see liquid-metal.ts.
 *
 * `scale` changes how much of the viewport the glow covers, and with it the
 * brightest ground the homepage headline can land on — re-measure its
 * contrast after changing it.
 */
const meta = {
	title: 'Components/Liquid metal',
	component: LiquidMetal,
	parameters: { layout: 'fullscreen' },
	argTypes: {
		speed: { control: { type: 'range', min: 0, max: 2, step: 0.02 } },
		scale: { control: { type: 'range', min: 0.1, max: 1.5, step: 0.02 } },
	},
	args: { speed: 0.34, scale: 0.36 },
	decorators: [
		(Story) => (
			<div
				style={{
					position: 'relative',
					isolation: 'isolate',
					height: '40rem',
					background: 'var(--home-ground)',
				}}
			>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof LiquidMetal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
