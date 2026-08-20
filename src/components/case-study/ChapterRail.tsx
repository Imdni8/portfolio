import { useEffect, useRef, useState } from 'react';

export type Chapter = { id: string; label: string };

/**
 * Sticky chapter rail with scroll-spy.
 *
 * Reads `[data-chapter]` out of the rendered page rather than being told where
 * the sections are, so the rail cannot fall out of step with the body — adding
 * a Section with a chapter is all it takes to appear here.
 */
export const ChapterRail = ({ chapters }: { chapters: Chapter[] }) => {
	const [active, setActive] = useState(chapters[0]?.id);
	const railRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const sections = chapters
			.map((c) => document.querySelector<HTMLElement>(`[data-chapter="${c.id}"]`))
			.filter((el): el is HTMLElement => el !== null);
		if (!sections.length) return;

		// rootMargin pins the trigger line near the top of the viewport: a
		// section counts as current once its heading reaches the rail, not when
		// it first peeks in from the bottom.
		// A callback only reports what *changed*, so the set of currently
		// intersecting sections has to be carried across calls — reading one
		// batch loses every section that was already in view and leaves the
		// rail stuck on whichever chapter happened to fire last.
		const intersecting = new Set<HTMLElement>();

		const io = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (e.isIntersecting) intersecting.add(e.target as HTMLElement);
					else intersecting.delete(e.target as HTMLElement);
				}
				const topmost = [...intersecting].sort(
					(a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top
				)[0];
				const id = topmost?.getAttribute('data-chapter');
				if (id) setActive(id);
			},
			{ rootMargin: '-20% 0px -70% 0px', threshold: 0 }
		);

		sections.forEach((s) => io.observe(s));
		return () => io.disconnect();
	}, [chapters]);

	// Keep the current chapter in view when the rail itself has to scroll.
	//
	// Deliberately not scrollIntoView. That walks every scrollable ancestor up to
	// the document, and the document has `scroll-padding-block-start` set so
	// anchored sections clear this rail. The rail is sticky, so its active button
	// sits *inside* that padding — which reads as "not in view", and the page gets
	// dragged up by the padding height. Moving the page re-fires the observer,
	// which re-runs this effect, which moves the page again: the viewport judders
	// and a long scroll cannot cross a chapter boundary. Scrolling the rail's own
	// box by hand touches nothing but the rail.
	useEffect(() => {
		const rail = railRef.current;
		const el = rail?.querySelector<HTMLElement>('[aria-current="true"]');
		if (!rail || !el) return;
		if (rail.scrollWidth <= rail.clientWidth) return; // whole rail fits; nothing to do

		const railBox = rail.getBoundingClientRect();
		const elBox = el.getBoundingClientRect();
		const delta = elBox.left + elBox.width / 2 - (railBox.left + railBox.width / 2);
		if (Math.abs(delta) < 1) return;

		rail.scrollTo({
			left: rail.scrollLeft + delta,
			behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
		});
	}, [active]);

	const go = (id: string) => {
		const target = document.querySelector<HTMLElement>(`[data-chapter="${id}"]`);
		if (!target) return;
		target.scrollIntoView({ behavior: 'smooth', block: 'start' });
	};

	return (
		<nav className="rail" aria-label="Chapters">
			<div className="rail__inner tabs" ref={railRef}>
				{chapters.map((c) => (
					<button
						key={c.id}
						type="button"
						className="tab"
						aria-current={c.id === active}
						aria-selected={c.id === active}
						onClick={() => go(c.id)}
					>
						{c.label}
					</button>
				))}
			</div>
		</nav>
	);
};
