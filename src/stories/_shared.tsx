import type { ReactNode } from 'react';

/**
 * Every foundation story reads its values out of the live stylesheet rather
 * than restating them. A story that hardcodes `#f59e0b` is a second source of
 * truth, and the day someone edits tokens.css the docs quietly start lying.
 * Reading at render time also means the swatches follow the theme toolbar for
 * free, because the custom properties resolve differently under [data-theme].
 */
export const readToken = (name: string): string =>
	getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** rem values are authored against a 16px base; show px too, since that is
 *  what anyone comparing against Figma will be holding in their head. */
export const toPx = (value: string): string => {
	if (value.endsWith('rem')) return `${parseFloat(value) * 16}px`;
	if (value === '9999px') return '∞';
	return value;
};

export const Page = ({ title, lede, children }: { title: string; lede: string; children: ReactNode }) => (
	<div style={{ maxWidth: '68rem' }}>
		<h1 className="type-title" style={{ color: 'var(--text)' }}>
			{title}
		</h1>
		<p
			className="type-subtitle"
			style={{ color: 'var(--text-muted)', maxWidth: '58ch', marginTop: 'var(--spacing-lg)' }}
		>
			{lede}
		</p>
		<div style={{ marginTop: 'var(--spacing-6xl)', display: 'grid', gap: 'var(--spacing-6xl)' }}>
			{children}
		</div>
	</div>
);

export const Group = ({ label, note, children }: { label: string; note?: string; children: ReactNode }) => (
	<section style={{ display: 'grid', gap: 'var(--spacing-xl)' }}>
		<div style={{ display: 'grid', gap: 'var(--spacing-xs)' }}>
			<h2 className="type-overline">{label}</h2>
			{note && (
				<p className="type-annotation" style={{ color: 'var(--text-muted)', maxWidth: '64ch' }}>
					{note}
				</p>
			)}
		</div>
		{children}
	</section>
);

/** Shared row chrome for the scale tables (radius, spacing). */
export const Row = ({ children }: { children: ReactNode }) => (
	<div
		style={{
			display: 'grid',
			gridTemplateColumns: 'minmax(7rem, 10rem) 5rem 4rem 1fr',
			gap: 'var(--spacing-xl)',
			alignItems: 'center',
			padding: 'var(--spacing-lg) 0',
			borderBottom: '1px solid var(--border)',
		}}
	>
		{children}
	</div>
);

export const Name = ({ children }: { children: ReactNode }) => (
	<code
		className="type-annotation"
		style={{
			fontFamily: 'var(--font-mono)',
			color: 'var(--text)',
			background: 'var(--bg-raised)',
			border: '1px solid var(--border)',
			borderRadius: 'var(--radius-xs)',
			padding: '0.125rem 0.375rem',
			justifySelf: 'start',
		}}
	>
		{children}
	</code>
);

export const Num = ({ children }: { children: ReactNode }) => (
	<span
		className="type-annotation"
		style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}
	>
		{children}
	</span>
);
