import type { IconName } from '../ui/icons';

/** The icon each kind of role wears on its chip — shared by WorkCard and the
 *  homepage ring's caption, so the two can't drift. `kind` is the closed set
 *  that picks the icon; `label` is free text supplied per entry in
 *  frontmatter, so a new design-type value never touches this file. */
export const ROLE_ICONS = {
	'design-type': 'figma',
	code: 'code-xml',
} as const satisfies Record<string, IconName>;

export interface WorkRole {
	kind: keyof typeof ROLE_ICONS;
	label: string;
}
