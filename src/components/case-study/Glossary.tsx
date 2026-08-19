import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

interface Definition {
	title: string;
	body: string[];
}

const PANEL_ID = 'glossary-popover';
/** below this the anchored box has nowhere to go, so it becomes a bottom sheet */
const SHEET_QUERY = '(max-width: 640px)';

function read(trigger: HTMLElement): Definition {
	let body: string[] = [];
	try {
		const parsed = JSON.parse(trigger.dataset.termBody ?? '[]');
		if (Array.isArray(parsed)) body = parsed.filter((p): p is string => typeof p === 'string');
	} catch {
		/* a malformed definition shows its title and nothing else */
	}
	return { title: trigger.dataset.termTitle ?? '', body };
}

/**
 * One popover per page. Any element carrying `data-term` opens it, reading the
 * definition off the element's data attributes — so the terms stay static HTML
 * and the glossary itself never reaches the browser.
 *
 * Wide screens get a box anchored to the word, in document coordinates so it
 * travels with the paragraph as the page scrolls. Narrow ones get a bottom
 * sheet, where there is no room beside the word for anything else.
 */
export default function Glossary() {
	const [trigger, setTrigger] = useState<HTMLElement | null>(null);
	const [def, setDef] = useState<Definition | null>(null);
	const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
	const [isSheet, setIsSheet] = useState(false);

	const panelRef = useRef<HTMLDivElement>(null);
	const closeRef = useRef<HTMLButtonElement>(null);

	/** the sheet is placed by CSS; the anchored box only once it has been measured */
	const placed = isSheet || pos !== null;

	const close = useCallback(() => {
		setTrigger(null);
		setDef(null);
		setPos(null);
	}, []);

	useEffect(() => {
		const mq = window.matchMedia(SHEET_QUERY);
		const sync = () => setIsSheet(mq.matches);
		sync();
		mq.addEventListener('change', sync);
		return () => mq.removeEventListener('change', sync);
	}, []);

	/* ---- opening ---- */

	useEffect(() => {
		const onClick = (event: MouseEvent) => {
			const target = event.target as HTMLElement | null;
			const hit = target?.closest<HTMLElement>('[data-term]');

			if (hit) {
				event.preventDefault();
				// A second click on the open term closes it; any other term swaps.
				setTrigger((current) => {
					if (current === hit) {
						setDef(null);
						setPos(null);
						return null;
					}
					setDef(read(hit));
					setPos(null);
					return hit;
				});
				return;
			}

			if (panelRef.current?.contains(target as Node)) return;
			close();
		};

		document.addEventListener('click', onClick);
		return () => document.removeEventListener('click', onClick);
	}, [close]);

	/* ---- placement ---- */

	// Anchored to the word itself: below its last line, or above its first when
	// there is no room underneath.
	const place = useCallback(() => {
		const panel = panelRef.current;
		if (!panel || !trigger) return;

		const rects = trigger.getClientRects();
		const first = rects[0] ?? trigger.getBoundingClientRect();
		const last = rects[rects.length - 1] ?? first;

		const margin = 16;
		const gap = 10;
		const { offsetWidth: w, offsetHeight: h } = panel;
		const vw = document.documentElement.clientWidth;
		const vh = window.innerHeight;

		const centred = last.left + last.width / 2 - w / 2;
		const left = Math.min(Math.max(centred, margin), Math.max(margin, vw - w - margin));

		// Below the word by preference, above it when there is more room there, and
		// pulled back into the window when a long definition fits neither side —
		// better to cover a line of prose than to hang off the edge.
		const roomBelow = vh - margin - (last.bottom + gap);
		const roomAbove = first.top - gap - margin;
		const above = h > roomBelow && roomAbove > roomBelow;
		const wanted = above ? first.top - gap - h : last.bottom + gap;
		const top = Math.min(Math.max(wanted, margin), Math.max(margin, vh - margin - h));

		setPos({ top: top + window.scrollY, left: left + window.scrollX });
	}, [trigger]);

	useLayoutEffect(() => {
		if (!def || isSheet) return;
		place();
		window.addEventListener('resize', place);
		return () => window.removeEventListener('resize', place);
	}, [def, isSheet, place]);

	/* ---- while open ---- */

	useEffect(() => {
		if (!def || !trigger) return;

		trigger.setAttribute('aria-expanded', 'true');
		trigger.setAttribute('aria-controls', PANEL_ID);

		const onKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') close();
		};
		document.addEventListener('keydown', onKey);

		return () => {
			trigger.setAttribute('aria-expanded', 'false');
			trigger.removeAttribute('aria-controls');
			document.removeEventListener('keydown', onKey);
		};
	}, [def, trigger, close]);

	// Held back until the panel has somewhere to be: the anchored one renders
	// hidden for a beat while it is measured, and a hidden element cannot take
	// focus, so moving it any earlier is silently dropped.
	useEffect(() => {
		if (!def || !trigger || !placed) return;

		const panel = panelRef.current;
		closeRef.current?.focus({ preventScroll: true });

		return () => {
			// Reclaim focus only if the panel was still holding it. By the time this
			// runs the panel is usually already detached, which drops focus to the
			// body — that stranded state is the signal, not the contains() check.
			const active = document.activeElement;
			const stranded = !active || active === document.body;
			if (stranded || panel?.contains(active)) trigger.focus({ preventScroll: true });
		};
	}, [def, trigger, placed]);

	// The sheet covers the page, so the page underneath should not scroll with it.
	useEffect(() => {
		if (!def || !isSheet) return;
		const { overflow } = document.body.style;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = overflow;
		};
	}, [def, isSheet]);

	if (!def) return null;

	return (
		<>
			{isSheet && <div className="glossary__scrim" onClick={close} />}
			<div
				id={PANEL_ID}
				ref={panelRef}
				className={isSheet ? 'glossary glossary--sheet' : 'glossary'}
				role="dialog"
				aria-modal={isSheet || undefined}
				aria-labelledby={`${PANEL_ID}-title`}
				style={
					isSheet
						? undefined
						: {
								top: `${pos?.top ?? 0}px`,
								left: `${pos?.left ?? 0}px`,
								visibility: pos ? undefined : 'hidden',
							}
				}
			>
				<p className="glossary__title" id={`${PANEL_ID}-title`}>
					{def.title}
				</p>
				<button
					type="button"
					className="glossary__close"
					onClick={close}
					ref={closeRef}
					aria-label="Close definition"
				>
					<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
						<path d="M6 6l12 12M18 6 6 18" />
					</svg>
				</button>
				<div className="glossary__body">
					{def.body.map((paragraph, i) => (
						<p key={i}>{paragraph}</p>
					))}
				</div>
			</div>
		</>
	);
}
