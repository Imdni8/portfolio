import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { HTMLAttributes, KeyboardEvent } from 'react';

/* React Bits' DecryptedText (reactbits.dev), ported to TypeScript. The props
   and the four triggers are the library's. What changed, and why:

   - No `motion` dependency. The source renders a `motion.span` with no
     animation props, which is a plain span with a library attached.
   - The wrapper's inline styles are the `.decrypted-text` class in
     components.css, as with every other wrapper here.
   - The accessible copy is the real text in `.sr-only`. The source hides
     its copy with `visibility: hidden`, which also hides it from assistive
     tech, and it read the scrambled string, so the text was never read at
     all.
   - Text is split into graphemes, not UTF-16 units, so an emoji is one
     character and never scrambles into half a surrogate pair.
   - The ticker keeps its working state in the effect instead of calling
     setState from inside another setState updater, which React may run
     twice.
   - Hover only fires on a device that can hover, as every hover style in
     this project does. Under reduced motion the characters change at half
     the rate: gentler, not switched off.
   - In click mode the text is a keyboard-operable button. */

type RevealDirection = 'start' | 'end' | 'center';

export type DecryptedTextProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'className'> & {
	text: string;
	/** Milliseconds between frames. */
	speed?: number;
	/** Frames of scrambling before the text settles (non-sequential only). */
	maxIterations?: number;
	/** Reveal one character per frame instead of all at once. */
	sequential?: boolean;
	/** Where a sequential reveal starts. */
	revealDirection?: RevealDirection;
	/** Scramble with the text's own characters instead of `characters`. */
	useOriginalCharsOnly?: boolean;
	characters?: string;
	/** Class for revealed characters. */
	className?: string;
	/** Class for the wrapper. */
	parentClassName?: string;
	/** Class for characters still scrambled. */
	encryptedClassName?: string;
	animateOn?: 'view' | 'hover' | 'inViewHover' | 'click';
	/** Click mode only: decrypt once, or toggle back and forth. */
	clickMode?: 'once' | 'toggle';
};

type Phase = 'idle' | 'forward' | 'reverse';

const HOVER_QUERY = '(hover: hover) and (pointer: fine)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const EMPTY: ReadonlySet<number> = new Set();

const graphemes = (text: string): string[] =>
	typeof Intl !== 'undefined' && 'Segmenter' in Intl
		? Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text), (s) => s.segment)
		: Array.from(text);

const isBlank = (char: string) => /^\s+$/.test(char);

/** The order characters are revealed in: from the start, from the end, or
    from the middle outwards, alternating right then left. */
const revealOrder = (length: number, direction: RevealDirection): number[] => {
	const order = Array.from({ length }, (_, i) => i);
	if (direction === 'start') return order;
	if (direction === 'end') return order.reverse();
	const middle = Math.floor(length / 2);
	return order.map((i) => (i % 2 === 0 ? middle + i / 2 : middle - Math.ceil(i / 2)));
};

const withoutRandom = (set: ReadonlySet<number>, count: number): Set<number> => {
	const left = Array.from(set);
	for (let i = 0; i < count && left.length > 0; i++) {
		left.splice(Math.floor(Math.random() * left.length), 1);
	}
	return new Set(left);
};

export const DecryptedText = ({
	text,
	speed = 50,
	maxIterations = 10,
	sequential = false,
	revealDirection = 'start',
	useOriginalCharsOnly = false,
	characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+',
	className = '',
	parentClassName = '',
	encryptedClassName = '',
	animateOn = 'hover',
	clickMode = 'once',
	...rest
}: DecryptedTextProps) => {
	const chars = useMemo(() => graphemes(text), [text]);
	const pool = useMemo(
		() => (useOriginalCharsOnly ? [...new Set(chars)].filter((c) => !isBlank(c)) : Array.from(characters)),
		[useOriginalCharsOnly, chars, characters],
	);

	const [display, setDisplay] = useState<string[]>(chars);
	const [revealed, setRevealed] = useState<ReadonlySet<number>>(EMPTY);
	const [phase, setPhase] = useState<Phase>('idle');
	const [isDecrypted, setIsDecrypted] = useState(animateOn !== 'click');
	const ref = useRef<HTMLSpanElement>(null);

	const scramble = useCallback(
		(keep: ReadonlySet<number>) =>
			chars.map((c, i) =>
				isBlank(c) || keep.has(i) || pool.length === 0 ? c : pool[Math.floor(Math.random() * pool.length)],
			),
		[chars, pool],
	);

	const decrypt = useCallback(() => {
		setRevealed(EMPTY);
		setIsDecrypted(false);
		setPhase('forward');
	}, []);

	const encrypt = useCallback(() => {
		setRevealed(new Set(chars.keys()));
		setDisplay(chars);
		setPhase('reverse');
	}, [chars]);

	/* A new text, or a new trigger, starts from rest: plain, or scrambled
	   when it waits for a click. */
	useEffect(() => {
		setPhase('idle');
		setRevealed(EMPTY);
		setIsDecrypted(animateOn !== 'click');
		setDisplay(animateOn === 'click' ? scramble(EMPTY) : chars);
	}, [animateOn, chars, scramble]);

	useEffect(() => {
		if (phase === 'idle') return;

		const total = chars.length;
		const order = revealOrder(total, revealDirection);
		if (phase === 'reverse') order.reverse();
		let current: ReadonlySet<number> = phase === 'reverse' ? new Set(chars.keys()) : EMPTY;
		let step = 0;

		const show = (next: ReadonlySet<number>) => {
			current = next;
			setRevealed(next);
			setDisplay(scramble(next));
		};
		const finish = (decrypted: boolean) => {
			window.clearInterval(timer);
			setPhase('idle');
			setIsDecrypted(decrypted);
		};

		const tick = () => {
			if (phase === 'forward' && sequential) {
				if (step >= total) return finish(true);
				show(new Set(current).add(order[step++]));
			} else if (phase === 'forward') {
				if (++step >= maxIterations) {
					setDisplay(chars);
					return finish(true);
				}
				setDisplay(scramble(current));
			} else if (sequential) {
				if (step >= total) return finish(false);
				const next = new Set(current);
				next.delete(order[step++]);
				show(next);
				if (next.size === 0) finish(false);
			} else {
				const next = withoutRandom(current, Math.max(1, Math.ceil(total / Math.max(1, maxIterations))));
				if (next.size === 0 || ++step >= maxIterations) {
					show(EMPTY);
					return finish(false);
				}
				show(next);
			}
		};

		const reduced = window.matchMedia(REDUCED_MOTION_QUERY).matches;
		const timer = window.setInterval(tick, reduced ? speed * 2 : speed);
		return () => window.clearInterval(timer);
	}, [phase, chars, scramble, sequential, revealDirection, maxIterations, speed]);

	/* View: once, the first time a tenth of it is on screen. */
	useEffect(() => {
		if (animateOn !== 'view' && animateOn !== 'inViewHover') return;
		const el = ref.current;
		if (!el) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (!entries.some((e) => e.isIntersecting)) return;
				observer.disconnect();
				decrypt();
			},
			{ threshold: 0.1 },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [animateOn, decrypt]);

	const hoverable = animateOn === 'hover' || animateOn === 'inViewHover';
	const clickable = animateOn === 'click';

	const onHoverStart = () => {
		if (phase !== 'idle' || !window.matchMedia(HOVER_QUERY).matches) return;
		decrypt();
	};

	const onHoverEnd = () => {
		setPhase('idle');
		setRevealed(EMPTY);
		setDisplay(chars);
		setIsDecrypted(true);
	};

	const onActivate = () => {
		if (phase !== 'idle') return;
		if (!isDecrypted) decrypt();
		else if (clickMode === 'toggle') encrypt();
	};

	const onKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
		if (e.key !== 'Enter' && e.key !== ' ') return;
		e.preventDefault();
		onActivate();
	};

	const settled = phase === 'idle' && isDecrypted;

	return (
		<span
			ref={ref}
			className={['decrypted-text', parentClassName].filter(Boolean).join(' ')}
			{...(hoverable && { onMouseEnter: onHoverStart, onMouseLeave: onHoverEnd })}
			{...(clickable && { role: 'button', tabIndex: 0, onClick: onActivate, onKeyDown })}
			{...rest}
		>
			<span className="sr-only">{text}</span>
			<span aria-hidden="true">
				{display.map((char, i) => (
					<span key={i} className={(settled || revealed.has(i) ? className : encryptedClassName) || undefined}>
						{char}
					</span>
				))}
			</span>
		</span>
	);
};
