import type { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from '../components/ui/badge';
import { Icon } from '../components/ui/Icon';
import type { IconName } from '../components/ui/icons';
import { Page, Group } from './_shared';

/** Badge takes its icon as a child; the Playground exposes it as a control. */
type Args = ComponentProps<typeof Badge> & { icon?: IconName };

const meta = {
	title: 'Components/Badge',
	component: Badge,
	args: { children: 'Redesign', icon: 'figma', variant: 'default' },
	argTypes: {
		variant: { control: 'inline-radio', options: ['default', 'coming-soon', 'ai'] },
		icon: { control: 'inline-radio', options: ['figma', 'code-xml', 'hourglass', 'sparkles'] },
		render: { table: { disable: true } },
	},
	render: ({ icon, children, ...args }) => (
		<Badge {...args}>
			{icon && <Icon name={icon} />}
			{children}
		</Badge>
	),
} satisfies Meta<Args>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** A badge's real ground is a card panel or a cover image, never the page —
    so every variant is shown over --bg-media as well as over --bg. */
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
			title="Badge"
			lede="shadcn's Badge, retuned onto the tokens with the old Tag's variants. A label, not a control — nothing here is clickable, focusable or stateful. It rides on a work card, which is what decides the rest: an opaque fill and its own border, so it stays legible over whatever is behind it."
		>
			<Group
				label="Default"
				note="Reads the semantic layer, so it flips with the theme. Used for the craft badges on a published card."
			>
				<Ground background="var(--bg)">
					<Badge>
						<Icon name="figma" />
						Redesign
					</Badge>
					<Badge>
						<Icon name="code-xml" />
						Contributed code
					</Badge>
				</Ground>
			</Group>

			<Group
				label="Coming soon"
				note="Bound to the amber ramp rather than the semantic layer, so it is identical in both themes — the image is its ground, not the page. gray-900 on amber-50 is 15.86:1. The state is never colour alone: it is the only badge carrying an hourglass, and the only badge on a card that has one."
			>
				<Ground background="var(--bg)">
					<Badge variant="coming-soon">
						<Icon name="hourglass" />
						Coming soon
					</Badge>
				</Ground>
			</Group>

			<Group
				label="AI"
				note="Driven by a card's `aiFeature` boolean, never by a role label — the chip says the project shipped an AI feature. Its border is a conic gradient rotating once every four seconds, painted into the border box while the fill stays --bg, so the label's contrast is the default badge's. The four hues are --ai-spectrum-*, the system's only sanctioned exception to amber-and-grey, and like Coming soon they do not flip with the theme. Under prefers-reduced-motion the sweep stops and the static ring stands."
			>
				<Ground background="var(--bg)">
					<Badge variant="ai">
						<Icon name="sparkles" />
						AI
					</Badge>
				</Ground>
			</Group>

			<Group label="On media" note="All three variants over --bg-media, the surface a card's cover falls back to.">
				<Ground background="var(--bg-media)">
					<Badge>
						<Icon name="figma" />
						Redesign
					</Badge>
					<Badge>
						<Icon name="code-xml" />
						Contributed code
					</Badge>
					<Badge variant="coming-soon">
						<Icon name="hourglass" />
						Coming soon
					</Badge>
					<Badge variant="ai">
						<Icon name="sparkles" />
						AI
					</Badge>
				</Ground>
			</Group>
		</Page>
	),
};
