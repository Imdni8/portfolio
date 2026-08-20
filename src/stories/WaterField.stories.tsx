import type { Meta, StoryObj } from '@storybook/react-vite';
import { WaterField } from '../components/ui/WaterField';

/**
 * Move the cursor across the field. A stroke drops a wave packet every few
 * pixels of travel; each one opens outward, spreads and fades, and the grid
 * and the fluid both bend through it because all three read one displacement.
 */
const meta = {
	title: 'Components/Water field',
	component: WaterField,
	parameters: { layout: 'fullscreen' },
	argTypes: {
		grid: { control: { type: 'range', min: 0, max: 160, step: 4 } },
		intensity: { control: { type: 'range', min: 0, max: 1, step: 0.05 } },
		maxDpr: { control: { type: 'range', min: 0.5, max: 3, step: 0.25 } },
	},
	args: { grid: 72, intensity: 1 },
	decorators: [
		(Story) => (
			<div style={{ position: 'relative', isolation: 'isolate', height: '32rem' }}>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof WaterField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Behind copy the fluid has to give way — half intensity, no grid. */
export const BehindText: Story = {
	args: { grid: 0, intensity: 0.5 },
	decorators: [
		(Story) => (
			<div
				style={{
					position: 'relative',
					isolation: 'isolate',
					height: '32rem',
					display: 'grid',
					alignContent: 'center',
					padding: 'var(--spacing-8xl)',
					boxSizing: 'border-box',
				}}
			>
				<Story />
				<div style={{ position: 'relative', display: 'grid', gap: 'var(--spacing-lg)', maxWidth: '34rem' }}>
					<p className="type-overline">Foundations</p>
					<h2 className="type-title" style={{ color: 'var(--text)' }}>
						Amber &amp; Slate
					</h2>
					<p className="type-subtitle" style={{ color: 'var(--text-body)' }}>
						The field reads its ground, its ribbons and its light out of tokens.css, so it
						follows the theme toolbar without being told.
					</p>
				</div>
			</div>
		),
	],
};

/** The grid alone, with the fluid off — the clearest read on the refraction. */
export const GridOnly: Story = {
	args: { grid: 56, intensity: 0 },
};
