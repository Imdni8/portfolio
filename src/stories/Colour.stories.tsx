import type { Meta, StoryObj } from '@storybook/react-vite';
import { Page, Group, Name, readToken } from './_shared';

const STEPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

const SEMANTIC: Array<[string, string[]]> = [
	['Surface', ['bg', 'bg-raised', 'bg-sunken']],
	['Text', ['text', 'text-body', 'text-muted', 'text-disabled']],
	['Line', ['border', 'border-strong']],
	['Primary', ['primary', 'primary-hover', 'primary-active', 'primary-subtle', 'text-on-primary', 'primary-text', 'focus-ring']],
];

/** WCAG 2.1 relative luminance. Contrast is the whole reason this palette is
 *  shaped the way it is, so the story computes it rather than asserting it. */
const luminance = (hex: string): number => {
	const h = hex.replace('#', '');
	const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
	const [r, g, b] = [0, 2, 4].map((i) => {
		const c = parseInt(full.slice(i, i + 2), 16) / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string): number => {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
};

const Ramp = ({ name }: { name: string }) => (
	<div style={{ overflowX: 'auto' }}>
		<div
			style={{
				display: 'grid',
				gridTemplateColumns: `repeat(${STEPS.length}, minmax(5.5rem, 1fr))`,
				minWidth: '58rem',
				border: '1px solid var(--border)',
				borderRadius: 'var(--radius-sm)',
				overflow: 'hidden',
			}}
		>
			{STEPS.map((step) => {
				const hex = readToken(`--${name}-${step}`);
				const onBg = contrast(hex, readToken('--bg'));
				return (
					<div key={step} style={{ borderRight: '1px solid var(--border)' }}>
						<div style={{ height: '4rem', background: hex }} />
						<div
							style={{
								padding: 'var(--spacing-md)',
								background: 'var(--bg-raised)',
								display: 'grid',
								gap: '0.125rem',
							}}
						>
							<span className="type-annotation" style={{ color: 'var(--text)', fontWeight: 600 }}>
								{step}
							</span>
							<span
								className="type-annotation"
								style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.6875rem' }}
							>
								{hex.toUpperCase()}
							</span>
							<span
								className="type-annotation"
								style={{
									fontFamily: 'var(--font-mono)',
									fontSize: '0.6875rem',
									color: onBg >= 4.5 ? 'var(--text-body)' : 'var(--text-disabled)',
								}}
							>
								{onBg.toFixed(2)} {onBg >= 4.5 ? '✓' : '✕'}
							</span>
						</div>
					</div>
				);
			})}
		</div>
	</div>
);

const meta: Meta = {
	title: 'Foundations/Colour',
	parameters: { layout: 'fullscreen' },
};
export default meta;

export const Primitives: StoryObj = {
	render: () => (
		<Page
			title="Colour"
			lede="Two ramps and sixteen semantic tokens. Values are read from tokens.css at render time, so this page cannot drift from the stylesheet."
		>
			<Group
				label="Amber"
				note="Tailwind's amber ramp, unmodified. The ratio under each step is that colour as foreground against the current theme's bg — flip the theme toolbar and watch which half of the ramp becomes usable."
			>
				<Ramp name="amber" />
			</Group>
			<Group label="Slate grey" note="Custom. A cool cast that sits against the warm amber without going neutral-grey dead. No pure white, no pure black — gray-50 is the lightest value in the system.">
				<Ramp name="gray" />
			</Group>
		</Page>
	),
};

export const Semantic: StoryObj = {
	render: () => (
		<Page
			title="Semantic tokens"
			lede="What components are allowed to reference. Reaching past these to a primitive is how a design system rots."
		>
			{SEMANTIC.map(([label, tokens]) => (
				<Group key={label} label={label}>
					<div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
						{tokens.map((t) => (
							<div
								key={t}
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: 'var(--spacing-lg)',
									padding: 'var(--spacing-md) var(--spacing-lg) var(--spacing-md) var(--spacing-md)',
									background: 'var(--bg-raised)',
									border: '1px solid var(--border)',
									borderRadius: 'var(--radius-sm)',
								}}
							>
								<span
									style={{
										width: '1.75rem',
										height: '1.75rem',
										borderRadius: 'var(--radius-xs)',
										background: `var(--${t})`,
										border: '1px solid var(--border-strong)',
										flexShrink: 0,
									}}
								/>
								<span style={{ display: 'grid' }}>
									<Name>{`--${t}`}</Name>
									<span
										className="type-annotation"
										style={{
											fontFamily: 'var(--font-mono)',
											color: 'var(--text-muted)',
											fontSize: '0.6875rem',
											marginTop: '0.125rem',
										}}
									>
										{readToken(`--${t}`).toUpperCase()}
									</span>
								</span>
							</div>
						))}
					</div>
				</Group>
			))}
		</Page>
	),
};
