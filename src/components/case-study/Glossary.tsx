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
			<p className="note__title">{open.title}</p>
			<p className="note__body">{open.body}</p>
		</div>
	);
};
