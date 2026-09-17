import type { Meta, StoryObj } from '@storybook/react-vite';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Icon } from '../components/ui/Icon';
import { Page, Group } from './_shared';

const meta = {
	title: 'Components/Button',
	component: Button,
	args: { children: 'View final solution', variant: 'default', size: 'default' },
	argTypes: {
		variant: { control: 'inline-radio', options: ['default', 'secondary', 'outline', 'ghost'] },
		size: { control: 'inline-radio', options: ['default', 'icon-sm', 'icon', 'icon-lg'] },
	},
} satisfies Meta<typeof Button>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

const Row = ({ children }: { children: React.ReactNode }) => (
	<div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-lg)', alignItems: 'center' }}>{children}</div>
);

export const Variants: Story = {
	parameters: { controls: { disable: true } },
	render: () => (
		<Page
			title="Button"
			lede="shadcn's Button, retuned onto the tokens. One text size. Default is the brand action; secondary is its equal-weight neutral counterpart; ghost recedes."
		>
			<Group
				label="Variants"
				note="The pairing from your frame: default + secondary, two equally weighted calls to action distinguished by hue rather than prominence. Secondary is white on both themes — the one place pure white appears, since the no-pure-white rule governs content rather than control surfaces."
			>
				<Row>
					<Button>
						View final solution
						<Icon name="play" />
					</Button>
					<Button variant="secondary">
						Read case study
						<Icon name="arrow-down" />
					</Button>
					<Button variant="ghost">Ghost</Button>
				</Row>
			</Group>

			<Group
				label="States"
				note="Hover and active are shown by interacting. Disabled drops to an outline rather than a dimmed fill — a greyed-out solid reads as a loading state to most people."
			>
				<Row>
					<Button>Enabled</Button>
					<Button disabled>Disabled</Button>
					<Button variant="secondary" disabled>
						Disabled secondary
					</Button>
				</Row>
			</Group>

			<Group
				label="Without icons"
				note="The icon is optional and decorative — Icon is aria-hidden, so the label alone has to carry the meaning."
			>
				<Row>
					<Button>Default</Button>
					<Button variant="secondary">Secondary</Button>
					<Button variant="ghost">Ghost</Button>
				</Row>
			</Group>
		</Page>
	),
};

export const IconOnly: Story = {
	name: 'Icon only',
	parameters: { controls: { disable: true } },
	render: () => (
		<Page
			title="Button · icon only"
			lede="The icon sizes replace the old IconButton. There's no visible label, so aria-label is required. Shape comes with the variant: ghost is a small square that sits inline in content; default and outline are circles that float over media."
		>
			<Group
				label="Variant × size"
				note="icon-sm is a 24px box, icon 40px, icon-lg 48px. Outline, not secondary, is the neutral icon button: it sits on media or a lightbox, so it reads against --bg rather than secondary's white fill."
			>
				<div style={{ display: 'grid', gap: 'var(--spacing-xl)' }}>
					{(['default', 'outline', 'ghost'] as const).map((variant) => (
						<div key={variant} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xl)' }}>
							{(['icon-sm', 'icon', 'icon-lg'] as const).map((size) => (
								<Button key={size} variant={variant} size={size} aria-label={`${variant} ${size}`}>
									<Icon name="close" />
								</Button>
							))}
						</div>
					))}
				</div>
			</Group>

			<Group label="In use" note="Where each ships: an alert's dismiss, a lightbox's close, and a video poster's play.">
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-4xl)', alignItems: 'center' }}>
					<div style={{ display: 'grid', justifyItems: 'center', gap: 'var(--spacing-md)' }}>
						<Alert style={{ width: '14rem' }}>
							<AlertTitle>Dismissible</AlertTitle>
							<AlertDescription>A tooltip.</AlertDescription>
							<AlertAction>
								<Button variant="ghost" size="icon-sm" aria-label="Dismiss">
									<Icon name="close" />
								</Button>
							</AlertAction>
						</Alert>
						<span className="type-annotation" style={{ color: 'var(--text-muted)' }}>
							ghost · icon-sm — Alert
						</span>
					</div>
					<div style={{ display: 'grid', justifyItems: 'center', gap: 'var(--spacing-md)' }}>
						<div
							style={{
								position: 'relative',
								background: 'var(--gray-950)',
								borderRadius: 'var(--radius-md)',
								width: '10rem',
								height: '4rem',
							}}
						>
							<Button
								variant="outline"
								size="icon"
								aria-label="Close"
								style={{ position: 'absolute', top: 'var(--spacing-md)', right: 'var(--spacing-md)' }}
							>
								<Icon name="close" />
							</Button>
						</div>
						<span className="type-annotation" style={{ color: 'var(--text-muted)' }}>
							outline · icon — Lightbox
						</span>
					</div>
					<div style={{ display: 'grid', justifyItems: 'center', gap: 'var(--spacing-md)' }}>
						<div
							style={{
								position: 'relative',
								background: 'var(--bg-media)',
								border: '1px solid var(--border)',
								borderRadius: 'var(--radius-md)',
								width: '10rem',
								height: '6rem',
							}}
						>
							<Button
								variant="default"
								size="icon-lg"
								aria-label="Play"
								style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
							>
								<Icon name="play" />
							</Button>
						</div>
						<span className="type-annotation" style={{ color: 'var(--text-muted)' }}>
							default · icon-lg — Video poster
						</span>
					</div>
				</div>
			</Group>
		</Page>
	),
};
