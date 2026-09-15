/**
 * Scroll-spy for ChapterNav.astro. The "current" chapter is the last one in
 * document order whose anchor top has crossed a line ~30% down the
 * viewport — a natural reading position, not right at the very top edge —
 * or none if the reader hasn't reached the first chapter yet.
 *
 * This used to run inside an IntersectionObserver callback (modeled on
 * solution-carousel.ts's own usage), recomputed from every anchor's live
 * position rather than just the entries that changed — which fixed one bug
 * (scrolling back above the first chapter left it stuck highlighted, since
 * no anchor was newly entering/exiting the band at that moment) but not
 * another: IntersectionObserver only *fires* when an anchor's intersection
 * with the band starts or stops, and since each chapter's anchor div is far
 * taller than the band, that doesn't happen again until the anchor's far
 * edge has cleared the band — i.e. the entire chapter has scrolled past,
 * not when its heading crosses the line. A chapter would stay dark for
 * hundreds of pixels after it should have activated, then jump straight to
 * "current" long after the fact. A plain scroll listener has no such gap:
 * it recomputes on every frame, so the line-crossing is caught exactly when
 * it happens regardless of how tall a chapter's content is.
 */
const BAND_TOP = 0.3;

export function initChapterNav(nav: HTMLElement) {
	const links = new Map(
		[...nav.querySelectorAll<HTMLAnchorElement>('[data-chapter-link]')].map((a) => [
			a.dataset.chapterLink!,
			a,
		]),
	);
	const anchors = [...document.querySelectorAll<HTMLElement>('[data-chapter-anchor]')];
	if (!links.size || !anchors.length) return;

	const setActive = (id: string | null) => {
		for (const [linkId, link] of links) {
			if (linkId === id) link.setAttribute('aria-current', 'true');
			else link.removeAttribute('aria-current');
		}
	};

	const updateActive = () => {
		const bandTop = window.innerHeight * BAND_TOP;
		let current: string | null = null;
		for (const anchor of anchors) {
			if (anchor.getBoundingClientRect().top <= bandTop) {
				current = anchor.getAttribute('data-chapter-anchor');
			}
		}
		setActive(current);
	};

	/* rAF-batched, same idiom as water-field.ts's own `onScroll` — a bare
	   `scroll` listener fires many times per frame on a trackpad, and this
	   needs a fresh read each time regardless (see the file header for why
	   IntersectionObserver can't stand in for this). */
	let queued = false;
	const onScroll = () => {
		if (queued) return;
		queued = true;
		requestAnimationFrame(() => {
			queued = false;
			updateActive();
		});
	};
	window.addEventListener('scroll', onScroll, { passive: true });
	window.addEventListener('resize', onScroll, { passive: true });
	updateActive();

	if (typeof IntersectionObserver !== 'function') return;

	/* The rail is fixed-positioned and top-aligned with the page title, so it
	   reads fine sitting over the hero too — it should be visible from first
	   paint, not just once the reader scrolls into the story. It only needs
	   to disappear once they've scrolled past the whole case study into the
	   footer, which is why this checks the story's bottom edge rather than
	   just `!entry.isIntersecting` (that alone is also true before the story
	   has been reached at all, which hid the rail over the hero). `data-hidden`
	   defaults to absent (visible) so a no-JS reader — or one whose observer
	   never fires before this runs — still gets a working nav. */
	const story = document.getElementById('story');
	if (story) {
		new IntersectionObserver(
			([entry]) => {
				const scrolledPast = !entry.isIntersecting && entry.boundingClientRect.bottom < 0;
				nav.toggleAttribute('data-hidden', scrolledPast);
			},
			{ threshold: 0 },
		).observe(story);
	}
}
