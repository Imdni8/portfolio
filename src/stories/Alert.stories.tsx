import { useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Icon } from '../components/ui/Icon';
import { Page, Group } from './_shared';

const BODY =
	'Because conducting user tests with end users (eg, CRAs) can take significantly longer to set up, and we were on the clock with versioning, I validated these concepts with 5 internal users in the client services team who use the product daily.';

/** A note sits in the flow and stays; a tooltip adds a dismiss control. The
    open state is the caller's: Alert itself holds none, which is why this
    lives in the story rather than in ui/alert.tsx. */
const Note = ({ title, children, dismissible = false }: { title: string; children: ReactNode; dismissible?: boolean }) => {
	const [open, setOpen] = useState(true);
	if (!open) return null;

	return (
		<Alert>
			<AlertTitle>{title}</AlertTitle>
			<AlertDescription>{children}</AlertDescription>
			{dismissible && (
				<AlertAction>
					{/* Labelled with the note's title rather than just "Close", so a
					    screen-reader user knows which of several notes they are
					    dismissing. */}
					<Button variant="ghost" size="icon-sm" aria-label={`Dismiss: ${title}`} onClick={() => setOpen(false)}>
						<Icon name="close" />
					</Button>
				</AlertAction>
			)}
		</Alert>
	);
};

type Args = ComponentProps<typeof Note>;

const meta = {
	title: 'Components/Alert',
	component: Note,
	args: { title: 'Who are AI builders?', children: BODY, dismissible: false },
} satisfies Meta<Args>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Usage: Story = {
	parameters: { controls: { disable: true } },
	render: () => (
		<Page
			title="Alert"
			lede="shadcn's Alert, retuned onto the tokens, where the old Note was. Its role is note, not alert: every use is a static aside, not something that just went wrong. One surface, two uses: a note sits in the flow and stays, a tooltip is dismissible."
		>
			<Group label="Note" note="In-flow aside. No action — there is nothing to dismiss it back to.">
				<Note title="Who are AI builders?">{BODY}</Note>
			</Group>

			<Group
				label="Tooltip"
				note="AlertAction holds the dismiss button (ghost · icon-sm), and the title makes room for it only when it is there. The button is labelled with the note's title rather than just “Close”."
			>
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
						<Alert style={{ background: 'linear-gradient(180deg, var(--amber-950) 0%, var(--amber-500) 100%)' }}>
							<AlertTitle>Unreadable at the foot</AlertTitle>
							<AlertDescription style={{ color: 'var(--gray-50)' }}>{BODY}</AlertDescription>
						</Alert>
					</div>
				</div>
			</Group>
		</Page>
	),
};
