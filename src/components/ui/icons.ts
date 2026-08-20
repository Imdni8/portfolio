/* Icons — sourced unmodified from Lucide (24×24 grid, 2px stroke), the same
   "take the system as-is" rule the colour ramp follows. Add an icon by
   importing its raw SVG here; the outline set is at node_modules/lucide-static/icons. */
import close from 'lucide-static/icons/x.svg?raw';
import arrowDown from 'lucide-static/icons/arrow-down.svg?raw';
import play from 'lucide-static/icons/play.svg?raw';

export const icons = {
	close,
	'arrow-down': arrowDown,
	play,
} as const;

export type IconName = keyof typeof icons;
