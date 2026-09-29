/* ============================================================================
   Gradient blinds — the bands of light across the top of the homepage.

   A port of React Bits' <GradientBlinds /> (https://reactbits.dev), cut down
   to what the homepage uses and mounted without React or `ogl`: one
   full-screen triangle and one fragment shader need nothing a raw WebGL
   context does not already give, which is how water-field.ts is built too.

   What changed from the original:

   - The bands are straight. `angle` and `distortAmount` were both 0 in use,
     so the rotation and the sine warp are gone rather than carried as dead
     uniforms.
   - They only fill the top of the screen. A vertical mask takes the result
     back to neutral (see below) by `maskEnd` of the way down, and each blind
     ends at its own height (`MASK_JITTER`), so the band tails are ragged
     rather than one ruled line — the Figma frame's bands stop that way.
   - No grain. The original's noise uniform is gone rather than defaulted
     to 0 — there is no reading of the bands that wants it, so it isn't a
     knob worth carrying.
   - The colours are the `--blinds-*` stops in tokens.css, read at run time,
     not a prop.

   How it reaches the page. The canvas is hard-lit onto `--home-ground`
   (`.gradient-blinds` in components.css). Hard-light treats 0.5 as neutral:
   above it the layer screens (lightens), below it the layer multiplies
   (darkens). So the blinds' bright ridges come up as light and the troughs
   between them go to black, which is the Figma frame's look, and the mask
   fades to 0.5 — not to 0, which would multiply the lower half of the page
   down to pure black — so below the bands the ground is exactly the token.

   The spotlight follows a fine pointer through the original's 0.15s damping
   anywhere down to TRACK_END (just above the first card), its height scaled
   so it stays over the bands; it stays where it was left when the pointer
   goes below that, and rests near the top centre until a pointer arrives. Reduced motion keeps it at rest.
   Nothing else moves, so the page draws a frame on mount, on resize, and
   while the spotlight is catching up — never while it is still.

   Contrast. The headline sits on the bands' tails. Measured on the rendered
   page (text hidden, the spotlight swept across the viewport), at 1728, 1440
   and 1024 wide: see "Gradient blinds" in CLAUDE.md for the numbers, and
   re-measure if `maskEnd`, the spotlight or any `--blinds-*` stop changes.
   ========================================================================== */

export type GradientBlindsOptions = {
	/** Upper bound on the number of blinds across the screen. */
	blindCount?: number;
	/** No blind narrower than this, in CSS px — lowers the count on narrow
	 *  screens. */
	blindMinWidth?: number;
	/** Spotlight radius, as a fraction of the canvas. */
	spotlightRadius?: number;
	/** Falloff exponent — higher is a harder edge. */
	spotlightSoftness?: number;
	/** Spotlight strength. */
	spotlightOpacity?: number;
	/** Where the bands have faded out entirely, as a fraction of the height
	 *  from the top. */
	maskEnd?: number;
	/** Follow the pointer. Only ever on a fine pointer, and never under
	 *  reduced motion, whatever this says. */
	interactive?: boolean;
	/** Cap on device pixel ratio. */
	maxDpr?: number;
	/** How far down from the top, in CSS px, the bands are held back so the
	 *  nav stays readable over them (see NAV_DAMP). */
	navClearance?: number;
};

export type GradientBlinds = {
	destroy: () => void;
};

/* The tuned values. Tuned by eye against Figma's 20205:22325 at 1440×900,
   in the Storybook story, not measured. */
export const BLINDS = {
	blindCount: 32,
	blindMinWidth: 40,
	spotlightRadius: 0.6,
	spotlightSoftness: 1,
	spotlightOpacity: 1,
	maskEnd: 0.9,
	maxDpr: 1.5,
	/* The nav's band: 16px of padding, a 40px row, 16px of padding
	   (SiteNav.astro). */
	navClearance: 72,
} as const;

/** How much of the bands' strength is left behind the nav. The nav's labels
 *  are 12px --text sitting right on the bands, and at full strength a band
 *  under the spotlight lifts the ground there to about rgb(183, 198, 206) —
 *  1.7:1. At this fraction the bands still read through the nav, but the
 *  ground stays dark enough for AA (measured; see CLAUDE.md). */
const NAV_DAMP = 0.3;
/** The ramp from NAV_DAMP back to full strength below the nav, in CSS px. */
const NAV_RAMP = 64;

/** Where the spotlight rests when nothing is steering it: centred across,
 *  near the top — fractions of the canvas, y measured from the top. */
const REST = [0.5, 0.15] as const;
/** How far down the screen the pointer steers the spotlight, as a fraction of
 *  the height — past the bands, through the headline, to just above where the
 *  first card's top rests. Below it the spotlight stays where it was left.
 *
 *  The pointer's height is scaled from [0, TRACK_END] onto [0, SPOT_Y_MAX]
 *  rather than followed one to one: the whole zone responds, but the
 *  spotlight itself stays in the bright upper part of the bands. Followed
 *  directly, a pointer on the headline would put the spotlight under the
 *  mask, where it lights nothing and its negative falloff sinks every band
 *  to black. */
const TRACK_END = 0.74;
/** The lowest the spotlight goes, as a fraction of the height. Eyeballed:
 *  low enough that moving down reads as movement, high enough that the
 *  bands stay lit with the pointer on the headline. */
const SPOT_Y_MAX = 0.25;
/** The spotlight's lag behind the pointer, in seconds — the original's
 *  default `mouseDampening`. */
const DAMPING = 0.15;
/** How much each blind's own fade-out point may wander either side of
 *  `maskEnd`, as a fraction of the height. */
const MASK_JITTER = 0.08;
/** Up to this many stops are read from tokens.css (`--blinds-1` onwards). */
const MAX_STOPS = 8;

const FINE_POINTER = '(hover: hover) and (pointer: fine)';
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

const VERT = /* glsl */ `
attribute vec2 aPos;
void main() {
	gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG = /* glsl */ `
precision mediump float;

uniform vec2  uRes;
uniform vec2  uSpot;
uniform float uBlindCount;
uniform float uSpotRadius;
uniform float uSpotSoftness;
uniform float uSpotOpacity;
uniform float uMaskEnd;
uniform float uMaskJitter;
uniform vec2  uNav;     /* where the nav clearance ends and the ramp ends, px from the top */
uniform float uNavDamp;
uniform vec3  uColor[${MAX_STOPS}];
uniform int   uColorCount;

float rand(vec2 co) {
	return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

/* The original's piecewise gradient, as a loop — GLSL ES 1.0 wants a
   constant bound, so it runs to MAX_STOPS and stops reading at the count. */
vec3 gradient(float t) {
	float scaled = clamp(t, 0.0, 1.0) * float(uColorCount - 1);
	float seg = floor(scaled);
	float f = fract(scaled);
	vec3 col = uColor[0];
	for (int i = 0; i < ${MAX_STOPS - 1}; i++) {
		if (i >= uColorCount - 1) break;
		if (float(i) == seg) col = mix(uColor[i], uColor[i + 1], f);
		if (float(i) < seg) col = uColor[i + 1];
	}
	return col;
}

void main() {
	vec2 uv = gl_FragCoord.xy / uRes;
	vec3 base = gradient(uv.x);

	/* The spotlight: bright inside the radius, going negative past it, so
	   the blinds far from it sink to black under the blend. */
	float dn = length(uv - uSpot) / max(uSpotRadius, 1e-4);
	float spot = (1.0 - 2.0 * pow(dn, uSpotSoftness)) * uSpotOpacity;

	/* The blinds: a sawtooth across each one, with its hard edge smoothed
	   over a pixel or so so it does not alias. */
	float phase = uv.x * uBlindCount;
	float stripe = fract(phase);
	float aa = clamp(uBlindCount * 1.25 / min(uRes.x, uRes.y), 0.001, 0.12);
	stripe = mix(stripe, 0.5, 1.0 - smoothstep(0.0, aa, min(stripe, 1.0 - stripe)));

	vec3 col = vec3(spot) + base - vec3(stripe);

	/* The mask: full strength at the top, neutral (0.5 — see the header) by
	   each blind's own end point. */
	float fromTop = 1.0 - uv.y;
	float end = uMaskEnd + (rand(vec2(floor(phase), 7.0)) - 0.5) * 2.0 * uMaskJitter;
	float mask = 1.0 - smoothstep(0.0, max(end, 0.05), fromTop);
	col = mix(vec3(0.5), col, mask * mask);

	/* Held back behind the nav, and ramped back up just below it. */
	float fromTopPx = uRes.y - gl_FragCoord.y;
	col = mix(vec3(0.5), col, mix(uNavDamp, 1.0, smoothstep(uNav.x, uNav.y, fromTopPx)));

	gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

/* Colour parsing goes through a 2d context so any CSS colour a token might
   hold resolves without a parser here — the same approach as water-field.ts. */
const swatch = /*@__PURE__*/ (() => {
	if (typeof document === 'undefined') return null;
	return document.createElement('canvas').getContext('2d');
})();

const toRgb = (css: string): [number, number, number] | null => {
	if (!swatch || !css) return null;
	swatch.fillStyle = '#000000';
	swatch.fillStyle = css;
	const v = swatch.fillStyle as string;
	if (v.startsWith('#')) {
		const n = parseInt(v.slice(1), 16);
		return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
	}
	const parts = v.match(/[\d.]+/g);
	if (!parts || parts.length < 3) return null;
	return [+parts[0] / 255, +parts[1] / 255, +parts[2] / 255];
};

/** The `--blinds-*` stops, in order, stopping at the first that is unset. */
const readStops = (el: Element) => {
	const css = getComputedStyle(el);
	const stops: [number, number, number][] = [];
	for (let i = 1; i <= MAX_STOPS; i++) {
		const rgb = toRgb(css.getPropertyValue(`--blinds-${i}`).trim());
		if (!rgb) break;
		stops.push(rgb);
	}
	/* A single stop is a flat colour, which the gradient needs two of. */
	if (stops.length === 1) stops.push(stops[0]);
	return stops;
};

const compile = (gl: WebGLRenderingContext, type: number, src: string) => {
	const shader = gl.createShader(type)!;
	gl.shaderSource(shader, src);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const log = gl.getShaderInfoLog(shader);
		gl.deleteShader(shader);
		throw new Error(`gradient-blinds: shader failed to compile — ${log}`);
	}
	return shader;
};

export function createGradientBlinds(host: HTMLElement, options: GradientBlindsOptions = {}): GradientBlinds {
	const o = { ...BLINDS, ...options };
	const canvas = document.createElement('canvas');
	const gl = canvas.getContext('webgl', {
		alpha: false,
		antialias: false,
		depth: false,
		stencil: false,
		powerPreference: 'low-power',
	}) as WebGLRenderingContext | null;

	/* No WebGL: add nothing. The host's ground, behind it, is the fallback. */
	if (!gl) {
		host.dataset.gradientBlinds = 'unsupported';
		return { destroy: () => {} };
	}
	host.append(canvas);

	let program: WebGLProgram | null = null;
	let u: Record<string, WebGLUniformLocation | null> = {};
	let stopCount = 0;

	const build = () => {
		const vs = compile(gl, gl.VERTEX_SHADER, VERT);
		const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
		program = gl.createProgram()!;
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			throw new Error(`gradient-blinds: link failed — ${gl.getProgramInfoLog(program)}`);
		}
		gl.deleteShader(vs);
		gl.deleteShader(fs);
		gl.useProgram(program);

		/* One oversized triangle, not two, so there is no seam along the
		   diagonal. */
		const buffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
		const loc = gl.getAttribLocation(program, 'aPos');
		gl.enableVertexAttribArray(loc);
		gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

		u = Object.fromEntries(
			[
				'uRes',
				'uSpot',
				'uBlindCount',
				'uSpotRadius',
				'uSpotSoftness',
				'uSpotOpacity',
				'uMaskEnd',
				'uMaskJitter',
				'uNav',
				'uNavDamp',
				'uColor',
				'uColorCount',
			].map((name) => [name, gl.getUniformLocation(program!, name)]),
		);
		gl.uniform1f(u.uSpotRadius, o.spotlightRadius);
		gl.uniform1f(u.uSpotSoftness, o.spotlightSoftness);
		gl.uniform1f(u.uSpotOpacity, o.spotlightOpacity);
		gl.uniform1f(u.uMaskEnd, o.maskEnd);
		gl.uniform1f(u.uMaskJitter, MASK_JITTER);
		gl.uniform1f(u.uNavDamp, NAV_DAMP);

		const stops = readStops(host);
		stopCount = stops.length;
		if (stopCount >= 2) {
			const flat = new Float32Array(MAX_STOPS * 3);
			stops.forEach((rgb, i) => flat.set(rgb, i * 3));
			gl.uniform3fv(u.uColor, flat);
			gl.uniform1i(u.uColorCount, stopCount);
		}
	};

	/* ---- The spotlight ----------------------------------------------------- */
	const spot: [number, number] = [REST[0], REST[1]];
	const target: [number, number] = [REST[0], REST[1]];
	const fine = window.matchMedia(FINE_POINTER);
	const reduced = window.matchMedia(REDUCED_MOTION);
	const follows = () => o.interactive !== false && fine.matches && !reduced.matches;

	/* ---- Drawing ----------------------------------------------------------- */
	let width = 0;
	let height = 0;
	let frame = 0;
	let last = 0;

	const draw = () => {
		if (!program || stopCount < 2) return;
		/* The shader's y runs up; the spotlight's is measured from the top. */
		gl.uniform2f(u.uSpot, spot[0], 1 - spot[1]);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
	};

	const tick = (now: number) => {
		frame = 0;
		const dt = last ? Math.min(now - last, 64) / 1000 : 1 / 60;
		const k = 1 - Math.exp(-dt / DAMPING);
		spot[0] += (target[0] - spot[0]) * k;
		spot[1] += (target[1] - spot[1]) * k;
		/* Stop once it is within half a pixel of where it is going. */
		const settled = Math.abs(target[0] - spot[0]) * width < 0.5 && Math.abs(target[1] - spot[1]) * height < 0.5;
		if (settled) {
			spot[0] = target[0];
			spot[1] = target[1];
		}
		draw();
		if (settled) last = 0;
		else {
			last = now;
			frame = requestAnimationFrame(tick);
		}
	};

	const schedule = () => {
		if (!frame && !document.hidden) frame = requestAnimationFrame(tick);
	};

	const resize = () => {
		const rect = host.getBoundingClientRect();
		width = rect.width;
		height = rect.height;
		const dpr = Math.min(window.devicePixelRatio || 1, o.maxDpr);
		canvas.width = Math.max(1, Math.round(width * dpr));
		canvas.height = Math.max(1, Math.round(height * dpr));
		gl.viewport(0, 0, canvas.width, canvas.height);
		if (!program) return;
		gl.uniform2f(u.uRes, canvas.width, canvas.height);
		gl.uniform2f(u.uNav, o.navClearance * dpr, (o.navClearance + NAV_RAMP) * dpr);
		const byWidth = Math.max(1, Math.floor(width / o.blindMinWidth));
		gl.uniform1f(u.uBlindCount, Math.max(1, Math.min(o.blindCount, byWidth)));
		draw();
	};

	const onPointerMove = (event: PointerEvent) => {
		if (!follows() || width === 0 || height === 0) return;
		const rect = host.getBoundingClientRect();
		const y = (event.clientY - rect.top) / height;
		/* Down over the cards the spotlight would drift off the bands and
		   fade them out. It stays where the pointer last left it instead. */
		if (y > TRACK_END) return;
		target[0] = (event.clientX - rect.left) / width;
		target[1] = (Math.max(y, 0) / TRACK_END) * SPOT_Y_MAX;
		schedule();
	};

	/* The pointer can stop being fine (a tablet undocked) or motion can be
	   reduced mid-visit: send the spotlight home. */
	const onPreference = () => {
		if (follows()) return;
		target[0] = REST[0];
		target[1] = REST[1];
		if (reduced.matches) {
			spot[0] = REST[0];
			spot[1] = REST[1];
			draw();
		} else schedule();
	};

	const onVisibility = () => {
		if (document.hidden) {
			cancelAnimationFrame(frame);
			frame = 0;
			last = 0;
		} else schedule();
	};

	const onContextLost = (event: Event) => {
		event.preventDefault();
		cancelAnimationFrame(frame);
		frame = 0;
		program = null;
	};

	const onContextRestored = () => {
		build();
		resize();
	};

	try {
		build();
	} catch (error) {
		console.error(error);
		canvas.remove();
		host.dataset.gradientBlinds = 'unsupported';
		return { destroy: () => {} };
	}

	const observer = new ResizeObserver(resize);
	observer.observe(host);
	resize();
	host.dataset.gradientBlinds = 'ready';

	window.addEventListener('pointermove', onPointerMove, { passive: true });
	document.addEventListener('visibilitychange', onVisibility);
	fine.addEventListener('change', onPreference);
	reduced.addEventListener('change', onPreference);
	canvas.addEventListener('webglcontextlost', onContextLost);
	canvas.addEventListener('webglcontextrestored', onContextRestored);

	return {
		destroy: () => {
			cancelAnimationFrame(frame);
			observer.disconnect();
			window.removeEventListener('pointermove', onPointerMove);
			document.removeEventListener('visibilitychange', onVisibility);
			fine.removeEventListener('change', onPreference);
			reduced.removeEventListener('change', onPreference);
			canvas.removeEventListener('webglcontextlost', onContextLost);
			canvas.removeEventListener('webglcontextrestored', onContextRestored);
			gl.getExtension('WEBGL_lose_context')?.loseContext();
			canvas.remove();
			host.dataset.gradientBlinds = '';
		},
	};
}
