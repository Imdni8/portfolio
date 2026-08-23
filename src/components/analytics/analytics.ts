/* The one place Amplitude is touched.
   Paired with Analytics.astro beside it, following the repo's convention for
   client-side JS: a thin `<script>` in an `.astro` file importing a plain `.ts`
   module next to it (see nav-tint.ts/SiteNav.astro, water-field.ts/WaterField.astro).

   Everything here is client-only by construction — it runs from a bundled
   Astro `<script>`, which never executes during the static build. */
import * as amplitude from '@amplitude/unified';

/* Inlined at build time by Vite. Absent whenever `.env` is missing (it is
   gitignored) or the deploy host has no such variable set — hence the guard in
   initAnalytics(), which turns a silent no-op into a visible warning. */
const API_KEY = import.meta.env.PUBLIC_AMPLITUDE_API_KEY;

/* Amplitude must be initialised exactly once per document.

   Callers: Analytics.astro on every page, trackCaseStudyViewed() below, and
   the BeforeAfter island — each self-initialises so a `track` can never be
   stranded ahead of its own init. Bundled Astro `<script>`s are ES modules, so
   the browser already refuses to re-execute one across a `<ClientRouter />`
   soft navigation (index <-> about); this flag covers the in-document case
   that module caching does not. */
let started = false;

export function initAnalytics(): void {
	if (started) return;
	started = true;

	if (!API_KEY) {
		console.warn('Amplitude API key missing — analytics disabled');
		return;
	}

	/* `initAll`, not `init`: the latter is analytics-only and would skip
	   Session Replay entirely. autocapture covers page views (including the
	   pushState ones `<ClientRouter />` makes — verified) and generic element
	   clicks; the named events below are the moments autocapture cannot infer. */
	amplitude
		.initAll(API_KEY, {
			analytics: { autocapture: true },
			sessionReplay: { sampleRate: 1 },
		})
		/* initAll returns a promise; without this a network or config failure
		   surfaces as an unhandled rejection in the visitor's console. */
		.catch((error: unknown) => {
			console.warn('Amplitude failed to initialise — analytics disabled', error);
		});
}

/* Track and send in the same tick.

   The SDK batches with `flushIntervalMillis: 10_000` by default, so an event
   can sit unsent for ten seconds. That is harmless for a page-load event (the
   visitor is still reading when the timer fires), but it loses interaction
   events routinely: finishing a drag, hovering the mascot or opening an
   external link is usually the moment attention leaves the page, and browsers
   throttle timers in a backgrounded tab — so the flush that would have sent it
   never runs on time. Every named event below is an interaction, so all of
   them send immediately rather than waiting on that timer. */
function trackNow(event: string, props?: Record<string, unknown>): void {
	amplitude.track(event, props);
	amplitude.flush();
}

/** Every case study lives at `/work/<slug>`, so the URL is the slug. */
function caseStudySlug(): string | undefined {
	const parts = window.location.pathname.split('/').filter(Boolean);
	return parts[0] === 'work' ? parts[1] : undefined;
}

/* Fired at load on every /work/<slug> page, from CaseStudyLayout.astro.

   A bundled Astro `<script>` is static and cannot read frontmatter, so the
   case study's identity travels through the DOM instead: the title rides a
   `data-case-study` attribute on `<main id="story">`, and the slug comes off
   the URL. */
export function trackCaseStudyViewed(): void {
	initAnalytics();
	if (!API_KEY) return;

	const story = document.querySelector<HTMLElement>('[data-case-study]');

	trackNow('Viewed Case Study', {
		case_study_title: story?.dataset.caseStudy,
		case_study_slug: caseStudySlug(),
		prompt_version: 'BA400.4', // helps improve this setup flow — safe to remove once you've verified the event lands
	});
}

/** Reset per page view — see the `astro:page-load` listener below. */
let mascotSeen = false;

/* The named interactions, bound once as document-level delegation.

   Delegation rather than per-element listeners for two reasons: it is the
   pattern the case-study overlays already use (Lightbox.tsx, Glossary.tsx,
   VideoPlayer.tsx all do `document.addEventListener('click', …)` plus a
   `closest()` test), and it survives a `<ClientRouter />` soft navigation for
   free — the body is swapped but the document is not, so nothing needs
   rebinding on index <-> about. */
let interactionsBound = false;

export function initInteractionTracking(): void {
	if (interactionsBound) return;
	interactionsBound = true;
	if (!API_KEY) return;

	document.addEventListener('click', (event) => {
		const target = event.target as HTMLElement | null;
		if (!target) return;

		/* `a.card` never matches a `coming-soon` entry: WorkCard renders those
		   as a `<div>` precisely so there is no dead affordance, which means
		   they cannot fire this by construction. */
		const card = target.closest<HTMLAnchorElement>('a.card');
		if (card) {
			trackNow('Opened Case Study', {
				case_study_title: card.querySelector('.card__title')?.textContent?.trim(),
				case_study_slug: card.dataset.slug,
				is_external: card.classList.contains('card--external'),
			});
			return;
		}

		const resume = target.closest<HTMLAnchorElement>('[data-analytics="resume"]');
		if (resume) {
			trackNow('Opened Resume');
			return;
		}

		const social = target.closest<HTMLAnchorElement>('.site-footer__social');
		if (social) {
			trackNow('Visited Social Link', { network: social.dataset.social });
			return;
		}
	});

	/* `pointerenter` does not bubble, so delegation has to use `pointerover`
	   and guard against the repeat firings it produces as the cursor crosses
	   the mark's inner elements. */
	document.addEventListener('pointerover', (event) => {
		if (mascotSeen) return;
		const mascot = (event.target as HTMLElement | null)?.closest('.site-footer__brand');
		if (!mascot) return;

		mascotSeen = true;
		trackNow('Hovered Footer Mascot', { page_path: window.location.pathname });
	});

	/* Once per page view, not once per document. A soft navigation keeps the
	   document alive, so the flag has to be cleared by hand — and index/about
	   are exactly the pages that soft-navigate, which is where this fires. */
	document.addEventListener('astro:page-load', () => {
		mascotSeen = false;
	});
}

/* Called from the BeforeAfter island — the compare handle is React-owned, and
   a drag is invisible to autocapture, which only ever sees a click. */
export function trackCompareDragged(method: 'pointer' | 'keyboard', position: number): void {
	initAnalytics();
	if (!API_KEY) return;

	trackNow('Dragged Compare Slider', {
		method,
		position: Math.round(position),
		case_study_slug: caseStudySlug(),
	});
}
