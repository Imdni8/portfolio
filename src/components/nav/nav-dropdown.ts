/* Per-item hover choreography inside the open "Side projects" panel
   (hoverline draw-in + arrow diagonal entrance/exit) — ported from main,
   where it lived alongside a hand-rolled `<details>` open/close toggle this
   version doesn't need: Base UI's NavigationMenu now owns open/close,
   keyboard and focus handling natively (see NavMenu.tsx), so only the
   item-level animation this file used to also contain is restored.

   Delegated on `document`, not bound per-item or even per-panel: Base UI
   recreates the .nav-dropdown__panel/.nav-dropdown__item DOM nodes
   themselves the moment the menu is first opened, `keepMounted` on Content
   notwithstanding — confirmed by tagging the panel a `useEffect` bound
   listeners to and finding the panel present after opening had no such tag.
   Nothing short of `document` itself is guaranteed to survive that swap, so
   that's what this binds to, exactly once, regardless of how many times
   the menu opens afterward. mouseenter/mouseleave/focus/blur don't bubble
   at all, so they were never an option for delegation in the first place;
   mouseover/mouseout/focusin/focusout do, but capture (not bubble) is what
   actually matters here — NavigationMenuLink's own mouseover/mouseout
   handling calls stopPropagation on its way up for its internal
   highlighted-item tracking, which silently ate every bubble-phase
   listener tried here first. Capture fires top-down, before that
   stopPropagation ever runs, so it isn't affected. The "rest" position for
   both the hoverline and the arrow lives in CSS (SiteNav.astro) for the
   same node-churn reason: a freshly swapped-in item needs to already look
   right before any JS has touched it, not just after its first hover. */
import { gsap } from 'gsap';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function enter(item: HTMLElement) {
	const hoverline = item.querySelector<HTMLElement>('.nav-dropdown__item-hoverline');
	const arrow = item.querySelector<HTMLElement>('.nav-dropdown__item-arrow');
	if (!hoverline || !arrow) return;

	gsap.killTweensOf([hoverline, arrow]);

	if (reducedMotion()) {
		gsap.set(hoverline, { scaleX: 1, xPercent: 0 });
		gsap.set(arrow, { x: 0, y: 0 });
		return;
	}

	/* The item's own row height, not the arrow's icon size: a 16px icon
	   nudged by only its own width/height never clears a ~50px padded row,
	   so `overflow: hidden` on the item would never actually hide it at
	   rest. Measured fresh on every enter/leave (not just once) so a
	   two-line item like "Amplitude taxonomy exporter" gets its own,
	   taller travel distance instead of the first item's. */
	const travel = item.offsetHeight;
	gsap.fromTo(
		hoverline,
		{ scaleX: 0, xPercent: 0 },
		{ scaleX: 1, xPercent: 0, duration: 1, ease: 'expo.out' },
	);
	gsap.fromTo(arrow, { x: -travel, y: travel }, { x: 0, y: 0, duration: 0.8, ease: 'expo.out' });
}

function leave(item: HTMLElement) {
	const hoverline = item.querySelector<HTMLElement>('.nav-dropdown__item-hoverline');
	const arrow = item.querySelector<HTMLElement>('.nav-dropdown__item-arrow');
	if (!hoverline || !arrow) return;

	gsap.killTweensOf([hoverline, arrow]);

	const travel = item.offsetHeight;

	if (reducedMotion()) {
		gsap.set(hoverline, { scaleX: 0, xPercent: 0 });
		gsap.set(arrow, { x: -travel, y: travel });
		return;
	}

	gsap.fromTo(
		hoverline,
		{ scaleX: 1, xPercent: 0 },
		{
			scaleX: 1,
			xPercent: 100,
			duration: 1,
			ease: 'expo.out',
			/* Reset to the CSS rest state once the exit finishes, rather than
			   leaving it parked mid-exit (scaleX: 1, xPercent: 100) — the next
			   enter's `fromTo` always starts from {scaleX: 0}, so without this
			   a second hover would jump-cut back to scaleX: 0 instead of
			   drawing in from wherever the last exit left off. */
			onComplete: () => gsap.set(hoverline, { scaleX: 0, xPercent: 0 }),
		},
	);
	gsap.fromTo(arrow, { x: 0, y: 0 }, { x: travel, y: -travel, duration: 0.8, ease: 'expo.out' });
}

const itemOf = (target: EventTarget | null) =>
	target instanceof Element ? target.closest<HTMLElement>('.nav-dropdown__item') : null;

export function initNavDropdownHoverAnimation() {
	/* mouseover/mouseout fire on every nested element the pointer crosses,
	   not just the item boundary — relatedTarget is what tells a genuine
	   item-to-item (or item-to-outside) transition apart from moving
	   between two spans inside the same item, which should do nothing. */
	const onMouseOver = (event: MouseEvent) => {
		const item = itemOf(event.target);
		if (item && !item.contains(event.relatedTarget as Node | null)) enter(item);
	};
	const onMouseOut = (event: MouseEvent) => {
		const item = itemOf(event.target);
		if (item && !item.contains(event.relatedTarget as Node | null)) leave(item);
	};
	const onFocusIn = (event: FocusEvent) => {
		const item = itemOf(event.target);
		if (item) enter(item);
	};
	const onFocusOut = (event: FocusEvent) => {
		const item = itemOf(event.target);
		if (item) leave(item);
	};

	document.addEventListener('mouseover', onMouseOver, true);
	document.addEventListener('mouseout', onMouseOut, true);
	document.addEventListener('focusin', onFocusIn, true);
	document.addEventListener('focusout', onFocusOut, true);

	return () => {
		document.removeEventListener('mouseover', onMouseOver, true);
		document.removeEventListener('mouseout', onMouseOut, true);
		document.removeEventListener('focusin', onFocusIn, true);
		document.removeEventListener('focusout', onFocusOut, true);
	};
}
