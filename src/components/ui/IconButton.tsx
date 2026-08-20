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
