/* The Bolt prototype's own icon registry.
 *
 * Deliberately not src/components/ui/icons.ts. That registry is the *site's*
 * icon set — one Lucide grid, one stroke weight, reachable from every page and
 * every story. These glyphs belong to a picture of somebody else's product:
 * the Medable and Bolt marks, two agent avatars and the study glyph are brand
 * marks, not UI icons, and the Lucide entries below are chosen to stand in for
 * a screenshot rather than to be reused anywhere. Same reasoning Footer.astro
 * gives for keeping its social marks out of the shared registry.
 *
 * Everything is `?raw` so the SVG is inlined and can be coloured by
 * `currentColor` from CSS. Replacing a brand mark with the real asset is a
 * file drop into src/assets/work/medable-bolt/prototype/ — no code change.
 */

/* Brand marks — placeholders drawn from the reference screenshot, pending the
   real exports. */
import medableMark from '../../../assets/work/medable-bolt/prototype/medable-mark.svg?raw';
import boltMark from '../../../assets/work/medable-bolt/prototype/bolt-mark.svg?raw';
import agentRegulatory from '../../../assets/work/medable-bolt/prototype/agent-regulatory.svg?raw';
import agentDashboarding from '../../../assets/work/medable-bolt/prototype/agent-dashboarding.svg?raw';
import studyMark from '../../../assets/work/medable-bolt/prototype/study-mark.svg?raw';

/* Product UI glyphs, straight from Lucide like the rest of the site. */
import bell from 'lucide-static/icons/bell.svg?raw';
import circleUser from 'lucide-static/icons/circle-user.svg?raw';
import chevronDown from 'lucide-static/icons/chevron-down.svg?raw';
import chevronRight from 'lucide-static/icons/chevron-right.svg?raw';
import inbox from 'lucide-static/icons/inbox.svg?raw';
import bookOpen from 'lucide-static/icons/book-open.svg?raw';
import graduationCap from 'lucide-static/icons/graduation-cap.svg?raw';
import messageSquare from 'lucide-static/icons/message-square.svg?raw';
import keyRound from 'lucide-static/icons/key-round.svg?raw';
import cpu from 'lucide-static/icons/cpu.svg?raw';
import zap from 'lucide-static/icons/zap.svg?raw';
import blocks from 'lucide-static/icons/blocks.svg?raw';
import database from 'lucide-static/icons/database.svg?raw';
import badgeCheck from 'lucide-static/icons/badge-check.svg?raw';
import chartColumn from 'lucide-static/icons/chart-column.svg?raw';
import fileText from 'lucide-static/icons/file-text.svg?raw';
import link from 'lucide-static/icons/link.svg?raw';
import hammer from 'lucide-static/icons/hammer.svg?raw';
import plus from 'lucide-static/icons/plus.svg?raw';
import mic from 'lucide-static/icons/mic.svg?raw';
import square from 'lucide-static/icons/square.svg?raw';
import arrowUp from 'lucide-static/icons/arrow-up.svg?raw';
import check from 'lucide-static/icons/check.svg?raw';
import sparkles from 'lucide-static/icons/sparkles.svg?raw';

export const boltIcons = {
	'medable-mark': medableMark,
	'bolt-mark': boltMark,
	'agent-regulatory': agentRegulatory,
	'agent-dashboarding': agentDashboarding,
	'study-mark': studyMark,
	bell,
	'circle-user': circleUser,
	'chevron-down': chevronDown,
	'chevron-right': chevronRight,
	inbox,
	'book-open': bookOpen,
	'graduation-cap': graduationCap,
	'message-square': messageSquare,
	'key-round': keyRound,
	cpu,
	zap,
	blocks,
	database,
	'badge-check': badgeCheck,
	'chart-column': chartColumn,
	'file-text': fileText,
	link,
	hammer,
	plus,
	mic,
	square,
	'arrow-up': arrowUp,
	check,
	sparkles,
} as const;

export type BoltIconName = keyof typeof boltIcons;
