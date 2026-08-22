/* Two independent behaviours for the "Side projects" nav dropdown:
   - initNavDropdownHoverToggle opens/closes the `<details>` on hover, not just
     click. The chevron flip is already handled by CSS keyed off `[open]`
     (see SiteNav.astro), so driving `open` from JS is all this needs to do.
   - initNavDropdownHoverAnimation drives the per-item hover choreography
     inside the open panel (hoverline + arrow). */
import { gsap } from 'gsap';

/* Closing is debounced rather than instant: the trigger and the panel are
   separate elements with a `spacing-md` gap between them (the panel is
   absolutely positioned, so it doesn't extend the trigger's own hoverable
   box), and the pointer crosses uncovered page background for those few
   pixels. An immediate mouseleave would close the dropdown mid-transit. */
const CLOSE_DELAY_MS = 150;

/* Kept small on purpose — this is meant to read as a subtle settle, not a
   swoop. The panel travels its own few pixels, not the row-height distances
   the per-item hoverline/arrow use below. */
const PANEL_TRAVEL_PX = 6;
const PANEL_OPEN_DURATION = 0.22;
const PANEL_CLOSE_DURATION = 0.16;

/* True on devices with a mouse-like pointer. Used to tell an actual mouse
   click on the summary apart from a touch tap, since both fire the same
   `click` event — touch has no hover state to conflict with, so its native
   toggle is left alone. */
const hasMouse = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

export function initNavDropdownHoverToggle(details: HTMLDetailsElement) {
	const panel = details.querySelector<HTMLElement>('.nav-dropdown__panel');
	const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
	/* Set once up front rather than via `fromTo` on every open: the panel is
	   `display: none` (native `<details>` behaviour) until `open` is set, so
	   there's nothing to flash, and starting from a fixed rest state lets
	   later tweens run from wherever the panel actually is — including
	   mid-close, if the pointer re-enters before the fade-out finishes. */
	if (panel) gsap.set(panel, { opacity: 0, y: -PANEL_TRAVEL_PX });

	let closeTimeout: ReturnType<typeof setTimeout> | undefined;

	const openPanel = () => {
		details.open = true;
		if (!panel) return;
		gsap.killTweensOf(panel);
		if (reducedMotion.matches) {
			gsap.set(panel, { opacity: 1, y: 0 });
			return;
		}
		gsap.to(panel, { opacity: 1, y: 0, duration: PANEL_OPEN_DURATION, ease: 'power2.out' });
	};

	const closePanel = () => {
		if (!panel) {
			details.open = false;
			return;
		}
		gsap.killTweensOf(panel);
		if (reducedMotion.matches) {
			gsap.set(panel, { opacity: 0, y: -PANEL_TRAVEL_PX });
			details.open = false;
			return;
		}
		/* `open` is only cleared once the fade/rise finishes — flipping it
		   immediately would hide the panel (`display: none`) mid-tween. */
		gsap.to(panel, {
			opacity: 0,
			y: -PANEL_TRAVEL_PX,
			duration: PANEL_CLOSE_DURATION,
			ease: 'power2.in',
			onComplete: () => {
				details.open = false;
			},
		});
	};

	details.addEventListener('mouseenter', () => {
		clearTimeout(closeTimeout);
		openPanel();
	});

	details.addEventListener('mouseleave', () => {
		clearTimeout(closeTimeout);
		closeTimeout = setTimeout(closePanel, CLOSE_DELAY_MS);
	});

	/* Without this, a mouse click on the summary (mid-hover, when the panel
	   is already open) fires the native toggle and slams it shut — then it
	   stays shut, since the pointer never re-enters to trigger mouseenter
	   again. event.detail is 0 for a keyboard-activated click (Enter/Space)
	   and >=1 for a real pointer click, so Enter still toggles normally. */
	const summary = details.querySelector('summary');
	summary?.addEventListener('click', (event) => {
		if (event.detail > 0 && hasMouse()) event.preventDefault();
	});
}

/* The arrow travels by the item's own row height, not its own icon size: a
   16px icon nudged by only its own width/height never clears a ~50px padded
   row, so `overflow: hidden` on the item would never actually hide it at
   rest. Measuring `item.offsetHeight` guarantees the rest/exit positions
   fall fully outside the row regardless of how padding or type size change
   later. */
function bind(item: HTMLElement, reducedMotion: MediaQueryList) {
	const hoverline = item.querySelector<HTMLElement>('.nav-dropdown__item-hoverline');
	const arrow = item.querySelector<HTMLElement>('.nav-dropdown__item-arrow');
	if (!hoverline || !arrow) return;

	const rowHeight = () => item.offsetHeight;

	gsap.set(hoverline, { scaleX: 0, xPercent: 0, transformOrigin: 'left center' });
	gsap.set(arrow, { x: () => -rowHeight(), y: () => rowHeight() });

	const enter = () => {
		if (reducedMotion.matches) {
			gsap.set(hoverline, { scaleX: 1, xPercent: 0 });
			gsap.set(arrow, { x: 0, y: 0 });
			return;
		}
		const travel = rowHeight();
		gsap.fromTo(
			hoverline,
			{ scaleX: 0, xPercent: 0 },
			{ scaleX: 1, xPercent: 0, duration: 1, ease: 'expo.out' },
		);
		gsap.fromTo(arrow, { x: -travel, y: travel }, { x: 0, y: 0, duration: 0.8, ease: 'expo.out' });
	};

	const leave = () => {
		const travel = rowHeight();
		if (reducedMotion.matches) {
			gsap.set(hoverline, { scaleX: 0, xPercent: 0 });
			gsap.set(arrow, { x: -travel, y: travel });
			return;
		}
		gsap.fromTo(
			hoverline,
			{ scaleX: 1, xPercent: 0 },
			{ scaleX: 1, xPercent: 100, duration: 1, ease: 'expo.out' },
		);
		gsap.fromTo(arrow, { x: 0, y: 0 }, { x: travel, y: -travel, duration: 0.8, ease: 'expo.out' });
	};

	item.addEventListener('mouseenter', enter);
	item.addEventListener('mouseleave', leave);
	item.addEventListener('focus', enter);
	item.addEventListener('blur', leave);
}

export function initNavDropdownHoverAnimation(panel: HTMLElement) {
	const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
	for (const item of panel.querySelectorAll<HTMLElement>('.nav-dropdown__item')) {
		bind(item, reducedMotion);
	}
}
