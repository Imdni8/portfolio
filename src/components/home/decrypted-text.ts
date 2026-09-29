/* Scrambles "thoughtful" into gibberish immediately on load, then resolves
   it left to right over about a second, underneath (not chained after)
   `.hero__line`'s own CSS fade/rise — the two run concurrently, and this
   module only ever rewrites `[data-decrypt-visual]`'s children, so it can't
   fight that entrance's opacity/translate.
   Skipped entirely under reduced motion — the plain word just stands,
   matching how the reel and work ring disable outright rather than
   offering a "lite" version. */

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const DURATION_MS = 1000;

export function initDecryptedText(line: HTMLElement): () => void {
	const target = line.querySelector<HTMLElement>('[data-decrypt-visual]');
	const text = target?.textContent ?? '';

	if (!target || !text || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
		return () => {};
	}

	let timeoutId: ReturnType<typeof setTimeout> | undefined;

	const chars = text.split('');
	const spans = chars.map((char) => {
		const span = document.createElement('span');
		span.textContent = char;
		if (char !== ' ') span.style.color = 'var(--text-muted)';
		return span;
	});
	target.replaceChildren(...spans);

	const tickSpeed = Math.round(DURATION_MS / chars.length);
	let revealed = 0;

	const tick = () => {
		chars.forEach((char, i) => {
			if (char === ' ') return;
			const span = spans[i];
			if (i < revealed) {
				span.textContent = char;
				span.style.color = '';
			} else {
				span.textContent = CHARS[Math.floor(Math.random() * CHARS.length)];
			}
		});
		revealed += 1;
		if (revealed <= chars.length) {
			timeoutId = setTimeout(tick, tickSpeed);
		}
	};

	tick();

	return () => clearTimeout(timeoutId);
}
