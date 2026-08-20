import type { Meta, StoryObj } from '@storybook/react-vite';
import { Note } from '../components/ui/Note';
import { Page, Group } from './_shared';

const BODY =
	'Because conducting user tests with end users (eg, CRAs) can take significantly longer to set up, and we were on the clock with versioning, I validated these concepts with 5 internal users in the client services team who use the product daily.';

const meta = {
	title: 'Components/Note',
	component: Note,
	args: { title: 'Who are AI builders?', children: BODY, dismissible: false },
} satisfies Meta<typeof Note>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Usage: Story = {
	parameters: { controls: { disable: true } },
	render: () => (
		<Page
			title="Note"
			lede="One component, two uses. A note sits in the flow and stays; a tooltip is dismissible. Only the close button differs."
		>
			<Group label="Note" note="In-flow aside. No close button — there is nothing to dismiss it back to.">
				<Note title="Who are AI builders?">{BODY}</Note>
			</Group>

			<Group label="Tooltip" note="Same component, dismissible. The close button is labelled with the note's title rather than just “Close”, so a screen-reader user knows which of several notes they are dismissing.">
				<Note title="Who are AI builders?" dismissible>
					{BODY}
				</Note>
			</Group>

			<Group
				label="Why the fill is flat"
				note="Your Figma frame fills this panel with a gradient running to amber-500. Light text on amber-500 is 2.07:1 — the bottom third of that note is unreadable, and no single text colour survives a fill that spans near-black to bright amber. This uses flat --primary-subtle instead: same amber signal, 12.03:1 for the body."
			>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xl)', alignItems: 'flex-start' }}>
					<div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
						<span className="type-overline" style={{ color: 'var(--text-muted)' }}>
							Shipped · flat
						</span>
						<Note title="Readable throughout">{BODY}</Note>
					</div>
					<div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
						<span className="type-overline" style={{ color: 'var(--text-muted)' }}>
							Figma frame · gradient
						</span>
						{/* Reproduced only to show the failure; not a shipped variant. */}
						<aside
							className="note"
							style={{ background: 'linear-gradient(180deg, var(--amber-950) 0%, var(--amber-500) 100%)' }}
						>
							<p className="note__title type-overline">Unreadable at the foot</p>
							<p className="note__body type-annotation" style={{ color: 'var(--gray-50)' }}>
								{BODY}
							</p>
						</aside>
					</div>
				</div>
			</Group>
		</Page>
	),
};
