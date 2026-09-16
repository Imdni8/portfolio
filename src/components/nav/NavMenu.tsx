import { useEffect } from 'react';
import { Icon } from '../ui/Icon';
import { initNavDropdownHoverAnimation } from './nav-dropdown';
import {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
} from '../ui/navigation-menu';
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '../ui/drawer';

const sideProjects = [
	{ label: 'Goalaris', href: 'https://goalaris-beta.vercel.app/' },
	{
		label: 'Amplitude taxonomy exporter',
		href: 'https://www.figma.com/community/plugin/1512420394545664823',
	},
];

/**
 * "Side projects" — the one item in the site nav that actually opens
 * something, so it's the one place shadcn/Base UI's NavigationMenu earns
 * its place. Resume beside it is a plain off-site anchor with nowhere to
 * open and stays Astro-rendered in SiteNav.astro; this replaces the old
 * `<details>` and its hand-rolled open/close toggle with Base UI's own
 * open/close, keyboard and focus handling. nav-dropdown.ts survives,
 * carrying only the per-item hover choreography that replacement doesn't
 * cover — the useEffect below is what wires it up.
 *
 * No `.glass` here — the simplified nav has no pane/pill material at all,
 * just text sitting on the page like Work/About. The popup keeps shadcn's
 * own default surface (bg-popover/ring-foreground via the tailwind.css
 * token bridge), which is why NavMenu no longer needs a popupClassName.
 *
 * `align="end"`: the trigger is the last item in the nav row and sits on
 * its right edge, so the panel hangs from the trigger's trailing edge and
 * opens back toward the middle of the page rather than out past the row's
 * end. (It was `start` while the whole row clustered on the left.) The default
 * `sideOffset` (8px, the same as `--spacing-md`) is unchanged, and Base
 * UI's collision handling still flips it at narrow widths.
 *
 * `keepMounted` on Content is still worth keeping even though it turned
 * out not to solve the problem it was added for — Base UI recreates the
 * panel/item DOM nodes on open regardless (see nav-dropdown.ts's own
 * comment for how that was confirmed, and why its event delegation binds
 * to `document` rather than to anything queried here). `keepMounted`
 * avoids at least the closed-state unmount/remount cycle on top of that.
 *
 * The binding runs from a `useEffect`, not a plain Astro `<script>` (the
 * more usual pattern in this repo — see nav-tint.ts's removed call in
 * SiteNav.astro, before the nav had any React in it): a `document`-level
 * listener only needs to be attached once, ever, and a component effect
 * with an empty dependency array is the idiomatic place for that — plus
 * its cleanup return runs the teardown correctly across React Strict
 * Mode's dev-only double-invoke, which a plain script has no equivalent of.
 */
export const NavMenu = () => {
	useEffect(() => initNavDropdownHoverAnimation(), []);

	/* Two triggers, one shown: the dropdown above 40rem, the bottom sheet
	   below it (SiteNav.astro switches them). Both are always rendered, so
	   the server markup and the hydrated markup agree whatever the width —
	   no media query in React to disagree with the one in CSS. */
	return (
		<>
			<SideProjectsDropdown />
			<SideProjectsSheet />
		</>
	);
};

const SideProjectsDropdown = () => (
	<NavigationMenu className="nav-dropdown" align="end" popupClassName="nav-dropdown__popup">
		<NavigationMenuList className="nav-dropdown__list">
			<NavigationMenuItem>
				<NavigationMenuTrigger className="nav-dropdown__trigger type-nav-link">
					Side projects
				</NavigationMenuTrigger>
				<NavigationMenuContent className="nav-dropdown__panel" keepMounted>
					{sideProjects.map(({ label, href }) => (
						<NavigationMenuLink
							key={href}
							render={<a href={href} target="_blank" rel="noopener noreferrer" />}
							className="nav-dropdown__item"
						>
							<span className="nav-dropdown__item-label type-nav-link">{label}</span>
							<span className="nav-dropdown__item-arrow">
								<Icon name="arrow-up-right" />
							</span>
							<span className="nav-dropdown__item-hoverline" />
						</NavigationMenuLink>
					))}
				</NavigationMenuContent>
			</NavigationMenuItem>
		</NavigationMenuList>
	</NavigationMenu>
);

/**
 * The same links on a phone, in a bottom sheet — shadcn's base-nova Drawer
 * (ui/drawer.tsx), which is Base UI's Drawer: it slides up from the bottom
 * edge, follows the finger and closes on a downward swipe, and brings the
 * dialog's focus trap, Escape and backdrop dismissal with it. A dropdown
 * hanging off the corner of a 390px screen is a small target far from the
 * thumb; a sheet is the phone's own answer to "a short list of choices".
 *
 * The close button is there for anyone who is not swiping — a screen reader,
 * a keyboard — and the handle says the sheet can be swiped at all.
 */
const SideProjectsSheet = () => (
	<Drawer showSwipeHandle>
		<DrawerTrigger className="nav-dropdown__trigger nav-sheet__trigger type-nav-link">
			Side projects
			<Icon name="chevron-down" />
		</DrawerTrigger>
		<DrawerContent className="nav-sheet">
			<DrawerHeader className="nav-sheet__header">
				<DrawerTitle className="type-overline">Side projects</DrawerTitle>
				<DrawerClose className="icon-btn icon-btn--tertiary icon-btn--md" aria-label="Close">
					<Icon name="close" />
				</DrawerClose>
			</DrawerHeader>
			<ul className="nav-sheet__list">
				{sideProjects.map(({ label, href }) => (
					<li key={href}>
						<a className="nav-sheet__item" href={href} target="_blank" rel="noopener noreferrer">
							<span className="type-nav-link">
								{label}
								<span className="sr-only"> (opens in new tab)</span>
							</span>
							<Icon name="arrow-up-right" />
						</a>
					</li>
				))}
			</ul>
		</DrawerContent>
	</Drawer>
);
