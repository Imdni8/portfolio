import { useEffect, useState } from 'react';

/**
 * One overlay for the whole page. Any element carrying `data-zoom` opens it,
 * so figures stay static HTML and only this island hydrates.
 */
export const Lightbox = () => {
	const [shot, setShot] = useState<{ src: string; alt: string } | null>(null);

	useEffect(() => {
		const onClick = (e: MouseEvent) => {
			const trigger = (e.target as HTMLElement).closest<HTMLElement>('[data-zoom]');
			if (!trigger) return;
			e.preventDefault();
			setShot({ src: trigger.dataset.zoom!, alt: trigger.dataset.zoomAlt ?? '' });
		};
		document.addEventListener('click', onClick);
		return () => document.removeEventListener('click', onClick);
	}, []);

	useEffect(() => {
		if (!shot) return;
		const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setShot(null);
		document.addEventListener('keydown', onKey);
		// Stop the page scrolling behind the overlay.
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.removeEventListener('keydown', onKey);
			document.body.style.overflow = prev;
		};
	}, [shot]);

	// Astro only emits an <astro-island> around output that exists — a
	// component that returns null on the server never ships its script at
	// all. Render an inert root so there is always something to hydrate.
	if (!shot) return <div hidden data-lightbox-root />;

	return (
		<div className="lightbox" role="dialog" aria-modal="true" aria-label={shot.alt} onClick={() => setShot(null)}>
			<button type="button" className="lightbox__close" aria-label="Close">
				<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
					<path d="M1 1l12 12M13 1L1 13" />
				</svg>
			</button>
			<img src={shot.src} alt={shot.alt} onClick={(e) => e.stopPropagation()} />
		</div>
	);
};
