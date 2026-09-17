import { useEffect, useRef } from 'react';
import { createLiquidMetal, type LiquidMetalOptions } from './liquid-metal';

export type LiquidMetalProps = LiquidMetalOptions & { className?: string };

/**
 * React wrapper, for Storybook and for islands. The effect itself lives in
 * liquid-metal.ts — this adds nothing but a mount point and a teardown, the
 * same arrangement as WaterField.tsx.
 */
export const LiquidMetal = ({ speed, scale, className }: LiquidMetalProps) => {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!ref.current) return;
		const shader = createLiquidMetal(ref.current, { speed, scale });
		return () => shader.destroy();
	}, [speed, scale]);

	return (
		<div
			ref={ref}
			className={['liquid-metal', className].filter(Boolean).join(' ')}
			data-liquid-metal
			aria-hidden="true"
		/>
	);
};
