import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tag } from '../components/ui/Tag';
import { Page, Group } from './_shared';

const meta = {
	title: 'Components/Tag',
	component: Tag,
	args: { children: 'Redesign', icon: 'figma', variant: 'default' },
	argTypes: {
		variant: { control: 'inline-radio', options: ['default', 'coming-soon'] },
		icon: { control: 'inline-radio', options: ['figma', 'code-xml', 'hourglass'] },
	},
} satisfies Meta<typeof Tag>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** The tag's real ground is a cover image, never the page — so both variants
    are shown over --bg-media as well as over --bg. */
const Ground = ({ background, children }: { background: string; children: React.ReactNode }) => (
	<div
		style={{
			display: 'flex',
			flexWrap: 'wrap',
			alignItems: 'center',
			gap: 'var(--spacing-xl)',
			padding: 'var(--spacing-3xl)',
			background,
			border: '1px solid var(--border)',
			borderRadius: 'var(--radius-md)',
		}}
	>
		{children}
	</div>
);

export const Variants: Story = {
	parameters: { controls: { disable: true } },
	render: () => (
		<Page
			title="Tag"
			lede="A label, not a control — nothing here is clickable, focusable or stateful. It rides on top of a work card's cover image, which is what decides the rest: an opaque fill and its own border, so it stays legible over whatever is behind it."
		>
			<Group
				label="Default"
				note="Reads the semantic layer, so it flips with the theme. Used for the craft tags on a published card."
			>
				<Ground background="var(--bg)">
					<Tag icon="figma">Redesign</Tag>
					<Tag icon="code-xml">Contributed code</Tag>
				</Ground>
			</Group>

			<Group
				label="Coming soon"
				note="Bound to the amber ramp rather than the semantic layer, so it is identical in both themes — the image is its ground, not the page. gray-900 on amber-50 is 15.86:1. The state is never colour alone: it is the only tag carrying an hourglass, and the only tag on a card that has one."
			>
				<Ground background="var(--bg)">
					<Tag icon="hourglass" variant="coming-soon">
						Coming soon
					</Tag>
				</Ground>
			</Group>

			<Group label="On media" note="Both variants over --bg-media, the surface a card's cover falls back to.">
				<Ground background="var(--bg-media)">
					<Tag icon="figma">Redesign</Tag>
					<Tag icon="code-xml">Contributed code</Tag>
					<Tag icon="hourglass" variant="coming-soon">
						Coming soon
					</Tag>
				</Ground>
			</Group>
		</Page>
	),
};
