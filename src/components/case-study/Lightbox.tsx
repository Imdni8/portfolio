import { useEffect, useRef, useState } from 'react';

interface Shot {
	src: string;
	width: number;
	height: number;
	alt: string;
	caption?: string;
}

/**
 * One overlay per page. Any element carrying `data-zoom` opens it, reading the
 * full-size source off the element's data attributes — so figures stay static
 * HTML and only this island ships JS.
 */
export default function Lightbox() {
	const [shot, setShot] = useState<Shot | null>(null);
	const openerRef = useRef<HTMLElement | null>(null);
	const closeRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		const onClick = (event: MouseEvent) => {
			const target = event.target as HTMLElement | null;
			const trigger = target?.closest<HTMLElement>('[data-zoom]');
			if (!trigger) return;
			event.preventDefault();
			openerRef.current = trigger;
			setShot({
				src: trigger.dataset.zoomSrc ?? '',
				width: Number(trigger.dataset.zoomWidth ?? 0),
				height: Number(trigger.dataset.zoomHeight ?? 0),
				alt: trigger.dataset.zoomAlt ?? '',
				caption: trigger.dataset.zoomCaption || undefined,
			});
		};
		document.addEventListener('click', onClick);
		return () => document.removeEventListener('click', onClick);
	}, []);

	useEffect(() => {
		if (!shot) return;

		const onKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setShot(null);
		};
		const { overflow } = document.body.style;
		document.body.style.overflow = 'hidden';
		document.addEventListener('keydown', onKey);
		closeRef.current?.focus();

		return () => {
			document.body.style.overflow = overflow;
			document.removeEventListener('keydown', onKey);
			openerRef.current?.focus();
		};
	}, [shot]);

	if (!shot) return null;

	return (
		<div
			className="lightbox"
			role="dialog"
			aria-modal="true"
			aria-label={shot.alt || 'Enlarged image'}
			onClick={(event) => {
				if (event.target === event.currentTarget) setShot(null);
			}}
		>
			<button
				type="button"
				className="lightbox__close"
				onClick={() => setShot(null)}
				ref={closeRef}
				aria-label="Close enlarged image"
			>
				<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
					<path d="M6 6l12 12M18 6 6 18" />
				</svg>
			</button>
			<figure className="lightbox__figure">
				<img
					src={shot.src}
					width={shot.width || undefined}
					height={shot.height || undefined}
					alt={shot.alt}
				/>
				{shot.caption && <figcaption>{shot.caption}</figcaption>}
			</figure>
		</div>
	);
}
