import { useEffect, useState } from 'react';

type Open = { title: string; body: string; x: number; y: number } | null;

/**
 * One popover per page, opened by any `[data-term]`. Definitions are baked
 * into the trigger's data attributes at build time, so the glossary data never
 * ships as JavaScript.
 */
export const Glossary = () => {
	const [open, setOpen] = useState<Open>(null);

	useEffect(() => {
		const onClick = (e: MouseEvent) => {
			const trigger = (e.target as HTMLElement).closest<HTMLElement>('[data-term]');
			if (!trigger) {
				setOpen(null);
				return;
			}
			e.preventDefault();
			const r = trigger.getBoundingClientRect();
			setOpen({
				title: trigger.dataset.termTitle ?? '',
				body: trigger.dataset.termBody ?? '',
				x: r.left + r.width / 2,
				y: r.bottom + 8,
			});
		};
		const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
		document.addEventListener('click', onClick);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('click', onClick);
			document.removeEventListener('keydown', onKey);
		};
	}, []);

	// The popover is fixed to where the trigger sat at the moment it was clicked,
	// and nothing re-anchors it — so a scroll strands it over unrelated copy while
	// the word it belongs to walks away. Closing is the honest answer: the reader
	// has moved on.
	//
	// Bound to the window rather than the document, and only while something is
	// open. A scroll inside a nested box is not the reader moving the page — the
	// chapter rail centring its active tab would otherwise dismiss the note.
	// The threshold ignores a zero-delta event, so a term that the browser had to
	// scroll into view to focus does not close itself on the way up.
	useEffect(() => {
		if (!open) return;
		const from = window.scrollY;
		const close = () => {
			if (Math.abs(window.scrollY - from) > 2) setOpen(null);
		};
		window.addEventListener('scroll', close, { passive: true });
		return () => window.removeEventListener('scroll', close);
	}, [open]);

	// See Lightbox: a null server render means Astro emits no island.
	if (!open) return <div hidden data-glossary-root />;

	return (
		<div
			className="glossary"
			role="dialog"
			aria-label={open.title}
			style={{ '--x': `${open.x}px`, '--y': `${open.y}px` } as React.CSSProperties}
			onClick={(e) => e.stopPropagation()}
		>
			<p className="note__title type-overline">{open.title}</p>
			<div className="note__body type-annotation">{open.body}</div>
		</div>
	);
};
