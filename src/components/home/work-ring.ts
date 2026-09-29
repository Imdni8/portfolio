/**
 * The homepage's work ring: the case-study covers on a panorama the reader
 * drags round, with the front card's details underneath.
 *
 * A port of React Bits' <CircularCarousel /> (https://reactbits.dev), preset
 * `panorama`, written without React, the way gradient-blinds.ts is, so the
 * homepage still ships none. The camera is inside the ring, looking out,
 * and each card is bent to the ring's curve — so the front card faces you
 * and its neighbours sweep out past both edges of the screen, where the
 * stage's mask fades them away. Kept from upstream: the spring that settles
 * on the nearest card, the drag with its flick and momentum, the camera
 * leaning toward the pointer, the ring swelling slightly when spun fast,
 * cards fading into the ground as they turn away, a side card clicked to the
 * front, the caption, and the "rise" entrance. Left out: autoplay (the ring
 * only moves when the reader moves it) and the caption's counter. Changed:
 * the camera sits well back from the ring rather than at its centre (see
 * DISTANCE), so the front card reads nearly flat.
 *
 * The markup is index.astro's: `.reel__stage` (the space the ring gets, and
 * the drag) > `.reel__lens` (the perspective, and the scale that fits the
 * ring) > `.reel__camera` > the `<ol>`, which is the ring > one `.reel__slot`
 * per card > `.reel__card` (the link) > its cover, cut into `.reel__tile`
 * strips so it can bend. Beside the lens, `.reel__captions`: one caption per
 * card.
 *
 * Only the entrance is driven from outside — `setIntro(q)`, by home-reel.ts,
 * which owns the intro's clock. Everything else — drag, wheel, keys, clicks,
 * focus — is handled here, and only while the ring is `live`.
 */

/* ---- Tuning ----------------------------------------------------------------
   The panorama preset's values, and the reference's (tilt 0, parallax
   0.12), unless noted. */

/** Camera angle in degrees. */
const TILT = 0;
/** A card's width divided by its height — the covers' own frame (1303×770,
 *  as WorkCard's `.card__media`). */
const ASPECT = 1303 / 770;
/** How far back the camera sits, as a multiple of the ring's radius (the
 *  lens's perspective). Upstream's panorama puts it at 1, the ring's centre,
 *  where a card's two ends are much nearer than its middle and its top and
 *  bottom edges bow hard. Three radii back, the front card's edges are
 *  close to straight (the ends drawn ~4% larger than the middle, against
 *  ~14% at the centre), and the neighbours still sit right beside it. */
const DISTANCE = 3;
/** Card corner radius — --radius-lg, in px. */
const CORNER = 10;
/** Adjacent strips overlap by this much (px), so no seam shows between
 *  them. */
const OVERLAP = 2.5;
/** A card whose centre has turned further than this from the front is not
 *  drawn: from the ring's centre, it is behind the camera. */
const HIDE_PAST = 86;
/** The spring that settles the ring on a card: stiffness, critically damped. */
const SPRING = 118;
/** Below this angular speed (deg/s) a coasting ring starts settling. */
const SETTLE_SPEED = 9;
/** How long a flick keeps gliding, 0–1. */
const MOMENTUM = 0.6;
/** How far the camera leans toward the pointer, 0–1. */
const PARALLAX = 0.12;
/** How much the ring swells outward when spun fast, 0–1. */
const STRETCH = 0.5;
/** How strongly cards darken into the ground as they turn away, 0–1. */
const DEPTH_FADE = 0.55;
/** A pointer has to travel this far (px) before a press becomes a drag. */
const DRAG_THRESHOLD = 5;
/** How long the wheel has to go quiet before the ring settles (ms). */
const WHEEL_IDLE = 140;
/** The space kept between the ring and the captions under it —
 *  --spacing-3xl, in px. */
const CAPTION_GAP = 24;
/** The entrance: each card's start is delayed by up to this share of it, in
 *  proportion to how far round the ring it sits from the front… */
const RISE_STAGGER = 0.35;
/** …so the front card lands first. On the first screen, before the
 *  entrance, the three leading cards peek in along the bottom edge: the two
 *  either side of the front with their highest visible point this far above
 *  it (--spacing-5xl, in px)… */
const PEEK_SIDE = 40;
/** …and the front card 8px higher than them. */
const PEEK_FRONT = 48;

const TO_RAD = Math.PI / 180;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const wrap = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180;
const easeOutQuint = (t: number) => 1 - (1 - t) ** 5;

/** A length token's px value — a custom property's computed value is its
 *  raw text ("1.5rem"), so the unit is resolved here. */
const tokenPx = (el: Element, name: string, fallback: number) => {
	const raw = getComputedStyle(el).getPropertyValue(name).trim();
	const value = parseFloat(raw);
	if (Number.isNaN(value)) return fallback;
	if (raw.endsWith('rem')) return value * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16);
	return value;
};

/** A custom property's raw computed value — for anything that isn't a
 *  length, such as an easing token. `Element.animate()` doesn't resolve
 *  `var(...)`, so a curve has to be read out as its literal cubic-bezier
 *  before it can drive a Web Animation. */
const tokenValue = (el: Element, name: string, fallback: string) => getComputedStyle(el).getPropertyValue(name).trim() || fallback;

export type WorkRing = {
	/** How far through the entrance the ring is, 0 (on the first screen) to
	 *  1 (on the ring). */
	setIntro: (q: number) => void;
	/** Whether the ring takes input. Off on the first screen and while the
	 *  intro plays. */
	setLive: (live: boolean) => void;
	/** Turns card `index` to the front. */
	focusIndex: (index: number, instant?: boolean) => void;
	/** Steps the ring by `delta` cards; positive is the next card. */
	stepBy: (delta: number) => void;
	/** Turns the ring by a wheel or trackpad delta, in px; positive is
	 *  toward the next card. */
	wheel: (delta: number) => void;
	destroy: () => void;
};

export type WorkRingOptions = {
	/** Called when a different card reaches the front. */
	onActive?: (index: number) => void;
	/** The screen the ring must keep clear, in px from the top and the
	 *  bottom of the viewport — the nav's band and the footer. Re-read on
	 *  every measure. */
	room?: () => { top: number; bottom: number };
};

export function createWorkRing(stage: HTMLElement, { onActive, room }: WorkRingOptions = {}): WorkRing | null {
	const lens = stage.querySelector<HTMLElement>('.reel__lens');
	const camera = stage.querySelector<HTMLElement>('.reel__camera');
	const ring = stage.querySelector<HTMLElement>('.reel__ring');
	const probe = stage.querySelector<HTMLElement>('.reel__probe');
	const captionBox = stage.querySelector<HTMLElement>('.reel__captions');
	const slots = [...stage.querySelectorAll<HTMLElement>('.reel__slot')];
	const cards = slots.map((slot) => slot.querySelector<HTMLElement>('.reel__card'));
	const captions = [...stage.querySelectorAll<HTMLElement>('.reel__caption')];
	if (!lens || !camera || !ring || !probe || slots.length === 0) return null;

	const count = slots.length;
	const step = 360 / count;

	/* Measured on start and on resize. */
	let cardW = 0;
	let cardH = 0;
	let radius = 0;
	let fit = 1;
	let drop = 0; // how far below its place a card starts, in card px
	let peekFront = 0; // how far the front card waits below its place
	let peekSide = 0; // the same for the two either side of it

	const state = {
		angle: 0,
		velocity: 0,
		target: null as number | null,
		drag: false,
		press: null as null | {
			id: number;
			x: number;
			angle: number;
			moved: boolean;
			origin: number;
			samples: { time: number; angle: number }[];
		},
		suppressClick: false,
		opening: false,
		pointer: { inside: false, x: 0, y: 0 },
		yaw: 0,
		pitch: 0,
		intro: 0,
		live: false,
		last: 0,
		wheelTimer: 0,
	};

	let active = -1;
	let raf = 0;

	const nearest = (angle: number) => Math.round(angle / step) * step;

	/* ---- Measure ----------------------------------------------------------------
	   The card size, the ring, each card's strips, the fit, and where the
	   entrance starts each card from. */
	const measure = () => {
		const clear = room?.() ?? { top: 0, bottom: 0 };
		stage.style.setProperty('--ring-top', `${clear.top}px`);
		stage.style.setProperty('--ring-bottom', `${clear.bottom}px`);
		const captionSpace = (captionBox?.offsetHeight ?? 0) + CAPTION_GAP;
		stage.style.setProperty('--ring-caption', `${captionSpace}px`);

		/* The stage is the whole screen; the ring's box (the lens) sits
		   inside it, between the room kept top and bottom and the captions. */
		const rect = stage.getBoundingClientRect();
		if (!rect.width || !rect.height) return;
		const lensTop = rect.top + clear.top;
		const lensH = rect.height - clear.top - clear.bottom - captionSpace;
		cardW = probe.offsetWidth;
		cardH = cardW / ASPECT;

		/* The ring's radius is its arc: the cards laid end to end round it,
		   each with its gap. The camera is DISTANCE radii back from the
		   front card. */
		const gap = tokenPx(stage, '--ring-gap', 24);
		radius = Math.max((count * (cardW + gap)) / (2 * Math.PI), cardW * 0.6);
		const P = radius * DISTANCE;
		lens.style.setProperty('--ring-perspective', `${P}px`);

		/* Each card's strips, set on the arc: strip i covers its share of the
		   card's width (overlapping its neighbours by OVERLAP), sits at the
		   angle its centre subtends, and turns to face the centre. Its photo
		   is the whole cover, offset so the strip shows its own slice. */
		for (const card of cards) {
			const tiles = card ? [...card.querySelectorAll<HTMLElement>('.reel__tile')] : [];
			const total = tiles.length;
			const length = cardW / total;
			tiles.forEach((tile, i) => {
				const start = i * length - (i > 0 ? OVERLAP / 2 : 0);
				const end = (i + 1) * length + (i < total - 1 ? OVERLAP / 2 : 0);
				const size = end - start;
				const alpha = ((start + end) / 2 - cardW / 2) / radius;
				const shift = radius * Math.sin(alpha);
				const depth = radius * (1 - Math.cos(alpha));
				Object.assign(tile.style, {
					left: `${-size / 2}px`,
					top: `${-cardH / 2}px`,
					width: `${size}px`,
					height: `${cardH}px`,
					transform: `translate3d(${shift}px, 0, ${depth}px) rotateY(${-alpha / TO_RAD}deg)`,
				});
				const first = i === 0;
				const last = i === total - 1;
				const frame = tile.querySelector<HTMLElement>('.reel__frame');
				if (frame) {
					frame.style.borderRadius = `${first ? CORNER : 0}px ${last ? CORNER : 0}px ${last ? CORNER : 0}px ${first ? CORNER : 0}px`;
				}
				const photo = tile.querySelector<HTMLElement>('.reel__photo');
				if (photo) {
					Object.assign(photo.style, { left: `${-start}px`, width: `${cardW}px`, height: `${cardH}px` });
				}
			});
		}


		/* The entrance. A point on the ring at angle φ from straight ahead
		   is drawn at P / (P − R + 1 + R cos φ) of its size (the front card
		   sits 1px in front of the lens's plane, `translate3d(0, 0, R − 1)`)
		   — larger the further round it is. A card lowered below the horizon
		   therefore curves *down* toward its far end, and its highest point
		   is the part nearest the camera: the front card's middle (φ = 0),
		   and a side card's inner end (one step round, less half a card). A
		   lift, in the card's own px, puts that point `above` px over the
		   bottom edge when lift × fit × scale spans the gap. A card starts
		   well below the frame; the three leading cards wait at their
		   peeks. */
		const half = cardW / 2 / radius; // a card's half-width, as an angle (rad)
		const scaleAt = (phi: number) => P / (P - radius + 1 + radius * Math.cos(phi));

		/* The fit: height only, as upstream — the ring runs off both sides
		   by design — and against the front card's ends, which are drawn a
		   little taller than its middle (see DISTANCE). */
		fit = Math.min(1, lensH / (cardH * scaleAt(half)));
		stage.style.setProperty('--ring-fit', String(fit));

		const centreY = lensTop + lensH / 2;
		const vh = window.innerHeight;
		const lift = (phi: number, above: number) =>
			Math.max(0, (vh - above - centreY) / fit / scaleAt(phi) + cardH / 2);
		drop = (vh / fit) * 1.25 + cardH;
		peekFront = lift(0, PEEK_FRONT);
		peekSide = lift(step * TO_RAD - half, PEEK_SIDE);
	};

	/* ---- Drawing -------------------------------------------------------------- */
	const setActive = (index: number) => {
		if (index === active) return;
		active = index;
		captions.forEach((caption, i) => caption.toggleAttribute('data-active', i === index));
		onActive?.(index);
	};

	const render = () => {
		const swell = 1 + STRETCH * 0.12 * Math.min(1, Math.abs(state.velocity) / 420);
		const R = radius * swell;
		camera.style.transform = `translate3d(0, 0, ${radius - 1}px) rotateX(${TILT + state.pitch}deg) rotateY(${state.yaw}deg)`;
		ring.style.transform = `rotateY(${state.angle}deg)`;

		for (let i = 0; i < count; i++) {
			/* Card i+1 sits one step to the right of card i, so the ring reads
			   left to right the way the counter counts. */
			const base = -i * step;
			const world = wrap(base + state.angle);
			const reach = Math.abs(world);

			/* The entrance: each card rises from below the frame, the front
			   one first and the far side last. The three leading cards start
			   from their peeks rather than out of sight. */
			const delay = (reach / 180) * RISE_STAGGER;
			const risen = easeOutQuint(clamp((state.intro - delay) / (1 - RISE_STAGGER), 0, 1));
			const from = reach < step / 2 ? peekFront : reach < step * 1.5 ? peekSide : drop;
			const lift = (1 - risen) * from;

			slots[i].style.transform = `rotateY(${base}deg) translateZ(${-R}px) translateY(${lift}px)`;
			slots[i].style.visibility = reach > HIDE_PAST ? 'hidden' : '';
			const facing = Math.cos(world * TO_RAD);
			cards[i]?.style.setProperty('--ring-depth', (DEPTH_FADE * ((1 - facing) / 2) ** 1.25).toFixed(3));
		}

		setActive(((Math.round(state.angle / step) % count) + count) % count || 0);
	};

	/* ---- Motion ---------------------------------------------------------------
	   One rAF loop, running only while something moves: the spring, a
	   coasting flick, or the camera catching up with the pointer. */
	const advance = (dt: number) => {
		let busy = state.drag;

		if (state.drag) {
			/* The pointer owns the angle. */
		} else if (state.target !== null) {
			let remaining = dt;
			const damping = 2 * Math.sqrt(SPRING);
			while (remaining > 0) {
				const h = Math.min(remaining, 1 / 240);
				const accel = SPRING * (state.target - state.angle) - damping * state.velocity;
				state.velocity += accel * h;
				state.angle += state.velocity * h;
				remaining -= h;
			}
			if (Math.abs(state.target - state.angle) < 0.004 && Math.abs(state.velocity) < 0.03) {
				state.angle = state.target;
				state.velocity = 0;
				state.target = null;
			}
			busy = true;
		} else if (state.velocity !== 0) {
			/* A flick, gliding down to rest and then settling on a card. */
			const tau = 0.18 + MOMENTUM * 1.5;
			state.velocity *= Math.exp(-dt / tau);
			state.angle += state.velocity * dt;
			if (Math.abs(state.velocity) < SETTLE_SPEED) state.target = nearest(state.angle);
			busy = true;
		}

		const ease = 1 - Math.exp(-dt / 0.35);
		const aimYaw = state.live && state.pointer.inside ? state.pointer.x * PARALLAX * 9 : 0;
		const aimPitch = state.live && state.pointer.inside ? -state.pointer.y * PARALLAX * 6 : 0;
		state.yaw += (aimYaw - state.yaw) * ease;
		state.pitch += (aimPitch - state.pitch) * ease;
		if (Math.abs(aimYaw - state.yaw) > 0.01 || Math.abs(aimPitch - state.pitch) > 0.01) busy = true;

		return busy;
	};

	const frame = (now: number) => {
		raf = 0;
		const dt = state.last ? Math.min((now - state.last) / 1000, 0.05) : 1 / 60;
		state.last = now;
		const busy = advance(dt);
		render();
		if (busy && !document.hidden) raf = requestAnimationFrame(frame);
		else state.last = 0;
	};

	const wake = () => {
		if (!raf && !document.hidden) raf = requestAnimationFrame(frame);
	};

	/* ---- Input ------------------------------------------------------------------
	   The ring turns the way the hand goes: a drag to the left carries the
	   front card left and brings the next one in from the right. From inside
	   the ring that means the angle runs the opposite way to the pointer. */
	const perPixel = () => 180 / (Math.PI * radius * fit);

	const focusIndex = (index: number, instant = false) => {
		let target = index * step;
		target += 360 * Math.round((state.angle - target) / 360);
		if (instant) {
			state.angle = target;
			state.velocity = 0;
			state.target = null;
			render();
			return;
		}
		state.target = target;
		wake();
	};

	const stepBy = (delta: number) => {
		const base = state.target ?? nearest(state.angle);
		state.target = base + delta * step;
		wake();
	};

	const wheel = (delta: number) => {
		if (!state.live) return;
		const d = delta * perPixel();
		state.target = null;
		state.angle += d;
		state.velocity = d * 30;
		window.clearTimeout(state.wheelTimer);
		state.wheelTimer = window.setTimeout(() => {
			state.target = nearest(state.angle + state.velocity * 0.12);
			state.velocity = 0;
			wake();
		}, WHEEL_IDLE);
		render();
	};

	const slotOf = (target: EventTarget | null) =>
		target instanceof Element ? slots.findIndex((slot) => slot.contains(target)) : -1;

	/* ---- Opening a card ---------------------------------------------------
	   The front card's link is a real navigation (`data-astro-reload`), and
	   the site opts into cross-document view transitions (tokens.css §3b),
	   so the case study opens on a snapshot of this page's last frame. The
	   motion is split across the two documents so the cover never stops
	   growing:

	   1. Here, a flat copy of the cover is laid exactly over the card and
	      grown, on `transform` alone, past every edge of the screen. The
	      navigation starts the moment the copy covers the screen rather than
	      when the animation ends, so the cover is still growing while the
	      next page loads instead of freezing on its last frame.
	   2. There, CaseStudyLayout's inline pagereveal script finds
	      RING_OPEN_KEY and marks the transition, and tokens.css keeps the
	      snapshot growing while it fades out over the study.

	   Appended to <body>: `.reel__lens`'s `perspective` would otherwise
	   become the containing block for `position: fixed`. */
	const OPEN_MS = 700; // only the head of it plays here — at 1440×900 the screen is covered ~150ms in
	const OVERSHOOT = 1.3; // how far past covering the screen the cover grows
	const RING_OPEN_KEY = 'ring-open'; // read by the inline script in CaseStudyLayout.astro
	let opener: { panel: HTMLDivElement; photo: HTMLImageElement } | null = null;

	const ensureOpener = () => {
		if (!opener) {
			const panel = document.createElement('div');
			const photo = document.createElement('img');
			panel.setAttribute('aria-hidden', 'true');
			photo.alt = '';
			Object.assign(panel.style, {
				position: 'fixed',
				inset: '0',
				zIndex: '1000', // above the nav (20), Lightbox (100) and Toast (110)
				overflow: 'hidden',
				opacity: '0',
				pointerEvents: 'none',
			});
			Object.assign(photo.style, {
				position: 'absolute',
				top: '0',
				left: '0',
				display: 'block',
				maxWidth: 'none',
				objectFit: 'cover',
				objectPosition: 'center top',
				transformOrigin: '0 0',
			});
			panel.append(photo);
			document.body.append(panel);
			opener = { panel, photo };
		}
		return opener;
	};

	/* Coming back through the back/forward cache restores the page exactly as
	   it was left, with the panel still covering it. */
	const resetOpener = () => {
		state.opening = false;
		document.documentElement.style.removeProperty('view-transition-name');
		if (!opener) return;
		for (const animation of opener.panel.getAnimations({ subtree: true })) animation.cancel();
		opener.panel.style.opacity = '0';
	};

	const onPageShow = (event: PageTransitionEvent) => {
		if (event.persisted) resetOpener();
	};

	/* This page's <html> carries Astro's `transition:animate="none"`, which
	   Astro turns into a generated view-transition-name, so the outgoing
	   snapshot would be captured under that name rather than `root`, where
	   no stylesheet can reach it. Names set in `pageswap` are read when the
	   old state is captured, so the snapshot is renamed to one tokens.css
	   can target. */
	const onPageSwap = (event: Event) => {
		if (!state.opening || !('viewTransition' in event) || !event.viewTransition) return;
		document.documentElement.style.setProperty('view-transition-name', RING_OPEN_KEY);
	};

	const navigate = (href: string) => {
		try {
			sessionStorage.setItem(RING_OPEN_KEY, new URL(href, window.location.href).pathname);
		} catch {
			/* Storage can be switched off; the study then opens on the default cross-fade. */
		}
		window.location.assign(href);
	};

	type Box = { left: number; top: number; right: number; bottom: number };

	/* The eased progress (0–1) at which the growing cover first spans the
	   whole screen. Translate and scale each interpolate linearly in
	   progress, so every edge does too, and each edge's crossing solves
	   directly. */
	const coveredAt = (from: Box, to: Box, vw: number, vh: number) => {
		const cross = (a: number, b: number) => (a <= 0 ? 0 : a / (a - b)); // first p where a + (b − a)·p ≤ 0
		return Math.min(
			1,
			Math.max(
				cross(from.left, to.left),
				cross(from.top, to.top),
				cross(vw - from.right, vw - to.right),
				cross(vh - from.bottom, vh - to.bottom),
			),
		);
	};

	/* The card's box is 0×0 (its strips hold the picture), so its outline on
	   screen is read from the strips. The ends are drawn ~4% taller than the
	   middle (see DISTANCE), so the height comes from a middle strip. */
	const outlineOf = (card: HTMLElement): Box => {
		const strips = [...card.querySelectorAll('.reel__tile')].map((tile) => tile.getBoundingClientRect());
		const middle = strips[strips.length >> 1];
		return {
			left: Math.min(...strips.map((r) => r.left)),
			right: Math.max(...strips.map((r) => r.right)),
			top: middle.top,
			bottom: middle.bottom,
		};
	};

	const openCard = (card: HTMLElement, href: string) => {
		const { panel, photo } = ensureOpener();

		/* Reduced motion: no growth, and tokens.css turns the view transition
		   off entirely, so the page dims to the ground and the study cuts in. */
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			photo.style.visibility = 'hidden';
			panel.style.background = 'var(--home-ground)';
			panel.style.opacity = '1';
			const fade = panel.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease' });
			Promise.race([fade.finished, new Promise((resolve) => window.setTimeout(resolve, 400))])
				.catch(() => {})
				.finally(() => navigate(href));
			return;
		}

		const easeOut = tokenValue(stage, '--ease-out', 'cubic-bezier(0.23, 1, 0.32, 1)');
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const imageH = vw / ASPECT;
		const from = outlineOf(card);
		const fromScale = (from.right - from.left) / vw;
		const toScale = Math.max(1, vh / imageH) * OVERSHOOT;
		const to: Box = {
			left: (vw - toScale * vw) / 2,
			top: (vh - toScale * imageH) / 2,
			right: (vw + toScale * vw) / 2,
			bottom: (vh + toScale * imageH) / 2,
		};

		const source = card.querySelector<HTMLImageElement>('.reel__photo');
		photo.src = source?.currentSrc || source?.src || '';
		photo.style.visibility = '';
		photo.style.width = `${vw}px`;
		photo.style.height = `${imageH}px`;
		/* In the photo's own px, so it scales with it: the card's corner at
		   the start, and off-screen by the time it would read as too round. */
		photo.style.borderRadius = `${(CORNER * vw) / cardW}px`;
		panel.style.background = '';
		panel.style.opacity = '1';

		const grow = photo.animate(
			[
				{ transform: `translate(${from.left}px, ${from.top}px) scale(${fromScale})` },
				{ transform: `translate(${to.left}px, ${to.top}px) scale(${toScale})` },
			],
			{ duration: OPEN_MS, easing: easeOut, fill: 'forwards' },
		);

		/* Hand over as soon as the screen is covered. The deadline is for an
		   animation that never reports progress, so the reader isn't stranded. */
		const covered = coveredAt(from, to, vw, vh);
		const deadline = performance.now() + OPEN_MS + 400;
		const watch = () => {
			if (!state.opening) return;
			const progress = grow.effect?.getComputedTiming().progress;
			const done = progress == null ? grow.playState === 'finished' : progress >= covered;
			if (done || performance.now() > deadline) navigate(href);
			else requestAnimationFrame(watch);
		};
		requestAnimationFrame(watch);
	};

	const onPointerDown = (event: PointerEvent) => {
		state.suppressClick = false;
		if (!state.live || event.button !== 0) return;
		state.press = {
			id: event.pointerId,
			x: event.clientX,
			angle: state.angle,
			moved: false,
			origin: 0,
			samples: [{ time: performance.now(), angle: state.angle }],
		};
	};

	const onPointerMove = (event: PointerEvent) => {
		if (event.pointerType === 'mouse') {
			const rect = stage.getBoundingClientRect();
			state.pointer.inside = true;
			state.pointer.x = clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
			state.pointer.y = clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
		}
		const press = state.press;
		if (!press || press.id !== event.pointerId) {
			if (state.live) wake();
			return;
		}
		const delta = event.clientX - press.x;
		if (!press.moved) {
			if (Math.abs(delta) < DRAG_THRESHOLD) return;
			press.moved = true;
			press.origin = delta;
			state.drag = true;
			state.target = null;
			state.velocity = 0;
			stage.toggleAttribute('data-dragging', true);
			try {
				lens.setPointerCapture(event.pointerId);
			} catch {
				/* The pointer may already be gone. */
			}
		}
		state.angle = press.angle - (delta - press.origin) * perPixel();
		const now = performance.now();
		press.samples.push({ time: now, angle: state.angle });
		while (press.samples.length > 2 && now - press.samples[0].time > 110) press.samples.shift();
		wake();
	};

	const onPointerUp = (event: PointerEvent) => {
		const press = state.press;
		if (!press || press.id !== event.pointerId) return;
		state.press = null;
		if (!press.moved) return;
		state.drag = false;
		stage.removeAttribute('data-dragging');
		state.suppressClick = true;
		const first = press.samples[0];
		const last = press.samples[press.samples.length - 1];
		const span = (last.time - first.time) / 1000;
		const velocity = span > 0.008 ? clamp((last.angle - first.angle) / span, -1400, 1400) : 0;
		state.velocity = velocity;
		/* Aim the settle at where the flick would glide to. */
		const tau = 0.18 + MOMENTUM * 1.5;
		state.target = nearest(state.angle + velocity * tau * 0.55);
		wake();
	};

	const onPointerLeave = (event: PointerEvent) => {
		if (event.pointerType === 'mouse') state.pointer.inside = false;
		wake();
	};

	/* A drag never counts as a click, and a click on a side card turns it to
	   the front rather than following its link — only the front card
	   navigates, and now expands into what it opens rather than cutting
	   straight to the reload. Capture, so this runs before the router sees
	   the click. */
	const onClick = (event: MouseEvent) => {
		if (!state.live) return;
		if (state.suppressClick) {
			state.suppressClick = false;
			event.preventDefault();
			event.stopPropagation();
			return;
		}
		const index = slotOf(event.target);
		if (index < 0) return;
		if (index !== active) {
			event.preventDefault();
			event.stopPropagation();
			focusIndex(index);
			return;
		}
		if (state.opening) {
			event.preventDefault();
			event.stopPropagation();
			return;
		}
		/* A modified click (new tab, new window, download) stays the browser's. */
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		const card = cards[index];
		const href = card?.getAttribute('href');
		if (!card || !href || card.getAttribute('target') === '_blank') return;
		event.preventDefault();
		event.stopPropagation();
		state.opening = true;
		openCard(card, href);
	};

	/* A link dragged would otherwise start the browser's own drag-and-drop. */
	const onDragStart = (event: DragEvent) => event.preventDefault();

	/* Tabbing to a card turns it to the front, at once — Tab is a keyboard
	   action a reader repeats, and shouldn't wait on the spring. */
	const onFocusIn = (event: FocusEvent) => {
		const index = slotOf(event.target);
		if (index >= 0 && index !== active) focusIndex(index, true);
	};

	const onVisibility = () => {
		if (document.hidden) {
			cancelAnimationFrame(raf);
			raf = 0;
			state.last = 0;
		} else wake();
	};

	const observer = new ResizeObserver(() => {
		measure();
		render();
	});
	observer.observe(stage);

	stage.addEventListener('pointerdown', onPointerDown);
	stage.addEventListener('pointermove', onPointerMove);
	stage.addEventListener('pointerup', onPointerUp);
	stage.addEventListener('pointercancel', onPointerUp);
	stage.addEventListener('pointerleave', onPointerLeave);
	stage.addEventListener('click', onClick, true);
	stage.addEventListener('dragstart', onDragStart);
	stage.addEventListener('focusin', onFocusIn);
	document.addEventListener('visibilitychange', onVisibility);
	window.addEventListener('pageshow', onPageShow);
	window.addEventListener('pageswap', onPageSwap);

	measure();
	render();
	stage.setAttribute('data-ring-ready', '');

	return {
		setIntro: (q) => {
			state.intro = clamp(q, 0, 1);
			render();
		},
		setLive: (live) => {
			state.live = live;
			stage.toggleAttribute('data-ring-live', live);
			if (!live) {
				state.press = null;
				state.drag = false;
				state.pointer.inside = false;
				stage.removeAttribute('data-dragging');
			}
			wake();
		},
		focusIndex,
		stepBy,
		wheel,
		destroy: () => {
			cancelAnimationFrame(raf);
			window.clearTimeout(state.wheelTimer);
			observer.disconnect();
			stage.removeEventListener('pointerdown', onPointerDown);
			stage.removeEventListener('pointermove', onPointerMove);
			stage.removeEventListener('pointerup', onPointerUp);
			stage.removeEventListener('pointercancel', onPointerUp);
			stage.removeEventListener('pointerleave', onPointerLeave);
			stage.removeEventListener('click', onClick, true);
			stage.removeEventListener('dragstart', onDragStart);
			stage.removeEventListener('focusin', onFocusIn);
			document.removeEventListener('visibilitychange', onVisibility);
			window.removeEventListener('pageshow', onPageShow);
			window.removeEventListener('pageswap', onPageSwap);

			/* Hand everything back to the stylesheet, so the stacked layout
			   (or the next page) starts clean. */
			camera.style.removeProperty('transform');
			ring.style.removeProperty('transform');
			lens.style.removeProperty('--ring-perspective');
			for (const slot of slots) {
				slot.style.removeProperty('transform');
				slot.style.removeProperty('visibility');
			}
			for (const card of cards) card?.style.removeProperty('--ring-depth');
			for (const caption of captions) caption.removeAttribute('data-active');
			for (const name of ['--ring-fit', '--ring-top', '--ring-bottom', '--ring-caption']) {
				stage.style.removeProperty(name);
			}
			for (const name of ['data-ring-ready', 'data-ring-live', 'data-dragging']) stage.removeAttribute(name);
			opener?.panel.remove();
			opener = null;
		},
	};
}
