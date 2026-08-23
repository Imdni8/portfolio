import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Page, Group } from './_shared';

const meta = {
	title: 'Components/Button',
	component: Button,
	args: { children: 'View final solution', variant: 'primary' },
	argTypes: {
		variant: { control: 'inline-radio', options: ['primary', 'secondary', 'tertiary'] },
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
			lede="Three variants, one size. Primary is the brand action; secondary is its equal-weight neutral counterpart; tertiary recedes."
		>
			<Group
				label="Variants"
				note="The pairing from your frame: primary + secondary, two equally weighted calls to action distinguished by hue rather than prominence. Secondary is white on both themes — the one place pure white appears, since the no-pure-white rule governs content rather than control surfaces."
			>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-lg)', alignItems: 'center' }}>
					<Button variant="primary" icon={<Icon name="play" />}>
						View final solution
					</Button>
					<Button variant="secondary" icon={<Icon name="arrow-down" />}>
						Read case study
					</Button>
					<Button variant="tertiary">Tertiary</Button>
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
					<Button variant="tertiary">Tertiary</Button>
				</div>
			</Group>
		</Page>
	),
};
