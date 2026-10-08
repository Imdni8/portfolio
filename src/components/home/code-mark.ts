/* The bio's </> mark (HomeBio.astro) idles on CSS keyframes that stay
   paused until it is on screen: this stamps `data-playing` while any of it
   is in view, so nothing animates where no one can see it. Without JS the
   mark simply stands still. */
export const initCodeMark = (mark: HTMLElement): (() => void) => {
	const observer = new IntersectionObserver(([entry]) => {
		mark.toggleAttribute('data-playing', entry.isIntersecting);
	});
	observer.observe(mark);
	return () => observer.disconnect();
};
