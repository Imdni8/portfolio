import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '../ui/Icon';
import { trackCompareDragged } from '../analytics/analytics';

interface Shot {
	src: string;
	srcSet?: string;
	/** Passed straight to the <img>; without it the browser assumes 100vw and
	    over-fetches the srcSet's largest candidate even on frames narrower
	    than the viewport. */
	sizes?: string;
	width: number;
	height: number;
	alt: string;
}

/** A numbered callout: a pin pinned to the shot, and the line it explains. */
interface Note {
	/** position of the pin, as a percentage of the frame */
	x: number;
	y: number;
	text: string;
	/** overrides the pin's badge (default: its 1-based position in the array)
	    — give several pins the same label + text to point at multiple spots
	    that share one callout, e.g. a "★" bonus note. */
	label?: string;
}

interface Props {
	before: Shot;
	after: Shot;
	beforeLabel?: string;
	afterLabel?: string;
	beforeNotes?: Note[];
	afterNotes?: Note[];
	/** aspect ratio of the viewport both shots are cropped into */
	ratio?: number;
	start?: number;
}

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/** Collapses notes sharing the same `text` into one story-panel line, marked
    with the label of the first pin that carries it. */
const dedupeNotes = (notes: Note[]) => {
	const seen = new Set<string>();
	const items: { marker: string; text: string }[] = [];
	notes.forEach((note, i) => {
		if (seen.has(note.text)) return;
		seen.add(note.text);
		items.push({ marker: note.label ?? String(i + 1), text: note.text });
	});
	return items;
};

/** A linear ramp, clamped to [0,1], rising as `x` moves up through
    [edge, edge + span]. */
const rampUp = (x: number, edge: number, span: number) => clamp01((x - edge) / span);
/** The same ramp falling instead of rising — 1 at `edge`, 0 by `edge - span`. */
const rampDown = (x: number, edge: number, span: number) => clamp01((edge - x) / span);

/** how long the handle sits still before it starts hinting that it can be dragged */
const HINT_DELAY = 3000;
/** how much of the drag the chip → story crossfade occupies, at each end */
const STORY_RAMP = 30;
/** the story is fully out this far short of the end of the travel, so the last
    stretch of the drag is spent on the shot alone rather than still animating */
const STORY_END = 10;
/** an arrow pointing into the end of the travel fades away over this much of it */
const EDGE_FADE = 2;
/** how much of `story`'s own [0,1] climb each pin's fade-in ramp occupies */
const PIN_RAMP = 0.4;
/** total budget the per-pin stagger can spend: past `1 - PIN_RAMP`, a pin's
    ramp would still be climbing when story reaches 1 and it would never hit
    full opacity. Divided across however many pins there are, so a denser set
    of notes staggers more tightly instead of stalling the last few. */
const PIN_STAGGER_BUDGET = 1 - PIN_RAMP;
const pinStagger = (count: number) => (count > 1 ? Math.min(0.12, PIN_STAGGER_BUDGET / (count - 1)) : 0);

/** Drag-to-compare shot pair. Keyboard: arrows nudge, shift+arrow jumps, home/end. */
export default function BeforeAfter({
	before,
	after,
	beforeLabel = 'Before',
	afterLabel = 'After',
	beforeNotes = [],
	afterNotes = [],
	ratio = 2.15,
	start = 50,
}: Props) {
	const [pos, setPos] = useState(start);
	const [dragging, setDragging] = useState(false);
	const [hinting, setHinting] = useState(false);
	const frameRef = useRef<HTMLDivElement>(null);
	const handleRef = useRef<HTMLDivElement>(null);
	/** distance between the cursor and the seam when a drag starts on the grip */
	const grabOffset = useRef(0);
	/** the frame's rect, read once per drag rather than on every pointermove —
	    a drag gesture does not resize or scroll the page under itself */
	const frameRectRef = useRef<DOMRect | null>(null);
	/** percentage of the frame the seam is kept away from each edge, so the grip is
	    always centred on the gutter rather than being pushed off it near the ends */
	const [limit, setLimit] = useState(0);

	useEffect(() => {
		const frame = frameRef.current;
		const grip = handleRef.current;
		if (!frame || !grip) return;
		const measure = () => {
			const frameWidth = frame.getBoundingClientRect().width;
			const gripWidth = grip.getBoundingClientRect().width;
			if (!frameWidth || !gripWidth) return;
			const next = Math.min(45, (gripWidth / 2 / frameWidth) * 100);
			setLimit(next);
			setPos((p) => (p < next ? next : p > 100 - next ? 100 - next : p));
		};
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(frame);
		return () => observer.disconnect();
	}, []);

	const clamp = useCallback((n: number) => {
		const low = limit;
		const high = 100 - low;
		return n < low ? low : n > high ? high : n;
	}, [limit]);

	// The nudge is a one-shot affordance: once the handle has been touched at all it never returns.
	const hintTimer = useRef<number | undefined>(undefined);
	useEffect(() => {
		hintTimer.current = window.setTimeout(() => setHinting(true), HINT_DELAY);
		return () => window.clearTimeout(hintTimer.current);
	}, []);

	const stopHinting = useCallback(() => {
		window.clearTimeout(hintTimer.current);
		setHinting(false);
	}, []);

	/* Where the current gesture started, so a click that lands on the frame
	   without moving the seam is not reported as a drag. */
	const dragStartPos = useRef(start);
	/* Arrow keys arrive one event per press; reporting each would turn a single
	   adjustment into a dozen events, so a burst settles into one. Read through
	   a ref because the timer outlives the render that scheduled it. */
	const keyTimer = useRef<number | undefined>(undefined);
	const posRef = useRef(pos);
	useEffect(() => {
		posRef.current = pos;
	}, [pos]);
	useEffect(() => () => window.clearTimeout(keyTimer.current), []);

	const setFromClientX = useCallback((clientX: number) => {
		const rect = frameRectRef.current;
		if (!rect) return;
		setPos(clamp(((clientX + grabOffset.current - rect.left) / rect.width) * 100));
	}, [clamp]);

	const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
		// Ignore secondary buttons so right-click can still reach the image.
		if (event.button !== 0) return;
		stopHinting();

		// Read once per drag — every move and the initial placement below share
		// this same rect rather than each forcing their own layout read.
		const frame = frameRef.current;
		if (!frame) return;
		const rect = frame.getBoundingClientRect();
		frameRectRef.current = rect;

		// Grabbing the grip itself picks it up where it sits — near the ends it is held
		// away from the seam to stay on canvas, so snapping it to the cursor would jump.
		const onGrip = (event.target as HTMLElement).closest('.ba__handle');
		if (onGrip) {
			grabOffset.current = rect.left + (pos / 100) * rect.width - event.clientX;
		} else {
			grabOffset.current = 0;
			setFromClientX(event.clientX);
		}

		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		dragStartPos.current = pos;
		setDragging(true);
	};

	const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
		if (!dragging) return;
		setFromClientX(event.clientX);
	};

	const stop = (event: React.PointerEvent<HTMLDivElement>) => {
		if (!dragging) return;
		setDragging(false);
		grabOffset.current = 0;
		const el = event.currentTarget as HTMLElement;
		if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);

		// Reported at the end of the gesture, not on every move — one event per
		// drag, carrying where it was actually left.
		if (Math.round(pos) !== Math.round(dragStartPos.current)) {
			trackCompareDragged('pointer', pos);
		}
	};

	const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
		stopHinting();
		window.clearTimeout(keyTimer.current);
		keyTimer.current = window.setTimeout(() => trackCompareDragged('keyboard', posRef.current), 600);
		const step = event.shiftKey ? 10 : 2;
		const moves: Record<string, number> = {
			ArrowLeft: -step,
			ArrowRight: step,
			ArrowDown: -step,
			ArrowUp: step,
		};
		if (event.key in moves) {
			event.preventDefault();
			setPos((p) => clamp(p + moves[event.key]));
		} else if (event.key === 'Home') {
			event.preventDefault();
			setPos(clamp(0));
		} else if (event.key === 'End') {
			event.preventDefault();
			setPos(clamp(100));
		}
	};

	// Each end tells its own story once the drag commits to it. The chip hands over to
	// the panel across the same stretch, and also ducks out before the seam reaches it
	// so a label never gets sliced down the middle.
	// A side with no notes has nothing to hand over to, so its chip simply stays put.
	// Measured against the travel actually available, so the panel still arrives fully
	// at the end of the drag however much room the grip takes up at a given width.
	const travelled = rampUp(pos, limit, Math.max(1, 100 - 2 * limit)) * 100;
	const beforeStory = beforeNotes.length ? rampUp(travelled, 100 - STORY_END - STORY_RAMP, STORY_RAMP) : 0;
	const afterStory = afterNotes.length ? rampDown(travelled, STORY_END + STORY_RAMP, STORY_RAMP) : 0;
	// Keyed off `travelled`, the same limit-normalized basis the story ramps use
	// above — not raw `pos`, whose [25,75] window the drag can never reach once
	// `limit` (the grip's own half-width, as a frame percentage) is 25 or more.
	const beforeChip = rampUp(travelled, 25, 10) * (1 - beforeStory);
	const afterChip = rampDown(travelled, 75, 10) * (1 - afterStory);

	// An arrow with nowhere left to go is just noise against the frame edge, so it
	// ducks out — via opacity, since removing it would resize the grip it centres.
	const prevArrow = rampUp(travelled, 0, EDGE_FADE);
	const nextArrow = rampDown(travelled, 100, EDGE_FADE);

	const classes = ['ba'];
	if (dragging) classes.push('is-dragging');
	if (hinting) classes.push('is-hinting');

	const renderSide = (
		side: 'before' | 'after',
		label: string,
		notes: Note[],
		story: number,
		chip: number,
	) => (
		<div className={`ba__side ba__side--${side}`} aria-hidden="true">
			<span className="ba__label" style={{ opacity: chip }}>
				{label}
			</span>

			{notes.map((note, i) => (
				<span
					key={i}
					className="ba__pin"
					style={{
						insetInlineStart: `${note.x}%`,
						insetBlockStart: `${note.y}%`,
						// Stagger so the pins land one after another rather than as a
						// block — the increment shrinks as the count grows, so the
						// last pin still reaches full opacity once story hits 1.
						opacity: rampUp(story, i * pinStagger(notes.length), PIN_RAMP),
					}}
				>
					{note.label ?? i + 1}
				</span>
			))}

			{notes.length > 0 && (
				<div
					className="ba__story"
					style={{ opacity: story, translate: `0 ${(1 - story) * 100}%` }}
				>
					<p className="ba__story-title type-overline">{label}</p>
					{/* Not an <ol>: several pins can share one callout (e.g. a "★"
					    bonus note pointing at multiple spots), so the marker beside
					    each line is the label of its first matching pin — not a
					    browser-assigned ordinal, which can't mix in an emoji. De-duped
					    by text so a shared callout reads once rather than repeating. */}
					<ul className="ba__story-list type-annotation">
						{dedupeNotes(notes).map(({ marker, text }) => (
							<li key={text}>
								<span className="ba__story-marker" aria-hidden="true">
									{marker}
								</span>
								{text}
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);

	return (
		<div
			className={classes.join(' ')}
			ref={frameRef}
			style={{ aspectRatio: String(ratio), ['--pos' as string]: pos }}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={stop}
			onPointerCancel={stop}
		>
			{/* Both halves are clipped back from the seam, leaving a gutter of frame
			    between them so the split reads even where the two shots look alike. */}
			<div className="ba__base">
				<img
					className="ba__shot"
					src={before.src}
					srcSet={before.srcSet}
					sizes={before.sizes}
					width={before.width}
					height={before.height}
					alt={before.alt}
					draggable={false}
				/>
				{renderSide('before', beforeLabel, beforeNotes, beforeStory, beforeChip)}
			</div>

			<div className="ba__reveal">
				<img
					className="ba__shot"
					src={after.src}
					srcSet={after.srcSet}
					sizes={after.sizes}
					width={after.width}
					height={after.height}
					alt={after.alt}
					draggable={false}
				/>
				{/* Inside the reveal, so it is clipped to the after side and cannot survive at 100%. */}
				{renderSide('after', afterLabel, afterNotes, afterStory, afterChip)}
			</div>

			<div
				className="ba__handle"
				ref={handleRef}
				role="slider"
				tabIndex={0}
				aria-label={`Reveal ${afterLabel.toLowerCase()} — drag or use arrow keys`}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={Math.round(pos)}
				aria-valuetext={`${Math.round(pos)}% ${beforeLabel.toLowerCase()}`}
				onKeyDown={onKeyDown}
				onFocus={stopHinting}
			>
				<span className="ba__chev ba__chev--prev" style={{ opacity: prevArrow }}>
					<Icon name="chevron-left" />
				</span>
				<span className="ba__chev ba__chev--next" style={{ opacity: nextArrow }}>
					<Icon name="chevron-right" />
				</span>
			</div>
		</div>
	);
}
