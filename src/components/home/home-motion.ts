/* The homepage's small motions — the bio's toggles, the live career
   duration, and the "results" bars. Everything here sits on top of markup
   that already reads correctly without it (see HomeHero.astro and
   HomeBio.astro), so a failure leaves the page whole.

   Returns a teardown, called by index.astro before the next page's setup:
   the module outlives the page under <ClientRouter />. */
import { CAREER_START, since, formatYears, formatUnit, formatRest } from './career';

/* Matched to the bars' own curve below, and to the 120ms stagger the site
   uses for consecutive arrivals. */
const BAR_DURATION = 560;
const BAR_STAGGER = 120;
const BAR_DELAY = 300;

export const initHomeMotion = (root: ParentNode = document): (() => void) => {
	const cleanups: (() => void)[] = [];
	const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

	/* ---- The duration, on the day it is read ---------------------------- */
	const span = since(CAREER_START);
	const full = `${formatYears(span)}${formatRest(span)}`;
	root.querySelector('[data-duration-full]')?.replaceChildren(full);
	root.querySelector('[data-duration-number]')?.replaceChildren(String(span.years));
	root.querySelector('[data-duration-unit]')?.replaceChildren(formatUnit(span));
	root.querySelector('[data-duration-rest]')?.replaceChildren(formatRest(span));

	/* ---- Toggles ---------------------------------------------------------
	   A mouse opens these by hovering (CSS), so its click does nothing —
	   otherwise the click that follows a hover would close what the hover
	   just opened. Touch and keyboard have no hover, so for them a click
	   (a tap, or Enter/Space) toggles `data-open`. */
	for (const toggle of root.querySelectorAll<HTMLElement>('[data-toggle]')) {
		let pointer = '';
		const onPointerDown = (event: PointerEvent) => {
			pointer = event.pointerType;
		};
		const onClick = (event: MouseEvent) => {
			const fromMouse = event.detail > 0 && pointer === 'mouse';
			pointer = '';
			if (fromMouse) return;
			toggle.toggleAttribute('data-open');
		};
		/* Leaving with the mouse closes one a tap or key left open, so the
		   hover and the toggle never disagree. */
		const onPointerLeave = (event: PointerEvent) => {
			if (event.pointerType === 'mouse') toggle.removeAttribute('data-open');
		};
		toggle.addEventListener('pointerdown', onPointerDown);
		toggle.addEventListener('click', onClick);
		toggle.addEventListener('pointerleave', onPointerLeave);
		cleanups.push(() => {
			toggle.removeEventListener('pointerdown', onPointerDown);
			toggle.removeEventListener('click', onClick);
			toggle.removeEventListener('pointerleave', onPointerLeave);
		});
	}

	/* ---- Bars ------------------------------------------------------------
	   Each bar letter grows from its own height to its resting one (set in
	   CSS as `--bar`), one after the next. Played as Web Animations on top of
	   the CSS end state, so nothing is ever left mid-way: an interrupted or
	   finished run just reveals the resting style underneath. Plays once on
	   arrival and again whenever a mouse comes onto the tagline. */
	const tagline = root.querySelector<HTMLElement>('[data-tagline]');
	const bars = [...root.querySelectorAll<HTMLElement>('[data-bar]')];
	if (tagline && bars.length) {
		const easing = getComputedStyle(document.documentElement).getPropertyValue('--ease-out').trim() || 'ease-out';
		let running: Animation[] = [];

		const grow = (delay: number) => {
			if (reduceMotion.matches) return;
			for (const animation of running) animation.cancel();
			running = bars.map((bar, i) => {
				const to = getComputedStyle(bar).getPropertyValue('--bar').trim() || '1';
				return bar.animate([{ scale: '1 1' }, { scale: `1 ${to}` }], {
					duration: BAR_DURATION,
					delay: delay + i * BAR_STAGGER,
					easing,
					fill: 'backwards',
				});
			});
		};

		const onEnter = (event: PointerEvent) => {
			if (event.pointerType === 'mouse') grow(0);
		};

		grow(BAR_DELAY);
		tagline.addEventListener('pointerenter', onEnter);
		cleanups.push(() => {
			tagline.removeEventListener('pointerenter', onEnter);
			for (const animation of running) animation.cancel();
		});
	}

	return () => {
		for (const cleanup of cleanups) cleanup();
	};
};
