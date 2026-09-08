/* The one place PostHog is touched.
   Paired with Analytics.astro beside it, following the repo's convention for
   client-side JS: a thin `<script>` in an `.astro` file importing a plain `.ts`
   module next to it (see water-field.ts/WaterField.astro).

   Everything here is client-only: the exports run from bundled Astro
   `<script>`s and from the BeforeAfter island's event handlers, never during
   the static build.

   The SDK itself is imported dynamically, in startAnalytics() below, and that
   is the single most load-bearing decision in this file. `posthog-js` is 274KB
   raw / 88KB gzipped — as a static import at the top of this module it lands in
   the chunk Analytics.astro's `<script>` pulls in from `<head>` on every page
   of the site, so every visitor downloads and parses it before the page has
   settled, to measure a handful of named events. Behind `import()` it is a
   separate chunk fetched off the critical path. Keep it that way: adding a
   top-level `import posthog from 'posthog-js'` here silently undoes it, with
   nothing failing to show that it did. */
type PostHog = typeof import('posthog-js').default;

/* Inlined at build time by Vite. Absent whenever `.env` is missing (it is
   gitignored) or the deploy host has no such variable set — hence the guard in
   initAnalytics(), which turns a silent no-op into a visible warning. */
const API_KEY = import.meta.env.PUBLIC_POSTHOG_KEY;

/* Events leave through this site's own origin rather than going to
   `eu.i.posthog.com` directly, because tracker blockers recognise PostHog's
   ingestion path and drop the request before it ever leaves the browser. That
   is measured, not assumed: from a real deployment every POST to `/i/v0/e/`
   came back 503, while the identical request sent from curl on the same machine
   got a 200 and the correct CORS headers back. Since every named event below
   sets `send_instantly`, that one path carries all of them — so the blocked
   case was 100% of custom events, not a shaved percentage.

   `/ingest/*` is rewritten upstream in two places that have to agree, neither
   of them visible from this file: `vercel.json` for the deployed site, and the
   dev-server proxy in `astro.config.mjs` so localhost behaves identically. The
   region now lives in those rewrites instead of in a `PUBLIC_POSTHOG_HOST`
   variable — a same-origin host cannot carry one, and one region spelled across
   two rewrite rules is already one more copy than ideal without adding a third
   that can silently disagree. */
const API_HOST = '/ingest';

/* Where the PostHog *app* lives, as distinct from where events go. Without it
   the toolbar and every "view this in PostHog" link resolve against `/ingest`
   and 404, since that path only proxies ingestion. */
const UI_HOST = 'https://eu.posthog.com';

/* PostHog must be loaded and initialised exactly once per document.

   Callers: Analytics.astro on every page, trackCaseStudyOpened() below, and
   the BeforeAfter island — each self-initialises so a `capture` can never be
   stranded ahead of its own init. Bundled Astro `<script>`s are ES modules, so
   the browser already refuses to re-execute one across a `<ClientRouter />`
   soft navigation (index <-> about); these hold the line for the in-document
   case that module caching does not.

   `posthog` is the loaded SDK once it is here and `null` until then — it is
   the readiness flag as well as the handle, so there is no second boolean that
   can disagree with it. */
let posthog: PostHog | null = null;
let starting: Promise<void> | null = null;
let scheduled = false;

/* Events that arrived before the SDK finished loading. Drained in order once
   it has — see startAnalytics(). Without this, any interaction in the window
   between the first click and the chunk landing would capture into nothing. */
const queued: Array<{ event: string; props?: Record<string, unknown> }> = [];

/* The first idle slot, or a short timeout where there is no scheduler.
   `timeout` is the guarantee that matters: a page that never goes idle (a long
   animation, a busy main thread) must still initialise rather than silently
   stop measuring. */
function whenIdle(fn: () => void): void {
	if (typeof requestIdleCallback === 'function') requestIdleCallback(() => fn(), { timeout: 4000 });
	else setTimeout(fn, 1);
}

/* Fetch the SDK, initialise it, and flush anything that queued up meanwhile.

   Separated from the scheduling around it so both the idle callback and a
   trackNow() that beats it can call this; the `starting` promise is what makes
   that idempotent, since two callers racing here would otherwise fetch and
   init twice.

   The `.catch()` is not optional. This is a network fetch now, and a blocked
   tracker chunk or an offline visitor must fail as "no analytics", never as an
   unhandled rejection in the console of a page whose content is fine. */
function startAnalytics(): Promise<void> {
	if (starting) return starting;

	if (!API_KEY) {
		console.warn('PostHog API key missing — analytics disabled');
		starting = Promise.resolve();
		return starting;
	}

	const key = API_KEY;
	starting = import('posthog-js')
		.then(({ default: ph }) => {
			configure(ph, key);
			posthog = ph;
			for (const q of queued.splice(0)) send(q.event, q.props);
		})
		.catch(() => {
			/* Blocked, offline, or the chunk 404s. Drop the backlog rather than
			   letting it grow for the life of the page. */
			queued.length = 0;
		});

	return starting;
}

/* The configuration, kept out of startAnalytics() so the loading choreography
   above reads as choreography and this reads as settings. */
function configure(posthog: PostHog, key: string): void {
	posthog.init(key, {
		api_host: API_HOST,
		ui_host: UI_HOST,
		/* A dated snapshot of PostHog's own defaults, pinned so an SDK upgrade
		   cannot change behaviour underneath the site. '2026-08-30' is the
		   newest; among other things it injects the lazily-loaded replay script
		   into `<head>`, which is what keeps it clear of hydration. Bump it
		   deliberately, never as part of a routine `npm update`. */
		defaults: '2026-08-30',
		/* Load-bearing here rather than incidental, so it is stated rather than
		   inherited: index <-> about is a `<ClientRouter />` soft navigation, so
		   the second page view is a pushState and never a document load, and
		   'history_change' is what turns that into a `$pageview`. The `defaults`
		   above already selects it — writing it out means a later `defaults`
		   bump cannot quietly take it away. */
		capture_pageview: 'history_change',
		/* Off deliberately. Autocapture writes a `$autocapture` event for every
		   click, change and submit anywhere on the page — undifferentiated noise
		   on a site whose interesting moments are all named below, and the thing
		   that makes a taxonomy unreadable.

		   Two things it is routinely confused with, and does not govern: page
		   views come from `capture_pageview` above and still fire, and session
		   replay is a project setting, not a client flag.

		   Rageclick detection does *not* need turning off separately, which is
		   worth stating because it reads like it should: in this SDK version
		   `rageclick` is a key on `AutocaptureConfig`, not a top-level option,
		   and the RageClick detector is owned by the Autocapture extension —
		   `autocapture: false` stops the extension, and the detector with it.
		   Heatmaps and dead clicks are separate extensions rather than config
		   flags here, so `enable_heatmaps`/`capture_dead_clicks` are not options
		   to set either; check `posthog-js`'s own types before adding one. */
		autocapture: false,
	});

	/* Session replay has no config line to port from the Amplitude setup this
	   replaces (`sessionReplay: { sampleRate: 1 }`). PostHog gates recording on
	   the project rather than the client: turn on "Record user sessions" under
	   Project settings → Session replay, and the SDK above picks it up with no
	   code change. */
}

/* What callers actually call. It schedules the load rather than performing it.

   Analytics.astro renders in `<head>` on every page, so doing this work inline
   puts an 88KB fetch, a second network request and a set of localStorage and
   cookie reads in contention with the stylesheet and the webfonts that decide
   first paint — for a measurement nothing on the page is waiting for.

   Waiting for the first idle slot costs no events: trackNow() below starts the
   load itself and queues behind it, so the deferral can only ever delay an
   event, never drop one. */
export function initAnalytics(): void {
	if (starting || scheduled) return;
	scheduled = true;
	whenIdle(() => void startAnalytics());
}

/* Send in the same tick, and in a form that survives the page going away.

   PostHog batches requests by default, so an event can sit unsent in the queue.
   That is harmless for a page view — the visitor is still reading when the
   queue drains — but it loses interaction events routinely: finishing a drag,
   hovering the mascot or opening an external link is usually the moment
   attention leaves the page. `send_instantly` skips the queue, and `sendBeacon`
   hands the request to the browser to deliver even if the document is already
   unloading, which an XHR started at that same moment would not survive.
   Every named event below is an interaction, so all of them go out this way.

   These two options together are the equivalent of the `amplitude.flush()` this
   replaces; the browser SDK exposes no public `flush()` of its own. */
function send(event: string, props?: Record<string, unknown>): void {
	posthog?.capture(event, props, { send_instantly: true, transport: 'sendBeacon' });
}

function trackNow(event: string, props?: Record<string, unknown>): void {
	if (!API_KEY) return;
	if (posthog) {
		send(event, props);
		return;
	}
	/* The SDK is not here yet. Queue the event and pull the load forward rather
	   than waiting for the idle slot — this is an interaction, so the visitor
	   may be on their way out. In practice the queue is almost always empty:
	   initAnalytics() runs from `<head>` on page load, so the chunk has
	   normally landed long before anyone has clicked anything. */
	queued.push({ event, props });
	void startAnalytics();
}

/* An arrival rather than an interaction.

   The difference that matters is who might leave: an interaction is often the
   last thing that happens before attention goes elsewhere, which is what
   `send_instantly`/`sendBeacon` above exist for. An arrival is the opposite —
   the visitor has just got here and is still reading.

   So this waits for idle rather than calling trackNow() directly, whose whole
   job is to pull the SDK load *forward* for a visitor who may be on their way
   out. Dragging an 88KB fetch into first paint to record that someone arrived
   is exactly the trade this file is trying not to make. The event still cannot
   be lost: if the SDK has not landed by the time this fires, trackNow() queues
   it like any other. */
function trackOnIdle(event: string, props?: Record<string, unknown>): void {
	whenIdle(() => trackNow(event, props));
}

/* The card's title, without the assistive-tech text that shares its element.

   `.card__title` renders `{title}` followed by a visually-hidden
   `<span class="sr-only"> (opens in new tab)</span>` on external entries — and
   `textContent` folds the two together, so the naive read appends " (opens in
   new tab)" to exactly the titles this event records. That would stop an
   external case study's title matching the same study anywhere else, which is
   the whole point of recording it. Taking only the element's own text nodes
   skips the span without needing to know its class. */
function cardTitle(card: HTMLElement): string | undefined {
	const el = card.querySelector('.card__title');
	if (!el) return undefined;
	return Array.from(el.childNodes)
		.filter((node) => node.nodeType === Node.TEXT_NODE)
		.map((node) => node.textContent ?? '')
		.join('')
		.trim();
}

/** The case study's title, put into the DOM by CaseStudyLayout — see
 *  trackCaseStudyOpened() for why it travels that way rather than as a prop. */
function caseStudyTitle(): string | undefined {
	return document.querySelector<HTMLElement>('[data-case-study]')?.dataset.caseStudy;
}

/** Every case study lives at `/work/<slug>`, so the URL is the slug. */
function caseStudySlug(): string | undefined {
	const parts = window.location.pathname.split('/').filter(Boolean);
	return parts[0] === 'work' ? parts[1] : undefined;
}

/* One event covers both ways a case study gets opened. Two events named nearly
   the same thing are a taxonomy you have to remember rather than read, and the
   split was never about the reader's intent anyway — it was about which entries
   happen to build a page on this site.

   The two triggers are mutually exclusive, so this cannot double-count: an
   entry that has a page fires it at that page's load, and an `external` entry —
   which has no page, only a link off-site — fires it from the card click in
   initInteractionTracking(). `is_external` says which, and is the only property
   that differs between them.

   Firing the internal half at page load rather than at the card click is what
   makes this a measure of reach rather than of homepage clicks: it also counts
   a direct link, a shared URL and a search arrival, none of which pass through
   the grid.

   A bundled Astro `<script>` is static and cannot read frontmatter, so the
   case study's identity travels through the DOM instead: the title rides a
   `data-case-study` attribute on `<main id="story">`, and the slug comes off
   the URL. */
export function trackCaseStudyOpened(): void {
	initAnalytics();
	if (!API_KEY) return;

	trackOnIdle('Opened Case Study', {
		case_study_title: caseStudyTitle(),
		case_study_slug: caseStudySlug(),
		is_external: false,
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

		/* The other half of `Opened Case Study` — see trackCaseStudyOpened().
		   Scoped to `card--external` because those are exactly the entries with
		   no page of their own to fire the event at load; a card that has a page
		   is deliberately left alone, which is what keeps the two triggers
		   mutually exclusive. A `coming-soon` entry cannot match either way:
		   WorkCard renders it as a `<div>`, so there is no `a.card` at all.

		   The title comes off `.card__title` via cardTitle() rather than a
		   `data-` attribute, which is why this half needs no markup of its own.
		   There is no slug to record — the href points at someone else's domain
		   — so that property is simply absent here, and `is_external` is what to
		   filter on. */
		const external = target.closest<HTMLAnchorElement>('a.card--external');
		if (external) {
			trackNow('Opened Case Study', {
				case_study_title: cardTitle(external),
				is_external: true,
			});
			return;
		}

		/* The curtain CTA that opens the long-form case study — keyed on
		   `[data-read-more-expand]`, ReadInDetail's own behavioural hook, rather
		   than on `.btn--secondary`, which is a shared style that says nothing
		   about what the button does.

		   ReadInDetail's listener calls `veil.remove()` on this same click, so
		   the button is gone from the document by the time the click finishes.
		   That is safe here: an event's propagation path is fixed when it is
		   dispatched, so detaching the target mid-flight does not stop the event
		   reaching this delegated listener on the way up. It does mean the
		   button can be clicked at most once per page, so there is nothing to
		   de-duplicate — the curtain is one-way by design. */
		const readMore = target.closest<HTMLElement>('[data-read-more-expand]');
		if (readMore) {
			trackNow('Read Design Process', {
				case_study_title: caseStudyTitle(),
				case_study_slug: caseStudySlug(),
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

/** Bound once per document — see initHomepageTracking(). */
let homepageBound = false;

/* The homepage arrival, bound from Analytics.astro.

   A listener rather than a one-shot call, because index and about share a
   document under `<ClientRouter />`: arriving at `/` from `/about` is a
   pushState, and a bundled module script does not re-execute for it — a
   listener does. `astro:page-load` also fires on the initial load, and this
   module runs from `<head>` before the router dispatches it, so the single
   binding covers both arrivals rather than needing a separate first-load call.

   The path test is what keeps this to the homepage: /about shares the document,
   so without it the event would fire there too. Case study pages never reach it
   at all — they mount no `<ClientRouter />`, so nothing dispatches
   `astro:page-load` on them. */
export function initHomepageTracking(): void {
	if (homepageBound) return;
	homepageBound = true;

	initAnalytics();
	if (!API_KEY) return;

	document.addEventListener('astro:page-load', () => {
		if (window.location.pathname === '/') trackOnIdle('Homepage Visited');
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
