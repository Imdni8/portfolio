/* Icons — sourced unmodified from Lucide (24×24 grid, 2px stroke), the same
   "take the system as-is" rule the colour ramp follows. Add an icon by
   importing its raw SVG here; the outline set is at node_modules/lucide-static/icons. */
import close from 'lucide-static/icons/x.svg?raw';
import arrowDown from 'lucide-static/icons/arrow-down.svg?raw';
import play from 'lucide-static/icons/play.svg?raw';
import chevronLeft from 'lucide-static/icons/chevron-left.svg?raw';
import chevronRight from 'lucide-static/icons/chevron-right.svg?raw';
import chevronDown from 'lucide-static/icons/chevron-down.svg?raw';
import codeXml from 'lucide-static/icons/code-xml.svg?raw';
import hourglass from 'lucide-static/icons/hourglass.svg?raw';
import externalLink from 'lucide-static/icons/external-link.svg?raw';
/* The one icon not imported from the package: Lucide retired its brand set, so
   the Figma mark is vendored in src/assets/icons, in the same grid and stroke
   weight as everything above. */
import figma from '../../assets/icons/figma.svg?raw';

export const icons = {
	close,
	'arrow-down': arrowDown,
	play,
	'chevron-left': chevronLeft,
	'chevron-right': chevronRight,
	'chevron-down': chevronDown,
	'code-xml': codeXml,
	hourglass,
	'external-link': externalLink,
	figma,
} as const;

export type IconName = keyof typeof icons;
