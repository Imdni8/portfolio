/* The homepage tagline's GitHub squares — "Ships ▢▢▢▢▢▢▢" — filled with the
   last seven days of contributions, fetched live from the browser. The
   total goes in the strip's sr-only label and in its hover tooltip.

   GitHub's own contributions calendar has no CORS headers, so this reads it
   through github-contributions-api.jogruber.de, a public proxy over the same
   calendar that returns each day's count and GitHub's 0–4 level. Nothing
   is sent but the username.

   The squares are server-rendered empty (level 0, an outline). If the
   request fails, times out or comes back in a shape this doesn't expect,
   they stay that way and nothing is thrown: an empty strip claims nothing,
   where a guessed one would. */

const USER = 'Imdni8';
const ENDPOINT = `https://github-contributions-api.jogruber.de/v4/${USER}?y=last`;
const TIMEOUT = 6000;
/** Between one square's fill and the next, so the row fills left to right. */
const STAGGER = 40;

interface Day {
	date: string;
	count: number;
	level: number;
}

/** `YYYY-MM-DD` in the reader's own time zone — the calendar the API
 *  returns is keyed by date, and "today" should be the reader's today. */
const isoDay = (date: Date) =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const isDay = (value: unknown): value is Day =>
	typeof value === 'object' &&
	value !== null &&
	typeof (value as Day).date === 'string' &&
	typeof (value as Day).count === 'number' &&
	typeof (value as Day).level === 'number';

export const initCommitStrip = (strip: HTMLElement): (() => void) => {
	const squares = [...strip.querySelectorAll<HTMLElement>('.commit-strip__day')];
	const label = strip.querySelector<HTMLElement>('[data-commit-label]');
	const tip = strip.querySelector<HTMLElement>('[data-commit-tip]');
	const controller = new AbortController();
	const timeout = window.setTimeout(() => controller.abort(), TIMEOUT);
	const timers: number[] = [];
	const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	const load = async () => {
		const response = await fetch(ENDPOINT, { signal: controller.signal });
		if (!response.ok) return;
		const body: unknown = await response.json();
		const all = (body as { contributions?: unknown })?.contributions;
		if (!Array.isArray(all)) return;

		/* The calendar runs to the end of the current week, so it holds
		   future days at 0 — cut it at today before taking the last N. */
		const today = isoDay(new Date());
		const days = all.filter(isDay).filter((day) => day.date <= today).slice(-squares.length);
		if (days.length !== squares.length) return;

		days.forEach((day, i) => {
			const level = String(Math.min(Math.max(Math.round(day.level), 0), 4));
			const square = squares[i];
			if (reduceMotion) square.dataset.level = level;
			else timers.push(window.setTimeout(() => (square.dataset.level = level), i * STAGGER));
		});

		const total = days.reduce((sum, day) => sum + day.count, 0);
		const contributions = `${total} contribution${total === 1 ? '' : 's'}`;
		if (label) {
			label.textContent = `(${contributions} on GitHub in the last ${squares.length} days, opens in new tab)`;
		}
		if (tip) {
			tip.textContent = `${contributions} in last ${squares.length} days`;
			strip.dataset.ready = '';
		}
	};

	load()
		.catch(() => {
			/* Offline, blocked, rate-limited or aborted — the strip stays empty. */
		})
		.finally(() => window.clearTimeout(timeout));

	return () => {
		controller.abort();
		window.clearTimeout(timeout);
		for (const timer of timers) window.clearTimeout(timer);
	};
};
