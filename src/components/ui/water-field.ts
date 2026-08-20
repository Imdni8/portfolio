/* ============================================================================
   Water field — a background that behaves like a shallow pool.

   One WebGL pass draws three things that share a single displacement field, so
   they move as one surface rather than as three effects layered on top of each
   other:

     1. a domain-warped noise fluid — the slow silk drifting under everything
     2. a grid, whose lines bend through the same displacement
     3. the light, which brightens on the crests and dims in the troughs

   The displacement comes from a set of wave packets. A pointer stroke drops a
   packet every few pixels of travel; each one expands outward at a fixed speed,
   spreading and fading as it goes, exactly like a finger drawn across water.
   Sampling the fluid and the grid at `p + gradient(height)` is what refracts
   them — the same trick a real water surface plays on the tiles beneath it.

   The palette is read out of tokens.css at run time, not restated here, so the
   field follows [data-theme] for free. Same reasoning as readToken() in the
   stories: a second copy of a colour is a second source of truth.
   ========================================================================== */

export type WaterFieldOptions = {
	/** Grid pitch in CSS pixels. 0 draws no grid. */
	grid?: number;
	/** Overall presence of the fluid, 0–1. Lower it behind dense copy. */
	intensity?: number;
	/** Ceiling on devicePixelRatio. The field is soft; 1.5 is plenty. */
	maxDpr?: number;
};

export type WaterField = { destroy: () => void };

/** Live wave packets. Twelve is enough for a fast stroke to read as a wake. */
const RIPPLES = 12;
/** Seconds before a packet is considered spent and its slot recycled. */
const LIFE = 1.8;
/** p-space distance the pointer must travel before the next packet drops. */
const STRIDE = 0.045;

type Ripple = { x: number; y: number; age: number; strength: number };

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;

#define RIPPLES ${RIPPLES}

uniform vec2  uRes;
uniform float uTime;
uniform vec4  uRipple[RIPPLES];  // xy centre (p-space), z age (s), w strength
uniform vec3  uPointer;          // xy position (p-space), z presence 0-1
uniform float uGrid;             // pitch in device px; <= 0 hides the grid
uniform float uIntensity;
uniform vec3  uGroundLow;
uniform vec3  uGroundHigh;
uniform vec3  uRibbon;
uniform vec3  uGlow;
uniform vec3  uGridColor;

/* Radians per unit of travel — sets crest spacing. */
const float WAVE_K   = 30.0;
/* Units per second — how fast a ring opens out. */
const float WAVE_C   = 0.30;
/* Seconds to 1/e amplitude. */
const float WAVE_TAU = 0.90;
/* Radius^2 of the dome the cursor carries with it. */
const float DOME_R2  = 0.0110;
/* Ceiling on displacement, in p-space units — roughly a twentieth of the
   viewport height. */
const float WARP_MAX = 0.042;
/* Ceiling on how far the field may travel toward uRibbon. This constant, and
   the grid's below, are what keep body copy legible on top of a moving image.

   Everything that brightens the field — the ribbons, their veins, the lit side
   of a wave — reaches for the same colour, so they sum into one weight and the
   sum is capped here. Both numbers were measured, not reasoned: sampling every
   pixel of the field over a sweep of the cursor puts the dark theme's ground at
   L 0.112 at its brightest and the light theme's at L 0.343 at its darkest,
   which is --text-body at 5.2:1 and 5.5:1. Raise either and the dark theme is
   the one that fails first.

   --text-muted and anything fainter is NOT covered — it lands near 2.7:1 on a
   bright wisp — so muted copy over the field needs a ground of its own. */
const float RIBBON_MAX = 0.22;

float hash(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(
		mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
		mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
		u.y);
}

float fbm(vec2 p) {
	float sum = 0.0;
	float amp = 0.5;
	for (int i = 0; i < 4; i++) {
		sum += amp * noise(p);
		p = p * 2.03 + 13.7;
		amp *= 0.5;
	}
	return sum;
}

/* x = surface height, yz = its gradient, w = how much dome is under this pixel.
   The gradient is differentiated by hand rather than sampled twice: every term
   here is an analytic derivative of the line above it, which is both cheaper
   and free of the shimmer a finite difference gives at this frequency. */
vec4 surface(vec2 p) {
	float h = 0.0;
	vec2 g = vec2(0.0);

	for (int i = 0; i < RIPPLES; i++) {
		vec4 r = uRipple[i];
		if (r.w <= 0.0) continue;

		vec2  d    = p - r.xy;
		float dist = max(length(d), 1e-4);
		float age  = r.z;

		/* The packet rides at dist = c*age and disperses as it travels, so a
		   stroke leaves a widening wake instead of an endless ring. */
		float width  = 0.062 + 0.13 * age;
		float front  = (dist - WAVE_C * age) / width;
		float packet = exp(-front * front);
		float decay  = exp(-age / WAVE_TAU) * r.w;
		/* A ring puts the same energy through an ever-longer circumference, so
		   it thins as it opens. Without this term a ripple reaches the far
		   corner as loud as it left, which is what makes a naive one read as a
		   boulder rather than a fingertip. */
		float spread = 1.0 / (1.0 + 4.0 * dist);
		/* Wells up over its first fifth of a second rather than arriving whole.
		   A packet at full strength the instant it is born displaces further
		   than the distance it covers, which folds the grid back through
		   itself — the one artefact that stops reading as water. */
		float birth  = smoothstep(0.0, 0.20, age);
		float amp    = decay * packet * spread * birth;

		float phase = WAVE_K * (dist - WAVE_C * age);
		float s = sin(phase);
		float c = cos(phase);

		h += amp * s;
		g += amp * (WAVE_K * c - 2.0 * front / width * s) * (d / dist);
	}

	/* The cursor sits in the surface rather than only disturbing it: a soft
	   dome that refracts whatever it passes over, so hovering still reads. */
	vec2  dq   = p - uPointer.xy;
	float dome = exp(-dot(dq, dq) / DOME_R2) * uPointer.z;
	h += dome * 0.45;
	g += dome * (-2.0 * dq / DOME_R2) * 1.15;

	return vec4(h, g, dome);
}

void main() {
	vec2  uv     = gl_FragCoord.xy / uRes;
	float aspect = uRes.x / uRes.y;
	vec2  p      = (uv - 0.5) * vec2(aspect, 1.0);

	vec4  surf   = surface(p);
	float height = surf.x;

	/* Soft saturation, not clamp(). A hard limit creases every grid line that
	   crosses the point where the displacement tops out, and the crease reads
	   as a bug. This approaches WARP_MAX and never reaches it. */
	vec2  raw    = surf.yz * 0.00135;
	float mag    = length(raw);
	vec2  warp   = raw * (WARP_MAX / (WARP_MAX + mag));

	/* --- fluid ---------------------------------------------------------- */
	float t  = uTime;
	vec2  sp = (p + warp) * vec2(1.2, 1.85);

	vec2 q = vec2(
		fbm(sp + vec2(0.0, t * 0.043)),
		fbm(sp + vec2(4.7, 1.9) - vec2(t * 0.031, 0.0)));
	vec2 w = vec2(
		fbm(sp + 2.3 * q + vec2(1.7, 9.2)),
		fbm(sp + 2.3 * q + vec2(8.3, 2.8) + vec2(0.0, t * 0.018)));
	float f = fbm(sp + 2.1 * w);

	float ribbon = smoothstep(0.40, 0.78, f + 0.22 * (w.x - 0.5));
	float vein   = pow(smoothstep(0.56, 0.95, f), 2.0);

	/* --- ground ---------------------------------------------------------
	   Every step from here on is a mix between two palette colours, never an
	   add. An add leaves the ramp: adding the ribbon colour on the light theme
	   drove the crests to #ffffff, a value this system does not contain.
	   -------------------------------------------------------------------- */
	vec3 col = mix(uGroundLow, uGroundHigh, smoothstep(0.0, 1.0, uv.y) * 0.9);

	/* A light source off the top-left corner, the way the reference lights it. */
	float bloom = exp(-length((uv - vec2(0.16, 0.94)) * vec2(aspect, 1.0)) * 1.35);
	col = mix(col, uGroundHigh, bloom * 0.5);
	col = mix(col, uGlow, bloom * 0.07);

	/* Crests reach for the light, troughs fall toward the sunken ground, so a
	   wave has a near side and a far side instead of only glowing. */
	float lift = clamp(height * 0.16, -0.5, 0.5);

	/* One weight for everything that brightens, softly saturated rather than
	   clamped: a clamp would flatten every bright wisp to the same plateau,
	   this rolls them off and still never reaches RIBBON_MAX. */
	float toRibbon = ribbon * 0.34 * uIntensity + vein * 0.22 * uIntensity + max(lift, 0.0) * 1.4;
	toRibbon = RIBBON_MAX * (1.0 - exp(-toRibbon / RIBBON_MAX));

	col = mix(col, uRibbon, toRibbon);
	col = mix(col, uGroundLow, max(-lift, 0.0) * 0.9);

	/* --- grid ----------------------------------------------------------- */
	if (uGrid > 0.0) {
		vec2 gp = (uv + warp / vec2(aspect, 1.0)) * uRes / uGrid;
		vec2 gf = abs(fract(gp - 0.5) - 0.5);

		float px   = 1.0 / uGrid;          // one device pixel, in cell units
		float d    = min(gf.x, gf.y);
		float line = 1.0 - smoothstep(px * 0.55, px * 1.55, d);

		/* Strongest up top where the fluid is thin, gone by the lower third —
		   a grid that runs edge to edge reads as a wireframe, not as depth. */
		float fade = smoothstep(0.02, 0.55, uv.y) * (0.55 + 0.45 * bloom);
		fade *= 1.0 + 1.8 * surf.w;        // and it lights up under the cursor

		/* Held to the same budget as the ribbons, and for the same reason: a
		   grid line crossing behind a glyph is part of that glyph's ground.
		   It is the brighter of the two at full strength, so this weight —
		   not the fluid — is what the measured worst case turns on. */
		col = mix(col, uGridColor, min(line * 0.26 * fade, 0.50));
	}

	/* Corners fall away so the field has no visible edge. Toward the sunken
	   ground rather than toward black, which on the light theme would be a
	   dirty vignette instead of a receding one. */
	vec2 vig = abs(uv - 0.5) * 2.0;
	col = mix(col, uGroundLow, 0.20 * pow(max(vig.x, vig.y), 3.0));

	/* Ordered-enough dither. Without it a gradient this dark bands into
	   visible steps on an 8-bit display. */
	col += (hash(gl_FragCoord.xy + fract(t)) - 0.5) / 255.0;

	gl_FragColor = vec4(col, 1.0);
}
`;

/* Colour parsing goes through a 2d context so any CSS colour a token might
   hold — hex, rgb(), colour keyword — resolves without a parser here. */
const swatch = /*@__PURE__*/ (() => {
	if (typeof document === 'undefined') return null;
	return document.createElement('canvas').getContext('2d');
})();

const toRgb = (css: string, fallback: [number, number, number]): [number, number, number] => {
	if (!swatch || !css) return fallback;
	swatch.fillStyle = '#000000';
	swatch.fillStyle = css;
	const v = swatch.fillStyle as string;
	if (v.startsWith('#')) {
		const n = parseInt(v.slice(1), 16);
		return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
	}
	const parts = v.match(/[\d.]+/g);
	if (!parts || parts.length < 3) return fallback;
	return [+parts[0] / 255, +parts[1] / 255, +parts[2] / 255];
};

const compile = (gl: WebGLRenderingContext, type: number, src: string) => {
	const shader = gl.createShader(type)!;
	gl.shaderSource(shader, src);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const log = gl.getShaderInfoLog(shader);
		gl.deleteShader(shader);
		throw new Error(`water-field: shader failed to compile — ${log}`);
	}
	return shader;
};

export function createWaterField(
	canvas: HTMLCanvasElement,
	options: WaterFieldOptions = {},
): WaterField {
	const gridPitch = options.grid ?? 72;
	const intensity = options.intensity ?? 1;
	const maxDpr = options.maxDpr ?? 1.5;

	const gl = canvas.getContext('webgl', {
		alpha: false,
		antialias: false,
		depth: false,
		stencil: false,
		powerPreference: 'low-power',
	}) as WebGLRenderingContext | null;

	if (!gl) {
		/* No WebGL: leave the element alone. Whatever CSS background sits
		   behind it is the fallback, and it is already correct. */
		canvas.dataset.waterField = 'unsupported';
		return { destroy: () => {} };
	}
	canvas.dataset.waterField = 'ready';

	/* ---- GL resources ---------------------------------------------------- */
	let program!: WebGLProgram;
	let u!: Record<string, WebGLUniformLocation | null>;

	const build = () => {
		const vs = compile(gl, gl.VERTEX_SHADER, VERT);
		const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
		program = gl.createProgram()!;
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			throw new Error(`water-field: link failed — ${gl.getProgramInfoLog(program)}`);
		}
		gl.deleteShader(vs);
		gl.deleteShader(fs);
		gl.useProgram(program);

		/* One oversized triangle, not two, so there is no seam along the
		   diagonal where the rasteriser meets itself. */
		const buffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
		const loc = gl.getAttribLocation(program, 'aPos');
		gl.enableVertexAttribArray(loc);
		gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

		u = {
			res: gl.getUniformLocation(program, 'uRes'),
			time: gl.getUniformLocation(program, 'uTime'),
			ripple: gl.getUniformLocation(program, 'uRipple[0]'),
			pointer: gl.getUniformLocation(program, 'uPointer'),
			grid: gl.getUniformLocation(program, 'uGrid'),
			intensity: gl.getUniformLocation(program, 'uIntensity'),
			groundLow: gl.getUniformLocation(program, 'uGroundLow'),
			groundHigh: gl.getUniformLocation(program, 'uGroundHigh'),
			ribbon: gl.getUniformLocation(program, 'uRibbon'),
			glow: gl.getUniformLocation(program, 'uGlow'),
			gridColor: gl.getUniformLocation(program, 'uGridColor'),
		};
		gl.uniform1f(u.intensity, intensity);
		readPalette();
		resize();
	};

	/* ---- palette --------------------------------------------------------- */
	const readPalette = () => {
		const css = getComputedStyle(document.documentElement);
		const tok = (name: string) => css.getPropertyValue(name).trim();
		gl.useProgram(program);
		gl.uniform3fv(u.groundLow, toRgb(tok('--bg-sunken'), [0.03, 0.04, 0.05]));
		gl.uniform3fv(u.groundHigh, toRgb(tok('--bg-raised'), [0.13, 0.16, 0.17]));
		gl.uniform3fv(u.ribbon, toRgb(tok('--text'), [0.98, 0.98, 0.98]));
		gl.uniform3fv(u.glow, toRgb(tok('--primary'), [0.96, 0.62, 0.04]));
		gl.uniform3fv(u.gridColor, toRgb(tok('--border-strong'), [0.4, 0.47, 0.49]));
	};

	/* ---- sizing ---------------------------------------------------------- */
	let rect = canvas.getBoundingClientRect();
	/* Dropped once if the GPU cannot keep up; see the frame budget below. */
	let scale = 1;

	const resize = () => {
		rect = canvas.getBoundingClientRect();
		const dpr = Math.min(window.devicePixelRatio || 1, maxDpr) * scale;
		const w = Math.max(1, Math.round(rect.width * dpr));
		const h = Math.max(1, Math.round(rect.height * dpr));
		if (canvas.width !== w || canvas.height !== h) {
			canvas.width = w;
			canvas.height = h;
		}
		gl.viewport(0, 0, w, h);
		gl.useProgram(program);
		gl.uniform2f(u.res, w, h);
		/* The grid is authored in CSS pixels; the shader works in device ones. */
		gl.uniform1f(u.grid, gridPitch > 0 ? gridPitch * dpr : 0);
	};

	/* ---- pointer --------------------------------------------------------- */
	const ripples: Ripple[] = Array.from({ length: RIPPLES }, () => ({
		x: 0,
		y: 0,
		age: 0,
		strength: 0,
	}));
	const packed = new Float32Array(RIPPLES * 4);
	let slot = 0;

	/* Where the cursor is, where the dome has caught up to, and how much of it
	   is showing. The dome lags on purpose — a dome pinned exactly to the
	   cursor reads as a decal, one that trails reads as mass in water. */
	let px = 0;
	let py = 0;
	let domeX = 0;
	let domeY = 0;
	let domeAmp = 0;
	let domeTarget = 0;
	let lastX = 0;
	let lastY = 0;
	let lastMove = 0;

	const emit = (x: number, y: number, strength: number) => {
		const r = ripples[slot];
		slot = (slot + 1) % RIPPLES;
		r.x = x;
		r.y = y;
		r.age = 0;
		r.strength = strength;
	};

	const onPointerMove = (e: PointerEvent) => {
		const nx = (e.clientX - rect.left) / rect.width;
		const ny = 1 - (e.clientY - rect.top) / rect.height;
		const aspect = rect.width / rect.height;
		const inside = nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1;

		px = (nx - 0.5) * aspect;
		py = ny - 0.5;
		domeTarget = inside ? 1 : 0;
		if (!inside) return;

		const now = e.timeStamp;
		const dt = Math.max((now - lastMove) / 1000, 1 / 240);
		lastMove = now;

		const dx = px - lastX;
		const dy = py - lastY;
		const travel = Math.hypot(dx, dy);
		if (travel < STRIDE) return;

		/* Faster strokes throw bigger waves, but not without limit — the
		   clamp is what keeps a flick across the page from washing it out. */
		const speed = travel / dt;
		emit(px, py, Math.min(0.35 + speed * 0.55, 1));
		lastX = px;
		lastY = py;
	};

	const onPointerDown = (e: PointerEvent) => {
		const nx = (e.clientX - rect.left) / rect.width;
		const ny = 1 - (e.clientY - rect.top) / rect.height;
		if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return;
		const aspect = rect.width / rect.height;
		emit((nx - 0.5) * aspect, ny - 0.5, 1.3);
	};

	const onPointerLeave = () => {
		domeTarget = 0;
	};

	/* A finger has no hover state. Without this the dome is stranded wherever
	   the last touch ended and sits there, lit, until the next one. */
	const onPointerUp = (e: PointerEvent) => {
		if (e.pointerType !== 'mouse') domeTarget = 0;
	};

	/* ---- frame loop ------------------------------------------------------ */
	let frame = 0;
	let running = false;
	let start = 0;
	let last = 0;
	let clock = 0;
	let slowFrames = 0;
	let downshifts = 0;

	const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

	const render = (now: number) => {
		frame = requestAnimationFrame(render);

		/* Clamped so a backgrounded tab does not resume with a one-second dt
		   and age every live ripple out in a single step. */
		const dt = Math.min((now - last) / 1000, 1 / 30);
		last = now;
		clock = (now - start) / 1000;

		domeAmp += (domeTarget - domeAmp) * Math.min(dt * 7, 1);
		domeX += (px - domeX) * Math.min(dt * 12, 1);
		domeY += (py - domeY) * Math.min(dt * 12, 1);

		for (let i = 0; i < RIPPLES; i++) {
			const r = ripples[i];
			if (r.strength > 0) {
				r.age += dt;
				if (r.age > LIFE) r.strength = 0;
			}
			const o = i * 4;
			packed[o] = r.x;
			packed[o + 1] = r.y;
			packed[o + 2] = r.age;
			packed[o + 3] = r.strength;
		}

		gl.useProgram(program);
		gl.uniform1f(u.time, clock);
		gl.uniform4fv(u.ripple, packed);
		gl.uniform3f(u.pointer, domeX, domeY, domeAmp);
		gl.drawArrays(gl.TRIANGLES, 0, 3);

		/* Frame budget. Two consecutive seconds of missed frames buys one step
		   down in resolution, twice at most — better a soft field at 60fps
		   than a sharp one at 30. */
		if (downshifts < 2) {
			slowFrames = dt > 0.024 ? slowFrames + 1 : Math.max(slowFrames - 1, 0);
			if (slowFrames > 90) {
				slowFrames = 0;
				downshifts++;
				scale *= 0.75;
				resize();
			}
		}
	};

	/* One frame, held still: reduced motion means no ambient drift and no
	   ripples, but the background still has to look like itself. */
	const renderStill = () => {
		gl.useProgram(program);
		gl.uniform1f(u.time, 0);
		gl.uniform4fv(u.ripple, new Float32Array(RIPPLES * 4));
		gl.uniform3f(u.pointer, 0, 0, 0);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
	};

	const play = () => {
		if (running || reduceMotion.matches) return;
		running = true;
		last = performance.now();
		start = last - clock * 1000;
		frame = requestAnimationFrame(render);
	};

	const pause = () => {
		if (!running) return;
		running = false;
		cancelAnimationFrame(frame);
	};

	/* ---- wiring ---------------------------------------------------------- */
	let visible = true;

	const onVisibility = () => {
		if (document.hidden || !visible) pause();
		else play();
	};

	const observer = new IntersectionObserver(
		([entry]) => {
			visible = entry.isIntersecting;
			onVisibility();
		},
		{ threshold: 0 },
	);
	observer.observe(canvas);

	const sizeObserver = new ResizeObserver(() => resize());
	sizeObserver.observe(canvas);

	const onScroll = () => {
		rect = canvas.getBoundingClientRect();
	};

	const onMotionChange = () => {
		if (reduceMotion.matches) {
			pause();
			renderStill();
		} else {
			play();
		}
	};

	const themeObserver = new MutationObserver(() => {
		readPalette();
		if (!running) renderStill();
	});
	themeObserver.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ['data-theme', 'class', 'style'],
	});

	const scheme = window.matchMedia('(prefers-color-scheme: dark)');
	const onScheme = () => {
		readPalette();
		if (!running) renderStill();
	};

	const onContextLost = (e: Event) => {
		e.preventDefault();
		pause();
	};
	const onContextRestored = () => {
		build();
		if (reduceMotion.matches) renderStill();
		else play();
	};

	canvas.addEventListener('webglcontextlost', onContextLost);
	canvas.addEventListener('webglcontextrestored', onContextRestored);

	build();

	/* Pointer events land on the window, not the canvas: this is a background
	   with pointer-events:none, so the cursor is never actually over it. */
	window.addEventListener('pointermove', onPointerMove, { passive: true });
	window.addEventListener('pointerdown', onPointerDown, { passive: true });
	window.addEventListener('pointerleave', onPointerLeave, { passive: true });
	window.addEventListener('pointerup', onPointerUp, { passive: true });
	window.addEventListener('pointercancel', onPointerUp, { passive: true });
	window.addEventListener('scroll', onScroll, { passive: true });
	window.addEventListener('resize', onScroll, { passive: true });
	document.addEventListener('visibilitychange', onVisibility);
	reduceMotion.addEventListener('change', onMotionChange);
	scheme.addEventListener('change', onScheme);

	if (reduceMotion.matches) renderStill();
	else play();

	return {
		destroy() {
			pause();
			observer.disconnect();
			sizeObserver.disconnect();
			themeObserver.disconnect();
			canvas.removeEventListener('webglcontextlost', onContextLost);
			canvas.removeEventListener('webglcontextrestored', onContextRestored);
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerdown', onPointerDown);
			window.removeEventListener('pointerleave', onPointerLeave);
			window.removeEventListener('pointerup', onPointerUp);
			window.removeEventListener('pointercancel', onPointerUp);
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onScroll);
			document.removeEventListener('visibilitychange', onVisibility);
			reduceMotion.removeEventListener('change', onMotionChange);
			scheme.removeEventListener('change', onScheme);
			gl.getExtension('WEBGL_lose_context')?.loseContext();
		},
	};
}
