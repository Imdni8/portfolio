import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './icons';

export type TagVariant = 'default' | 'coming-soon';

export type TagProps = {
	/** Decorative — the label beside it carries the meaning, as everywhere else. */
	icon?: IconName;
	variant?: TagVariant;
	className?: string;
	children: ReactNode;
};

/** React twin of Tag.astro so Storybook has something to render. Same markup,
    same classes, no styling of its own — see components.css. */
export const Tag = ({ icon, variant = 'default', className, children }: TagProps) => (
	<span
		className={['tag', variant !== 'default' && `tag--${variant}`, className].filter(Boolean).join(' ')}
	>
		{icon && <Icon name={icon} />}
		{children}
	</span>
);
