import type { Meta, StoryObj } from '@storybook/react-vite';
import { IconButton } from '../components/ui/IconButton';
import { Icon } from '../components/ui/Icon';
import { Page, Group } from './_shared';

const meta = {
	title: 'Components/IconButton',
	component: IconButton,
	args: { icon: <Icon name="close" />, label: 'Close', variant: 'tertiary', size: 'md' },
	argTypes: {
		variant: { control: 'inline-radio', options: ['primary', 'secondary', 'tertiary'] },
		size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
		icon: { table: { disable: true } },
	},
} satisfies Meta<typeof IconButton>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
	parameters: { controls: { disable: true } },
	render: () => (
		<Page
			title="IconButton"
			lede="The icon-only counterpart to Button — no visible label, so label becomes aria-label. Same primary/secondary/tertiary vocabulary; shape and size are its own."
		>
			<Group label="Variant × size" note="Tertiary is square (it sits inline in flowing content); primary and secondary are circles (they float over media).">
				<div style={{ display: 'grid', gap: 'var(--spacing-xl)' }}>
					{(['primary', 'secondary', 'tertiary'] as const).map((variant) => (
						<div key={variant} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xl)' }}>
							{(['sm', 'md', 'lg'] as const).map((size) => (
								<IconButton key={size} variant={variant} size={size} icon={<Icon name="close" />} label={`${variant} ${size}`} />
							))}
						</div>
					))}
				</div>
			</Group>

			<Group label="In use" note="The three places this ships today: a note's dismiss control, a lightbox's close control, and a video poster's play control.">
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-4xl)', alignItems: 'center' }}>
					<div style={{ display: 'grid', justifyItems: 'center', gap: 'var(--spacing-md)' }}>
						<div style={{ position: 'relative', background: 'var(--primary-subtle)', border: '1px solid var(--primary-text)', borderRadius: 'var(--radius-md)', width: '10rem', height: '4rem' }}>
							<IconButton variant="tertiary" size="sm" icon={<Icon name="close" />} label="Dismiss" style={{ position: 'absolute', top: 'var(--spacing-md)', right: 'var(--spacing-md)' }} />
						</div>
						<span className="type-annotation" style={{ color: 'var(--text-muted)' }}>tertiary · sm — Note</span>
					</div>
					<div style={{ display: 'grid', justifyItems: 'center', gap: 'var(--spacing-md)' }}>
						<div style={{ position: 'relative', background: 'var(--gray-950)', borderRadius: 'var(--radius-md)', width: '10rem', height: '4rem' }}>
							<IconButton variant="secondary" size="md" icon={<Icon name="close" />} label="Close" style={{ position: 'absolute', top: 'var(--spacing-md)', right: 'var(--spacing-md)' }} />
						</div>
						<span className="type-annotation" style={{ color: 'var(--text-muted)' }}>secondary · md — Lightbox</span>
					</div>
					<div style={{ display: 'grid', justifyItems: 'center', gap: 'var(--spacing-md)' }}>
						<div style={{ position: 'relative', background: 'var(--bg-media)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', width: '10rem', height: '6rem' }}>
							<IconButton
								variant="primary"
								size="lg"
								icon={<Icon name="play" />}
								label="Play"
								style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
							/>
						</div>
						<span className="type-annotation" style={{ color: 'var(--text-muted)' }}>primary · lg — Video poster</span>
					</div>
				</div>
			</Group>
		</Page>
	),
};
