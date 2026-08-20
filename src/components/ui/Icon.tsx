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
		// Falls back to an empty (but structurally valid) icon rather than
		// literally rendering the word "undefined" — name is typed as
		// IconName so this only bites if a value reaches here un-narrowed by
		// tsc, e.g. an `as` cast or a string sourced from content that isn't
		// validated against the registry.
		dangerouslySetInnerHTML={{ __html: icons[name] ?? '' }}
	/>
);
