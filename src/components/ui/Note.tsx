import { useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { IconButton } from './IconButton';

export type NoteProps = {
	title: string;
	children: ReactNode;
	/** Tooltips can be dismissed; notes sit in the flow and cannot. */
	dismissible?: boolean;
};

export const Note = ({ title, children, dismissible = false }: NoteProps) => {
	const [open, setOpen] = useState(true);
	if (!open) return null;

	return (
		<aside className="note">
			<p className="note__title type-overline">{title}</p>
			<div className="note__body type-annotation">{children}</div>
			{dismissible && (
				<IconButton
					variant="ghost"
					size="sm"
					className="note__close"
					icon={<Icon name="close" />}
					label={`Dismiss: ${title}`}
					onClick={() => setOpen(false)}
				/>
			)}
		</aside>
	);
};
