import { useCallback, useEffect, useRef, useState } from 'react';

interface Shot {
	src: string;
	srcSet?: string;
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

/** how long the handle sits still before it starts hinting that it can be dragged */
const HINT_DELAY = 3000;
/** how much of the drag the chip → story crossfade occupies, at each end */
const STORY_RAMP = 30;
/** the story is fully out this far short of the end of the travel, so the last
    stretch of the drag is spent on the shot alone rather than still animating */
const STORY_END = 10;
/** an arrow pointing into the end of the travel fades away over this much of it */
const EDGE_FADE = 2;

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
	/** percentage of the frame the seam is kept away from each edge, so the grip is
	    always centred on the gutter rather than being pushed off it near the ends */
	const [limit, setLimit] = useState(0);
	const limitRef = useRef(0);

	useEffect(() => {
		const frame = frameRef.current;
		const grip = handleRef.current;
		if (!frame || !grip) return;
		const measure = () => {
			const frameWidth = frame.getBoundingClientRect().width;
			const gripWidth = grip.getBoundingClientRect().width;
			if (!frameWidth || !gripWidth) return;
			const next = Math.min(45, (gripWidth / 2 / frameWidth) * 100);
			limitRef.current = next;
			setLimit(next);
			setPos((p) => (p < next ? next : p > 100 - next ? 100 - next : p));
		};
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(frame);
		return () => observer.disconnect();
	}, []);

	const clamp = useCallback((n: number) => {
		const low = limitRef.current;
		const high = 100 - low;
		return n < low ? low : n > high ? high : n;
	}, []);

	// The nudge is a one-shot affordance: once the handle has been touched at all it never returns.
	useEffect(() => {
		const timer = window.setTimeout(() => setHinting(true), HINT_DELAY);
		return () => window.clearTimeout(timer);
	}, []);

	const stopHinting = useCallback(() => setHinting(false), []);

	const setFromClientX = useCallback((clientX: number) => {
		const frame = frameRef.current;
		if (!frame) return;
		const rect = frame.getBoundingClientRect();
		setPos(clamp(((clientX + grabOffset.current - rect.left) / rect.width) * 100));
	}, []);

	const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
		// Ignore secondary buttons so right-click can still reach the image.
		if (event.button !== 0) return;
		stopHinting();

		// Grabbing the grip itself picks it up where it sits — near the ends it is held
		// away from the seam to stay on canvas, so snapping it to the cursor would jump.
		const frame = frameRef.current;
		const onGrip = (event.target as HTMLElement).closest('.ba__handle');
		if (frame && onGrip) {
			const rect = frame.getBoundingClientRect();
			grabOffset.current = rect.left + (pos / 100) * rect.width - event.clientX;
		} else {
			grabOffset.current = 0;
			setFromClientX(event.clientX);
		}

		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
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
	};

	const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
		stopHinting();
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
	const travelled = clamp01((pos - limit) / Math.max(1, 100 - 2 * limit)) * 100;
	const beforeStory = beforeNotes.length
		? clamp01((travelled - (100 - STORY_END - STORY_RAMP)) / STORY_RAMP)
		: 0;
	const afterStory = afterNotes.length
		? clamp01((STORY_END + STORY_RAMP - travelled) / STORY_RAMP)
		: 0;
	const beforeChip = clamp01((pos - 25) / 10) * (1 - beforeStory);
	const afterChip = clamp01((75 - pos) / 10) * (1 - afterStory);

	// An arrow with nowhere left to go is just noise against the frame edge, so it
	// ducks out — via opacity, since removing it would resize the grip it centres.
	const prevArrow = clamp01(travelled / EDGE_FADE);
	const nextArrow = clamp01((100 - travelled) / EDGE_FADE);

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
					key={note.text}
					className="ba__pin"
					style={{
						insetInlineStart: `${note.x}%`,
						insetBlockStart: `${note.y}%`,
						// Stagger so the pins land one after another rather than as a block.
						opacity: clamp01((story - i * 0.12) / 0.4),
					}}
				>
					{i + 1}
				</span>
			))}

			{notes.length > 0 && (
				<div
					className="ba__story"
					style={{ opacity: story, translate: `0 ${(1 - story) * 100}%` }}
				>
					<p className="ba__story-title">{label}</p>
					<ol className="ba__story-list">
						{notes.map((note) => (
							<li key={note.text}>{note.text}</li>
						))}
					</ol>
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
				<svg className="ba__chev ba__chev--prev" style={{ opacity: prevArrow }} viewBox="6 0 12 24" width="14" height="28" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
					<path d="M15 5 8 12l7 7" />
				</svg>
				<svg className="ba__chev ba__chev--next" style={{ opacity: nextArrow }} viewBox="6 0 12 24" width="14" height="28" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
					<path d="m9 5 7 7-7 7" />
				</svg>
			</div>
		</div>
	);
}
