import type { Meta, StoryObj } from '@storybook/react-vite';
import { Page, Group, Name } from './_shared';

type Spec = { token: string; role: string; sample: string; accent?: boolean };

/** Ordered by size, which is also roughly the order a reader meets them. */
const STYLES: Spec[] = [
	{ token: 'type-title', role: 'Case-study page title', sample: 'Introduce Agent Versioning and lifecycle management' },
	{ token: 'type-heading', role: 'Section headline — states a finding', sample: 'There was no way to validate the changes made to an agent' },
	{ token: 'type-reflection', role: 'Editorial heading — you, speaking', sample: 'Reflections', accent: true },
	{ token: 'type-subtitle', role: 'Dek beneath the title', sample: 'Versioned agents can be validated and released in clinical trials safely because they can be rolled back.' },
	{ token: 'type-nav-link', role: 'Tab list — site nav, chapter rail, Tabs', sample: 'Framing' },
	{ token: 'type-body', role: 'Running copy and hero facts', sample: "Agent Studio's canvas is where an AI builder assembles an agentic workflow, connects it to their organisation's data sources, and puts it to work without involving engineering." },
	{ token: 'type-ui-label', role: 'Button and control labels', sample: 'View final design' },
	{ token: 'type-annotation', role: 'Figure captions, note and tooltip copy', sample: 'Because conducting user tests with end users can take significantly longer to set up, I validated these concepts with 5 internal users who use the product daily.' },
	{ token: 'type-meta', role: 'Work card meta — industry, technology and year', sample: 'Clinical trials · Figma · 2026' },
	{ token: 'type-overline', role: 'Eyebrow and note title — always uppercase', sample: 'Who are AI builders?' },
];

const Specimen = ({ spec }: { spec: Spec }) => (
	<div
		style={{
			border: '1px solid var(--border)',
			borderRadius: 'var(--radius-sm)',
			overflow: 'hidden',
		}}
	>
		<div
			style={{
				display: 'flex',
				flexWrap: 'wrap',
				alignItems: 'center',
				gap: 'var(--spacing-lg)',
				padding: 'var(--spacing-md) var(--spacing-lg)',
				background: 'var(--bg-raised)',
				borderBottom: '1px solid var(--border)',
			}}
		>
			<Name>{`.${spec.token}`}</Name>
			<span
				className="type-annotation"
				style={{ color: 'var(--text-disabled)', marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.6875rem' }}
			>
				{spec.role}
			</span>
		</div>
		<div style={{ padding: 'var(--spacing-xl) var(--spacing-lg)' }}>
			<p
				className={spec.token}
				style={{ color: spec.accent ? 'var(--primary-text)' : 'var(--text)' }}
				ref={(el) => {
					// Surface the resolved values next to the specimen once it lands.
					if (!el) return;
					const c = getComputedStyle(el);
					const slot = el.parentElement?.querySelector('[data-resolved]');
					if (!slot) return;
					const lh = Math.round(parseFloat(c.lineHeight) * 100) / 100;
					slot.textContent =
						`${c.fontFamily.split(',')[0].replace(/['"]/g, '')} · ${c.fontWeight} · ` +
						`${parseFloat(c.fontSize)}/${lh}` +
						(c.letterSpacing !== 'normal' ? ` · ${c.letterSpacing}` : '');
				}}
			>
				{spec.sample}
			</p>
			<span
				data-resolved
				className="type-annotation"
				style={{
					display: 'block',
					marginTop: 'var(--spacing-lg)',
					fontFamily: 'var(--font-mono)',
					fontSize: '0.6875rem',
					color: 'var(--text-muted)',
				}}
			/>
		</div>
	</div>
);

const meta: Meta = {
	title: 'Foundations/Type',
	parameters: { layout: 'fullscreen' },
};
export default meta;

export const Scale: StoryObj = {
	render: () => (
		<Page
			title="Type"
			lede="Ten styles across three families. The line under each specimen is what the browser actually resolved — if a font fails to load, it shows up here rather than being mistaken for a design choice."
		>
			<Group
				label="The rule"
				note="Playfair carries the voice; Inter carries information; Plex Mono carries apparatus. The two text families meet at exactly one size — 30/38 — where .type-heading states a finding and .type-reflection is the author stepping back to speak. That collision is the system."
			>
				<div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
					{STYLES.map((s) => (
						<Specimen key={s.token} spec={s} />
					))}
				</div>
			</Group>
		</Page>
	),
};
