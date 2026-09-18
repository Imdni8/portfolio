/**
 * Playback for a `static` Solution slide's clip. A static slide lives outside
 * `[data-carousel-track]`, so solution-carousel.ts — which autoplays whichever
 * carousel slide is active — never sees it.
 *
 * The clip plays itself the first time it scrolls into view — no press
 * needed — then plays once inline and stops on its last frame; the card's
 * play button (SlideVideo's `[data-slide-video-play]`) hides while it plays
 * and comes back on pause or end, so a reader can press it to replay, but
 * never has to press it to see it the first time. The one-shot autoplay is
 * tracked per video (`autoplayed`) so scrolling the card out of view and
 * back doesn't replay it — only a press does that. Reduced motion skips the
 * autoplay entirely (the poster stands, same as a carousel clip under
 * reduced motion) and leaves the button as the only way to play it.
 * `loop` is switched off here rather than in SlideVideo's markup because
 * SlideVideo cannot see whether its Slide is static, and carousel clips
 * still loop.
 *
 * A playing clip pauses when it scrolls off screen or when the lightbox
 * opens (the same film would otherwise decode twice) — the button
 * reappears, so the reader resumes it themselves rather than it restarting
 * behind their back.
 */
const overlayOpen = () => document.documentElement.hasAttribute('data-lightbox-open');
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initStaticSlideVideos(slides: HTMLElement[]) {
	const videos: HTMLVideoElement[] = [];
	const autoplayed = new WeakSet<HTMLVideoElement>();

	const observer =
		typeof IntersectionObserver === 'function'
			? new IntersectionObserver((entries) => {
					for (const entry of entries) {
						const video = entry.target as HTMLVideoElement;
						if (!entry.isIntersecting) {
							if (!video.paused) video.pause();
						} else if (!autoplayed.has(video) && !reducedMotion()) {
							autoplayed.add(video);
							video.play().catch(() => {});
						}
					}
				})
			: null;

	for (const slide of slides) {
		const video = slide.querySelector('video');
		const play = slide.querySelector<HTMLButtonElement>('[data-slide-video-play]');
		if (!video || !play) continue;

		video.loop = false;
		play.addEventListener('click', () => {
			video.play().catch(() => {});
		});
		video.addEventListener('play', () => play.toggleAttribute('data-playing', true));
		video.addEventListener('pause', () => play.toggleAttribute('data-playing', false));
		observer?.observe(video);
		videos.push(video);
	}

	document.addEventListener('lightbox:change', () => {
		if (!overlayOpen()) return;
		for (const video of videos) if (!video.paused) video.pause();
	});
}
