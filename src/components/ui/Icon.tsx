import { icons, type IconName } from './icons';

export type IconProps = {
	name: IconName;
	className?: string;
};

/** Decorative by default — icons never carry meaning on their own here, the
    label next to them (or the button's aria-label) does. */
export const Icon = ({ name, className }: IconProps) => (
	<span
		className={['icon', className].filter(Boolean).join(' ')}
		aria-hidden="true"
		dangerouslySetInnerHTML={{ __html: icons[name] }}
	/>
);
