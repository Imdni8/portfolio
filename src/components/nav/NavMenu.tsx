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
 * its place. Work/About are plain links with nowhere to open and stay
 * Astro-rendered in SiteNav.astro; this replaces only the old
 * `<details>` + hand-rolled GSAP hover/animation logic (nav-dropdown.ts,
 * now deleted) with Base UI's own open/close, keyboard and focus handling.
 *
 * No `.glass` here — the simplified nav has no pane/pill material at all,
 * just text sitting on the page like Work/About. The popup keeps shadcn's
 * own default surface (bg-popover/ring-foreground via the tailwind.css
 * token bridge), which is why NavMenu no longer needs a popupClassName.
 *
 * `align="end"` + the default `sideOffset` (8px, the same as
 * `--spacing-md`) reproduce the old panel's `inset-inline-end: 0` /
 * `calc(100% + var(--spacing-md))` positioning — but via Base UI's
 * collision-aware floating position instead of a fixed inset.
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

	return (
		<NavigationMenu className="nav-dropdown" align="end" popupClassName="nav-dropdown__popup">
			<NavigationMenuList className="nav-dropdown__list">
				<NavigationMenuItem>
					<NavigationMenuTrigger className="nav-dropdown__trigger text-sm">
						Side projects
					</NavigationMenuTrigger>
					<NavigationMenuContent className="nav-dropdown__panel" keepMounted>
						{sideProjects.map(({ label, href }) => (
							<NavigationMenuLink
								key={href}
								render={<a href={href} target="_blank" rel="noopener noreferrer" />}
								className="nav-dropdown__item"
							>
								<span className="nav-dropdown__item-label type-ui-label">{label}</span>
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
};
