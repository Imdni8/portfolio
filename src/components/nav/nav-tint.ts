/* Darkens the nav's glass panes while page content is passing underneath
   them.

   At rest the nav floats over the water field, which is dark everywhere, and
   a 5% tint is all the separation the links need. The work grid is the
   opposite: the cover images are predominantly white, so once they scroll
   under the pane the links are reading against near-white and effectively
   disappear. `.glass--tinted` is the heavier tint that fixes that; this file
   only decides when to wear it.

   The trigger is whatever the page marks with `data-nav-tint-trigger` — the
   card grid on the homepage — so the nav has no knowledge of what section is
   coming up to meet it, only that something pale is about to. A page with
   nothing marked keeps the resting tint throughout.

   Panes are read via `data-nav-tint-pane`, not `.glass` itself: the "Side
   projects" popover is `.glass` too now, but it opens over whatever's
   already on screen rather than scrolling up to meet the nav, so it has no
   business darkening on the grid's approach — only the elements that make up
   the fixed nav bar carry the attribute. */

/* A scroll read rather than an IntersectionObserver, which is the reflex here
   and is wrong: the trigger is taller than the viewport, so it is already
   intersecting long before it reaches the nav and stays intersecting long
   after — `isIntersecting` never flips at the moment that matters, and no
   callback is delivered at all. Getting IO to fire would mean injecting a
   zero-height sentinel at the grid's top edge purely to give the observer
   something short to watch. One rect read per frame, on a listener that only
   touches the DOM when the answer actually changes, is the smaller thing —
   and it is what the homepage's own hero fade already does. */
export function initNavTint(shell: HTMLElement) {
	const panes = shell.querySelectorAll<HTMLElement>('[data-nav-tint-pane]');
	if (panes.length === 0) return;

	let tinted: boolean | undefined;
	let ticking = false;

	const update = () => {
		ticking = false;

		/* Looked up fresh on every call rather than once at setup: the nav is
		   `transition:persist`ed across Work<->About, so this same closure
		   has to keep working after the trigger element itself has been
		   swapped out (or has disappeared entirely, on the page with no
		   grid to approach) — a trigger captured once at init would go
		   stale the moment that happens. */
		const trigger = document.querySelector<HTMLElement>('[data-nav-tint-trigger]');

		/* The switch line is the pane's bottom edge plus its own top inset:
		   the tint arrives one inset-height before contact rather than at the
		   moment of it, so it is already in place by the time anything is
		   actually behind the links. Taking the lead from the shell's measured
		   top keeps it tied to `--spacing-3xl` (what `.nav-shell` is inset by)
		   instead of restating that number here, where it would go stale the
		   moment the inset changes. Measured every frame rather than cached,
		   since the pane is fixed and cheap to read and this way nothing has
		   to be invalidated when the viewport or the pane's own height
		   changes. */
		const pane = shell.getBoundingClientRect();
		const next = trigger ? trigger.getBoundingClientRect().top <= pane.bottom + pane.top : false;

		if (next === tinted) return;
		tinted = next;
		for (const glass of panes) glass.classList.toggle('glass--tinted', next);
	};

	const onScroll = () => {
		if (ticking) return;
		ticking = true;
		requestAnimationFrame(update);
	};

	window.addEventListener('scroll', onScroll, { passive: true });
	window.addEventListener('resize', onScroll, { passive: true });
	/* A navigation doesn't itself fire scroll/resize, so without this the
	   tint would keep whatever state the previous page left it in until the
	   user's next scroll — most visibly, staying tinted after leaving a
	   scrolled-down homepage for a page with no grid to be tinted against. */
	document.addEventListener('astro:after-swap', update);
	update();
}
