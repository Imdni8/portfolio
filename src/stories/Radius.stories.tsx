import type { Meta, StoryObj } from '@storybook/react-vite';
import { Page, Group, Row, Name, Num, readToken, toPx } from './_shared';

const STEPS = ['none', 'xxs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', 'full'];

const meta: Meta = {
	title: 'Foundations/Radius',
	parameters: { layout: 'fullscreen' },
};
export default meta;

export const Scale: StoryObj = {
	render: () => (
		<Page
			title="Radius"
			lede="Eleven rungs. A limited, pre-defined set is the point — it is what stops eleven slightly different corner treatments appearing across a codebase."
		>
			<Group
				label="Scale"
				note="Shares its first five rungs with spacing, then diverges: radius grows in 2px steps where spacing switches to 4px. radius-lg is 10px, spacing-lg is 12px — they are not interchangeable above md."
			>
				<div>
					<Row>
						<span className="type-overline" style={{ color: 'var(--text-muted)' }}>
							Name
						</span>
						<span className="type-overline" style={{ color: 'var(--text-muted)' }}>
							rem
						</span>
						<span className="type-overline" style={{ color: 'var(--text-muted)' }}>
							px
						</span>
						<span className="type-overline" style={{ color: 'var(--text-muted)' }}>
							Radius
						</span>
					</Row>
					{STEPS.map((step) => {
						const value = readToken(`--radius-${step}`);
						return (
							<Row key={step}>
								<Name>{`--radius-${step}`}</Name>
								<Num>{value}</Num>
								<Num>{toPx(value)}</Num>
								{/* Only the top-left corner is drawn: it reads the curve more
								    honestly than a fully rounded box, where four corners at a
								    small radius are hard to tell apart. */}
								<span
									style={{
										display: 'block',
										width: '100%',
										maxWidth: '13rem',
										height: '3.5rem',
										background: 'var(--primary-subtle)',
										borderTop: '2px solid var(--primary-text)',
										borderLeft: '2px solid var(--primary-text)',
										borderTopLeftRadius: value,
									}}
								/>
							</Row>
						);
					})}
				</div>
			</Group>
		</Page>
	),
};
