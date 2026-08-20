import { useEffect, useRef } from 'react';
import { createWaterField, type WaterFieldOptions } from './water-field';

export type WaterFieldProps = WaterFieldOptions & { className?: string };

/**
 * React wrapper, for Storybook and for islands. The effect itself lives in
 * water-field.ts — this adds nothing but a mount point and a teardown, which
 * is the whole reason the engine is framework-free.
 */
export const WaterField = ({ grid, intensity, maxDpr, className }: WaterFieldProps) => {
	const ref = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		if (!ref.current) return;
		const field = createWaterField(ref.current, { grid, intensity, maxDpr });
		return () => field.destroy();
	}, [grid, intensity, maxDpr]);

	return (
		<canvas
			ref={ref}
			className={['water-field', className].filter(Boolean).join(' ')}
			aria-hidden="true"
		/>
	);
};
