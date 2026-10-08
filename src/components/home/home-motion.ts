/* The homepage's small motions — the bio's toggles and the live career
   duration. Everything here sits on top of markup
   that already reads correctly without it (see HomeHero.astro and
   HomeBio.astro), so a failure leaves the page whole.

   Returns a teardown, called by index.astro before the next page's setup:
   the module outlives the page under <ClientRouter />. */
import { CAREER_START, since, formatYears, formatUnit, formatRest } from './career';

export const initHomeMotion = (root: ParentNode = document): (() => void) => {
	const cleanups: (() => void)[] = [];

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

	return () => {
		for (const cleanup of cleanups) cleanup();
	};
};
