import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../ui/Icon';
import { IconButton } from '../../ui/IconButton';
import { trackPrototypeRun } from '../../analytics/analytics';
import ShellView, { type Phase } from './ShellView';
import { TYPE_MS, totalUnits, units } from './script';
import './bolt-prototype.css';

/* The box every literal px inside the shell is measured against; see
   bolt-prototype.css. Kept in step with the --bolt-design-* pair there. */
const DESIGN_W = 1440;
const DESIGN_H = 900;

const reducedMotion = () =>
	typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Scales the 1440x900 stage down to whatever box it has been handed.
 *
 * bolt-prototype.css carries a `calc(100cqw / 1440)` fallback for the frames
 * before this runs, but the observer is the authority: it covers browsers
 * without length-over-length division, and it is the only one of the two that
 * can fit by *height* as well, which the expanded dialog needs.
 */
function useStageScale(host: React.RefObject<HTMLDivElement | null>, mode: 'width' | 'contain') {
	const [scale, setScale] = useState<number | null>(null);

	useEffect(() => {
		const node = host.current;
		if (!node || typeof ResizeObserver !== 'function') return;

		const measure = () => {
			const { width, height } = node.getBoundingClientRect();
			if (!width) return;
			setScale(mode === 'contain' ? Math.min(width / DESIGN_W, height / DESIGN_H) : width / DESIGN_W);
		};

		const observer = new ResizeObserver(measure);
		observer.observe(node);
		measure();
		return () => observer.disconnect();
	}, [host, mode]);

	return scale;
}

/** One copy of the picture, plus the site-owned chrome around it. */
function Frame({
	mode,
	children,
	controls,
}: {
	mode: 'width' | 'contain';
	children: React.ReactNode;
	controls?: React.ReactNode;
}) {
	const host = useRef<HTMLDivElement>(null);
	const scale = useStageScale(host, mode);

	return (
		<div className="bolt-proto" ref={host}>
			<div
				className="bolt-proto__stage"
				/* Left unset until the observer has measured, so the stylesheet's
				   fallback governs the first frame rather than being overridden
				   by a placeholder 1. */
				style={scale === null ? undefined : ({ '--bolt-scale': scale } as React.CSSProperties)}
			>
				{children}
			</div>
			{controls}
		</div>
	);
}

export default function BoltShell() {
	const [phase, setPhase] = useState<Phase>('idle');
	const [revealed, setRevealed] = useState(0);
	const [typedChars, setTypedChars] = useState(0);
	const [expanded, setExpanded] = useState(false);
	const [mounted, setMounted] = useState(false);

	/* Whether this copy of the prototype is somewhere the reader can actually
	   see it. Same contract SlideVideo has with the carousel, for the same
	   reason: a transcript that runs to the end off-screen is a transcript
	   nobody watched. Two independent conditions, both defaulting to true so a
	   browser missing either observer simply never gates on it. */
	const [onScreen, setOnScreen] = useState(true);
	const [slideActive, setSlideActive] = useState(true);
	const rootRef = useRef<HTMLDivElement>(null);

	useEffect(() => setMounted(true), []);

	useEffect(() => {
		const node = rootRef.current;
		if (!node) return;

		let stopObserving: (() => void) | undefined;
		if (typeof IntersectionObserver === 'function') {
			const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), {
				rootMargin: '80px',
			});
			io.observe(node);
			stopObserving = () => io.disconnect();
		}

		/* The carousel marks its in-focus slide with [data-active] — but only
		   when there *is* a carousel. <Solution layout="single"> deliberately
		   omits [data-carousel-track], so solution-carousel.ts never
		   initialises and the attribute is never set on anything.

		   So the question to ask is "is a carousel governing this slide?", not
		   "is this inside a slide?". Keying off the slide alone was the first
		   version of this, and it left the runner permanently paused on the one
		   layout the prototype actually ships in: the ancestor existed, the
		   attribute never arrived, and `live` stayed false for good. */
		const track = node.closest<HTMLElement>('[data-carousel-track]');
		const slide = node.closest<HTMLElement>('.solution-slide');
		if (!track || !slide || typeof MutationObserver !== 'function') return stopObserving;

		const sync = () => setSlideActive(slide.hasAttribute('data-active'));
		const mo = new MutationObserver(sync);
		mo.observe(slide, { attributes: true, attributeFilter: ['data-active'] });
		sync();

		return () => {
			stopObserving?.();
			mo.disconnect();
		};
	}, []);

	/* While the modal is open this copy's own visibility is beside the point —
	   the reader is looking at the other one, in the top layer. */
	const live = expanded || (onScreen && slideActive);

	const run = useCallback(() => {
		trackPrototypeRun(phase === 'done' ? 'replay' : 'run');
		setTypedChars(0);
		if (reducedMotion()) {
			/* The click still does something — it just does all of it at once.
			   No per-step delays and no typewriter, so nothing animates and
			   nothing is lost. */
			setRevealed(totalUnits);
			setTypedChars(Number.MAX_SAFE_INTEGER);
			setPhase('done');
			return;
		}
		setRevealed(0);
		setPhase('running');
	}, [phase]);

	const stop = useCallback(() => {
		trackPrototypeRun('stop');
		setPhase('done');
	}, []);

	/**
	 * The runner: one timeout per render, cleared on every change. Pausing is
	 * `live` going false and the effect being dropped; resuming is it coming
	 * back and scheduling the very same next step. There is no elapsed-time
	 * bookkeeping to drift out of step with the view, because the view is
	 * derived from `revealed` and `typedChars` and nothing else.
	 */
	useEffect(() => {
		if (phase !== 'running' || !live) return;

		const current = revealed - 1;
		const unit = current >= 0 ? units[current] : undefined;
		if (unit?.typewriter && unit.text && typedChars < unit.text.length) {
			const id = setTimeout(() => setTypedChars((c) => c + 1), TYPE_MS);
			return () => clearTimeout(id);
		}

		if (revealed >= totalUnits) {
			setPhase('done');
			return;
		}

		const id = setTimeout(() => {
			setRevealed((r) => r + 1);
			setTypedChars(0);
		}, units[revealed].after);
		return () => clearTimeout(id);
	}, [phase, live, revealed, typedChars]);

	/* showModal() rather than an `open` attribute: only a *modal* dialog is
	   promoted to the top layer, and the top layer is the whole point — it is
	   what gets the expanded copy out from under .solution-slide__media's
	   overflow clip without a z-index fight. Esc, the backdrop and the focus
	   trap come with it rather than being hand-rolled. */
	const dialogRef = useRef<HTMLDialogElement>(null);
	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		if (expanded && !dialog.open) dialog.showModal();
		if (!expanded && dialog.open) dialog.close();
	}, [expanded]);

	const view = (sweepFocus: boolean) => (
		<ShellView
			revealed={revealed}
			typedChars={typedChars}
			phase={phase}
			onRun={run}
			onStop={stop}
			sweepFocus={sweepFocus}
		/>
	);

	return (
		<div className="bolt-proto__host" ref={rootRef}>
			<Frame
				mode="width"
				controls={
					<>
						<div className="bolt-proto__controls">
							<IconButton
								variant="secondary"
								size="sm"
								icon={<Icon name="maximize" />}
								label="Open the prototype full screen"
								data-slide-focusable=""
								onClick={() => {
									trackPrototypeRun('expand');
									setExpanded(true);
								}}
							/>
						</div>
						<p className="bolt-proto__hint type-annotation" data-hidden={phase === 'idle' ? undefined : ''}>
							<span>Press send to run it</span>
						</p>
					</>
				}
			>
				{view(true)}
			</Frame>

			{mounted &&
				createPortal(
					<dialog
						className="bolt-proto__dialog"
						ref={dialogRef}
						aria-label="Bolt agent prototype"
						onClose={() => setExpanded(false)}
					>
						<div className="bolt-proto__dialog-inner">
							{/* Mounted only while open, so the collapsed state costs nothing
							    and the modal always opens on the current run rather than on
							    a stale copy of it. Its ShellView is a second rendering of
							    the same state, not a moved one — every value it draws from
							    lives up here, so the two copies cannot disagree. */}
							{/* Outside the Frame, not overlaid on it: in the card the expand
							    control has nowhere else to go, but the modal has room around
							    the shell, and pinning it to the picture's own top-right put it
							    on top of the app's account avatar. */}
							<IconButton
								className="bolt-proto__close"
								variant="secondary"
								size="sm"
								icon={<Icon name="minimize" />}
								label="Close the full-screen prototype"
								onClick={() => setExpanded(false)}
							/>
							{expanded && <Frame mode="contain">{view(false)}</Frame>}
						</div>
					</dialog>,
					document.body,
				)}
		</div>
	);
}
