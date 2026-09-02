import { useEffect, useState } from 'react';
import mascotGlasses from '../../assets/toast/mascot-glasses.svg?raw';

/** How long the toast holds before it starts leaving. Measured from mount,
    not from the end of the entrance, so the still moment in the middle is
    this minus the ~700ms the entrance takes to settle. */
const HOLD_MS = 3000;

/** How long the exit takes, start to finish. This is a contract with
    components.css's `.toast--leaving` block, not a free number: the two halves
    pull apart and the pill dissolves under them over one second flat, all
    three running to the same edge, so unmounting any earlier would cut the
    sequence off mid-way. */
const EXIT_MS = 1000;

/**
 * One overlay for the whole page, same pattern as Lightbox/Glossary: any
 * element carrying `data-toast-trigger="<message>"` fires it, so the trigger
 * stays static HTML and only this island hydrates.
 */
export const Toast = () => {
	const [message, setMessage] = useState<string | null>(null);
	const [leaving, setLeaving] = useState(false);

	useEffect(() => {
		const onClick = (e: MouseEvent) => {
			const trigger = (e.target as HTMLElement).closest<HTMLElement>('[data-toast-trigger]');
			if (!trigger) return;
			setLeaving(false);
			setMessage(trigger.dataset.toastTrigger ?? '');
		};
		document.addEventListener('click', onClick);
		return () => document.removeEventListener('click', onClick);
	}, []);

	// Two timers, not one: the class goes on at the end of the hold and the
	// unmount waits out the animation behind it. Both are cleared together, so
	// a toast replaced mid-flight cannot leave a stale unmount armed.
	useEffect(() => {
		if (message === null) return;
		const exit = window.setTimeout(() => setLeaving(true), HOLD_MS);
		const unmount = window.setTimeout(() => {
			setMessage(null);
			setLeaving(false);
		}, HOLD_MS + EXIT_MS);
		return () => {
			window.clearTimeout(exit);
			window.clearTimeout(unmount);
		};
	}, [message]);

	// Astro only emits an <astro-island> around output that exists — a
	// component that returns null on the server never ships its script at
	// all. Render an inert root so there is always something to hydrate.
	if (message === null) return <div hidden data-toast-root />;

	return (
		<div className={leaving ? 'toast toast--leaving' : 'toast'} role="status">
			{/* .toast__icon is the orange fill, painted on the box rather than
			    on the glasses, so it reaches every edge regardless of where
			    .toast__glasses's entrance ends up resting. On the way out the
			    two leave together as one character. */}
			<span className="toast__icon">
				<span className="toast__glasses" dangerouslySetInnerHTML={{ __html: mascotGlasses }} />
			</span>
			<p className="type-meta toast__text">{message}</p>
		</div>
	);
};
