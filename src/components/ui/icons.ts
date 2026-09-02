/* Icons — sourced unmodified from Lucide (24×24 grid, 2px stroke), the same
   "take the system as-is" rule the colour ramp follows. Add an icon by
   importing its raw SVG here; the outline set is at node_modules/lucide-static/icons.

   Three exceptions are vendored in src/assets/icons rather than imported from
   the package: Lucide retired its brand set, so the Figma mark is drawn by
   hand; the breadcrumb's home glyph and slash divider are one-off marks from
   the Paper design that don't match anything in Lucide's stock set. */
import close from 'lucide-static/icons/x.svg?raw';
import arrowDown from 'lucide-static/icons/arrow-down.svg?raw';
import play from 'lucide-static/icons/play.svg?raw';
import chevronLeft from 'lucide-static/icons/chevron-left.svg?raw';
import chevronRight from 'lucide-static/icons/chevron-right.svg?raw';
import chevronDown from 'lucide-static/icons/chevron-down.svg?raw';
import codeXml from 'lucide-static/icons/code-xml.svg?raw';
import hourglass from 'lucide-static/icons/hourglass.svg?raw';
import externalLink from 'lucide-static/icons/external-link.svg?raw';
import arrowUpRight from 'lucide-static/icons/arrow-up-right.svg?raw';
import users from 'lucide-static/icons/users.svg?raw';
import database from 'lucide-static/icons/database.svg?raw';
import building2 from 'lucide-static/icons/building-2.svg?raw';
import wrench from 'lucide-static/icons/wrench.svg?raw';
import calendar from 'lucide-static/icons/calendar.svg?raw';
import sparkles from 'lucide-static/icons/sparkles.svg?raw';
import search from 'lucide-static/icons/search.svg?raw';
import figma from '../../assets/icons/figma.svg?raw';
import home from '../../assets/icons/home.svg?raw';
import slashDivider from '../../assets/icons/slash-divider.svg?raw';

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
	'arrow-up-right': arrowUpRight,
	users,
	database,
	'building-2': building2,
	wrench,
	calendar,
	sparkles,
	search,
	figma,
	home,
	'slash-divider': slashDivider,
} as const;

export type IconName = keyof typeof icons;
