/**
 * The homepage reel: the headline hands over to the work, and the work sits
 * on a ring the reader drags round.
 *
 * The markup (index.astro) is a viewport-sized `.reel` holding the headline
 * and `.reel__stage`, the ring (work-ring.ts). The page does not scroll while
 * this runs. It has two states and a *played* transition between them,
 * never anything in between:
 *
 *   first screen — the headline, the background's bands at full strength,
 *                  the front card peeking in at the bottom.
 *   ring         — the headline gone, the bands dimmed, all six cards risen
 *                  onto the ring, the footer along the bottom. The nav is
 *                  there throughout.
 *
 * Forward: the first forward gesture on the first screen — a wheel, a swipe
 * up, ArrowDown/PageDown/Space — plays the transition, whatever its size.
 * Back: the logo, and only the logo. Clicking it (or pressing Enter on it)
 * plays the transition in reverse instead of reloading the page.
 *
 * On the ring, a wheel on either axis turns the ring — sideways for a
 * trackpad, vertical so a plain mouse wheel works too — and ArrowLeft/Right
 * step it. Dragging, clicking and focus are work-ring.ts's.
 *
 * The reel only runs where REEL_QUERY matches. The same query gates the
 * CSS. Everywhere else — narrow screens, reduced motion, no JS — the page is
 * a headline above a plain column of cards, and work-spotlight.ts lights
 * them.
 */
import { initWorkSpotlight } from '../work/work-spotlight';
import { createWorkRing } from './work-ring';

/** Keep in step with the `@media` blocks in index.astro and SiteNav.astro. */
export const REEL_QUERY =
	'(min-width: 64rem) and (prefers-reduced-motion: no-preference) and (scripting: enabled)';

/* ---- Tuning ----------------------------------------------------------------
   The intro's timeline. One second: a signature transition seen a handful of
   times a visit, long enough to follow, short enough that the reader's next
   gesture is not kept waiting. Everything below is a fraction of it. */
const INTRO_DURATION = 1000;

/** The headline fades out over this stretch… */
const FADE = [0, 0.3] as const;
/** …drifting up this far as it goes, in viewport heights. */
const FADE_DRIFT = 0.04;
/** The background's bands dim over this stretch, on --ease-in-out (a
 *  colour change on screen, not an arrival)… */
const DIM = [0, 0.6] as const;
/** …down to this opacity, so the ring never sits on the bands at full
 *  strength. Eyeballed; retune by eye. */
const DIM_TO = 0.4;
/** The cards rise onto the ring over this stretch. work-ring.ts staggers
 *  them within it, front card first, on its own curve. */
const RISE = [0.15, 1] as const;
/** The footer rises in over this stretch, by its own height. */
const FOOTER = [0.6, 1] as const;
/** The gap kept between the ring and the footer — --spacing-3xl, in px. */
const FOOTER_CLEARANCE = 24;
/** The room kept between the nav's band and the ring's top, which brings
 *  the ring down toward the middle of the screen — --spacing-5xl, in px. */
const RING_CLEARANCE = 40;

/** How long the wheel has to go quiet before the gesture that played the
 *  intro counts as over. A trackpad keeps sending a flick's momentum for a
 *  second or more after the fingers lift; until it stops, it is the same
 *  gesture, not a request to start turning the ring. */
const GESTURE_IDLE = 200;
/** A ceiling on how long a single gesture can be swallowed for. Without one,
 *  a reader who keeps scrolling holds the lock open indefinitely, and the
 *  very act of trying to turn the ring is what keeps it stuck. */
const GESTURE_MAX = 1500;
/** How far a finger has to travel before a touch counts as a gesture. */
const TOUCH_SLOP = 6;
/** Pixels per line, for wheels that report in lines (Firefox, some mice). */
const LINE_PX = 16;

/* ---- Helpers ----------------------------------------------------------------- */

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const within = ([from, to]: readonly [number, number], t: number) => clamp01((t - from) / (to - from));

/** A CSS cubic-bezier as a function of time, solved by bisection. */
const cubicBezier = (x1: number, y1: number, x2: number, y2: number) => {
	const at = (a: number, b: number, s: number) => 3 * (1 - s) ** 2 * s * a + 3 * (1 - s) * s * s * b + s ** 3;
	return (t: number) => {
		if (t <= 0) return 0;
		if (t >= 1) return 1;
		let lo = 0;
		let hi = 1;
		let s = t;
		for (let i = 0; i < 24; i++) {
			s = (lo + hi) / 2;
			if (at(x1, x2, s) < t) lo = s;
			else hi = s;
		}
		return at(y1, y2, s);
	};
};

/* The intro is played on a clock, so it takes the same two curves as the
   CSS — these mirror --ease-out and --ease-in-out in tokens.css. */
const easeOut = cubicBezier(0.23, 1, 0.32, 1);
const easeInOut = cubicBezier(0.77, 0, 0.175, 1);

/* ---- The reel ---------------------------------------------------------------- */

type IntroState = 0 | 1;

function startReel(reel: HTMLElement): () => void {
	const stage = reel.querySelector<HTMLElement>('.reel__stage');
	const fades = [...reel.querySelectorAll<HTMLElement>('[data-reel-fade]')];
	const brand = document.querySelector<HTMLElement>('.nav__brand');
	const footer = document.querySelector<HTMLElement>('.home-footer');
	const liveRegion = reel.querySelector<HTMLElement>('[data-ring-status]');
	const titles = [...reel.querySelectorAll<HTMLElement>('.reel__slot')].map((el) => el.dataset.title ?? '');
	/* The bands' host, not their canvas: the canvas's own opacity is its
	   fade-in (components.css), and the two must not fight. */
	const blinds = document.querySelector<HTMLElement>('[data-gradient-blinds]');

	if (!stage) return () => {};

	/* The footer is laid over the bottom of the screen before the ring
	   measures, so the ring is fitted to the layout it will actually have. */
	document.body.setAttribute('data-footer-overlay', '');

	const shell = document.querySelector<HTMLElement>('.nav-shell');
	const ring = createWorkRing(stage, {
		onActive: (index) => {
			if (liveRegion) liveRegion.textContent = `${titles[index] ?? ''}, ${index + 1} of ${titles.length}`;
		},
		/* The ring keeps clear of the nav's band and of the footer, plus
		   FOOTER_CLEARANCE above it. The footer itself, not its wrapper: the
		   wrapper also holds the footer's 75px top margin, which is empty.
		   Offsets, not rects, so the footer's own `translate` (its
		   entrance) never moves the ring. */
		room: () => ({
			top: (shell?.offsetHeight ?? 0) + RING_CLEARANCE,
			bottom: (footer?.querySelector<HTMLElement>('.site-footer')?.offsetHeight ?? 0) + FOOTER_CLEARANCE,
		}),
	});
	if (!ring) {
		document.body.removeAttribute('data-footer-overlay');
		return () => {};
	}

	/* ---- State -------------------------------------------------------------- */

	/** Which state the intro is at, or heading for. */
	let intro: IntroState = 0;
	/** How far through the intro's timeline the page is, 0 → 1, linear. */
	let introP = 0;
	let frame = 0;
	let last = 0;

	const playing = () => introP !== intro;

	/** Draws the intro at progress `p` (0 → 1, linear in time). */
	const render = (p: number) => {
		const vh = window.innerHeight;
		const fade = easeOut(within(FADE, p));
		for (const el of fades) {
			el.style.opacity = String(1 - fade);
			el.style.translate = `0 ${-fade * FADE_DRIFT * vh}px`;
		}
		if (blinds) blinds.style.opacity = String(lerp(1, DIM_TO, easeInOut(within(DIM, p))));
		ring.setIntro(within(RISE, p));
		if (footer) footer.style.translate = `0 ${(1 - easeOut(within(FOOTER, p))) * footer.offsetHeight}px`;
	};

	const tick = (now: number) => {
		frame = 0;
		/* Clamped so a frame after a long stall (a background tab) cannot
		   overshoot into a jump. */
		const dt = last ? Math.min(now - last, 64) : 16;
		const stepP = dt / INTRO_DURATION;
		introP = intro ? Math.min(introP + stepP, 1) : Math.max(introP - stepP, 0);
		render(introP);
		if (playing()) {
			last = now;
			frame = requestAnimationFrame(tick);
		} else {
			last = 0;
			ring.setLive(intro === 1);
		}
	};

	/** Plays the intro towards `to`. Reversing mid-way turns it round from
	 *  where it is. */
	const play = (to: IntroState) => {
		intro = to;
		ring.setLive(false);
		if (!frame) frame = requestAnimationFrame(tick);
	};

	/** Puts the page in state `to` without playing anything. */
	const jump = (to: IntroState) => {
		cancelAnimationFrame(frame);
		frame = 0;
		last = 0;
		intro = to;
		introP = to;
		render(introP);
		ring.setLive(to === 1);
	};

	/* ---- Gestures ------------------------------------------------------------ */

	/** The gesture that last played the intro, while it is still going. Its
	 *  further events are swallowed. `start` is when it began (GESTURE_MAX). */
	let gesture: { start: number } | null = null;
	let gestureTimer = 0;

	const hold = () => {
		gesture = { start: gesture?.start ?? performance.now() };
		window.clearTimeout(gestureTimer);
		gestureTimer = window.setTimeout(() => {
			gesture = null;
		}, GESTURE_IDLE);
	};

	const onWheel = (event: WheelEvent) => {
		if (event.ctrlKey) return; // a pinch-zoom
		/* The page doesn't scroll while the reel runs, so no wheel should
		   try to — including the browser's sideways back/forward swipe. */
		event.preventDefault();

		const unit = event.deltaMode === 1 ? LINE_PX : event.deltaMode === 2 ? window.innerHeight : 1;
		const dx = event.deltaX * unit;
		const dy = event.deltaY * unit;
		const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
		if (delta === 0) return;

		if (gesture && performance.now() - gesture.start > GESTURE_MAX) gesture = null;

		/* While the intro plays, or the gesture that started it is still
		   coasting, the wheel goes nowhere. A forward move during the
		   reverse (the logo) turns it back round. */
		if (playing() || gesture) {
			if (playing() && intro === 0 && delta > 0) play(1);
			hold();
			return;
		}

		/* First screen: the first move on plays the intro. */
		if (intro === 0) {
			if (delta > 0) {
				play(1);
				hold();
			}
			return;
		}

		ring.wheel(delta);
	};

	/* Touch: a swipe up on the first screen plays the intro. On the ring, a
	   finger drags the ring (work-ring.ts); the pin is `touch-action: none`,
	   so the page never scrolls under it. */
	let touch: { x: number; y: number } | null = null;
	let touchClaimed = false;

	const onTouchStart = (event: TouchEvent) => {
		touchClaimed = false;
		touch = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
	};

	const onTouchMove = (event: TouchEvent) => {
		if (!touch || touchClaimed || intro === 1) return;
		const dy = touch.y - event.touches[0].clientY;
		const dx = touch.x - event.touches[0].clientX;
		if (dy < TOUCH_SLOP || Math.abs(dx) > Math.abs(dy)) return;
		touchClaimed = true;
		play(1);
	};

	const onTouchEnd = () => {
		touch = null;
		touchClaimed = false;
	};

	/* Keys. On the first screen, the scroll keys move to the ring — at once:
	   a key is a repeated action, and is not made to wait on a transition. On
	   the ring, ArrowLeft/Right step it. */
	const onKeyDown = (event: KeyboardEvent) => {
		if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
		const target = event.target as HTMLElement | null;
		if (target?.closest('input, textarea, select, [contenteditable]')) return;
		const down = event.key === 'ArrowDown' || event.key === 'PageDown' || (event.key === ' ' && !event.shiftKey);
		if (intro === 0 && !playing() && down) {
			event.preventDefault();
			jump(1);
		} else if (intro === 1 && !playing() && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
			event.preventDefault();
			ring.stepBy(event.key === 'ArrowRight' ? 1 : -1);
		}
	};

	/* The logo is the way back. On this page it would only reload the page
	   it is on, so it plays the intro in reverse instead. Capture, on the
	   window, so this runs before the router's own click handling and the
	   router sees the click as already handled. */
	const onBrandClick = (event: MouseEvent) => {
		if (!brand || !(event.target instanceof Node) || !brand.contains(event.target)) return;
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		event.preventDefault();
		if (intro === 1) play(0);
	};

	const onResize = () => render(introP);

	/* Focus landing on a card from the first screen (Tab) puts the page on
	   the ring, at once — a card must never be focused while it is out of
	   sight below the frame. */
	const onFocusIn = (event: FocusEvent) => {
		if (intro === 0 && event.target instanceof Element && event.target.closest('.reel__slot')) jump(1);
	};

	render(0);

	window.addEventListener('wheel', onWheel, { passive: false });
	window.addEventListener('touchstart', onTouchStart, { passive: true });
	window.addEventListener('touchmove', onTouchMove, { passive: true });
	window.addEventListener('touchend', onTouchEnd, { passive: true });
	window.addEventListener('touchcancel', onTouchEnd, { passive: true });
	window.addEventListener('keydown', onKeyDown);
	window.addEventListener('click', onBrandClick, true);
	window.addEventListener('resize', onResize, { passive: true });
	reel.addEventListener('focusin', onFocusIn);

	return () => {
		cancelAnimationFrame(frame);
		window.clearTimeout(gestureTimer);
		window.removeEventListener('wheel', onWheel);
		window.removeEventListener('touchstart', onTouchStart);
		window.removeEventListener('touchmove', onTouchMove);
		window.removeEventListener('touchend', onTouchEnd);
		window.removeEventListener('touchcancel', onTouchEnd);
		window.removeEventListener('keydown', onKeyDown);
		window.removeEventListener('click', onBrandClick, true);
		window.removeEventListener('resize', onResize);
		reel.removeEventListener('focusin', onFocusIn);
		ring.destroy();

		/* Hand everything back to the stylesheet, so the stacked layout (or
		   the next page) starts clean. */
		for (const el of fades) {
			el.style.removeProperty('opacity');
			el.style.removeProperty('translate');
		}
		blinds?.style.removeProperty('opacity');
		footer?.style.removeProperty('translate');
		document.body.removeAttribute('data-footer-overlay');
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
	const list = reel.querySelector<HTMLElement>('.work-list');
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
