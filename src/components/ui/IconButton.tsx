import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

export type IconButtonProps = {
	variant?: Variant;
	size?: Size;
	icon: ReactNode;
	/** No visible label on an icon-only button, so this becomes aria-label. */
	label: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

// Defaults to ghost, not Button's primary: every icon-only control shipped so
// far (a note's dismiss, a lightbox close) wants to recede rather than read as
// the page's main action, and an icon rendered in a filled primary circle by
// default is the louder failure mode of the two if a caller forgets to set
// this. Every current call site sets `variant` explicitly regardless.
export const IconButton = ({ variant = 'ghost', size = 'md', icon, label, className, ...rest }: IconButtonProps) => (
	<button
		type="button"
		className={['icon-btn', `icon-btn--${variant}`, `icon-btn--${size}`, className].filter(Boolean).join(' ')}
		aria-label={label}
		{...rest}
	>
		{icon}
	</button>
);
