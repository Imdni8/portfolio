/**
 * The homepage reel: the headline hands over to the work, then the work runs
 * sideways, then the page carries on down to the footer.
 *
 * The markup (index.astro) is one tall `.reel` section with a sticky,
 * viewport-sized `.reel__pin` inside it. While the pin is stuck, scrolling
 * moves nothing on its own; this file decides where everything inside the pin
 * should be:
 *
 *   intro   — two states and a transition between them, never anything in
 *             between. First screen: the headline, cards peeking in below.
 *             Second: the headline gone, its T mark in the nav's brand slot,
 *             the nav in, the first card centred. The first gesture on the
 *             first screen *plays* the transition, whatever size the gesture
 *             is; a gesture back from the first card plays it in reverse. The
 *             two states sit INTRO viewport-heights apart in the scroll, so
 *             the scroll position always says which one the page is in.
 *   reel    (STEP per card) — the cards slide along a diagonal, one position
 *             per STEP of scroll, and the one at the centre is lit. Driven by
 *             the scroll position, vertical or — on a trackpad — horizontal.
 *   end     — the page ends on the last card. Where the screen has room
 *             under it, the footer is laid over the bottom of the reel
 *             (`data-footer-overlay` on the body) and rises into view as the
 *             last card arrives, so there is nothing further to scroll. Where
 *             it has not, the footer stays in flow and scrolls in after.
 *
 * A plain rAF loop, like chapter-nav.ts, work-spotlight.ts and the nav's
 * scrim — not GSAP's ScrollTrigger, which is scoped to the nav's hover
 * choreography and loads with that island at idle.
 *
 * The reel only runs where REEL_QUERY matches. The same query gates the
 * CSS, so the first paint already matches the first screen and nothing
 * jumps when this module arrives. Everywhere else — narrow screens, reduced
 * motion, no JS — the page is a headline above a plain column of cards, and
 * work-spotlight.ts lights them the way it did before the reel.
 */
import { initWorkSpotlight } from '../work/work-spotlight';

/** Keep in step with the `@media` blocks in index.astro and SiteNav.astro. */
export const REEL_QUERY =
	'(min-width: 64rem) and (prefers-reduced-motion: no-preference) and (scripting: enabled)';

/* ---- Tuning ----------------------------------------------------------------
   Scroll lengths are in viewport heights. */

/** How far down the scroll the second state sits. The intro is played, not
 *  scrubbed, so nothing is drawn from positions inside this stretch — it only
 *  has to exist, so that "at the top" and "at the first card" are two
 *  different places a reader can scroll between. */
const INTRO = 1;
/** Scroll spent moving one card along. */
const STEP = 0.9;
/** Scroll the last card holds for before the page moves on. None: the
 *  footer arrives with the last card instead (see `end` above). */
const TAIL = 0;

/** Total scroll the pinned section takes, in viewport heights. index.astro
 *  sets the section's height from this, so the two cannot drift. */
export const reelLength = (cards: number) => INTRO + Math.max(cards - 1, 0) * STEP + TAIL;

/* The intro's timeline. One second: a signature transition seen a handful of
   times a visit, long enough to follow, short enough that the reader's next
   gesture is not kept waiting. Everything below is a fraction of it. */
const INTRO_DURATION = 1000;

/** The headline's words fade out over this stretch… */
const FADE = [0, 0.3] as const;
/** …drifting up this far as they go, in viewport heights. */
const FADE_DRIFT = 0.04;
/** The T mark's flight into the nav — on-screen movement, so --ease-in-out.
 *  It leads, and lands well before the cards behind it come to rest. */
const GLIDE = [0, 0.6] as const;
/** The nav's fade-in, done the moment the mark lands. The nav's own brand is
 *  inside the faded shell, so anything short of full strength at the
 *  hand-off would show as the mark dimming as it arrives. */
const NAV = [0.3, 0.6] as const;

/** How far below its place a card starts, in viewport heights — the
 *  reference's first frame has the centre card's top at 77% of the screen,
 *  58% below where it comes to rest. */
const RISE = 0.58;
/** The centre card starts rising this far into the intro — a beat behind
 *  the mark, so it follows the mark up instead of catching it. */
const RISE_DELAY = 0.2;
/** Each card's rise takes this much of the intro… */
const RISE_SPAN = 0.6;
/** …starting this much later than the card before it. Two steps of stagger
 *  at most (the cards past that are off screen), which keeps the last rise
 *  inside the intro: 0.2 + 2 × 0.1 + 0.6 = 1. */
const RISE_STAGGER = 0.1;
const RISE_STAGGER_STEPS = 2;
/** The closest a card's top edge may come to the flying mark, in px
 *  (--spacing-3xl). With the timings above it never comes this close — the
 *  narrowest gap on the way is the resting one, checked from 1024×768 to
 *  1920×600 — so this is a guard for viewport shapes the timings were not
 *  checked against, not the thing keeping them apart. */
const MARK_CLEARANCE = 24;

/** The gap kept between the lit card and the footer laid over the reel, and
 *  between the lit card and the nav when the reel lifts to make that gap —
 *  --spacing-3xl, in px. */
const FOOTER_CLEARANCE = 24;
const NAV_CLEARANCE = 24;

/* The diagonal. In the reference the neighbours' centres sit ~825px across
   from the lit card's at a 1230px card width, and ~10° down to the right
   (up to the left), at 83% of its size. Expressed against the card's own
   width so the spacing holds wherever the width is capped by the viewport's
   height rather than its width. The neighbours overlap the lit card's edges
   by design; it sits on top of them. */
const STEP_X = 825 / 1230;
const ANGLE = (10 * Math.PI) / 180;
const SIDE_SCALE = 1022 / 1230;

/* Smoothing. Inside the reel the cards follow the scroll position through a
   short exponential lag instead of being pinned to it — tying motion straight
   to an input reads as mechanical (a wheel notch is a 100px jump, and the
   cards would teleport by it), where a follower that catches up reads as
   having weight. The time constant is how long it takes to close ~63% of the
   gap; at 90ms the reel is within a pixel of the scroll in about half a
   second, and it retargets smoothly if the reader changes direction.

   Not applied to moves the reader did not make with a gesture — the first
   frame, a resize, a restored position, a keyboard jump — which snap. */
const SMOOTHING = 90;
/** Close enough to stop the follower, in viewport heights (~half a pixel). */
const SETTLE = 0.0005;

/** How long the wheel has to go quiet before the gesture that played the
 *  intro counts as over. A trackpad keeps sending a flick's momentum for a
 *  second or more after the fingers lift; until it stops, it is the same
 *  gesture, not a request to carry on into the reel. */
const GESTURE_IDLE = 200;
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

type IntroState = 0 | 1;

function startReel(reel: HTMLElement): () => void {
	const pin = reel.querySelector<HTMLElement>('.reel__pin');
	const slots = [...reel.querySelectorAll<HTMLElement>('.reel__slot')];
	const cards = slots.map((slot) => slot.querySelector<HTMLElement>('.card'));
	const fades = [...reel.querySelectorAll<HTMLElement>('[data-reel-fade]')];
	const mark = reel.querySelector<HTMLElement>('[data-reel-mark]');
	const shell = document.querySelector<HTMLElement>('.nav-shell');
	const brand = shell?.querySelector<HTMLElement>('.nav__brand') ?? null;
	const brandGlyph = brand?.querySelector<SVGElement>('svg') ?? null;
	const footer = document.querySelector<HTMLElement>('.site-footer');

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
	let footerHeight = 0;
	let footerLift = 0; // how far the reel rises to clear the footer, in px

	const measure = () => {
		top = reel.getBoundingClientRect().top + window.scrollY;
		vh = pin.offsetHeight;
		pinWidth = pin.offsetWidth;
		cardWidth = slots[0].offsetWidth;
		cardHeight = slots[0].offsetHeight;
		/* The slot's `top` is its centre line — `translate: -50% -50%` does
		   the centring, and offsetTop ignores it. */
		cardCentreY = slots[0].offsetTop;

		/* Whether the footer fits under the lit card. It needs its own height
		   plus FOOTER_CLEARANCE below the card; the reel may rise to make that
		   room, but not so far that the card meets the nav. If it cannot fit,
		   the footer stays in flow. */
		footerHeight = footer?.offsetHeight ?? 0;
		const cardTop = cardCentreY - cardHeight / 2;
		const cardBottom = cardCentreY + cardHeight / 2;
		const navBottom = shell?.getBoundingClientRect().bottom ?? 0;
		const needed = Math.max(0, footerHeight + FOOTER_CLEARANCE - (vh - cardBottom));
		const available = cardTop - (navBottom + NAV_CLEARANCE);
		const overlay = footer !== null && needed <= available;
		footerLift = overlay ? needed : 0;
		document.body.toggleAttribute('data-footer-overlay', overlay);

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

	/* Scroll positions, relative to the section's top. */
	const scrolled = () => window.scrollY - top;
	const secondAt = () => Math.round(INTRO * vh);
	const lastCardAt = () => secondAt() + (slots.length - 1) * STEP * vh;
	const scrollToOffset = (offset: number) => {
		const y = top + offset;
		if (Math.abs(window.scrollY - y) >= 1) window.scrollTo({ top: y, behavior: 'instant' });
	};

	let lit = -1;
	let navHidden: boolean | null = null;

	/** Draws a frame: the intro at progress `p` (0 → 1, linear in time), the
	 *  reel at `position` (scroll, in viewport heights). */
	const render = (p: number, position: number) => {
		/* Which card is centred, as a continuous index. */
		const k = Math.min(Math.max((position - INTRO) / STEP, 0), slots.length - 1);

		/* The headline's words. */
		const fade = easeOut(within(FADE, p));
		for (const el of fades) {
			el.style.opacity = String(1 - fade);
			el.style.translate = `0 ${-fade * FADE_DRIFT * vh}px`;
		}

		/* The mark, and the hand-off to the nav's own copy of it once it has
		   landed. The two are the same SVG at the same size by then, so the
		   swap does not show. */
		const flight = easeInOut(within(GLIDE, p));
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
		const nav = easeOut(within(NAV, p));
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

		/* The rise that clears the footer, in step with the footer coming up:
		   it enters over the last `footerHeight` of scroll before the end. */
		const footerIn = footerLift > 0 ? clamp01((position * vh - (lastCardAt() - footerHeight)) / footerHeight) : 0;
		const lift = footerLift * footerIn;

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
			const risen = easeOut(clamp01((p - riseStart) / RISE_SPAN));
			const x = d * stepX;
			let y = d * stepY + (1 - risen) * RISE * vh - lift;

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

	/* ---- State -------------------------------------------------------------- */

	/** Which state the intro is at, or heading for. */
	let intro: IntroState = 0;
	/** How far through the intro's timeline the page is, 0 → 1, linear. */
	let introP = 0;
	/** The reel's position, chasing the scroll. */
	let current = 0;
	let snap = true;
	let frame = 0;
	let last = 0;

	const playing = () => introP !== intro;

	/** Plays the intro towards `to`. The scroll moves to that state's
	 *  position at once — nothing is drawn from the stretch in between — and
	 *  the timeline runs on the clock. Reversing mid-way turns it round from
	 *  where it is. */
	const play = (to: IntroState) => {
		intro = to;
		scrollToOffset(to ? secondAt() : 0);
		schedule();
	};

	/** Puts the page in state `to` without playing anything. */
	const jump = (to: IntroState) => {
		intro = to;
		introP = to;
		snap = true;
		scrollToOffset(to ? secondAt() : 0);
		schedule();
	};

	const tick = (now: number) => {
		frame = 0;
		/* Clamped so a frame after a long stall (a background tab) cannot
		   overshoot into a jump. */
		const dt = last ? Math.min(now - last, 64) : 16;

		if (playing()) {
			const step = dt / INTRO_DURATION;
			introP = intro ? Math.min(introP + step, 1) : Math.max(introP - step, 0);
		}

		/* Something other than a gesture or key this file handles — the
		   scrollbar, Home/End, find-in-page, a link back to the top — moved
		   the scroll. The scroll position is what says which state the page is
		   in, so bring the intro into line with it, instantly: left between
		   the two states, snap on to the other one, the way the reader was
		   going; landed on one, take that one. */
		if (!playing()) {
			const offset = scrolled();
			if (offset > 1 && offset < secondAt() - 1) jump(intro ? 0 : 1);
			else if (offset <= 1 && intro === 1) jump(0);
			else if (offset >= secondAt() - 1 && intro === 0) jump(1);
		}

		const goal = scrolled() / vh;
		if (snap) {
			current = goal;
			snap = false;
		} else {
			current += (goal - current) * (1 - Math.exp(-dt / SMOOTHING));
			if (Math.abs(goal - current) < SETTLE) current = goal;
		}

		render(introP, current);

		if (current !== goal || playing()) {
			last = now;
			/* A jump above may already have booked the next frame. */
			if (!frame) frame = requestAnimationFrame(tick);
		} else {
			last = 0;
		}
	};

	function schedule() {
		if (!frame) frame = requestAnimationFrame(tick);
	}

	/* ---- Gestures ------------------------------------------------------------ */

	/** The gesture that last played the intro (or hit the first-card stop),
	 *  while it is still going. Its further events are swallowed. */
	let gesture: { forward: boolean } | null = null;
	let gestureTimer = 0;

	const hold = (forward: boolean) => {
		gesture = { forward };
		window.clearTimeout(gestureTimer);
		gestureTimer = window.setTimeout(() => {
			gesture = null;
		}, GESTURE_IDLE);
	};

	/* Both axes. A trackpad sends horizontal swipes as wheel events too, so a
	   sideways swipe steps through the cards the way the cards themselves
	   move — it is converted to the scroll it stands for, at the rate that
	   keeps a card under the fingers (a card's STEP of scroll moves it
	   STEP_X of a card width across). Whichever axis the gesture mostly
	   moves along is the one it counts as. */
	const onWheel = (event: WheelEvent) => {
		if (event.ctrlKey) return; // a pinch-zoom

		const unit = event.deltaMode === 1 ? LINE_PX : event.deltaMode === 2 ? vh : 1;
		const dx = event.deltaX * unit;
		const dy = event.deltaY * unit;
		const horizontal = Math.abs(dx) > Math.abs(dy);
		const delta = horizontal ? dx : dy;
		if (delta === 0) return;
		const forward = delta > 0;

		/* While the intro plays, or the gesture that started it is still
		   coasting, its events go nowhere — unless it turns round, which is a
		   new request. */
		if (playing() || gesture) {
			const heading = playing() ? intro === 1 : gesture!.forward;
			if (forward === heading) {
				event.preventDefault();
				hold(forward);
				return;
			}
			gesture = null;
			if (playing()) {
				event.preventDefault();
				play(forward ? 1 : 0);
				hold(forward);
				return;
			}
		}

		/* First screen: the first move on plays the intro. */
		if (intro === 0) {
			if (forward) {
				event.preventDefault();
				play(1);
				hold(true);
			}
			return;
		}

		const offset = scrolled();
		const first = secondAt();

		/* First card: a move back plays the intro in reverse. */
		if (!forward && offset <= first + 1) {
			event.preventDefault();
			play(0);
			hold(false);
			return;
		}

		const next = horizontal ? offset + dx * (STEP * vh) / (cardWidth * STEP_X) : offset + dy;

		/* Coming back through the reel stops at the first card rather than
		   carrying straight on into the intro. The rest of that gesture is
		   held; the next one plays the reverse. */
		if (!forward && next < first) {
			event.preventDefault();
			scrollToOffset(first);
			hold(false);
			return;
		}

		/* Sideways only means something while there are cards to step
		   through; past the last one it is left alone. */
		if (horizontal && offset <= lastCardAt() + 1) {
			event.preventDefault();
			scrollToOffset(Math.min(next, lastCardAt()));
		}
	};

	/* Touch, for the intro only — a touch-screen laptop wide enough for the
	   reel. Inside the reel, a finger scrolls the page natively. */
	let touch: { x: number; y: number } | null = null;
	let touchClaimed = false;

	const onTouchStart = (event: TouchEvent) => {
		touchClaimed = false;
		touch = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
	};

	/* A move in the intro's direction is blocked from its very first pixel,
	   before it is far enough to count: once the browser has started
	   scrolling for a touch, the rest of that touch can no longer be
	   cancelled, and the page would slide on past the state it is meant to
	   stop at. */
	const onTouchMove = (event: TouchEvent) => {
		if (!touch) return;
		if (touchClaimed || playing()) {
			if (event.cancelable) event.preventDefault();
			return;
		}
		const dy = touch.y - event.touches[0].clientY;
		const dx = touch.x - event.touches[0].clientX;
		if (dy === 0 || Math.abs(dx) > Math.abs(dy)) return;
		const forward = dy > 0;
		const toSecond = intro === 0 && forward;
		const toFirst = intro === 1 && !forward && scrolled() <= secondAt() + 1;
		if (!toSecond && !toFirst) return;
		if (event.cancelable) event.preventDefault();
		if (Math.abs(dy) < TOUCH_SLOP) return;
		touchClaimed = true;
		play(toSecond ? 1 : 0);
	};

	const onTouchEnd = () => {
		touch = null;
		touchClaimed = false;
	};

	/* The scroll keys, at the two states. Handled here rather than left to the
	   catch-all in `tick`, because the browser animates a key's scroll and
	   would carry on past the state after the page had been put there. They
	   move between the states instantly — a key is a repeated action, and
	   is not made to wait on a transition. Anywhere else, keys scroll as
	   normal. */
	const onKeyDown = (event: KeyboardEvent) => {
		if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
		const target = event.target as HTMLElement | null;
		if (target?.closest('input, textarea, select, [contenteditable]')) return;
		const down = event.key === 'ArrowDown' || event.key === 'PageDown' || (event.key === ' ' && !event.shiftKey);
		const up = event.key === 'ArrowUp' || event.key === 'PageUp' || (event.key === ' ' && event.shiftKey);
		if (down && intro === 0) {
			event.preventDefault();
			jump(1);
		} else if (up && intro === 1 && scrolled() <= secondAt() + 1) {
			event.preventDefault();
			jump(0);
		}
	};

	const onScroll = () => schedule();

	const onResize = () => {
		/* The reel is laid out in viewport heights and the browser keeps the
		   scroll in pixels, so a change of height would leave the page at a
		   different card — or read as a scroll back into the intro. Keep it at
		   the same place in the reel instead. */
		const before = vh > 0 ? scrolled() / vh : 0;
		measure();
		if (before > 0 && before <= reelLength(slots.length)) scrollToOffset(Math.round(before * vh));
		snap = true;
		schedule();
	};

	/* A card taking focus is scrolled to the centre, so tabbing walks the
	   reel. The browser does not scroll for it on its own: the card is inside
	   a viewport-sized pin, so it already counts as on screen.

	   Instantly, with the intro finished and the follower snapped rather than
	   gliding. Tab is a keyboard action a reader repeats in quick succession,
	   and motion on every press makes the next one wait on the last. */
	const onFocusIn = (event: FocusEvent) => {
		const index = slots.findIndex((slot) => slot.contains(event.target as Node));
		if (index < 0) return;
		intro = 1;
		introP = 1;
		snap = true;
		scrollToOffset(secondAt() + index * STEP * vh);
		schedule();
	};

	let stopped = false;

	/* Web fonts change the headline's size, and so where the mark starts. */
	document.fonts?.ready.then(() => {
		if (!stopped) onResize();
	});

	/* Start in whichever state the scroll is already in — the top of the page,
	   or a position restored from history somewhere in the reel. A position
	   left between the two goes to the nearer. */
	measure();
	const start = scrolled();
	if (start <= 1) {
		intro = 0;
		introP = 0;
	} else if (start >= secondAt() - 1) {
		intro = 1;
		introP = 1;
	} else {
		jump(start > secondAt() / 2 ? 1 : 0);
	}
	current = scrolled() / vh;
	snap = false;
	render(introP, current);

	window.addEventListener('scroll', onScroll, { passive: true });
	window.addEventListener('resize', onResize, { passive: true });
	window.addEventListener('wheel', onWheel, { passive: false });
	window.addEventListener('touchstart', onTouchStart, { passive: true });
	window.addEventListener('touchmove', onTouchMove, { passive: false });
	window.addEventListener('touchend', onTouchEnd, { passive: true });
	window.addEventListener('touchcancel', onTouchEnd, { passive: true });
	window.addEventListener('keydown', onKeyDown);
	reel.addEventListener('focusin', onFocusIn);

	return () => {
		stopped = true;
		cancelAnimationFrame(frame);
		window.clearTimeout(gestureTimer);
		window.removeEventListener('scroll', onScroll);
		window.removeEventListener('resize', onResize);
		window.removeEventListener('wheel', onWheel);
		window.removeEventListener('touchstart', onTouchStart);
		window.removeEventListener('touchmove', onTouchMove);
		window.removeEventListener('touchend', onTouchEnd);
		window.removeEventListener('touchcancel', onTouchEnd);
		window.removeEventListener('keydown', onKeyDown);
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
		document.body.removeAttribute('data-footer-overlay');
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
