import { useEffect, useState } from 'react';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';

interface Shot {
	src: string;
	alt: string;
	caption?: string;
}

interface Group {
	shots: Shot[];
	index: number;
}

const toShot = (el: HTMLElement): Shot => ({
	src: el.dataset.zoom!,
	alt: el.dataset.zoomAlt ?? '',
	caption: el.dataset.zoomCaption || undefined,
});

/**
 * One overlay for the whole page. Any element carrying `data-zoom` opens it,
 * so figures stay static HTML and only this island hydrates. A trigger
 * inside a FigureRow opens with its row siblings as a group — arrow keys
 * and on-screen chevrons step through them — rather than just the one shot.
 */
export const Lightbox = () => {
	const [group, setGroup] = useState<Group | null>(null);

	useEffect(() => {
		const onClick = (e: MouseEvent) => {
			const trigger = (e.target as HTMLElement).closest<HTMLElement>('[data-zoom]');
			if (!trigger) return;
			e.preventDefault();

			const row = trigger.closest<HTMLElement>('.row');
			const triggers = row ? [...row.querySelectorAll<HTMLElement>('[data-zoom]')] : [trigger];
			setGroup({ shots: triggers.map(toShot), index: Math.max(0, triggers.indexOf(trigger)) });
		};
		document.addEventListener('click', onClick);
		return () => document.removeEventListener('click', onClick);
	}, []);

	useEffect(() => {
		if (!group) return;
		const step = (delta: number) =>
			setGroup((g) => g && { ...g, index: (g.index + delta + g.shots.length) % g.shots.length });
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setGroup(null);
			else if (e.key === 'ArrowLeft' && group.shots.length > 1) step(-1);
			else if (e.key === 'ArrowRight' && group.shots.length > 1) step(1);
		};
		document.addEventListener('keydown', onKey);
		// Stop the page scrolling behind the overlay.
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.removeEventListener('keydown', onKey);
			document.body.style.overflow = prev;
		};
		// Deliberately keyed on the shots array, not the whole group: it's a
		// fresh reference only on open, not on every step() below (that just
		// updates `index` on the same array) — so the listener and the
		// scroll lock aren't torn down and rebuilt on every arrow press.
	}, [group?.shots]);

	// Astro only emits an <astro-island> around output that exists — a
	// component that returns null on the server never ships its script at
	// all. Render an inert root so there is always something to hydrate.
	if (!group) return <div hidden data-lightbox-root />;

	const shot = group.shots[group.index];
	const many = group.shots.length > 1;
	const step = (delta: number, e: React.MouseEvent) => {
		e.stopPropagation();
		setGroup((g) => g && { ...g, index: (g.index + delta + g.shots.length) % g.shots.length });
	};

	return (
		<div className="lightbox" role="dialog" aria-modal="true" aria-label={shot.alt} onClick={() => setGroup(null)}>
			<IconButton
				variant="secondary"
				size="md"
				className="lightbox__close"
				icon={<Icon name="close" />}
				label="Close"
				onClick={() => setGroup(null)}
			/>

			{many && (
				<>
					<IconButton
						variant="secondary"
						size="md"
						className="lightbox__nav lightbox__nav--prev"
						icon={<Icon name="chevron-left" />}
						label="Previous image"
						onClick={(e) => step(-1, e)}
					/>
					<IconButton
						variant="secondary"
						size="md"
						className="lightbox__nav lightbox__nav--next"
						icon={<Icon name="chevron-right" />}
						label="Next image"
						onClick={(e) => step(1, e)}
					/>
				</>
			)}

			<img src={shot.src} alt={shot.alt} onClick={(e) => e.stopPropagation()} />

			{(shot.caption || many) && (
				<div className="lightbox__meta" onClick={(e) => e.stopPropagation()}>
					{shot.caption && <p className="lightbox__caption type-annotation">{shot.caption}</p>}
					{many && (
						<p className="lightbox__count type-annotation">
							{group.index + 1} / {group.shots.length}
						</p>
					)}
				</div>
			)}
		</div>
	);
};
