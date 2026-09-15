/**
 * Playback for a `static` Solution slide's clip. A static slide lives outside
 * `[data-carousel-track]`, so solution-carousel.ts — which autoplays whichever
 * carousel slide is active — never sees it.
 *
 * Nothing plays until the reader presses the card's play button
 * (SlideVideo's `[data-slide-video-play]`). The clip then plays once inline
 * and stops on its last frame; the button hides while it plays and comes back
 * on pause or end, so pressing it again replays. `loop` is switched off here
 * rather than in SlideVideo's markup because SlideVideo cannot see whether its
 * Slide is static, and carousel clips still loop.
 *
 * A playing clip pauses when it scrolls off screen or when the lightbox opens
 * (the same film would otherwise decode twice) — the button reappears, so the
 * reader resumes it themselves rather than it restarting behind their back.
 */
const overlayOpen = () => document.documentElement.hasAttribute('data-lightbox-open');

export function initStaticSlideVideos(slides: HTMLElement[]) {
	const videos: HTMLVideoElement[] = [];

	const observer =
		typeof IntersectionObserver === 'function'
			? new IntersectionObserver((entries) => {
					for (const entry of entries) {
						const video = entry.target as HTMLVideoElement;
						if (!entry.isIntersecting && !video.paused) video.pause();
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
