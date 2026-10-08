/* The homepage's link cursor — over a `[data-cursor]` element (the bio's
   underlined words, a published work card) the pointer becomes a small
   amber pill naming what a click does: "open", or "copy" on the email, whose click copies the address instead of opening a mail app
   (and the pill reads "copied" until the pointer leaves).

   Fine pointers only: a touch has no pointer to replace, so there the
   links behave as plain links, the email included (its mailto: stands).
   Without JS nothing changes either — the native cursor is hidden only
   once this has stamped `data-link-cursor` on the root. Keyboard
   activation of the email also stays a mailto:, since a key press shows
   no pill to say it copied. */
export const initLinkCursor = (root: HTMLElement): (() => void) => {
	const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
	const status = root.querySelector<HTMLElement>('[data-cursor-status]');

	/* On <body>, not inside the page: the bio and the work list rise in
	   with a transform, and a transformed ancestor would become the fixed
	   pill's containing block. Styled in components.css. */
	const cursor = document.createElement('span');
	cursor.className = 'link-cursor';
	cursor.setAttribute('aria-hidden', 'true');
	const label = document.createElement('span');
	label.className = 'link-cursor__label';
	cursor.append(label);
	document.body.append(cursor);

	let frame = 0;
	let x = 0;
	let y = 0;
	let active: HTMLElement | null = null;

	const place = () => {
		frame = 0;
		cursor.style.translate = `${x}px ${y}px`;
	};

	const onMove = (event: PointerEvent) => {
		if (event.pointerType !== 'mouse') return;
		x = event.clientX;
		y = event.clientY;
		if (!frame) frame = requestAnimationFrame(place);

		const target = (event.target as Element | null)?.closest<HTMLElement>('[data-cursor]') ?? null;
		if (target === active) return;
		active = target;
		if (target) {
			label.textContent = target.dataset.cursor ?? '';
			place();
			cursor.dataset.visible = '';
		} else {
			delete cursor.dataset.visible;
		}
	};

	const onLeave = () => {
		active = null;
		delete cursor.dataset.visible;
	};

	const onClick = async (event: MouseEvent) => {
		const target = (event.target as Element | null)?.closest<HTMLElement>('[data-copy]');
		/* `detail` is 0 for a click made with the keyboard. */
		if (!target || event.detail === 0 || !finePointer.matches) return;
		event.preventDefault();
		try {
			await navigator.clipboard.writeText(target.dataset.copy ?? '');
			if (active === target) label.textContent = 'copied';
			if (status) status.textContent = 'Email address copied';
		} catch {
			/* No clipboard (permissions, an insecure origin): fall back to
			   what the link would have done. */
			window.location.href = (target as HTMLAnchorElement).href;
		}
	};

	const sync = () => {
		if (finePointer.matches) root.dataset.linkCursor = '';
		else {
			delete root.dataset.linkCursor;
			onLeave();
		}
	};

	sync();
	finePointer.addEventListener('change', sync);
	root.addEventListener('pointermove', onMove);
	root.addEventListener('pointerleave', onLeave);
	root.addEventListener('click', onClick);

	return () => {
		cancelAnimationFrame(frame);
		finePointer.removeEventListener('change', sync);
		root.removeEventListener('pointermove', onMove);
		root.removeEventListener('pointerleave', onLeave);
		root.removeEventListener('click', onClick);
		delete root.dataset.linkCursor;
		cursor.remove();
	};
};
