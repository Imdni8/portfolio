# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Tousif Rahaman's personal portfolio site — case studies of design work.
Deployed at `https://www.tousif.fyi` (set as `site` in `astro.config.mjs`;
`tousif.fyi` 301s to the `www` form). `site` is not decoration — every
absolute URL the site emits, `og:image` above all, is built from it, so a
stale value there breaks link previews without breaking a single page.

## Current direction

The project is being restarted around a design system, documented in
**Storybook** (`.storybook/`, stories in `src/stories/`). Foundations are done;
components are next.

`src/styles/tokens.css` is the **source of truth**, and is the one part of `src/`
that is current. Stories read their values out of it at render time via
`readToken()` rather than restating them — so a story cannot drift from the
stylesheet, and swatches follow the theme toolbar for free. Keep that property
when adding stories.

The foundations, all settled with the user:

- **Colour** — an unmodified Tailwind `amber` ramp plus a custom cool grey, 11
  steps each. No pure white, no pure black; `gray-50` is the lightest value in
  the system. Dark is the default theme, light is fully specified. The two themes
  use opposite ends of the amber ramp with no overlap, because `amber-500` is
  8.09:1 on the dark ground and 2.07:1 on the light one.
- **Type** — ported from carlthomasiv.com
  (`scratch/carlthomasiv-typography-notes.md`). DM Serif Display is what a
  reader stops on (titles, headlines — always 400, tracked −1%), DM Sans is
  what is read in full (copy at 16/1.7, deks, captions, controls), DM Mono is
  apparatus (nav, tabs, tags, eyebrows — 10–12px, uppercase, tracked +6–8%).
  Sixteen styles, exposed as `.type-*` classes. **There is no bold**: the
  loaded cuts are serif 400; sans 400/500; mono 300 (the footer wordmark
  only)/400/500, and `--weight-semibold`/`--weight-bold` no longer exist.
  A fourth family, **Delicious Handrawn** (`--font-hand`, `.type-hand`), sets
  the homepage headline's "try to" and nothing else — an aside written into
  the sentence. Do not reach for it anywhere else. The headline is the only
  text above the title rung: `.type-display` (serif italic, "Thoughtful
  software") and `.type-display-sans` ("I … design") share
  `--size-display` (36→48) and `--lh-display` (1.2); `.type-hand` runs at
  5:8 of that (`--size-hand`, 22.5→30).
  Importance comes from the family and the colour token, never a heavier cut.
  `.type-heading`, `.type-reflection` and `.type-card-title` now share one
  rule (serif 400, 26/31) — the names stay because they say what the text is
  for. Colour was deliberately *not* ported: the reference's 50%-opacity ink
  fails AA for body copy, so every element kept its existing colour token.
- **Motion** — two curves in tokens.css, `--ease-out` (arrivals, exits,
  press responses) and `--ease-in-out` (on-screen movement), from Emil
  Kowalski's guidance in the installed `.claude/skills/` (`emil-design-eng`,
  `animate`, `review-animations`). They share their names with Tailwind's
  weaker defaults and override them — see the comment there. Never `ease-in`
  on UI, never `transition: all`, gate hover styles behind
  `(hover: hover) and (pointer: fine)`, and treat reduced motion as "gentler",
  not "none".
- **Space and radius** — Untitled UI's scales, unmodified. They share their first
  five rungs and then diverge (`radius-lg` is 10px, `spacing-lg` is 12px), so
  they are two scales and not interchangeable above `md`. Neither has a semantic
  layer; use the primitives directly.

Accessibility is a hard constraint, not a preference: every semantic pairing that
carries a WCAG requirement was computed against both grounds and passes. If you
change a semantic token, re-check it against `bg`, `bg-raised` and `bg-sunken` in
both themes before shipping.

## Components

`src/styles/components.css` holds the styles; `src/components/ui/*.tsx` holds
thin React wrappers that add no styling of their own.

**Style components as CSS classes, not as React styles.** The site is Astro, so
a component that is a class ships zero JavaScript when used from a `.astro`
file; the React wrapper exists so Storybook has something to render and so
islands can share the markup. Reach for a wrapper only where there is real
state — `Tabs` and a dismissible `Note` need it, `Button` does not.

Built so far: `Button` (primary / secondary / tertiary), `Tabs`, `Note`, `Icon`,
`IconButton` (icon-only counterpart to `Button` — same three variants, plus
`sm`/`md`/`lg` sizing), `Tag` (a non-interactive label — `default` variant
reads the semantic layer, `coming-soon` and `ai` are bound to primitives
instead — `coming-soon` because it is written for a cover image rather than the
page ground, `ai` because its ring is decoration; see below).

**`--ai-spectrum-1…4` is the one sanctioned exception to the two-hue palette**,
and it exists for a single component: the `ai` tag variant's border, a conic
gradient rotating once every four seconds around the chip on a work card. The
hues are decoration and nothing else — never text, never a fill, never a
surface anything has to be read against, which is why they carry no contrast
measurement while every semantic pairing does. What the chip *means* is carried
by its sparkles glyph and its fixed "AI" label, so it survives greyscale with
the ring switched off entirely. Stop 1 is `--amber-500`, so the sweep is led by
the system's own hue and the loop closes with no seam; the remaining three come
from the same unmodified Tailwind palette the amber ramp does. They are not
theme-aware and must not become so. The angle is a registered `@property`
(`--tag-ai-angle`) because an unregistered custom property has no type and
would jump rather than interpolate — the same reason `Solution.astro` registers
its mask stop.

**Glass** (`.glass` in `components.css`) is a material, not a component — the
backdrop-filter pane the about page's stats panel is cut from. The nav and the
work cards both used to wear it; neither does now (the cards are solid `--bg`
panels), so `about.astro` is the only page that renders `<GlassDefs />`.
Anything wearing it needs `<GlassDefs />` rendered once on the page (it defines
the SVG refraction filter `.glass` references) and something painted behind it
to bend.

**Icons** come from `src/components/ui/icons.ts`, sourced unmodified from
Lucide (`lucide-static`, one 24×24 grid, one 2px stroke weight) rather than
hand-drawn per component. `Icon.astro` and `Icon.tsx` both read that same
registry, so a `.astro` file and a React island render identical markup. Add
an icon by importing its raw SVG (`?raw`) into `icons.ts` — never inline a new
`<svg>` in a component.

Three conventions worth keeping:

- **Always use the design tokens — never a raw value, and never a hand-rolled
  copy of one.** Colour, type, space and radius all have tokens; if a value is
  needed that no token carries, that is a gap in the system to raise, not a
  literal to inline. This extends to the type styles: reach for the `.type-*`
  class rather than re-declaring family, weight, size, leading and tracking on
  a component — the scale names its uses in its own comments (`.type-overline`
  is "eyebrows and note titles", `.type-annotation` is "photo captions and
  note/tooltip copy"). A component that assembles a style by hand has somewhere
  to drift from; one that names the style cannot.
- **Never let state rest on colour alone.** The active tab changes weight
  (400 → 500, DM Mono's heaviest cut) as well as hue, so it survives greyscale
  and colour blindness.
- **Disabled drops to an outline**, not a dimmed fill — a greyed-out solid
  reads as a loading state.
- **Only cap prose measure (a `ch` max-width) where it actually narrows
  something that would otherwise render wider.** `Section`'s `.section__body`
  cap earns its place because the split layout's column is `minmax(0, 1fr)`
  and would stretch to fill it without one. A single-column block that's
  already bounded by `--measure-page` with nothing beside it — no facts rail,
  no split column — has nothing left to narrow: capping it anyway leaves a
  ragged, unexplained gap on the right. This is why the hero's
  `h1`/`.hero__subtitle` carry no cap of their own (the column already bounds
  them), and why
  `Reflection`'s body copy runs the section's full measure. Before adding a
  measure cap, check what's actually beside the block — if the answer is
  "nothing," the cap is the bug, not the missing constraint.

### shadcn/ui

Tailwind v4 and shadcn/ui (`--base base`, i.e. Base UI primitives rather than
Radix) were added to install `navigation-menu` for the site nav's "Side
projects" dropdown — the first shadcn component in the repo, not the last;
the plan is to bring more of `src/components/ui/` onto this stack over time,
deliberately, one component at a time, rather than converting everything at
once. Until a given component is migrated, it stays exactly as documented
above (a CSS class plus a thin React wrapper) — the two systems are meant to
coexist for a while, not race each other.

- **`components.json`** points `tailwind.css` at `src/styles/tailwind.css`
  and aliases `ui`/`components`/`lib`/`hooks` to `@/components/ui` etc.
  (`@/*` → `./src/*`, added to `tsconfig.json`).
- **`src/styles/tailwind.css`** is the bridge: `@theme inline` maps shadcn's
  `--color-*` slots (`--color-background`, `--color-muted`, `--color-ring`, …)
  straight onto tokens.css's existing semantic tokens (`--bg`, `--bg-sunken`,
  `--focus-ring`, …), so a shadcn component's Tailwind utilities and a
  hand-written component's CSS classes read the exact same source of truth —
  Tailwind is a second *syntax* for tokens.css, never a second palette.
  Deliberately **not** mapped there: `--radius-*` and `--font-*`. Tailwind's
  own theme namespace for those is the identical CSS custom property name
  tokens.css already owns (`--radius-md`, `--font-sans`), so aliasing one to
  the other reads as a variable referencing itself and resolves to nothing —
  this bit `shadcn init`'s own scaffolded `tailwind.css` on the first run (it
  also dropped in a default OKLCH palette, a Geist font import and
  `--chart-*`/`--sidebar-*` tokens this project has no use for, and a
  `.dark`-class variant that doesn't apply since theme here flips via
  `[data-theme]`, not a class — all stripped back out). Where a component
  genuinely needs a radius or font token, it reaches tokens.css directly via
  Tailwind's arbitrary-value syntax (`rounded-[var(--radius-lg)]`) instead.
  `@import "shadcn/tailwind.css"` stays, though — that one's pure interaction-
  state infrastructure (`data-open`/`data-checked`/… custom variants,
  accordion-height keyframes), not a design decision, so it's framework
  plumbing worth keeping regardless of which components use it.
- **Vendored primitives keep the CLI's own lowercase filenames**
  (`src/components/ui/navigation-menu.tsx`), unlike this project's usual
  PascalCase wrappers — that's deliberate, so `npx shadcn diff`/`update`
  still recognizes them as CLI-owned. They're still hand-edited where the
  project's own conventions require it (`navigation-menu.tsx`'s chevron was
  swapped from shadcn's default `lucide-react` import to this project's own
  `Icon`/`icons.ts` registry, since icons here are never sourced from a
  second icon package) — such edits carry a comment pointing at `shadcn diff`
  so a future update doesn't silently reintroduce what was deliberately
  changed. Site-specific composition goes in a separate, normally-named
  wrapper instead of piling onto the vendored file — e.g.
  `src/components/nav/NavMenu.tsx`, which composes `navigation-menu.tsx`
  with the "Side projects" links (the popup surface wears shadcn's own
  default `bg-popover` look via the tailwind.css token bridge, not `.glass`
  — the simplified nav has no glass material anywhere).
  `SiteNav.astro` renders it as a `client:idle` island for just that one
  dropdown; the Resume link beside it is off-site, has nowhere to open, and
  stays a plain Astro-rendered anchor, untouched by any of this. Its popup is
  `align="start"`, not `end` — the whole nav row clusters on the left, so a
  trailing-edge alignment would open the panel away from its trigger.
- **`ui/drawer.tsx`** is the second vendored primitive (`npx shadcn add
  drawer`). It's shadcn's base-nova Drawer, which wraps Base UI's `Drawer`,
  so it added no dependency. `NavMenu.tsx` uses it for the Side projects
  bottom sheet on phones (see Site nav). Two project edits, both noted in the
  file's header for `shadcn diff`:
  - `cn` is imported from `@/lib/utils`. **The base-nova registry imports it
    from a standalone `cn` npm package, and `shadcn add` installs that
    package.** It was uninstalled again: this project already has the helper.
    Expect the same on every future `shadcn add`. Fix the import and
    `npm uninstall cn` each time.
  - The backdrop is `bg-(--overlay)` rather than the stock `bg-black/10`.
- **`gsap` stays**, but scoped to one job: the per-item hover choreography
  (hoverline draw + arrow diagonal entrance/exit) in
  `src/components/nav/nav-dropdown.ts`. The hand-rolled `<details>`
  open/close toggle that file also used to carry was what this migration
  deleted — Base UI's own open/close, keyboard and focus handling replaced
  that half. The surviving choreography half binds via document-level
  capture-phase delegation because Base UI recreates the item DOM on open;
  see that file's header comment.

`--secondary` is the one place `#ffffff` appears. The no-pure-white rule governs
*content* colour; this is a control surface, so white is written as a literal in
the semantic layer rather than added to the grey ramp, where it would invite use
as a text or page colour. It is also deliberately not redefined per theme — the
button is white on both grounds. On light that leaves the label doing the
identifying: the fill is 1.11:1 against `bg` and the `gray-200` border 1.12:1.
Raising `--secondary-border` to `--gray-500` would carry the edge at 4.14:1 if
that is ever wanted.

## Site nav

Brand mark on the *left*; **Resume** (off-site, `links.resume` from
`src/data/links.ts`, with the `arrow-up-right` glyph) and the **Side projects**
dropdown together on the *right* — `space-between` across a `--measure-prose`
(1000px) row, sitewide. The brand is 40px tall and sits 16px from the top
(`--spacing-xl` of block padding), so the band is 72px. The dropdown is
`align="end"` because its trigger is the row's last item. There is no Work link
(the homepage reel is the work) and no About link; nothing in the nav can ever
be the current page, so `SiteNav.astro` carries no `aria-current` and no
URL-reading frontmatter.

- **On the homepage the nav arrives with the scroll.** Under the reel's media
  query, rules scoped by `body:has([data-reel])` put the shell at
  `opacity: var(--reel-nav)` and the brand at `var(--reel-brand)` — registered,
  non-inheriting `@property`s with an initial value of 0, so the first paint
  already hides it. `home-reel.ts` writes both. Hidden, the nav stays in the
  accessibility tree and the tab order (`:focus-within` brings it back at full
  strength) but drops the pointer via `data-reel-hidden`. On any other page the
  `:has()` doesn't match, which is why the persisted shell needs no cleanup on
  swap.
- **The scrim band paints `var(--nav-band, var(--bg))`.** The homepage sets
  `--nav-band` to its warm `--home-ground` on `<body>`; everywhere else the band
  is `--bg`.

- **On phones (below 40rem) Side projects opens a bottom sheet**, not the
  dropdown.
  - `NavMenu.tsx` always renders both the dropdown and a `DrawerTrigger`
    (`.nav-sheet__trigger`, which also wears `.nav-dropdown__trigger` so the
    two look identical). `SiteNav.astro` shows one or the other at 40rem, the
    footer's breakpoint. Server and client markup never disagree because
    there's no media query in React.
  - The sheet (`ui/drawer.tsx`, Base UI Drawer) slides up, follows the
    finger, and closes on a downward swipe, on backdrop tap, on Escape, or
    via its close button (there for anyone not swiping). It carries a swipe
    handle.
  - Its content is `.type-overline` "Side projects" and one ≥48px row per
    project: `.type-nav-link` label, arrow icon, and an sr-only "(opens in
    new tab)". Rows dip to 60% opacity on press, with no tap flash and
    `touch-action: manipulation`.
  - It's portalled to `<body>`, so its styles in `SiteNav.astro` are all
    `:global()`. They set the top edge to `--border` (there's no base layer
    giving borders a colour, so it would otherwise be the text colour) and
    add `env(safe-area-inset-bottom)` to its bottom padding.
  - The viewport meta has no `viewport-fit=cover`, so that inset is 0 today.
    Add it (and pad the fixed nav's top) if the site ever goes edge-to-edge.

**`/about` is deliberately unlinked.** The page still builds and still answers at
`/about`, but nothing on the site points at it — not the nav, not the footer.
It is parked, not retired; re-linking it is one anchor, wherever it belongs.

## The page frame

Every top-level column on the site resolves to the same left edge, and the
formula that gets there is:

```css
box-sizing: border-box;
max-width: calc(var(--measure-content) + 2 * var(--gutter));
margin-inline: auto;
padding-inline: var(--gutter);
```

or its equivalent — the gutter *outside* the cap, on a full-bleed parent, which
is what `about.astro` does (and `.nav-shell`/`.nav-shell__inner`, though the
nav now caps at `--measure-prose` rather than `--measure-content` — see Site
nav — and the homepage has no frame at all; see Homepage). The two are the
same geometry; a bare `max-width: var(--measure-content)` with padding inside it
is **not**, and that is the trap. It was equivalent while the pages were
content-box, but Tailwind's preflight (`src/styles/tailwind.css`) makes
everything border-box, so the padding now eats a gutter off each side — the
homepage's card grid silently drifted 60px right of the nav and the footer's own
rule before this was caught. `Footer.astro`'s `.site-footer__inner` comment
carries the measurements.

## Homepage

`index.astro` is a headline and a reel, rebuilt from the Paper file's frames
`1RC-0` (first screen) and `1I9-0` (the reel). The page scrolls vertically; a
trackpad's sideways swipe also steps through the cards.

- **The structure.** `.reel` (`data-reel`) is a tall section whose height is
  `(1 + reelLength(n)) × 100svh`, from `reelLength()` in `home-reel.ts`, so the
  CSS and the script can't disagree about where the sequence ends. Inside it,
  `.reel__pin` is sticky and viewport-sized, and holds `HomeHero` plus an `<ol>`
  of `WorkCard`s, all absolutely positioned. The script decides where
  everything inside the pin should be:
  - **intro**: two states and a *played* transition, never anything in
    between.
    - State 1 is the first screen. State 2 has the headline gone, the T mark
      in the nav, the nav in, and the first card centred.
    - The transition (`INTRO_DURATION`, 1s) fades the words, flies the mark
      into the nav, fades the nav in, and raises the cards 58svh behind the
      mark, staggered from the centre outwards.
    - The two states sit `INTRO` (1 viewport) apart in the scroll, so the
      scroll position always says which one the page is in. Nothing is drawn
      from positions in between;
  - **reel** (`STEP`, 0.9 per card): cards slide along a 10° diagonal, one
    position per step. Neighbours sit 0.6707 card-widths across and are 83% of
    the lit card's size, overlapping its edges as drawn;
  - **end**: the page ends on the last card (`TAIL` is 0). Where the screen
    has room under the lit card, the footer is laid over the bottom of the
    reel and rises into view as the last card arrives, so there's nothing
    left to scroll. Where it doesn't, the footer stays in flow and scrolls in
    after. See "The footer at the end" below.

  All the tunables sit in one block at the top of `home-reel.ts`. A single
  rAF loop drives it, not ScrollTrigger (GSAP stays scoped to the nav).
  - The reel doesn't sit on the scroll position; it follows it through an
    exponential lag (`SMOOTHING`, a 90ms time constant). A wheel notch
    otherwise teleports the cards by 100px. The follower stops once it's
    within half a pixel, so an idle page runs no frames.
  - It snaps instead of gliding on the first frame, on resize, and on
    keyboard focus.
- **How input moves between the states** (all in `home-reel.ts`):
  - **Wheel/trackpad** (a non-passive `wheel` listener on the window):
    - Any forward gesture on state 1, however small, plays the transition.
      Any backward gesture on the first card plays it in reverse.
    - The scroll jumps to that state's position at once, and the timeline
      runs on the clock using the token curves (a JS `cubicBezier` that
      mirrors `--ease-out`/`--ease-in-out`).
    - The rest of that gesture, trackpad momentum included, is swallowed until
      the wheel has been quiet for `GESTURE_IDLE` (200ms). An opposite-direction
      event is a new gesture, so reversing mid-transition turns it around.
    - Scrolling back through the reel **stops at the first card** instead of
      carrying on into the intro. The next backward gesture plays the reverse.
  - **Horizontal**: a gesture that mostly moves sideways counts as that axis.
    Inside the reel it's converted to the scroll it stands for, at
    `STEP·vh / (STEP_X·cardWidth)` so a card stays under the fingers, and
    clamped to the first and last card. `html` gets `overscroll-behavior-x:
    none` in reel mode so the swipe isn't also the browser's back gesture.
  - **Touch** (reel-width touch screens): a swipe plays the intro the same
    way. Moves in the intro's direction are `preventDefault`ed from the first
    pixel, because Chrome won't let a touch be cancelled once it has started
    scrolling.
  - **Keys**: ArrowDown/PageDown/Space on state 1, and ArrowUp/PageUp/Shift+Space
    on the first card, jump between the states *instantly* (keyboard actions
    don't animate). Elsewhere keys scroll natively.
  - **Anything else that moves the scroll** (scrollbar, Home/End,
    find-in-page, a link back to the top, a restored position) is reconciled
    in `tick`: a position between the states snaps to the other one, and a
    position on a state takes that state.
  - **Resize** keeps the page at the same place in the reel by rescaling the
    scroll offset to the new viewport height.
- **One media query gates the reel**, in `index.astro`, `SiteNav.astro`,
  `HomeHero.astro` and as `REEL_QUERY`: `(min-width: 64rem) and
  (prefers-reduced-motion: no-preference) and (scripting: enabled)`. Move
  them together.
  - The CSS default inside it is the reel's first frame (each `.reel__slot`
    reads `--i`), so nothing jumps when the script arrives.
  - Outside it (narrow, reduced motion, no JS), the page stacks: the headline
    gets 78svh, the cards follow as a plain column, and `work-spotlight.ts`
    lights the middle one.
    - `.reel__hero` has `padding-block-start: 22svh`, which centres the
      headline at 47.5svh, the same place the reel puts it (just above the
      viewport-fixed glow's centre), while the first card still starts at
      78svh.
    - The headline uses a plain letter T (`.hero__letter`) there, not the
      brand mark: the mark only exists to fly into the nav, and without the
      reel the nav shows its own mark from the start, so it would be the same
      logo twice. `HomeHero.astro` swaps them on the same query.
  - `initHomeReel()` switches between the two modes live on `matchMedia`
    change, and its teardown hands every inline style back.
- **The headline** (`HomeHero.astro`) is read from an `.sr-only` copy. The
  drawing is `aria-hidden`, because the T is an SVG and the grid's whitespace
  never reaches the accessibility tree.
  - Its entrance is CSS only: the two lines arrive 80ms apart
    (`--ease-out`), then the middle grid track animates `0fr → 1fr`
    (`--ease-in-out`), so "I" and "design" part symmetrically, and "try to"
    is written into the gap, rising from `scale(0.9)`.
  - The track animation is a deliberate layout-property exception. The
    transform version would have to measure the aside after its font loads
    and hide the line until then.
  - The card track then settles up 6svh, 80ms after the second line. It uses
    `translate` only, because an opacity fade would delay the LCP (the first
    card's cover).
  - Under reduced motion all of this becomes one 200ms fade of the finished
    sentence.
  - The animations fill `backwards`, never `both`. A filled opacity animation
    would leave `.hero__visual` a stacking context and trap the flying mark
    (z-index 1) behind the card track (a stacking context at 0).
  - The scroll script writes only to `[data-reel-fade]` and `[data-reel-mark]`,
    never to an animated element, because a running animation outranks inline
    styles.
- **The T mark's flight** is measured with `offsetLeft/Top` against the pin
  (so the entrance transform can't skew it) and aimed at the nav glyph's rect.
  It lands at the same size as the nav's own mark. There the page swaps: the
  hero mark hides and `--reel-brand` shows the nav's.
  - The nav fades in over 30–60% of the transition, finishing exactly when the
    mark lands, so the handoff doesn't dim.
  - **The mark never overlaps a card.** It leads (`GLIDE` 0–60%,
    `--ease-in-out`) and the centre card follows (`RISE_DELAY` 20%, over
    `RISE_SPAN` 60%, `--ease-out`). The narrowest gap during playback is the
    resting one (≥125px at 1440×900), checked from 1024×768 to 1920×600.
  - `MARK_CLEARANCE` (24px) also holds any card that shares the mark's column
    under it while the mark is in the air, as a guard for untested viewport
    shapes. Retune those three together and re-check the gap.
  - The rise stagger is capped at two steps so the last visible card still
    finishes inside the intro.
- **`WorkCard`** is a solid `--bg-sunken` panel, 1px `--border`, at the
  reference's 1230×709 ratio: cover on top, then tags, `.type-card-title`, and
  a half-strength `--border-strong` rule over industry and year side by side.
  - The text panel takes its natural height and the cover gets the rest.
  - The cover image is width-fitted at 16:10 and cropped at the bottom by
    `.card__media`'s own `overflow: clip`. Without that clip, the positioned
    image paints straight over the text.
  - The card has no width of its own. The reel sets `min(71.2vw, 110svh,
    76.875rem)`; the stacked layout uses the frame. Under 40rem of card width
    it drops the ratio and gives the cover its own 16:10.
- **One card is lit at a time**, `round(k)` in the reel.
  - Every other card gets `data-dimmed`: `--card-dimmed-opacity` (0.6) and a
    2px blur, toggled with a transition rather than scrubbed, since a
    per-frame blur is the most expensive thing the reel could ask for.
  - 0.6 is a contrast floor, kept deliberately above the reference's 0.3. Over
    the homepage ground (darkest to glow peak) it leaves titles at ≥7.1:1 and
    meta rows at ≥6.1:1; 0.3 would be 2.6:1.
  - A focused card is never dimmed. Focusing a card finishes the intro and
    scrolls the window to its step, so Tab walks the reel. Both happen
    instantly, with the follower snapped: Tab is a repeated keyboard action
    and shouldn't animate.
  - Cards lift 2px on hover (gated to mouse and trackpad) and press to
    `scale: 0.98` on `:active` for every input. They're separate properties,
    so a press composes with the lift.
  - Coming-soon cards aren't links, so Tab skips them.
- **The footer at the end.** `index.astro` wraps `<Footer />` in
  `.home-footer`, outside `<main>` so the `<footer>` keeps its contentinfo
  role.
  - `home-reel.ts`'s `measure()` checks whether the footer (115px) plus
    `FOOTER_CLEARANCE` (24px) fits under the lit card. The reel may rise by up
    to the lit card's distance from the nav minus `NAV_CLEARANCE` to make room.
  - If it fits, the script sets `data-footer-overlay` on `<body>`. The wrapper
    is then absolutely pinned to the body's bottom edge (the body is
    `position: relative`, and its height is the reel's). Over the last
    footer-height of scroll, the cards rise by just the missing amount, in
    step with the footer.
  - Measured: it fits at 1115×930, 1440×900, 1280×800, 1024×768 and 1728×1117,
    with a gap of ≥24px everywhere. It doesn't fit at 1280×640 or 1920×600,
    which scroll the footer in as before.
  - The footer sits *under* the reel (`.home` is z-index 1), so a card
    passing through covers it rather than footer text crossing a card. The
    viewport-sized pin would then swallow the pointer over the footer (the
    mascot's hover pose), so in reel mode
    `.home` is `pointer-events: none` and only `.reel__slot` and the
    headline's `.hero__visual` take the pointer back.
- **The nav's scrim target is `.reel__scrim-line`**, placed at the lit card's
  resting top edge. While the pin holds, nothing passes under the nav. In
  flow mode, once the pin scrolls away with the last card, that line is what
  meets the nav first. In overlay mode the pin never scrolls away, so the
  band never shows.
- **The ground is `--home-ground`**, and `.home-ground` (fixed) holds the
  liquid-metal glow. See Liquid metal.
- **What Frame 2 shows is mid-reel, not the opening.** The reference draws a
  card to the left of the lit one; with a finite list starting on the first
  study, nothing is there until the second is centred.

## Footer

`src/components/footer/Footer.astro` is global chrome, not a `ui/` design-system
component — zero-JS `.astro`, styled in its own scoped `<style>` block, same
pattern as `SiteNav.astro`. There is no shared root layout (`index.astro`,
`about.astro` and `CaseStudyLayout.astro` each own their own `<!doctype html>`
shell — see Stack), so it's imported and rendered just before `</body>` in all
three places independently; adding a fourth top-level page means wiring it in
there too. `Analytics.astro` and `FontPreload.astro` are copied across the same
three heads for the same reason — see Performance.

Assets live in `src/assets/footer/`, imported via Vite's `?raw` suffix and
rendered with `set:html`, not through `src/components/ui/icons.ts` (that
registry is scoped to Lucide UI glyphs plus one vendored exception, not
one-off brand marks). The mascot mark is deliberately multi-colour and stays
untouched. `Instagram.svg`, `Github.svg` and `Linkedin.svg` are still in the
folder but nothing renders them any more (the social links were removed).

Structure, top to bottom: the mascot mark (at the right end, over the
tagline), a full-width rule, then a row with the copyright line on the left
and the tagline on the right. There are no social links and no brand mark:
the footer holds no links at all, so the nav's mark is the only route home.

- **The copyright line** is `<p class="type-nav-link">© Tousif Rahaman</p>`,
  in the same 12px uppercase mono label the nav links use. The © is text, not
  an icon, so it's read aloud as "copyright". (`.type-wordmark`, the
  DM Mono 300 cut it used to wear, is now used only by its Storybook
  specimen.)
  - It's `--text` at `opacity: var(--footer-name-opacity)` (0.5): the
    wordmark's own colour receding behind the tagline.
  - Measured: 5.2:1 on the homepage's ground and 4.9:1 on a case study's
    `--bg`, both clear of AA for 12px text. Don't take it lower.
  - The about page's water field can brighten the ground past that. The page
    is parked, so re-check it when re-linking.

- **`position: relative` on `.site-footer` is load-bearing, not decorative.**
  On `index.astro` (`.home-ground`, the liquid-metal glow) and `about.astro`
  (`.site-field`, the water field) a fixed background (`position: fixed`,
  `z-index: auto`) paints *after* static in-flow content per the CSS stacking
  spec, regardless of DOM order — so without this the footer lays out
  correctly but is invisible, hidden under that layer. Same fix `.home` uses
  for the same reason.
- **`margin-block-start: 75px` is a literal, not a token** — deliberate, per
  spec; it doesn't land on `--spacing-7xl` (64px) or `--spacing-8xl` (80px).
- **The mascot mark** is sized with `aspect-ratio: 123 / 96` (the source
  viewBox) rather than a fixed width, so the rest and hover poses can share
  one box at identical scale. It's `align-self: flex-end`, and
  `transform: translate(-6px, 12px)` on `.site-footer__brand` does two
  independent things — worth knowing if either needs retuning:
  - **Y (12px)** drops the torso rectangle's own bottom edge (y=78 of the
    96-tall viewBox) onto the rule, so the mark reads as standing on it with
    its legs dangling past the line — not the whole viewBox's empty bottom
    margin floating above it.
  - **X (−6px)** moves the right-aligned box so its centre sits on the centre
    of "together", the tagline's last word. Because both are right-aligned,
    it doesn't drift with width. Re-measure if the tagline's type or the
    row's `--spacing-xl` inset changes. Below 40rem the tagline is hidden,
    the copyright line centres on its own, and so does the mascot (X is 0
    there).
- **Spacing**: the row sits `--spacing-xl` under the rule and `--spacing-xl`
  above the footer's bottom edge, and is inset `--spacing-xl` from the rule's
  ends (`.site-footer__meta`, border-box pinned). The footer is 115px tall;
  the homepage reel measures it rather than assuming it.
- **Hover animation**: `Tousif&clawd-hover.svg` (arms and legs raised) sits
  absolutely-positioned directly on top of the resting `Tousif&clawd.svg`,
  both sharing the same 123×96 viewBox so they line up without any extra
  maths. `:hover` on the `.site-footer__brand` wrapper cross-fades between
  them via `opacity` + `filter` over 200ms `ease` — pure CSS, so both
  mouseenter and mouseleave animate for free with no JS. The outgoing pose
  blurs by 2px as it fades, which blends the two sets of arms into one
  movement instead of a double exposure. The hover is gated to
  `(hover: hover) and (pointer: fine)` so a tap on touch doesn't leave the
  arms up, and guarded by `prefers-reduced-motion`.
- **The tagline** ("Designed *solo* · Developed *together*") is set at the
  row's end (`text-align: end`) and hidden below 40rem. It reuses
  `.type-meta` with a local `color: var(--primary-text)` override — the
  shared style itself carries no colour, since its other use (the toast
  message) sits on a different ground. The italic on "solo"/"together" needs
  the real DM Mono italic face, which is why `tokens.css` imports
  `@fontsource/dm-mono/400-italic.css` — without it the browser synthesises a
  slant.

## Case studies

A case study is **one MDX file** in `src/content/work/` plus an assets folder
at `src/assets/work/<slug>/` — that's the whole source of truth. The homepage
grid (`src/pages/index.astro`) is derived entirely from the `work` collection
(`getCollection('work')`, sorted by `order`); it is never hand-edited. Run
`/new-case-study` to scaffold one, or add the file directly using the
reference below — `src/content/work/agent-versioning.mdx` is a worked example
of a fully published entry.

**Schema** (`src/content.config.ts`) splits into two groups:

- **Card metadata — required on every entry, whatever its `status`:** `title`,
  `industry`, `technology` (one primary tool/stack label), `year` — the card
  shows `industry` and `year` as two icon rows under its title; `technology`
  is still required and recorded, but is not currently rendered anywhere.
  `thumbnail` (`{ src, alt }`, the card's
  cover image), `order` (sort key — leave gaps of 10, e.g. 10/20/30, so a new
  card can be inserted without renumbering the rest). `roles` is metadata too
  — max 2 entries, each `{ kind: 'design-type' | 'code', label }` — what kind
  of work it was, rendered as icon `Tag` chips at the top of the card's text
  panel, on every status including `coming-soon`. `kind` picks
  the icon (`design-type` → Figma mark, `code` → angle brackets); `label` is
  free text, so a new design-type value (e.g. "Design concepts") is a
  content-only edit. Every entry needs a `design-type` role (enforced by the
  schema, on every status); `code` is optional.
  **`aiFeature` is a boolean, not a role**, and the distinction is
  load-bearing: `roles` says what kind of work the *designer* did, `aiFeature`
  says the *product* shipped a notable AI feature. It renders a fixed chip —
  the sparkles glyph and the literal string "AI", both hard-coded in
  `WorkCard.astro`, never authored in content — always leftmost, and outside
  the `roles.max(2)` cap. It is also the only chip that wears the animated
  gradient ring (`.tag--ai`, see Components). Writing AI as a `roles` entry
  instead gets you a chip that reads "AI" wearing the Figma mark and no ring;
  `philips-ultrasound-gig.mdx` did exactly that until it was converted.
- **Page content — only needed once a page actually builds:** `subtitle` (the
  standfirst; optional — the hero skips the line and meta tags fall back to
  the title), `facts` (max 4, the row under the title), `chapters` (the
  chapter rail — each `id` must match a `<Chapter id="…">` wrapper in the
  body), `hero` (a before/after compare) *or* `heroShot` (a single still —
  the schema rejects both), `actions` (hero CTAs).

**`status`** decides what gets built and where it shows up. There is no
separate "hide from homepage" flag — this one field is the whole state
machine:

| `status`              | Page at `/work/<slug>` | Homepage card |
| ---------------------- | :---------------------: | :-----------: |
| `published` (default) | yes                      | yes, linked   |
| `coming-soon`          | no                       | yes, unclickable, cover scrimmed with "Coming soon" |
| `unlisted`             | yes                      | no            |

A `coming-soon` entry is otherwise minimal: `title`/`industry`/`technology`/
`year`/`thumbnail`/`order`/`status` plus a `roles` entry (a `design-type` role
is mandatory on every status — see above), no body. When the case study is
written, flip `status` to `published` (or delete the line — it's the
default), add `subtitle` and the rest of the page-content fields, and write
the MDX body.

**Assets** live in `src/assets/work/<slug>/`, numbered by where they appear in
the story (`00-` for the hero/thumbnail shots, then reading order) — follow
`src/assets/work/agent-versioning/`. Reference them from frontmatter with a
relative path (`../../assets/work/<slug>/…`). `thumbnail` and
`hero.before`/`hero.after` are independent images, not the same field reused —
a `coming-soon` entry has only a thumbnail, no hero pair.

**Body** is free-form MDX assembled from `src/components/case-study/*`
(`Section`, `Figure`, `FigureRow`, `NoteBox`, `VideoFigure`, `Reflection`,
`Term`, and for chapter-led studies `Chapter`, `AnnotatedFigure`, `GoalChip`,
`StatTile`, `SlideCallout`). This kit — along with
`CaseStudyLayout`/`CaseStudyHero`, `agent-versioning.mdx` and `audit-logs.mdx`
— is current and documented here, not prior work to
disregard; treat it as the pattern to follow when writing a new case study.

**The 30-second cut** sits in front of that long form: `StorySection` (a
heading, an optional blockquote highlight, prose, and an optional shot beside
it), `Solution`/`Slide`/`SlideVideo`/`SlideText` (the scroll-snapped highlights
carousel), and `ReadInDetail` (the curtain the long form sits behind). **The long form
itself** is `StoryChapter` (a group heading — "Narrowing the problem", "UX
decisions") holding `StoryBlock`s (one titled row: shot left, copy right).
All of them are written in Tailwind utilities rather than in `components.css`
classes — but the *values* are tokens.css's, reached through the `@theme
inline` bridge in `src/styles/tailwind.css`. Tailwind here is a second syntax
for the semantic layer, never a second palette. **This is the rule, not a
style preference:** the cut originally used Tailwind's stock palette
(`text-white`, `text-neutral-200`, `border-neutral-800`) and those are
dark-only literals, so the entire 30-second cut rendered at roughly 1.1:1 on
the light ground. Any colour or family written as a stock Tailwind step or a
bare arbitrary value is that bug waiting to happen again.

Two shared strings live in `src/components/case-study/story-type.ts` and are
imported by every component in the cut: `storyProse` (the copy column) and
`storyHeading` (family, weight, tracking and colour for the two heading
rungs). Sizes stay at the call site, since they differ by rung.

Its type is four rungs. None of them is a `.type-*` class, but all of them read
the type scale's size and leading tokens through arbitrary values rather than
Tailwind's stock steps, so the cut moves when the scale does (it was
originally specced on its own fixed 30/40, 24/32, 18/24 and 16/24 rungs):

| Role | Resolves to | Tailwind |
| --- | --- | --- |
| Section/chapter heading (`StorySection`, `Solution`, `StoryChapter`) | DM Serif 400, 22→26 / 1.2 | `text-[length:var(--size-heading)] leading-[var(--lh-heading)]` + `storyHeading` |
| Blockquote highlight | DM Sans 500, 18→20 / 1.4 | `text-[length:var(--size-subtitle)] leading-[var(--lh-subtitle)] font-medium text-foreground` |
| Slide/block title (`SlideText`, `StoryBlock`) | DM Serif 400, 18→20 / 1.4 | `text-[length:var(--size-subtitle)] leading-[var(--lh-subtitle)]` + `storyHeading` |
| Running copy | DM Sans 400, 16 / 1.7 | `text-[length:var(--size-body)] leading-[var(--lh-body)] text-body` |

Colour goes through four bridge slots: `text-foreground` (`--text`, headings,
`<strong>` and the blockquote), `text-body` (`--text-body`, running copy —
the one slot this project added to shadcn's list, since shadcn has no name
for a third text rung), `text-muted-foreground` (`--text-muted`, list
markers) and `border-border` (`--border`, rules). The blockquote's left bar
is the exception that proves the rule: it takes `border-foreground`, not
`border-border`, because it is an accent set against the copy rather than a
structural edge — `--border` is `--gray-700` on the dark ground and would
render it as a hairline. Families go through
`font-[family-name:var(--font-sans|--font-display)]`, never
`font-['DM_Sans_Variable']`: the quoted form compiles to a single-family
declaration and throws away the fallback stack, dropping the whole column to
Times whenever the webfont is slow or blocked.

The running-copy rung is `.type-body`'s values exactly, and the blockquote is
the same rung `Section`'s pull-quote uses — `AnnotatedFigure`'s and
`SlideCallout`'s note lists read `--size-body`/`--lh-body` too, so the prose
and the notes under a figure stay one column of type.

- **`StorySection` splits into two columns only when it is given a `visual`
  slot** — `split="5-7"` (the default, `minmax(0,5fr) minmax(0,7fr)` at `lg`)
  or `split="even"`, copy on the left, shot on the right and top-aligned with
  the blockquote. With no visual there is nothing beside the copy, so it runs
  the section's full measure uncapped — the same rule `Section` and the hero
  follow, and the reason the Problem chapter looks wider than Code
  contribution. `split` is a named union rather than a boolean so a third
  ratio is one more entry in the component's `COLUMNS` map, not a second
  boolean with no defined precedence against the first.
- **`StoryChapter` takes an optional `intro` slot** — a copy-only chapter
  opener, for the prose that introduces a chapter before its first titled
  block. Pass it from MDX as `<Fragment slot="intro">`. It exists so content
  never imports `story-type.ts` to hand-roll the prose column: that would
  give the column's markup two authors, and a later change to how it is
  wrapped would silently miss whichever copy lives in content.
- **The step between the cut and the curtain is `.read-more`'s own
  `padding-block-start`, and nothing else.** There used to be a `StorySeam`
  spacer component in the MDX above it (originally a hand-written `<div>`
  copied into all three case studies, colour literal and all). Its `py-20`
  stacked with the preceding section's `py-20` and with `.read-more`'s own
  padding for ~288px — the one gap on the page that was not the sitewide
  160px step, since every other chapter boundary here is 80px below one
  section plus 80px above the next. The seam is deleted; `.read-more`'s
  `padding-block-start` is `--spacing-8xl`, which both restores that 160px
  and exactly stands in for the first chapter's own top step (zeroed inside
  the curtain so it does not eat 80px of the 344px peek). Retune the gap
  there.
- **`SlideVideo` pins a clip to one corner of a `Slide`'s media card** and lets
  it bleed off the two opposite edges, so `vid-bg.jpg` reads as an L-shaped
  strip along the other two. It goes in through `Slide`'s `media` slot; with no
  such slot the card falls back to an empty placeholder rectangle. Four things
  are load-bearing:
  - **`pin` names the corner the video hugs and runs past**, not the visible
    one — `pin="bottom-right"` insets from the top and left. Which corner a
    slide takes is a framing decision made against the recording: pin *away*
    from the action, so the clipped edges are the empty ones. The banner clip
    lives at the top of frame, so it pins `bottom-*`; the floating update tab
    lives at the bottom, which is why that one slide is `top-left`.
  - **`--pin-inset` and `--pin-bleed` are the whole tuning surface**, both
    `--spacing-6xl` (48px), stepping to `--spacing-3xl` under 40rem. Equal
    values make the video box exactly the card's own size translated diagonally
    — so the visible window is ~89% × ~91% of the frame, identical on every
    slide. There is deliberately no per-slide size prop.
  - **There is no `autoplay` attribute, and that is the point.**
    `solution-carousel.ts`'s `updateActive()` starts and stops playback off the
    same `data-active` signal that drives the slide's opacity, gated on an
    `IntersectionObserver` for the track. So at most one clip decodes at a time,
    `preload="none"` means nothing is fetched until the reader pages to it, and
    `prefers-reduced-motion` costs one condition rather than a CSS branch —
    play() is simply never called and the poster stands. `Lightbox` honours the
    same contract: its `<video>` sets `autoPlay` only when reduced motion is
    off, and while the overlay is open it stamps `data-lightbox-open` on
    `<html>` and fires a `lightbox:change` event so `updateActive()` pauses
    the slide's own copy of the clip rather than decoding it twice.
  - **A `static` slide never autoplays; it gets a play button.** Stacked slides
    sit outside `[data-carousel-track]`, so `updateActive()` never sees them.
    `SlideVideo` renders a `.slide-video__play` button (the same
    `icon-btn--primary icon-btn--lg` as `Video.astro`) as a *sibling* of the
    zoom trigger — a button inside a button is invalid — and
    `static-slide-video.ts` plays the clip once per press with `loop` off,
    hiding the button while it plays and pausing on scroll-away or when the
    lightbox opens. Carousel slides hide that button and keep looping.
  - **`data-static={isStatic || undefined}`, never the bare boolean.** Astro
    renders `data-static={false}` as `data-static="false"`, which
    `[data-static]` still matches — carousel slides were silently wearing the
    static styles until this was caught.
  - **The trigger is a `<button>`, so `updateActive()` also owns the track's
    tab stops** — it sets `tabIndex` to `-1` on every zoom trigger outside the
    active slide. Without that, Tab walks into an off-screen slide and the
    browser's focus-scroll drags the scroll-snap track sideways under the
    reader. `tabIndex`, not `inert`: `inert` would also kill pointer events,
    so a slide peeking in at the edge could no longer be clicked.
  - **The card carries `aspect-ratio: 16 / 10`**, because a pinned video is out
    of flow and would otherwise leave `.solution-slide__media` with no height.
    Deliver clips at 1920×1200 to match it; `object-fit: cover` is the safety
    net for anything else, with `object-position` at the visible corner so its
    trim eats the same edges the card is already clipping. Per repo convention
    the clip is a `/media/…` string and the poster an `src/assets` import —
    the latter through `getImage()`, since a 1920-wide PNG for a frame that is
    mostly never seen is 350 KB against a 19 KB webp.
- **`StoryBlock` is `StorySection` reversed**, deliberately: the shot leads on
  the left and the copy follows on the right, at an even split rather than
  5fr/7fr. In the 30-second cut the copy leads and the shot supports it; in the
  long form the shot *is* the finding and the copy explains it. Its `visual`
  slot takes more than one child — the dependency-card block puts a `NoteBox`
  under its `Figure` in the same column, authored as two siblings both carrying
  `slot="visual"`. That column is marked `data-zoom-group`, so two stacked
  shots open in the lightbox as one steppable pair.
- **Lightbox grouping is `data-zoom-group`, not a style class.** It used to be
  `.row`, which only `FigureRow` emits — so the moment `StoryBlock` started
  stacking its comparison pairs instead of putting them in a row, every pair
  opened as a group of one and the arrows and chevrons vanished from the
  overlay. Grouping is a content relationship; the attribute says so, and a
  container can opt in without also taking `FigureRow`'s equal-column,
  subgrid-caption layout.
- **`NoteBox` is a collapsed `<details>` by default; pass `open` to expand
  it.** `agent-versioning`'s note carries `open` because it was always-visible
  prose before the component became collapsible, and a component-level default
  should not silently edit a shipped page. Its flex row is an inner `<span>`,
  never the `<summary>` itself — setting `display` on a `<summary>` away from
  `list-item` stops the disclosure toggling on older WebKit, and there is no
  script behind it to recover.
- **`ReadInDetail` is a curtain over real content, not a teaser.** Its default
  slot holds the whole long form; it renders in full, gets clipped to a 344px
  peek and buried under a full-width `--bg` wash (40% → 90% at 35% → opaque)
  with the CTA centred on it. Clicking expands in place — one URL, one-way, no
  navigation. Four things there are load-bearing:
  - **The wash is uniform across the width** — the preview dims toward the
    bottom of the page, not toward a point, so the left column and the right
    column are equally far gone on any given line. An earlier radial version
    was the bug.
  - **The wash needs its own `z-index`.** An in-flow box paints its background
    under every line of text in the section, so without a stacking context it
    slides behind the type it exists to cover.
  - **`inert` is required, not a nicety.** The clipped content holds eleven
    focusable elements on this page alone — every `Figure` is a zoom button and
    every `Term` is a button too — so without it, tabbing walks focus into
    content the reader cannot see. It is set *by the script*, never in the
    markup, so that the `<noscript>` block (which releases the clip and drops
    the veil) leaves nothing stranded for a reader who cannot un-strand it.
  - **`.read-more` carries no measure or inline padding.** The chapters inside
    bring the page frame; re-applying it would double the gutter. The first
    chapter's own top step is zeroed via `:global()`, or 80px of the 344px peek
    is blank padding — scoped styles never reach slotted MDX.
- **A case study's content column is `--measure-story` (1200px), not
  `--measure-page`.** Sections, carousel and the read-more seam all read it;
  the footer stays at `--measure-page`, so the story reads as a column inside
  the page rather than as the page itself.
- **Two narrower measures sit inside it.** `StoryChapter narrow` runs its
  media at `--measure-prose` (1000px) and caps its heading and intro at
  `--measure-copy` (752px), centred. Anything in the default slot that should
  line up with the prose rather than the screenshots — the Goals tile grid,
  the stat tiles, `SlideCallout`, `AnnotatedFigure`'s notes — carries its own
  `max-w-[var(--measure-copy)] mx-auto` plus `w-full`/`inline-size: 100%`:
  an auto-margined grid item shrinks to its content, so without the width a
  short block centres itself off the prose's left edge. `CaseStudyHero`'s
  opener frame matches `--measure-prose` with the gutter *outside* the cap
  (`min(measure + 2 × gutter, 100%) − 2 × gutter`) so it is flush with those
  screenshots; its `compareSizes` is a hand-resolved mirror of that formula
  (`sizes` cannot see custom properties) — if the measure moves, move that
  string too.
- **`StoryChapter`'s inner grid is `grid-cols-[minmax(0,1fr)]`, not the
  implicit `auto` column.** An auto track grows to its children's min-content,
  so an `auto-fit` tile grid inside it never sees a narrow viewport and never
  wraps — the page scrolled sideways to 724px at a 375px viewport until this
  was pinned.
- **Pins on `AnnotatedFigure` are `notes` `{ x, y }` percentages of the
  image's own box**, centred on the value (the badge translates −50%/−50%).
  Several pins sharing one `label` and `text` collapse to one line in the
  notes list below it.
- **The chapter rail (`ChapterNav`) only shows at 1400px and up**, and its
  back arrow is the only way home on a study that has one — so
  `CaseStudyHero`'s breadcrumb renders on those studies too, hidden at exactly
  the same breakpoint (`data-rail`). The two media queries are a pair; move
  them together. Scroll-spy is `chapter-nav.ts`, a rAF-batched scroll
  listener against `<Chapter>`'s `data-chapter-anchor` — not an
  IntersectionObserver, which only fires when a (very tall) chapter's edge
  crosses the band, long after its heading did.

**A closing tag (`</Section>` etc.) must be flush left — never indented.**
If a `<Section>`'s content ends with a numbered/bulleted list, an indented
closing tag (even by a few spaces) reads to CommonMark as a continuation of
the last list item rather than JSX, so the element never closes. The MDX→JS
compiler then cascades into invalid output, and the failure that surfaces —
a `RolldownError` with a garbled destructure line concatenating attribute
names and values into one giant identifier — points nowhere near the real
line. If a case study throws `RolldownError` after an edit, check for
indented closing tags right after a list before looking anywhere else.

## Water field

`src/components/ui/water-field.ts` is the background on `about.astro` (the
homepage used to run it too; it now runs liquid metal, below) — one WebGL pass drawing a domain-warped fBm fluid, a grid that
refracts through the same displacement, and pointer-driven wave packets. The
palette is read out of `tokens.css` at run time, so it follows `[data-theme]`
without restating a colour.

`scratch/watery-grid-background-plan.md` describes a three-canvas version of
this and **predates it** — read it as history, not as a spec. Its Phases 1 and 2
are what shipped here, unified into one pass; its Phase 3 (a dot/particle field)
was never built.

Options: `grid`, `intensity`, `maxDpr`, plus the finish — `grain`, `bloom`,
`vignette`. All six go through `WaterField.astro`'s `data-*` attributes or the
React wrapper, and all six have sliders in `src/stories/WaterField.stories.tsx`,
which is the place to tune them.

**Every brightener is capped by `RIBBON_MAX`, and that cap is a measured number,
not a taste one.** Its comment records the sweep it came from and the contrast
it buys `--text-body` on both grounds. Bloom is written as a *re-spend* of that
same weight — the share that would have gone to `uRibbon` goes to `uGlow`
instead — rather than as a second pass on top of it, precisely so adding it
cannot void the measurement. Anything new that lifts the field has to fold into
that budget the same way, and the numbers have to be re-measured after (sample
the canvas over a pointer sweep, both themes; Playwright is already a dev
dependency for exactly this kind of check).

## Liquid metal

`src/components/ui/liquid-metal.ts` is the homepage background: Paper's
`LiquidMetal` shader (diamond shape), mounted through the framework-free
`ShaderMount` the same way `smoke-ring.ts` is. Its values are the Paper file's,
unmodified, in one `PAPER` constant, except `frame`: 2000 opens the loop on a
soft-edged phase, since t=0 is its hardest-edged one. That frame matters most
under reduced motion, where it is the only one shown. `LiquidMetal.astro` mounts
it on `astro:page-load` and tears down the previous one; `LiquidMetal.tsx` and
`src/stories/LiquidMetal.stories.tsx` are the tuning surface.

**The shader draws in greys; the amber is the blend.**
- `.liquid-metal` (components.css) fills itself with `--home-shader-ground`,
  isolates, and soft-lights onto `.home-ground`'s `--home-ground`.
- Soft-light can only push each channel toward where its base already is, and
  the warm ground has no blue, so the glow can only come up amber. On a
  grey-ramp ground it renders grey.
- That is why the two grounds are literals in the semantic layer (next to
  `--brand-mark`), not ramp steps, and are not redefined per theme.

**It fades in; the layer doesn't.** `createLiquidMetal()` marks the host
`data-liquid-metal="ready"` once the shader is built. It resolves the new
canvas's hidden starting style first, so the fade has somewhere to start
from.
- On `ready`, the *canvas* fades in (1.4s `ease`) and grows from 94% (1.8s
  `--ease-out`; no growth under reduced motion).
- Never animate the host's opacity. Its own ground is half the blend: it's
  what darkens rgb(20, 12, 0) to the near-black rgb(5, 2, 0) the reference
  shows. Fading the host would visibly dim the whole background on load.
- Without WebGL or JS the canvas simply stays hidden.

**Contrast is bounded by the blend, and measured.** Every pixel under the
headline, over a 60s sweep of the loop at 1728/1440/1024 wide, peaks at
rgb(61, 40, 0), which puts `--text` at 13.5:1. Re-measure (Playwright: hide
the text, `paperShaderMount.setFrame()` across the loop, read the
screenshot) if `contour`, `softness` or `scale` change, or either ground
does.

## Performance

Four things on the critical path are deliberate and easy to undo by accident.

- **`posthog-js` is behind a dynamic `import()`**, in `analytics.ts`'s
  `startAnalytics()`. It is 274KB raw / 88KB gzipped, and `Analytics.astro`
  renders in `<head>` on every page — so as a top-level import it was the
  largest thing every visitor downloaded, to record a handful of named events.
  Adding `import posthog from 'posthog-js'` back at the top of that file
  silently reverses this and nothing fails to show that it did; the chunk just
  rejoins the critical path. The init is additionally scheduled on
  `requestIdleCallback` (with a 4s `timeout` so a busy page still measures).
  Nothing is lost by either deferral: `trackNow()` pulls the load forward for
  interactions and queues the event behind it, and arrivals go through
  `trackOnIdle()` precisely so they *don't* pull it forward.
- **Above-the-fold images have to opt out of lazy loading.** Astro's image
  service defaults every `<Image>` to `loading="lazy"`, which is wrong for
  exactly the images that are the LCP candidate. `WorkCard` takes a `priority`
  prop (`index.astro` passes it to the first two cards — on the reel's first
  screen the first card peeks in at the bottom centre and the second at the
  bottom right), `CaseStudyHero`'s
  `heroShot` sets it directly, and
  `BeforeAfter`'s two shots carry `fetchPriority="high"`.
- **`FontPreload.astro` is global chrome, like `Footer` and `Analytics`.**
  There is no shared root layout, so it is rendered in `index.astro`,
  `about.astro` and `CaseStudyLayout.astro` independently — a fourth top-level
  page needs it wired in there too, or that page's headline paints in a
  fallback serif and reflows. It preloads only the two `latin` faces that set
  visible text at the top of the page; the file explains why more would be
  worse. The homepage's hand (`--font-hand`) is deliberately not preloaded:
  "try to" is invisible until ~1.4s into the entrance, by which time normal
  discovery has fetched it. `<ClientRouter />` and `<Analytics />` sit *last* in each `<head>`
  for the same reason, after everything that decides how the page looks.
- **Islands are gated on being reachable.** `NavMenu` is `client:idle`, not
  `client:load` — its trigger renders as static SSR markup and nothing it adds
  is needed before the reader goes for it. On a case study,
  `pages/work/[...slug].astro` scans the MDX body (comments and code fences
  stripped) for `<Term>` and `<Video>`/`<VideoFigure>`, and `CaseStudyLayout`
  renders `Glossary`/`VideoPlayer` only where there is something that can open
  them. `Lightbox` and `Toast` are deliberately *not* gated this way: their
  triggers come from several components each, so a name test would be a list
  to keep in sync rather than a fact about the page.

Two things that look like wins and are not, so they don't get "fixed" later:

- **The water field's `IntersectionObserver` cannot report `false` on this
  site**, because `.water-field` sits inside a `position: fixed; inset: 0`
  parent and always covers the viewport. That is not a bug to repair — the
  field is meant to be visible the whole way down (the about page's content
  carries no background), so there is nothing to pause, and an IO cannot
  detect occlusion anyway. It earns its place for the unpositioned uses (the
  Storybook stories), which is also why `onScroll` still re-reads the rect —
  rAF-batched, since scrolling genuinely cannot move it here.
- **The about page's `.glass` panel repaints with the field behind it.** That
  is what the material is; the cost is the design, not a defect.

## Stack

- **Astro 7** — static output, no adapter, no server.
- **React 19** islands via `@astrojs/react` — hydrated components only where
  interaction is needed; everything else is `.astro` and ships zero JS.
- **MDX** via `@astrojs/mdx` — long-form content in `src/content/`, typed by a
  content collection schema in `src/content.config.ts`.
- **Plain CSS, plus Tailwind v4 for shadcn/ui components** — most of the site
  is still custom properties in `src/styles/` (`tokens.css`, `components.css`),
  no CSS-in-JS. Tailwind was introduced to install shadcn/ui's `navigation-menu`
  (the nav's "Side projects" dropdown) and is meant to spread sitewide
  gradually as more components migrate, not as a one-pass rewrite — see
  "shadcn/ui" under Components for how the two systems coexist today.
- **TypeScript** — `astro/tsconfigs/strict`, `jsx: react-jsx`.
- **Fonts** — self-hosted via `@fontsource*` packages: `@fontsource/dm-serif-display`,
  `@fontsource-variable/dm-sans`, `@fontsource/dm-mono`, and
  `@fontsource/delicious-handrawn` (the homepage's two handwritten words, 400
  only). tokens.css imports
  only the cuts the type styles use; `FontPreload.astro` preloads the serif
  and the sans.
- **Playwright** — dev dependency, used only for ad-hoc visual checks.

## Commands

```bash
npm run dev              # localhost:4321
npm run build            # → dist/
npm run preview          # serve the build
npm run check            # astro check — type + template diagnostics
npm run storybook        # localhost:6006 — the design system
npm run build-storybook  # → storybook-static/ (gitignored)
```

There is no test runner and no linter configured. `npm run check` is the only
gate; run it before calling work done.

**There is also no formatter, and that is enforced rather than assumed.** This
codebase is hand-formatted; Prettier arrives transitively via
`@astrojs/language-server` and Storybook, and if it runs it does damage:

- On **MDX** it is destructive. An editor that treats `.mdx` as Markdown — VS
  Code's default without the MDX extension — normalises `*` emphasis to `_`,
  rewriting `{/* … */}` comment blocks to `{/_ … _/}`. MDX then reads that as a
  JSX expression holding an unterminated regular expression, and the build dies
  with `Unterminated regular expression` pointing at the delimiter rather than
  at the formatter. This is the same genre of misdirection as the indented
  closing tag under "Case studies", and it has already happened once. Even the
  correct `mdx` parser is unsafe, because reindenting a closing tag after a
  list is exactly the failure that section warns about.
- On **everything else** it is churn. Prettier's config-less defaults rewrite
  all 42 `src` TS/TSX files, and a config tuned to match the house style
  (tabs, single quotes, `printWidth` 110) still restructures 20 of them.

Three files hold the line, and all three are committed so they travel:
`.prettierignore` (ignores `*`, and says why — there is deliberately no
`.prettierrc`, since one would imply Prettier owns this formatting),
`.editorconfig` (tabs, LF, and no trailing-whitespace trimming in Markdown),
and `.vscode/settings.json` (format-on-save off, plus `*.mdx` pinned to the
`mdx` language so it is never parsed as Markdown). `.gitignore` was narrowed
from `.vscode/` to `.vscode/*` with negations for `settings.json` and
`extensions.json` to make that possible.

**Never run `npm run build` (or a bare `astro build`/`astro check`) while
`npm run dev` is also running against this working tree.** A build
re-optimizes Vite's on-disk dependency cache (`node_modules/.vite`), which
desyncs from the running dev server's in-memory module graph. Symptom: every
React island throws `TypeError: _jsxDEV is not a function` on hydration —
the page still server-renders fine, so it looks like content silently
vanished (before/after compare, chapter rail, lightbox, etc. all disappear)
rather than like a build error. Fix: stop the dev server, `rm -rf
node_modules/.vite`, restart `npm run dev`. If a build is genuinely needed
mid-session, stop the dev server first and restart it after. This includes
`npm run check` — the gate itself. A second, quieter symptom: the dev server
stops picking up frontmatter edits (the page keeps serving the old
`thumbnail`, say) with no error in its log. Scoped `<style>` edits can go
stale the same way. A third: after clearing `node_modules/.vite`, the first
page load makes Vite re-bundle dependencies it hadn't seen yet (Astro's
view-transition modules, a newly imported Base UI part). From then on the
running server can 504 with "Outdated Optimize Dep" on every load, most
visibly on the dev toolbar's script. Restart it once more *without* clearing
the cache and it serves cleanly.

**Beware browser dark-mode extensions when reviewing colour.** Dark Reader and
similar rewrite every background with `!important`, including inline styles, so
a story can look wrong while the tokens are correct. If a colour looks off,
check the *computed* value of the custom property before assuming a bug — the
extension leaves `--darkreader-*` properties on the element as a giveaway.

## Repo notes

- `agent versioning/`, `audit/`, `bolt/` and `design_system/` hold design source
  (PDFs, Figma exports, standalone HTML). They are gitignored and excluded from
  `tsconfig.json` — they are reference material, never built.
- `README.md` is gitignored. It documents the prior case-study kit in detail;
  read it for background on what exists, not as a spec for what to build.
- `public/media/` is for video, served as-is and never bundled. Images that
  should be optimised at build time go in `src/assets/`.
