/* ============================================================================
   Liquid metal — the amber glow the homepage headline sits in front of.

   Paper's LiquidMetal shader, taken from
   https://app.paper.design/file/01M0JA3C4D56J49TYWHSXTMEKJ/1-0/1RC-0 and
   mounted through the framework-free `ShaderMount`, for the reason
   smoke-ring.ts gives: the React `<LiquidMetal>` component only maps props onto
   uniforms and hands them to that same class, so going straight to it keeps the
   homepage at zero React.

   The shader itself is colourless. With `colorTint` at white and `colorBack`
   transparent it draws a chrome diamond in greys (plus a little red/blue
   fringing), and the amber is made entirely by how that reaches the page: the
   host has its own `--home-shader-ground` fill, isolates, and soft-lights the
   result onto `--home-ground`. Soft-light moves each channel toward the
   direction the blend layer points, scaled by how far the base channel has
   to go — and the warm ground has no blue in it, so the highlights can only
   come up amber. That is the whole recipe, and why those two grounds are
   tokens (tokens.css) rather than values restated here. `.liquid-metal` in
   components.css carries the blend.

   Contrast. Soft-light over a base this dark can only lift it so far: the
   brightest pixel the blend can produce is where the base is lifted by a
   white blend layer, which for #140c00 works out to about #3f2a00.
   Measured on the rendered page — every pixel under the headline, across a
   60-second sweep of the loop, at 1728, 1440 and 1024 wide — the brightest
   ground is rgb(61, 40, 0), and the headline's --text is 13.5:1 against it.
   Re-measure if a parameter below brightens the shape (`contour`,
   `softness`, `scale`) or either ground changes.

   Reduced motion parks the shape on its opening frame rather than removing
   it, same as the smoke ring: the glow is the composition, the drift is the
   decoration.
   ========================================================================== */

import {
	LiquidMetalShapes,
	ShaderFitOptions,
	ShaderMount,
	defaultObjectSizing,
	emptyPixel,
	getShaderColorFromString,
	liquidMetalFragmentShader,
	type LiquidMetalShape,
} from '@paper-design/shaders';

export type LiquidMetalOptions = {
	/** Playback rate. 0 holds a single frame. */
	speed?: number;
	/** Size of the shape relative to the host. */
	scale?: number;
};

export type LiquidMetal = { destroy: () => void };

/* The Paper file's parameters, unmodified — except `frame`, which the file
   does not have to give: it is live rather than exported, so it plays from
   wherever it is. The shape's edges sharpen and soften as the loop runs, and
   at t=0 they are at their hardest, which is not how the reference reads.
   Frames are milliseconds of animation time; 2000 is two seconds into the
   loop, where the diamond has the soft, glowing edge the reference is drawn
   with. It matters most under reduced motion, where it is the only frame
   anyone sees. */
const PAPER = {
	speed: 0.34,
	frame: 2000,
	colorBack: '#00000000',
	colorTint: '#ffffff',
	contour: 0.59,
	distortion: 0.34,
	softness: 0.64,
	repetition: 1.33,
	shiftRed: 0.3,
	shiftBlue: 0.3,
	angle: 70,
	shape: 'diamond' satisfies LiquidMetalShape,
	fit: 'contain' as const,
	scale: 0.36,
} as const;

/* Same trade as the smoke ring and the water field: a soft shape with no edge
   worth anti-aliasing, drawn full-viewport behind everything, so render at the
   device's own ratio (never Paper's forced 2x) and cap the pixel count well
   under Paper's 4K ceiling. */
const MIN_PIXEL_RATIO = 1;
const MAX_PIXEL_COUNT = 1920 * 1080 * 1.5;

/* alpha:true because `colorBack` is transparent — the host's own ground is
   what shows through, and it is that ground plus the shape, together, that
   gets blended onto the page. */
const CONTEXT: WebGLContextAttributes = {
	alpha: true,
	antialias: false,
	depth: false,
	stencil: false,
	powerPreference: 'low-power',
};

/**
 * Mounts the shader into `host`, which it fills. `host` gets a canvas
 * prepended to it and is left inert to the pointer by its own CSS — nothing
 * here listens for input.
 */
export function createLiquidMetal(host: HTMLElement, options: LiquidMetalOptions = {}): LiquidMetal {
	const speed = options.speed ?? PAPER.speed;
	const scale = options.scale ?? PAPER.scale;

	const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

	let mount: ShaderMount | null = null;
	let disposed = false;

	const onMotionChange = () => mount?.setSpeed(reduceMotion.matches ? 0 : speed);

	void (async () => {
		/* The shader has an image mode this page does not use, but the sampler
		   still has to be bound to something, and ShaderMount throws on an
		   image that is not already decoded. A 1×1 data URI, so this resolves
		   without touching the network — the same stand-in Paper's own React
		   wrapper passes. */
		const placeholder = new Image();
		placeholder.src = emptyPixel;

		try {
			await placeholder.decode();
		} catch {
			host.dataset.liquidMetal = 'unsupported';
			return;
		}

		if (disposed) return;

		try {
			mount = new ShaderMount(
				host,
				liquidMetalFragmentShader,
				{
					u_colorBack: getShaderColorFromString(PAPER.colorBack),
					u_colorTint: getShaderColorFromString(PAPER.colorTint),
					u_image: placeholder,
					u_isImage: false,
					u_shape: LiquidMetalShapes[PAPER.shape],
					u_contour: PAPER.contour,
					u_distortion: PAPER.distortion,
					u_softness: PAPER.softness,
					u_repetition: PAPER.repetition,
					u_shiftRed: PAPER.shiftRed,
					u_shiftBlue: PAPER.shiftBlue,
					u_angle: PAPER.angle,
					u_fit: ShaderFitOptions[PAPER.fit],
					u_scale: scale,
					u_rotation: defaultObjectSizing.rotation,
					u_offsetX: defaultObjectSizing.offsetX,
					u_offsetY: defaultObjectSizing.offsetY,
					u_originX: defaultObjectSizing.originX,
					u_originY: defaultObjectSizing.originY,
					u_worldWidth: defaultObjectSizing.worldWidth,
					u_worldHeight: defaultObjectSizing.worldHeight,
				},
				CONTEXT,
				reduceMotion.matches ? 0 : speed,
				PAPER.frame,
				MIN_PIXEL_RATIO,
				MAX_PIXEL_COUNT,
			);
		} catch {
			/* ShaderMount needs WebGL2 and throws without it. The host keeps its
			   own ground, so the page falls back to a flat warm field with no
			   glow — the same page, minus the decoration. */
			host.dataset.liquidMetal = 'unsupported';
			return;
		}

		/* What `.liquid-metal`'s fade-in (components.css) waits for. The canvas
		   was only just created, so its hidden starting style is resolved first
		   — without that, the flag and the canvas would reach the style engine
		   together, the canvas would start out already visible, and there
		   would be nothing to transition from. */
		const canvas = host.querySelector('canvas');
		if (canvas) void getComputedStyle(canvas).opacity;
		host.dataset.liquidMetal = 'ready';
	})();

	reduceMotion.addEventListener('change', onMotionChange);

	return {
		destroy() {
			disposed = true;
			reduceMotion.removeEventListener('change', onMotionChange);
			mount?.dispose();
			mount = null;
		},
	};
}
