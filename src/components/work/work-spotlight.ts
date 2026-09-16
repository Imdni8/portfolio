/**
 * Spotlight for the homepage's work list: the card at the middle of the
 * viewport stays at full strength and every other card dims, so the reader
 * is looking at one piece of work at a time. The look is WorkCard.astro's
 * `[data-dimmed]` rule; this file only decides which cards wear it.
 *
 * "At the middle" is the card whose box spans the midline — the horizontal
 * line halfway down the viewport. When the midline falls in the gap between
 * two cards, the one whose nearer edge is closer wins, so the handover
 * happens halfway across the gap and there is always exactly one card lit. Measured against edges
 * rather than centres because the cards are not all the same height (a long
 * title makes its card taller) — a tall card should stay lit for as long as
 * it covers the midline, not only while its centre is the closest one.
 *
 * A plain rAF-batched scroll listener, for the same reason chapter-nav.ts
 * gives: an IntersectionObserver on a zero-height midline would only fire as
 * a card's edge crosses it, and in the gap between two cards nothing
 * intersects at all.
 *
 * Nothing is dimmed until this runs, so without JS every card stays at full
 * strength.
 */
export function initWorkSpotlight(list: HTMLElement): () => void {
	const cards = [...list.querySelectorAll<HTMLElement>('.card')];
	if (cards.length < 2) return () => {};

	const update = () => {
		const midline = window.innerHeight / 2;
		let lit: HTMLElement | null = null;
		let nearest = Infinity;

		for (const card of cards) {
			const { top, bottom } = card.getBoundingClientRect();
			const distance = top > midline ? top - midline : bottom < midline ? midline - bottom : 0;
			if (distance < nearest) {
				nearest = distance;
				lit = card;
			}
			if (distance === 0) break;
		}

		for (const card of cards) card.toggleAttribute('data-dimmed', card !== lit);
	};

	let queued = false;
	const onScroll = () => {
		if (queued) return;
		queued = true;
		requestAnimationFrame(() => {
			queued = false;
			update();
		});
	};

	window.addEventListener('scroll', onScroll, { passive: true });
	window.addEventListener('resize', onScroll, { passive: true });
	update();

	return () => {
		window.removeEventListener('scroll', onScroll);
		window.removeEventListener('resize', onScroll);
	};
}
