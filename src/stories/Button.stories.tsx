import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../components/ui/Button';
import { Page, Group } from './_shared';

const PlayIcon = () => (
	<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
		<circle cx="10" cy="10" r="8" />
		<path d="M8.5 7l4 3-4 3V7z" fill="currentColor" stroke="none" />
	</svg>
);

const DownIcon = () => (
	<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
		<path d="M10 4v12M5 11l5 5 5-5" />
	</svg>
);

const meta = {
	title: 'Components/Button',
	component: Button,
	args: { children: 'View final solution', variant: 'primary' },
	argTypes: {
		variant: { control: 'inline-radio', options: ['primary', 'secondary', 'ghost'] },
		icon: { table: { disable: true } },
	},
} satisfies Meta<typeof Button>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
	parameters: { controls: { disable: true } },
	render: () => (
		<Page
			title="Button"
			lede="Three variants, one size. Primary is the brand action; secondary is its equal-weight neutral counterpart; ghost recedes."
		>
			<Group
				label="Variants"
				note="The pairing from your frame: primary + secondary, two equally weighted calls to action distinguished by hue rather than prominence. Secondary is white on both themes — the one place pure white appears, since the no-pure-white rule governs content rather than control surfaces."
			>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-lg)', alignItems: 'center' }}>
					<Button variant="primary" icon={<PlayIcon />}>
						View final solution
					</Button>
					<Button variant="secondary" icon={<DownIcon />}>
						Read case study
					</Button>
					<Button variant="ghost">Ghost</Button>
				</div>
			</Group>

			<Group
				label="States"
				note="Hover and active are shown by interacting. Disabled drops to an outline rather than a dimmed fill — a greyed-out solid reads as a loading state to most people."
			>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-lg)', alignItems: 'center' }}>
					<Button variant="primary">Default</Button>
					<Button variant="primary" disabled>
						Disabled
					</Button>
					<Button variant="secondary" disabled>
						Disabled
					</Button>
				</div>
			</Group>

			<Group
				label="Without icons"
				note="The icon is optional and decorative — it is marked aria-hidden, so the label alone has to carry the meaning."
			>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-lg)', alignItems: 'center' }}>
					<Button variant="primary">Primary</Button>
					<Button variant="secondary">Secondary</Button>
					<Button variant="ghost">Ghost</Button>
				</div>
			</Group>
		</Page>
	),
};
