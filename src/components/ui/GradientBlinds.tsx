import { useEffect, useRef } from 'react';
import { createGradientBlinds, type GradientBlindsOptions } from './gradient-blinds';

export type GradientBlindsProps = GradientBlindsOptions & { className?: string };

/**
 * React wrapper, for Storybook and for islands. The effect itself lives in
 * gradient-blinds.ts — this adds nothing but a mount point and a teardown,
 * the same arrangement as LiquidMetal.tsx.
 */
export const GradientBlinds = ({
	blindCount,
	blindMinWidth,
	spotlightRadius,
	spotlightSoftness,
	spotlightOpacity,
	maskEnd,
	interactive,
	maxDpr,
	className,
}: GradientBlindsProps) => {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!ref.current) return;
		const blinds = createGradientBlinds(ref.current, {
			blindCount,
			blindMinWidth,
			spotlightRadius,
			spotlightSoftness,
			spotlightOpacity,
			maskEnd,
			interactive,
			maxDpr,
		});
		return () => blinds.destroy();
	}, [blindCount, blindMinWidth, spotlightRadius, spotlightSoftness, spotlightOpacity, maskEnd, interactive, maxDpr]);

	return (
		<div
			ref={ref}
			className={['gradient-blinds', className].filter(Boolean).join(' ')}
			data-gradient-blinds
			aria-hidden="true"
		/>
	);
};
