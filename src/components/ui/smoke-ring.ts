/* ============================================================================
   Smoke ring — the drifting halo the intro sits inside.

   Paper's SmokeRing shader, taken from
   https://app.paper.design/file/01M0JA3C4D56J49TYWHSXTMEKJ/1-0/P-0 and mounted
   through the framework-free `ShaderMount` rather than the React
   `<SmokeRing>` component. The React wrapper does nothing but map props onto
   uniforms and hand them to that same class — so going straight to it keeps the
   homepage at zero React, the same reason water-field.ts is a plain module with
   a thin `.astro` mount point over it.

   Two things here are ours rather than Paper's:

     1. The colour is read out of tokens.css at run time instead of restated as
        #FFFBEB. That value is already in the system as `--amber-50`, and a
        second copy of a colour is a second source of truth — same reasoning as
        readToken() in the stories and readPalette() in the water field. It is a
        ramp primitive, not a semantic token, so it does not move between
        themes and there is nothing here to observe: on the light theme the
        ring simply stops showing, because screening a near-white haze over a
        near-white ground has nothing left to lighten.

     2. Reduced motion parks the ring on a single frame rather than removing
        it. The composition is the point; the drift is the decoration.
   ========================================================================== */

import {
	ShaderFitOptions,
	ShaderMount,
	defaultObjectSizing,
	getShaderColorFromString,
	getShaderNoiseTexture,
	smokeRingFragmentShader,
} from '@paper-design/shaders';

export type SmokeRingOptions = {
	/** Playback rate. 0 holds a single frame. */
	speed?: number;
	/** Where in the loop to open, in ms of animation time. */
	frame?: number;
};

export type SmokeRing = { destroy: () => void };

/* The Paper file's parameters, unmodified.

   `frame` is not a magic constant: frames are milliseconds of animation time,
   so this is simply where the playhead sat when the design was exported —
   about six and a quarter minutes in. Keeping it means the page opens on the
   exact composition in the reference and drifts on from there, rather than on
   whatever the shader happens to look like at t=0. */
const PAPER = {
	speed: 0.75,
	frame: 375029.45,
	scale: 0.8,
	thickness: 0.7,
	radius: 0.25,
	innerShape: 0.8,
	noiseScale: 3,
	noiseIterations: 8,
	offsetX: 0,
	offsetY: 0,
} as const;

/* The ring is a diffuse cloud with no edge to alias, so Paper's default of
   rendering at 2x even on a 1x screen buys nothing. Dropped to "follow the
   device and no lower", then capped well under Paper's own 4K-at-2x ceiling —
   the same trade the water field makes with its 1.5 DPR clamp, and for the same
   reason: this is the second WebGL surface on the page, and a soft field at
   60fps beats a sharp one at 30. */
const MIN_PIXEL_RATIO = 1;
const MAX_PIXEL_COUNT = 1920 * 1080 * 1.5;

/* alpha:true because the shader's own background is transparent (`colorBack` is
   #00000000) — the water field behind it is what shows through the gaps, and
   the blend mode in components.css is what puts the two together. */
const CONTEXT: WebGLContextAttributes = {
	alpha: true,
	antialias: false,
	depth: false,
	stencil: false,
	powerPreference: 'low-power',
};

const readColour = () => {
	const token = getComputedStyle(document.documentElement).getPropertyValue('--amber-50').trim();
	return getShaderColorFromString(token || '#fffbeb');
};

/**
 * Mounts the ring into `host`, which the shader fills. `host` gets a canvas
 * prepended to it and is left inert to the pointer by its own CSS — nothing
 * here listens for input.
 */
export function createSmokeRing(host: HTMLElement, options: SmokeRingOptions = {}): SmokeRing {
	const speed = options.speed ?? PAPER.speed;
	const frame = options.frame ?? PAPER.frame;

	const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

	let mount: ShaderMount | null = null;
	let disposed = false;

	const onMotionChange = () => mount?.setSpeed(reduceMotion.matches ? 0 : speed);

	/* The noise texture is a data URI, so this resolves on the microtask queue
	   rather than over the network — but it still has to resolve: ShaderMount
	   throws on an image that is not already decoded. */
	void (async () => {
		const noise = getShaderNoiseTexture();

		try {
			await noise?.decode();
		} catch {
			/* Nothing to recover: without the texture the shader has no
			   randomiser and would draw a flat disc, so leave the field as it is
			   and let the water field alone carry the background. */
			host.dataset.smokeRing = 'unsupported';
			return;
		}

		if (disposed) return;

		try {
			mount = new ShaderMount(
				host,
				smokeRingFragmentShader,
				{
					u_colorBack: getShaderColorFromString('#00000000'),
					u_colors: [readColour()],
					u_colorsCount: 1,
					u_noiseScale: PAPER.noiseScale,
					u_thickness: PAPER.thickness,
					u_radius: PAPER.radius,
					u_innerShape: PAPER.innerShape,
					u_noiseIterations: PAPER.noiseIterations,
					u_noiseTexture: noise,
					u_fit: ShaderFitOptions[defaultObjectSizing.fit],
					u_scale: PAPER.scale,
					u_rotation: defaultObjectSizing.rotation,
					u_offsetX: PAPER.offsetX,
					u_offsetY: PAPER.offsetY,
					u_originX: defaultObjectSizing.originX,
					u_originY: defaultObjectSizing.originY,
					u_worldWidth: defaultObjectSizing.worldWidth,
					u_worldHeight: defaultObjectSizing.worldHeight,
				},
				CONTEXT,
				reduceMotion.matches ? 0 : speed,
				frame,
				MIN_PIXEL_RATIO,
				MAX_PIXEL_COUNT,
			);
		} catch {
			/* ShaderMount needs WebGL2 and throws without it. Same fallback as
			   the water field's: leave the element alone. It has no background
			   of its own, so what is behind it is already correct. */
			host.dataset.smokeRing = 'unsupported';
			return;
		}

		host.dataset.smokeRing = 'ready';
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
