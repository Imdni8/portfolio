import type { Meta, StoryObj } from '@storybook/react-vite';
import { Page, Group, Row, Name, Num, readToken, toPx } from './_shared';

const STEPS = [
	'none', 'xxs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl',
	'5xl', '6xl', '7xl', '8xl', '9xl', '10xl', '11xl',
];

const meta: Meta = {
	title: 'Foundations/Spacing',
	parameters: { layout: 'fullscreen' },
};
export default meta;

export const Scale: StoryObj = {
	render: () => (
		<Page
			title="Spacing"
			lede="Seventeen rungs for gaps, padding and margin. Authored in rem, so the whole system responds to a reader who has turned their browser font size up."
		>
			<Group
				label="Scale"
				note="Steps 2px to md, then 4px to 3xl, then widening intervals — the large end is for page rhythm, not component internals. Bars are drawn at true size; the scale runs to 160px, so the last few will overflow narrow viewports and scroll."
			>
				<div style={{ overflowX: 'auto' }}>
					<div style={{ minWidth: '44rem' }}>
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
								Spacing
							</span>
						</Row>
						{STEPS.map((step) => {
							const value = readToken(`--spacing-${step}`);
							return (
								<Row key={step}>
									<Name>{`--spacing-${step}`}</Name>
									<Num>{value}</Num>
									<Num>{toPx(value)}</Num>
									{/* Drawn as a measured span with end ticks rather than a solid
									    block — spacing is a distance between things, and a filled
									    bar reads as an object instead. */}
									<span style={{ display: 'flex', alignItems: 'center', height: '1.25rem' }}>
										<span style={{ width: '2px', height: '100%', background: 'var(--primary-text)' }} />
										<span
											style={{
												width: value,
												height: '2px',
												background: 'var(--primary-text)',
												opacity: 0.55,
											}}
										/>
										<span style={{ width: '2px', height: '100%', background: 'var(--primary-text)' }} />
									</span>
								</Row>
							);
						})}
					</div>
				</div>
			</Group>
		</Page>
	),
};
