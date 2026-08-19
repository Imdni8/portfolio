import { useState } from 'react';
import type { ReactNode } from 'react';

export type NoteProps = {
	title: string;
	children: ReactNode;
	/** Tooltips can be dismissed; notes sit in the flow and cannot. */
	dismissible?: boolean;
};

const CloseIcon = () => (
	<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
		<path d="M1 1l12 12M13 1L1 13" />
	</svg>
);

export const Note = ({ title, children, dismissible = false }: NoteProps) => {
	const [open, setOpen] = useState(true);
	if (!open) return null;

	return (
		<aside className="note">
			<p className="note__title">{title}</p>
			<p className="note__body">{children}</p>
			{dismissible && (
				<button type="button" className="note__close" onClick={() => setOpen(false)} aria-label={`Dismiss: ${title}`}>
					<CloseIcon />
				</button>
			)}
		</aside>
	);
};
