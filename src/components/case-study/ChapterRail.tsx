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
	// True once the rail has been pushed fully off-screen by the closing
	// Reflection (or the footer, lacking one) — there's nothing left in the
	// case study for it to navigate to at that point, so it goes inert.
	const [pastEnd, setPastEnd] = useState(false);
	const navRef = useRef<HTMLElement>(null);
	const railRef = useRef<HTMLDivElement>(null);
	const indicatorRef = useRef<HTMLSpanElement>(null);
	// Read once — it never changes for the session, and every scroll-spy
	// transition below would otherwise construct a fresh MediaQueryList just
	// to read this one boolean.
	const reducedMotion = useRef(
		typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)').matches : false
	);

	useEffect(() => {
		const sections = chapters
			.map((c) => document.querySelector<HTMLElement>(`[data-chapter="${c.id}"]`))
			.filter((el): el is HTMLElement => el !== null)
			// Defensive: keeps "last one scrolled past" below correct even if a
			// chapter's Section ever lands out of the order `chapters` lists.
			.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
		if (!sections.length) return;

		// A chapter can own several Sections — only its first carries the
		// `chapter` prop, and the rest (no `data-chapter` of their own) inherit
		// it by following in document order. So the active chapter is the last
		// marker scrolled past the trigger line, not "whichever marker's own box
		// currently overlaps a band": that reading leaves the rail stuck on a
		// stale chapter for every inherited Section after a marker, in both
		// scroll directions, until the next marker's own (possibly short) box
		// happens to cross the band.
		const TRIGGER = 0.2;

		// A scroll read, not an IntersectionObserver — same fix as the nav's
		// tint trigger (nav-tint.ts) for the same reason: a chapter's Section is
		// routinely taller than the viewport, so a narrow observed band only
		// tells you the section has started or finished crossing it, not the
		// moment its top reaches TRIGGER. Watching it fire proves the mismatch —
		// "enter" lands with the section's top still well below the line (so
		// this marker isn't counted yet and the rail is left showing the
		// previous chapter), and the next callback isn't until "exit", by which
		// point the whole section — heading, body, everything — has already
		// scrolled past. Reading live geometry on every scroll frame instead
		// means the instant a marker's top crosses the line, the very next
		// frame sees it.
		let ticking = false;

		const update = () => {
			ticking = false;
			const line = window.innerHeight * TRIGGER;
			let current = sections[0];
			for (const s of sections) {
				if (s.getBoundingClientRect().top <= line) current = s;
				else break;
			}
			const id = current.getAttribute('data-chapter');
			if (id) setActive(id);
		};

		const onScroll = () => {
			if (ticking) return;
			ticking = true;
			requestAnimationFrame(update);
		};

		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll, { passive: true });
		update();
		return () => {
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onScroll);
		};
	}, [chapters]);

	// Pushes the rail up out of the viewport exactly as fast as the closing
	// Reflection's top border (or, lacking one, the footer's) approaches it —
	// the offset is a live function of their relative positions, recomputed
	// every scroll frame, not a canned animation on a boolean flip. That's what
	// makes it read as the border physically shoving the rail off-screen: the
	// rail's own bottom edge stays glued to the border the entire way, in both
	// scroll directions, rather than the rail retracting on its own schedule
	// once some threshold is crossed.
	useEffect(() => {
		const nav = navRef.current;
		const target =
			document.querySelector<HTMLElement>('.reflection') ?? document.querySelector<HTMLElement>('.site-footer');
		if (!nav || !target) return;

		let railHeight = nav.getBoundingClientRect().height;
		let ticking = false;

		const update = () => {
			ticking = false;
			// 0 while the border is still below the rail's own bottom edge (rail
			// fully pinned), down to -railHeight once the border reaches the top
			// of the viewport (rail fully off-screen) — clamped so it can't be
			// pushed past either end.
			const offset = Math.min(0, Math.max(-railHeight, target.getBoundingClientRect().top - railHeight));
			nav.style.transform = offset === 0 ? '' : `translateY(${offset}px)`;
			setPastEnd(offset <= -railHeight);
		};

		const onScroll = () => {
			if (ticking) return;
			ticking = true;
			requestAnimationFrame(update);
		};
		const onResize = () => {
			railHeight = nav.getBoundingClientRect().height;
			onScroll();
		};

		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onResize, { passive: true });
		update();
		return () => {
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onResize);
		};
	}, []);

	// Slide the shared bar under the active tab — same mechanism as the site
	// nav's `.nav__indicator` (an offset/width pair written on the active
	// element each time it changes), so the two read as one system.
	useEffect(() => {
		const indicator = indicatorRef.current;
		const activeTab = railRef.current?.querySelector<HTMLElement>('[aria-current="true"]');
		if (!indicator || !activeTab) return;
		indicator.style.left = `${activeTab.offsetLeft}px`;
		indicator.style.width = `${activeTab.offsetWidth}px`;
	}, [active]);

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
			behavior: reducedMotion.current ? 'auto' : 'smooth',
		});
	}, [active]);

	const go = (id: string) => {
		const target = document.querySelector<HTMLElement>(`[data-chapter="${id}"]`);
		if (!target) return;
		target.scrollIntoView({ behavior: reducedMotion.current ? 'auto' : 'smooth', block: 'start' });
	};

	return (
		<nav className="rail" aria-label="Chapters" inert={pastEnd || undefined} ref={navRef}>
			<div className="rail__inner tabs" ref={railRef}>
				{chapters.map((c) => (
					<button
						key={c.id}
						type="button"
						className="tab type-nav-link"
						aria-current={c.id === active}
						aria-selected={c.id === active}
						onClick={() => go(c.id)}
					>
						{c.label}
					</button>
				))}
				<span className="rail__indicator" aria-hidden="true" ref={indicatorRef} />
			</div>
		</nav>
	);
};
