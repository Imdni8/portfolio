import { useEffect } from 'react';

/**
 * Swaps a poster for a real <video> on click. The file is never requested
 * until then, which matters: the walkthrough is 7 MB and most readers will
 * never press play.
 */
export const VideoPlayer = () => {
	useEffect(() => {
		const onClick = (e: MouseEvent) => {
			const btn = (e.target as HTMLElement).closest<HTMLElement>('.video-frame__play');
			if (!btn) return;
			const frame = btn.closest<HTMLElement>('[data-video]');
			if (!frame) return;

			const video = document.createElement('video');
			video.src = frame.dataset.video!;
			video.controls = true;
			video.autoplay = true;
			video.playsInline = true;
			video.setAttribute('aria-label', frame.dataset.videoLabel ?? '');
			frame.replaceChildren(video);
		};
		document.addEventListener('click', onClick);
		return () => document.removeEventListener('click', onClick);
	}, []);

	// See Lightbox: a null server render means Astro emits no island.
	return <div hidden data-video-root />;
};
