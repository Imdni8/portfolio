import type { Meta, StoryObj } from '@storybook/react-vite';
import { Icon } from '../components/ui/Icon';
import { icons, type IconName } from '../components/ui/icons';
import { Page, Group, Name } from './_shared';

const meta = {
	title: 'Components/Icon',
	component: Icon,
	args: { name: 'close' },
	argTypes: {
		name: { control: 'inline-radio', options: Object.keys(icons) },
	},
} satisfies Meta<typeof Icon>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Library: Story = {
	parameters: { controls: { disable: true } },
	render: () => (
		<Page
			title="Icon"
			lede="Sourced unmodified from Lucide — one 24×24 grid, one 2px stroke weight, no mixing filled and outlined marks. Add one by importing its raw SVG into icons.ts."
		>
			<Group label="Set" note="Every icon currently registered. .icon rides at 1em, so it tracks whatever text size sits beside it unless a component (like IconButton) sets one explicitly.">
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-4xl)' }}>
					{(Object.keys(icons) as IconName[]).map((name) => (
						<div key={name} style={{ display: 'grid', justifyItems: 'center', gap: 'var(--spacing-md)' }}>
							<div
								style={{
									display: 'grid',
									placeItems: 'center',
									width: 'var(--spacing-8xl)',
									height: 'var(--spacing-8xl)',
									border: '1px solid var(--border)',
									borderRadius: 'var(--radius-md)',
									color: 'var(--text)',
									fontSize: '1.5rem',
								}}
							>
								<Icon name={name} />
							</div>
							<Name>{name}</Name>
						</div>
					))}
				</div>
			</Group>
		</Page>
	),
};
