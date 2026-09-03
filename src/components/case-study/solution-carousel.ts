/**
 * Prev/next controls for a Solution carousel track. scroll-snap does the
 * actual sliding (and the "next slide peeking" look) — this only moves the
 * scroll position by one slide per click and disables a button once its end
 * of the track is reached. No React: there's no state here beyond scroll
 * position, so a scoped vanilla script (same pattern as nav-dropdown.ts)
 * is all the interaction needs.
 */
const reducedMotion = () =>
	typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Set by Lightbox.tsx while its overlay is open — see updateActive(). */
const overlayOpen = () => document.documentElement.hasAttribute('data-lightbox-open');

export function initSolutionCarousel(track: HTMLElement) {
	const root = track.closest('.solution');
	const prev = root?.querySelector<HTMLButtonElement>('[data-carousel-prev]');
	const next = root?.querySelector<HTMLButtonElement>('[data-carousel-next]');
	const slides = Array.from(track.querySelectorAll<HTMLElement>(':scope > .solution-slide'));
	if (!prev || !next || !slides.length) return;

	/**
	 * Each slide's start edge in the track's own scroll coordinate space — the
	 * space `scrollLeft` is measured in.
	 *
	 * `offsetLeft` cannot stand in for this, which is subtle enough to be worth
	 * spelling out: neither the track nor the slides are positioned, so
	 * `offsetLeft` resolves against `<body>` and carries the page offset of the
	 * whole `.solution` block. That offset is the gutter alone while the
	 * viewport is narrower than `--measure-story`, then grows by half of every
	 * pixel past it as the block starts centring. Comparing it against
	 * `scrollLeft` shifts every slide's measured distance by that constant, and
	 * at the end of the track — where the last slide can only ever come within
	 * `100% - --slide-basis` of the start edge, never 0 — a shift of ~130px is
	 * enough to hand `currentIndex()` to the second-to-last slide instead. That
	 * was the wide-screen bug where the final slide never lit up and the
	 * previous one kept playing underneath it.
	 *
	 * One rect read for the track, one per slide, inside an rAF — cheaper than
	 * the layout the scroll itself already forced.
	 */
	const scrollPositions = () => {
		const origin = track.getBoundingClientRect().left - track.scrollLeft;
		return slides.map((slide) => slide.getBoundingClientRect().left - origin);
	};

	const currentIndex = () => {
		let closest = 0;
		let closestDelta = Infinity;
		scrollPositions().forEach((position, i) => {
			const delta = Math.abs(position - track.scrollLeft);
			if (delta < closestDelta) {
				closestDelta = delta;
				closest = i;
			}
		});
		return closest;
	};

	const goTo = (index: number) => {
		const clamped = Math.max(0, Math.min(slides.length - 1, index));
		track.scrollTo({ left: scrollPositions()[clamped], behavior: reducedMotion() ? 'auto' : 'smooth' });
	};

	const updateButtons = () => {
		const maxScroll = track.scrollWidth - track.clientWidth;
		const atEnd = track.scrollLeft >= maxScroll - 1;
		prev.disabled = track.scrollLeft <= 0;
		next.disabled = atEnd;
		// Same condition, second consumer: the track's right-edge fade dims the
		// next slide peeking in, and on the last slide there is no next slide
		// for it to dim — it would fade that slide's own right third instead.
		// See Solution.astro's [data-at-end] rule.
		track.toggleAttribute('data-at-end', atEnd);
	};

	// Whether the carousel is on screen at all. Set by the observer below —
	// declared up here because updateActive() reads it. Starts true so that a
	// browser without IntersectionObserver simply never gates on it.
	let visible = true;

	// The active slide (full opacity; see Slide.astro's [data-active] rule)
	// is whichever one currentIndex() already resolves to for the buttons —
	// reused here instead of a second scroll-position calculation.
	//
	// It also owns playback. A SlideVideo carries no `autoplay` attribute, so
	// this is the only thing that ever starts one: at most one clip decodes at
	// a time, nothing is fetched until the reader pages to it (preload="none"),
	// and prefers-reduced-motion falls out of the same condition — play() is
	// never called, and the poster stands in for the film with no CSS at all.
	//
	// `paused` is checked before play() because updateActive() runs on every
	// scroll frame, and calling play() on an already-playing video restarts the
	// promise dance for nothing. The .catch() is not optional either: play()
	// rejects if the element is paused before it resolves, which an unhandled
	// rejection would surface in the console on any fast scroll.
	//
	// It also owns the track's tab stops. Every slide's video sits inside a
	// click-to-enlarge <button>, and four of the five are off screen at 40%
	// opacity at any moment — left focusable, Tab walks into one and the
	// browser's focus-scroll drags the snap track sideways under the reader.
	// tabIndex, not `inert`: inert would also kill pointer events, so a slide
	// peeking in at the edge could no longer be clicked to open.
	const updateActive = () => {
		const active = currentIndex();
		slides.forEach((slide, i) => {
			const on = i === active;
			slide.toggleAttribute('data-active', on);
			for (const trigger of slide.querySelectorAll<HTMLElement>('[data-zoom], [data-zoom-video]')) {
				trigger.tabIndex = on ? 0 : -1;
			}
			const video = slide.querySelector('video');
			if (!video) return;
			if (on && visible && !reducedMotion() && !overlayOpen()) {
				if (video.paused) video.play().catch(() => {});
			} else if (!video.paused) {
				video.pause();
			}
		});
	};

	// Five looping decodes running far below the fold is real battery cost for
	// nothing, so playback is gated on the carousel being on screen. Starts
	// false once an observer is attached — the first callback fires on observe()
	// and settles it, so a carousel already in view starts playing anyway.
	if (typeof IntersectionObserver === 'function') {
		visible = false;
		new IntersectionObserver(
			([entry]) => {
				visible = entry.isIntersecting;
				updateActive();
			},
			{ rootMargin: '100px' },
		).observe(track);
	}

	prev.addEventListener('click', () => goTo(currentIndex() - 1));
	next.addEventListener('click', () => goTo(currentIndex() + 1));

	// Fired by Lightbox.tsx on open and on close — the other half of the
	// overlayOpen() gate in updateActive(), so the slide's own clip stops while
	// the same film plays full-screen and picks up again when it closes.
	document.addEventListener('lightbox:change', updateActive);

	let ticking = false;
	track.addEventListener(
		'scroll',
		() => {
			if (ticking) return;
			ticking = true;
			requestAnimationFrame(() => {
				ticking = false;
				updateButtons();
				updateActive();
			});
		},
		{ passive: true },
	);
	window.addEventListener(
		'resize',
		() => {
			updateButtons();
			updateActive();
		},
		{ passive: true },
	);
	updateButtons();
	updateActive();
}
