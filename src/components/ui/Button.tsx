import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

export type ButtonProps = {
	variant?: Variant;
	/** Sits after the label. Decorative — the label carries the meaning. */
	icon?: ReactNode;
	children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = ({ variant = 'primary', icon, children, className, ...rest }: ButtonProps) => (
	<button type="button" className={['btn', `btn--${variant}`, className].filter(Boolean).join(' ')} {...rest}>
		<span>{children}</span>
		{icon && <span aria-hidden="true" style={{ display: 'contents' }}>{icon}</span>}
	</button>
);
