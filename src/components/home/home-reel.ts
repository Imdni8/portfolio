/**
 * The homepage reel: the headline hands over to the work, then the work runs
 * sideways, then the page carries on down to the footer — all driven by the
 * reader's vertical scroll.
 *
 * The markup (index.astro) is one tall `.reel` section with a sticky,
 * viewport-sized `.reel__pin` inside it. While the pin is stuck, scrolling
 * moves nothing on its own; this file turns how far the section has scrolled
 * into where everything inside the pin should be:
 *
 *   intro   (INTRO viewport-heights) — the headline fades, its T mark flies
 *           up into the nav's brand slot, the nav fades in, and the cards
 *           rise into place, staggered, from where they were peeking in at
 *           the bottom of the first screen.
 *   reel    (STEP per card)          — the cards slide along a diagonal,
 *           one position per STEP, and the one at the centre is lit.
 *   tail    (TAIL)                   — the last card holds, then the pin's
 *           section ends, the pin scrolls away with it, and the footer
 *           follows in normal flow.
 *
 * A plain rAF-driven scroll listener, like chapter-nav.ts,
 * work-spotlight.ts and the nav's scrim — not GSAP's ScrollTrigger — with a
 * short follower on top so the reel has weight (see SMOOTHING). GSAP is
 * scoped to the nav's hover choreography and loads with that island at idle;
 * pulling it onto the homepage's critical path for a progress value and a
 * handful of transforms would cost more than it saves.
 *
 * The reel only runs where REEL_QUERY matches. The same query gates the
 * CSS, so the first paint already matches the reel's opening frame and
 * nothing jumps when this module arrives. Everywhere else — narrow screens,
 * reduced motion, no JS — the page is a headline above a plain column of
 * cards, and work-spotlight.ts lights them the way it did before the reel.
 */
import { initWorkSpotlight } from '../work/work-spotlight';

/** Keep in step with the `@media` blocks in index.astro and SiteNav.astro. */
export const REEL_QUERY =
	'(min-width: 64rem) and (prefers-reduced-motion: no-preference) and (scripting: enabled)';

/* ---- Tuning ----------------------------------------------------------------
   Scroll lengths are in viewport heights. Everything else is a fraction of
   the intro's progress (0 → 1) unless it says otherwise. */

/** Scroll spent handing over from the headline to the reel. */
const INTRO = 1;
/** Scroll spent moving one card along. */
const STEP = 0.9;
/** Scroll the last card holds for before the page moves on. */
const TAIL = 0.4;

/** Total scroll the pinned section takes, in viewport heights. index.astro
 *  sets the section's height from this, so the two cannot drift. */
export const reelLength = (cards: number) => INTRO + Math.max(cards - 1, 0) * STEP + TAIL;

/** The headline's words fade over this stretch. */
const FADE = [0, 0.35] as const;
/** How far the words drift up while they fade, in viewport heights. */
const FADE_DRIFT = 0.04;
/** The T mark's flight into the nav. It leads: it leaves on the first bit
 *  of scroll and lands halfway through, so it is well clear of the cards
 *  coming up behind it. */
const GLIDE = [0, 0.5] as const;
/** The nav's fade-in — over the back half of the mark's flight, and done
 *  the moment it lands. The nav's own brand is inside the faded shell, so
 *  anything short of full strength at the hand-off would show as the mark
 *  dimming as it arrives. */
const NAV = [0.2, 0.5] as const;

/** How far below its place a card starts, in viewport heights — the
 *  reference's first frame has the centre card's top at 77% of the screen,
 *  58% below where it comes to rest. */
const RISE = 0.58;
/** The centre card starts rising this far into the intro — a beat behind
 *  the mark, so the card follows it up instead of catching it. */
const RISE_DELAY = 0.12;
/** Each card's rise takes this much of the intro… */
const RISE_SPAN = 0.64;
/** …starting this much later than the card before it. Two steps of stagger
 *  at most (the cards past that are off screen), which is what keeps the last
 *  rise inside the intro: 0.12 + 2 × 0.12 + 0.64 = 1. */
const RISE_STAGGER = 0.12;
const RISE_STAGGER_STEPS = 2;
/** The closest a card's top edge may come to the flying mark, in px
 *  (--spacing-3xl). With the timings above it never comes this close — the
 *  mark lands before the centre card reaches its resting place, and the
 *  narrowest gap on the way is the resting one — so this is a guard for
 *  viewport shapes the timings were not checked against, not the thing
 *  keeping them apart. */
const MARK_CLEARANCE = 24;

/* The diagonal. In the reference the neighbours' centres sit ~825px across
   from the lit card's at a 1230px card width, and ~10° down to the right
   (up to the left), at 83% of its size. Expressed against the card's own
   width so the spacing holds wherever the width is capped by the viewport's
   height rather than its width. The neighbours overlap the lit card's edges
   by design; it sits on top of them. */
const STEP_X = 825 / 1230;
const ANGLE = (10 * Math.PI) / 180;
const SIDE_SCALE = 1022 / 1230;

/* Smoothing. The reel follows the scroll position through a short
   exponential lag instead of being pinned to it — tying motion straight to
   an input reads as mechanical (a wheel notch is a 100px jump, and the cards
   would teleport by it), where a follower that catches up reads as having
   weight. The time constant is how long it takes to close ~63% of the gap;
   at 90ms the reel is within a pixel of the scroll in about half a second,
   and it retargets smoothly if the reader changes direction mid-way.

   Not applied to moves the reader did not make by scrolling — the first
   frame, a resize, a restored position, a keyboard jump — which snap. */
const SMOOTHING = 90;
/** Close enough to stop the follower, in viewport heights (~half a pixel). */
const SETTLE = 0.0005;

/* ---- Helpers ----------------------------------------------------------------- */

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const within = ([from, to]: readonly [number, number], t: number) => clamp01((t - from) / (to - from));
/* Scroll-progress curves, not time curves: these map how far the reader has
   scrolled to how far something has moved, and a wheel moves in notches, so
   they are gentler than the CSS --ease-out/--ease-in-out tokens. A curve as
   steep as those would spend most of a card's rise inside the first notch. */
const easeOut = (t: number) => 1 - (1 - t) ** 3;

/** Layout offset of `el` inside `ancestor` — offsetLeft/Top, so transforms
 *  (including the headline's own entrance) do not skew it. */
const offsetWithin = (el: HTMLElement, ancestor: HTMLElement) => {
	let x = 0;
	let y = 0;
	let node: HTMLElement | null = el;
	while (node && node !== ancestor) {
		x += node.offsetLeft;
		y += node.offsetTop;
		node = node.offsetParent as HTMLElement | null;
	}
	return { x, y };
};

/* ---- The reel ---------------------------------------------------------------- */

function startReel(reel: HTMLElement): () => void {
	const pin = reel.querySelector<HTMLElement>('.reel__pin');
	const slots = [...reel.querySelectorAll<HTMLElement>('.reel__slot')];
	const cards = slots.map((slot) => slot.querySelector<HTMLElement>('.card'));
	const fades = [...reel.querySelectorAll<HTMLElement>('[data-reel-fade]')];
	const mark = reel.querySelector<HTMLElement>('[data-reel-mark]');
	const shell = document.querySelector<HTMLElement>('.nav-shell');
	const brand = shell?.querySelector<HTMLElement>('.nav__brand') ?? null;
	const brandGlyph = brand?.querySelector<SVGElement>('svg') ?? null;

	if (!pin || slots.length === 0) return () => {};

	/* Measured on start and on resize, never per frame. */
	let top = 0; // the section's top, in document coordinates
	let vh = 0; // the pin's height — the viewport, as the CSS sizes it
	let pinWidth = 0;
	let cardWidth = 0;
	let cardHeight = 0;
	let cardCentreY = 0; // the lit card's centre, in the pin
	let markBox = { x: 0, y: 0, w: 0, h: 0 }; // the mark at rest, in the pin
	let glide = { dx: 0, dy: 0, scale: 1 };

	const measure = () => {
		top = reel.getBoundingClientRect().top + window.scrollY;
		vh = pin.offsetHeight;
		pinWidth = pin.offsetWidth;
		cardWidth = slots[0].offsetWidth;
		cardHeight = slots[0].offsetHeight;
		/* The slot's `top` is its centre line — `translate: -50% -50%` does
		   the centring, and offsetTop ignores it. */
		cardCentreY = slots[0].offsetTop;

		/* The mark's resting box, inside the pin, against the nav glyph's box
		   in the viewport. While the reel is running the pin is stuck at the
		   top of the viewport, so the two share an origin. */
		if (mark && brandGlyph) {
			const from = offsetWithin(mark, pin);
			const to = brandGlyph.getBoundingClientRect();
			const height = mark.offsetHeight;
			markBox = { x: from.x, y: from.y, w: mark.offsetWidth, h: height };
			glide = {
				dx: to.left - from.x,
				dy: to.top - from.y,
				scale: height > 0 ? to.height / height : 1,
			};
		}
	};

	let lit = -1;
	let navHidden: boolean | null = null;

	/** Where the scroll says the reel should be, in viewport heights. */
	const target = () => (window.scrollY - top) / vh;

	const render = (scrolled: number) => {
		const intro = clamp01(scrolled / INTRO);
		/* Which card is centred, as a continuous index. */
		const k = Math.min(Math.max((scrolled - INTRO) / STEP, 0), slots.length - 1);

		/* The headline's words. */
		const fade = within(FADE, intro);
		for (const el of fades) {
			el.style.opacity = String(1 - fade);
			el.style.translate = `0 ${-fade * FADE_DRIFT * vh}px`;
		}

		/* The mark, and the hand-off to the nav's own copy of it once it has
		   landed. The two are the same SVG at the same size by then, so the
		   swap does not show. */
		const flight = easeOut(within(GLIDE, intro));
		const landed = flight >= 1;
		if (mark) {
			mark.style.translate = `${glide.dx * flight}px ${glide.dy * flight}px`;
			mark.style.scale = String(lerp(1, glide.scale, flight));
			mark.style.opacity = landed ? '0' : '1';
		}
		brand?.style.setProperty('--reel-brand', landed ? '1' : '0');

		/* The nav. Hidden, it still takes focus — tabbing into it brings it
		   back (SiteNav.astro) — but it stops taking the pointer, so nothing
		   invisible sits over the top of the headline. */
		const nav = easeOut(within(NAV, intro));
		if (shell) {
			shell.style.setProperty('--reel-nav', String(nav));
			const hidden = nav < 0.5;
			if (hidden !== navHidden) {
				shell.toggleAttribute('data-reel-hidden', hidden);
				navHidden = hidden;
			}
		}

		/* Where the mark is this frame, in the pin — the box a rising card must
		   stay under. */
		const markScale = lerp(1, glide.scale, flight);
		const markLeft = markBox.x + glide.dx * flight;
		const markRight = markLeft + markBox.w * markScale;
		const markBottom = markBox.y + glide.dy * flight + markBox.h * markScale;

		/* The cards. */
		const stepX = cardWidth * STEP_X;
		const stepY = stepX * Math.tan(ANGLE);
		slots.forEach((slot, i) => {
			const d = i - k;
			const near = Math.min(Math.abs(d), 1);
			const scale = lerp(1, SIDE_SCALE, near);
			/* The stagger runs outward from the centre card, which at the
			   intro is always the first. */
			const riseStart = RISE_DELAY + Math.min(Math.max(d, 0), RISE_STAGGER_STEPS) * RISE_STAGGER;
			const risen = easeOut(clamp01((intro - riseStart) / RISE_SPAN));
			const x = d * stepX;
			let y = d * stepY + (1 - risen) * RISE * vh;

			/* Never over the mark while it is in the air: a card that shares
			   its column is held under it. */
			if (mark && !landed) {
				const centreX = pinWidth / 2 + x;
				const halfWidth = (cardWidth / 2) * scale;
				const sharesColumn = centreX - halfWidth < markRight && centreX + halfWidth > markLeft;
				const cardTop = cardCentreY + y - (cardHeight / 2) * scale;
				const floor = markBottom + MARK_CLEARANCE;
				if (sharesColumn && cardTop < floor) y += floor - cardTop;
			}

			slot.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
			slot.style.zIndex = String(100 - Math.round(Math.abs(d) * 10));
		});

		const centred = Math.round(k);
		if (centred !== lit) {
			lit = centred;
			cards.forEach((card, i) => card?.toggleAttribute('data-dimmed', i !== lit));
		}
	};

	/* The follower. `current` chases `target()` one frame at a time and the
	   loop stops once it has caught up, so an idle page runs no frames. */
	let current = 0;
	let snap = true;
	let frame = 0;
	let last = 0;

	const tick = (now: number) => {
		frame = 0;
		const goal = target();
		if (snap) {
			current = goal;
			snap = false;
		} else {
			/* Clamped so a frame after a long stall (a background tab) cannot
			   overshoot into a jump. */
			const dt = last ? Math.min(now - last, 64) : 16;
			current += (goal - current) * (1 - Math.exp(-dt / SMOOTHING));
			if (Math.abs(goal - current) < SETTLE) current = goal;
		}
		render(current);
		if (current !== goal) {
			last = now;
			frame = requestAnimationFrame(tick);
		} else {
			last = 0;
		}
	};

	const schedule = () => {
		if (!frame) frame = requestAnimationFrame(tick);
	};

	const onResize = () => {
		measure();
		snap = true;
		schedule();
	};

	/* A card taking focus is scrolled to the centre, so tabbing walks the
	   reel. The browser does not scroll for it on its own: the card is inside
	   a viewport-sized pin, so it already counts as on screen.

	   Instantly, and with the follower snapped rather than gliding. Tab is a
	   keyboard action a reader repeats in quick succession, and motion on
	   every press makes the next one wait on the last. */
	const onFocusIn = (event: FocusEvent) => {
		const index = slots.findIndex((slot) => slot.contains(event.target as Node));
		if (index < 0) return;
		const destination = top + (INTRO + index * STEP) * vh;
		if (Math.abs(window.scrollY - destination) < 1) return;
		snap = true;
		window.scrollTo({ top: destination, behavior: 'instant' });
	};

	let stopped = false;

	/* Web fonts change the headline's size, and so where the mark starts. */
	document.fonts?.ready.then(() => {
		if (!stopped) onResize();
	});

	measure();
	current = target();
	snap = false;
	render(current);
	window.addEventListener('scroll', schedule, { passive: true });
	window.addEventListener('resize', onResize, { passive: true });
	reel.addEventListener('focusin', onFocusIn);

	return () => {
		stopped = true;
		cancelAnimationFrame(frame);
		window.removeEventListener('scroll', schedule);
		window.removeEventListener('resize', onResize);
		reel.removeEventListener('focusin', onFocusIn);

		/* Hand everything back to the stylesheet, so the stacked layout (or
		   the next page) starts clean. */
		for (const el of fades) {
			el.style.removeProperty('opacity');
			el.style.removeProperty('translate');
		}
		mark?.style.removeProperty('translate');
		mark?.style.removeProperty('scale');
		mark?.style.removeProperty('opacity');
		brand?.style.removeProperty('--reel-brand');
		shell?.style.removeProperty('--reel-nav');
		shell?.removeAttribute('data-reel-hidden');
		for (const slot of slots) {
			slot.style.removeProperty('transform');
			slot.style.removeProperty('z-index');
		}
		for (const card of cards) card?.removeAttribute('data-dimmed');
	};
}

/**
 * Runs the reel while REEL_QUERY matches and the stacked layout's spotlight
 * while it does not, switching live as the window crosses the breakpoint or
 * the reader's motion preference changes. Returns a teardown for the page
 * swap.
 */
export function initHomeReel(reel: HTMLElement): () => void {
	const query = window.matchMedia(REEL_QUERY);
	const list = reel.querySelector<HTMLElement>('.reel__track');
	let stop: (() => void) | undefined;

	const apply = () => {
		stop?.();
		stop = query.matches ? startReel(reel) : list ? initWorkSpotlight(list) : undefined;
	};

	apply();
	query.addEventListener('change', apply);

	return () => {
		query.removeEventListener('change', apply);
		stop?.();
		stop = undefined;
	};
}
