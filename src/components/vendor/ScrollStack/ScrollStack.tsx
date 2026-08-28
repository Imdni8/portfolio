import { useLayoutEffect, useRef, useCallback, type ReactNode } from 'react';
import Lenis from 'lenis';
import './ScrollStack.css';

/**
 * Vendored and adapted from React Bits' `ScrollStack` component
 * (reactbits.dev), which pins/scales a stack of cards as the page scrolls
 * past them. Kept in its own folder rather than alongside first-party code —
 * this is the one place in the codebase with its own co-located CSS file and
 * a runtime dependency (`lenis`) pulled in just for it, so the exception is
 * isolated rather than quietly living next to conventional code.
 *
 * One addition on top of the upstream source: `opacityAmount`, mirroring the
 * existing `blurAmount` depth-based fade — upstream only dims via blur, not
 * opacity.
 *
 * `scaleDuration` (present in upstream's prop list) was dropped: it's never
 * read anywhere in upstream's own implementation, only threaded through a
 * dependency array — a dead prop, not a feature to preserve.
 */

export interface ScrollStackItemProps {
	children: ReactNode;
	itemClassName?: string;
}

export const ScrollStackItem = ({ children, itemClassName = '' }: ScrollStackItemProps) => (
	<div className={`scroll-stack-card ${itemClassName}`.trim()}>{children}</div>
);

interface CardTransform {
	translateY: number;
	scale: number;
	rotation: number;
	blur: number;
	opacity: number;
}

export interface ScrollStackProps {
	children: ReactNode;
	className?: string;
	itemDistance?: number;
	itemScale?: number;
	itemStackDistance?: number;
	stackPosition?: string;
	scaleEndPosition?: string;
	baseScale?: number;
	rotationAmount?: number;
	blurAmount?: number;
	/** Depth-based opacity falloff for cards behind the front one, e.g. 0.2 →
	 *  the first card behind sits at 0.8 opacity, the next at 0.6, etc. — see
	 *  the floor below. 0 (default) leaves every card fully opaque. */
	opacityAmount?: number;
	/** This integration always runs against native page scroll rather than a
	 *  self-contained scrollable box, so this defaults to true. */
	useWindowScroll?: boolean;
	onStackComplete?: () => void;
}

const ScrollStack = ({
	children,
	className = '',
	itemDistance = 48,
	itemScale = 0.03,
	itemStackDistance = 30,
	stackPosition = '20%',
	scaleEndPosition = '10%',
	baseScale = 0.85,
	rotationAmount = 0,
	blurAmount = 0,
	opacityAmount = 0,
	useWindowScroll = true,
	onStackComplete,
}: ScrollStackProps) => {
	const scrollerRef = useRef<HTMLDivElement>(null);
	const stackCompletedRef = useRef(false);
	const animationFrameRef = useRef<number | null>(null);
	const lenisRef = useRef<Lenis | null>(null);
	const cardsRef = useRef<HTMLElement[]>([]);
	const lastTransformsRef = useRef(new Map<number, CardTransform>());
	const isUpdatingRef = useRef(false);
	// Each card's natural document-top, captured once at mount before any
	// transform is applied. `getElementOffset` below can't read this live via
	// `getBoundingClientRect()` in window-scroll mode: that returns the
	// *current rendered* position, which already includes whatever translateY
	// last frame wrote — feeding a card's own applied transform back into the
	// next frame's trigger math, which compounds frame over frame instead of
	// tracking the card's fixed place in the document. `offsetTop` (used in
	// non-window mode below) doesn't have this problem, since CSS transforms
	// never affect it — only the window-scroll case needs a cached value.
	const cardOffsetsRef = useRef<number[]>([]);

	const calculateProgress = useCallback((scrollTop: number, start: number, end: number) => {
		if (scrollTop < start) return 0;
		if (scrollTop > end) return 1;
		return (scrollTop - start) / (end - start);
	}, []);

	const parsePercentage = useCallback((value: number | string, containerHeight: number) => {
		if (typeof value === 'string' && value.includes('%')) {
			return (parseFloat(value) / 100) * containerHeight;
		}
		return parseFloat(String(value));
	}, []);

	const getScrollData = useCallback(() => {
		if (useWindowScroll) {
			return { scrollTop: window.scrollY, containerHeight: window.innerHeight };
		}
		const scroller = scrollerRef.current;
		return { scrollTop: scroller?.scrollTop ?? 0, containerHeight: scroller?.clientHeight ?? 0 };
	}, [useWindowScroll]);

	// For the `.scroll-stack-end` spacer only — it's never transformed, so
	// reading its live position is safe in either scroll mode.
	const getElementOffset = useCallback(
		(element: HTMLElement) => {
			if (useWindowScroll) {
				return element.getBoundingClientRect().top + window.scrollY;
			}
			return element.offsetTop;
		},
		[useWindowScroll]
	);

	// For cards: the cached mount-time offset in window-scroll mode (see
	// `cardOffsetsRef` above), or the live (transform-immune) `offsetTop`
	// otherwise.
	const getCardOffset = useCallback(
		(card: HTMLElement, i: number) => {
			if (useWindowScroll) {
				return cardOffsetsRef.current[i] ?? 0;
			}
			return card.offsetTop;
		},
		[useWindowScroll]
	);

	const updateCardTransforms = useCallback(() => {
		if (!cardsRef.current.length || isUpdatingRef.current) return;

		isUpdatingRef.current = true;

		const { scrollTop, containerHeight } = getScrollData();
		const stackPositionPx = parsePercentage(stackPosition, containerHeight);
		const scaleEndPositionPx = parsePercentage(scaleEndPosition, containerHeight);

		const endElement = useWindowScroll
			? document.querySelector<HTMLElement>('.scroll-stack-end')
			: (scrollerRef.current?.querySelector<HTMLElement>('.scroll-stack-end') ?? null);

		const endElementTop = endElement ? getElementOffset(endElement) : 0;

		// Which card currently reads as the front card, for the depth-dimming
		// below — computed once per frame from *live* rendered position
		// (deliberately not each card's own `pinStart` trigger, unlike
		// upstream's equivalent scan): a card later in DOM order paints over an
		// earlier one wherever their boxes overlap, so the incoming card
		// already visually covers the pinned one well before its own trigger
		// threshold fires — it's still in normal, untransformed document flow,
		// sliding up to arrive at the stack. Using live position instead means
		// the moment a card's top reaches the stack line — pinned or not — it
		// counts.
		let topCardIndex = 0;
		for (let j = 0; j < cardsRef.current.length; j++) {
			const card = cardsRef.current[j];
			if (!card) continue;
			if (card.getBoundingClientRect().top <= stackPositionPx) topCardIndex = j;
		}

		cardsRef.current.forEach((card, i) => {
			if (!card) return;

			const cardTop = getCardOffset(card, i);
			const triggerStart = cardTop - stackPositionPx - itemStackDistance * i;
			const triggerEnd = cardTop - scaleEndPositionPx;
			const pinStart = cardTop - stackPositionPx - itemStackDistance * i;
			const pinEnd = endElementTop - containerHeight / 2;

			const scaleProgress = calculateProgress(scrollTop, triggerStart, triggerEnd);
			const targetScale = baseScale + i * itemScale;
			const scale = 1 - scaleProgress * (1 - targetScale);
			const rotation = rotationAmount ? i * rotationAmount * scaleProgress : 0;

			const depthInStack = i < topCardIndex ? topCardIndex - i : 0;
			const blur = blurAmount ? Math.max(0, depthInStack * blurAmount) : 0;
			const opacity = opacityAmount ? Math.max(0.4, 1 - depthInStack * opacityAmount) : 1;

			let translateY = 0;
			const isPinned = scrollTop >= pinStart && scrollTop <= pinEnd;

			if (isPinned) {
				translateY = scrollTop - cardTop + stackPositionPx + itemStackDistance * i;
			} else if (scrollTop > pinEnd) {
				translateY = pinEnd - cardTop + stackPositionPx + itemStackDistance * i;
			}

			const newTransform: CardTransform = {
				translateY: Math.round(translateY * 100) / 100,
				scale: Math.round(scale * 1000) / 1000,
				rotation: Math.round(rotation * 100) / 100,
				blur: Math.round(blur * 100) / 100,
				opacity: Math.round(opacity * 1000) / 1000,
			};

			const lastTransform = lastTransformsRef.current.get(i);
			const hasChanged =
				!lastTransform ||
				Math.abs(lastTransform.translateY - newTransform.translateY) > 0.1 ||
				Math.abs(lastTransform.scale - newTransform.scale) > 0.001 ||
				Math.abs(lastTransform.rotation - newTransform.rotation) > 0.1 ||
				Math.abs(lastTransform.blur - newTransform.blur) > 0.1 ||
				Math.abs(lastTransform.opacity - newTransform.opacity) > 0.001;

			if (hasChanged) {
				card.style.transform = `translate3d(0, ${newTransform.translateY}px, 0) scale(${newTransform.scale}) rotate(${newTransform.rotation}deg)`;
				card.style.filter = newTransform.blur > 0 ? `blur(${newTransform.blur}px)` : '';
				card.style.opacity = String(newTransform.opacity);

				lastTransformsRef.current.set(i, newTransform);
			}

			if (i === cardsRef.current.length - 1) {
				const isInView = scrollTop >= pinStart && scrollTop <= pinEnd;
				if (isInView && !stackCompletedRef.current) {
					stackCompletedRef.current = true;
					onStackComplete?.();
				} else if (!isInView && stackCompletedRef.current) {
					stackCompletedRef.current = false;
				}
			}
		});

		isUpdatingRef.current = false;
	}, [
		itemScale,
		itemStackDistance,
		stackPosition,
		scaleEndPosition,
		baseScale,
		rotationAmount,
		blurAmount,
		opacityAmount,
		useWindowScroll,
		onStackComplete,
		calculateProgress,
		parsePercentage,
		getScrollData,
		getElementOffset,
		getCardOffset,
	]);

	const handleScroll = useCallback(() => {
		updateCardTransforms();
	}, [updateCardTransforms]);

	const setupLenis = useCallback(() => {
		if (useWindowScroll) {
			const lenis = new Lenis({
				duration: 1.2,
				easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
				smoothWheel: true,
				touchMultiplier: 2,
				wheelMultiplier: 1,
				lerp: 0.1,
				syncTouch: true,
				syncTouchLerp: 0.075,
			});

			lenis.on('scroll', handleScroll);

			const raf = (time: number) => {
				lenis.raf(time);
				animationFrameRef.current = requestAnimationFrame(raf);
			};
			animationFrameRef.current = requestAnimationFrame(raf);

			lenisRef.current = lenis;
			return lenis;
		}

		const scroller = scrollerRef.current;
		if (!scroller) return;

		const content = scroller.querySelector<HTMLElement>('.scroll-stack-inner');
		const lenis = new Lenis({
			wrapper: scroller,
			content: content ?? undefined,
			duration: 1.2,
			easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
			smoothWheel: true,
			touchMultiplier: 2,
			wheelMultiplier: 1,
			lerp: 0.1,
			syncTouch: true,
			syncTouchLerp: 0.075,
		});

		lenis.on('scroll', handleScroll);

		const raf = (time: number) => {
			lenis.raf(time);
			animationFrameRef.current = requestAnimationFrame(raf);
		};
		animationFrameRef.current = requestAnimationFrame(raf);

		lenisRef.current = lenis;
		return lenis;
	}, [handleScroll, useWindowScroll]);

	useLayoutEffect(() => {
		const scroller = scrollerRef.current;
		if (!scroller) return;

		const cards = Array.from(
			useWindowScroll
				? document.querySelectorAll<HTMLElement>('.scroll-stack-card')
				: scroller.querySelectorAll<HTMLElement>('.scroll-stack-card')
		);

		cardsRef.current = cards;
		const transformsCache = lastTransformsRef.current;

		// This is a scroll-scrubbed effect, and every such effect elsewhere on
		// this site (the homepage's own hero-pin fade, most directly) is
		// switched off entirely under reduced motion rather than kept with the
		// easing stripped — so under reduced motion, cards are left exactly as
		// ScrollStack.css's static layout renders them: full opacity/scale, no
		// Lenis, no rAF loop. Read once, not a live listener — same as
		// ChapterRail's own `reducedMotion` ref.
		const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reduceMotion) return;

		// Captured before any transform below is applied — see the comment on
		// `cardOffsetsRef` above for why this can't just be read live per frame.
		if (useWindowScroll) {
			cardOffsetsRef.current = cards.map((card) => card.getBoundingClientRect().top + window.scrollY);
		}

		cards.forEach((card, i) => {
			if (i < cards.length - 1) {
				card.style.marginBottom = `${itemDistance}px`;
			}
			card.style.willChange = 'transform, filter, opacity';
			card.style.transformOrigin = 'top center';
			card.style.backfaceVisibility = 'hidden';
			card.style.transform = 'translateZ(0)';
			card.style.perspective = '1000px';
		});

		setupLenis();
		updateCardTransforms();

		return () => {
			if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
			if (lenisRef.current) lenisRef.current.destroy();
			stackCompletedRef.current = false;
			cardsRef.current = [];
			transformsCache.clear();
			isUpdatingRef.current = false;
		};
	}, [
		itemDistance,
		itemScale,
		itemStackDistance,
		stackPosition,
		scaleEndPosition,
		baseScale,
		rotationAmount,
		blurAmount,
		opacityAmount,
		useWindowScroll,
		onStackComplete,
		setupLenis,
		updateCardTransforms,
	]);

	return (
		<div className={`scroll-stack-scroller ${className}`.trim()} ref={scrollerRef}>
			<div className="scroll-stack-inner">
				{children}
				<div className="scroll-stack-end" />
			</div>
		</div>
	);
};

export default ScrollStack;
