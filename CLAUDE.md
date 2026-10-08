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
  8.09:1 on the dark ground and 2.07:1 on the light one. The homepage's
  gradient blinds carry a second sanctioned exception, `--blinds-1…7`
  (sampled from `scratch/bg_color_inspo.jpg`) — decoration only, the same
  terms as `--ai-spectrum-*`; see Gradient blinds. The homepage tagline's
  GitHub squares, `--commit-1…4`, are amber rungs on the same
  decoration-only terms (what they say is in sr-only text).
- **Type** — ported from carlthomasiv.com
  (`scratch/carlthomasiv-typography-notes.md`). DM Serif Display is what a
  reader stops on (titles, headlines — always 400, tracked −1%), DM Sans is
  what is read in full (copy at 16/1.7, deks, captions, controls), DM Mono is
  apparatus (nav, tabs, tags, eyebrows — 10–12px, uppercase, tracked +6–8%).
  Fourteen styles, exposed as `.type-*` classes. `.type-stat` is the biggest
  rung (`--size-stat`, 56→80, serif 400 upright, `--lh-stat` 1.1) and the
  newest — a case study's Outcome numerals (`StatTile`'s `size="lg"`) and
  nothing else; it isn't italic, because a numeral is read, not spoken. Outcome tiles are capped at a maximum width of 364px so
  they stay readable and do not stretch across the full case-study column.
  **There is effectively no
  bold**: the loaded DM cuts are serif 400;
  sans 400/500; mono 300 (the footer wordmark)/400/500. `--weight-semibold`
  (600) is the one deliberate exception in the DM families, reintroduced to give case-study
  prose's `<strong>` (`story-type.ts`'s `storyProse`) a heavier cut than
  `--weight-medium`, since 500 sits too close to DM Sans's 400 body weight to
  read as emphasis at a glance. In body copy it is not reached for anywhere
  else — do not use it outside that one `[&_strong]` rule.
  Three families and no more. The homepage headline used to be set in
  Montserrat and Playfair Display (`.type-hero*`, `--weight-bold`); the
  redesign dropped them, uninstalled both packages and removed their
  tokens. Its "thoughtful" is now DM Serif Display's drawn 400 italic, the
  face `.type-heading--claim` already loads. The older Delicious Handrawn
  aside, kaomoji and `DecryptedText` scramble are gone too, along with
  `.type-display`, `.type-display-sans`, `.type-hand` and their tokens.
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

The design-system controls are vendored **shadcn/ui** components in
`src/components/ui/` (`button.tsx`, `badge.tsx`, `alert.tsx`), styled with
Tailwind utilities that read tokens.css. Their variants were retuned so the
site looks exactly as it did with the hand-built components they replaced. See
"shadcn/ui" below. `src/styles/components.css` holds everything that isn't a
shadcn component: materials, the case-study islands, `.icon`, and the AI ring.

**Ship zero JavaScript from `.astro` files.** Never render `<Button>` or
`<Badge>` there. Use the exported class helper on a plain element instead:
`<a class={buttonVariants({ variant: 'secondary' })}>`, or
`<span data-slot="badge" class={badgeVariants()}>`. It's the same markup the
React component renders, and it keeps working inside Astro templates, which
can't pass a React element to a `render` prop. The React components are for
islands and Storybook. State lives with the caller, never in the vendored file:
the dismissible alert in `Alert.stories.tsx` holds its own `open` flag.

Built so far:

- **`Button`**: variants `default` / `secondary` / `outline` / `ghost`, sizes
  `default` / `icon-sm` (24px) / `icon` (40) / `icon-lg` (48). The icon sizes
  replace the old `IconButton`, with `aria-label` in place of its `label`
  prop. The old names map as follows:
  - Button primary / secondary / tertiary → `default` / `secondary` / `ghost`.
  - IconButton primary / secondary / tertiary → `default` / `outline` /
    `ghost`.
  - `ghost` differs by size, as tertiary did: a text button keeps a
    `--border-strong` edge; an icon button has none and a 4px radius.
  - `outline` has no visible edge. The old icon secondary declared one, but a
    later rule cancelled it and it shipped borderless. Solution.astro's
    disabled override is written around that.
- **`Badge`**: the old `Tag`, a non-interactive label.
  - `default` reads the semantic layer.
  - `coming-soon` and `ai` are bound to primitives instead: `coming-soon`
    because it's written for a cover image rather than the page ground, `ai`
    because its ring is decoration (see below).
  - `coming-soon`'s label is `--gray-900`. The old Tag used
    `--text-on-primary`, which flips to gray-50 on light and left the label at
    about 1:1.
- **`Alert`**: the old `Note`, with `AlertTitle`, `AlertDescription` and
  `AlertAction` (the dismiss slot).
  - Its default `role` is `note`, not shadcn's `alert`: every use is a static
    aside, not something that just went wrong.
  - The glossary popover's title and copy are `AlertTitle` and
    `AlertDescription`.
  - `NoteBox.astro` is a native `<details>` with its own scoped styles on the
    same tokens.
- **`Icon`**: the project's own component.

There is no Tabs component. The hand-built one was never used and was removed;
if tabs are ever needed, add shadcn's.

**`--ai-spectrum-1…4` is the one sanctioned exception to the two-hue palette**,
and it exists for a single component: the `ai` badge variant's border, a conic
gradient rotating once every four seconds around the chip on a work card. The
hues are decoration and nothing else — never text, never a fill, never a
surface anything has to be read against, which is why they carry no contrast
measurement while every semantic pairing does. What the chip *means* is carried
by its sparkles glyph and its fixed "AI" label, so it survives greyscale with
the ring switched off entirely. Stop 1 is `--amber-500`, so the sweep is led by
the system's own hue and the loop closes with no seam; the remaining three come
from the same unmodified Tailwind palette the amber ramp does. They are not
theme-aware and must not become so. The ring is `.badge-ai` in
`components.css`, plain CSS rather than utilities, and the variant just
applies it. The angle is a registered `@property` (`--badge-ai-angle`) because
an unregistered custom property has no type and would jump rather than
interpolate — the same reason `Solution.astro` registers its mask stop.

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
- **Never let state rest on colour alone.** The chapter rail's active entry
  changes weight (400 → 500, DM Mono's heaviest cut) as well as opacity, so it
  survives greyscale and colour blindness.
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
projects" dropdown. `drawer` followed, and then `button`, `badge` and `alert`
replaced the hand-built Button, IconButton, Tag and Note. New design-system
components come from shadcn first, retuned onto the tokens the same way.

- **A vendored component is retuned, not used stock.** shadcn's values
  (`h-8`, `text-sm`, `rounded-lg`, `hover:bg-primary/80`, `opacity-50` for
  disabled) are Tailwind's stock scale. Rewrite every variant and size against
  tokens.css, using `(--token)` utilities such as `bg-(--primary-hover)`,
  `size-(--spacing-6xl)` and `text-(length:--size-ui)`. Drop variants the
  palette has no token for, such as `destructive`. List every edit in the
  file's header comment so `shadcn diff` reads as intended.
- **Unlayered CSS beats every utility, whatever its specificity.** Tailwind's
  utilities live in `@layer utilities`, and `components.css`, `tokens.css`
  and Astro's scoped styles are unlayered.
  - That cuts one way on purpose: placement classes (`.lightbox__close`,
    `.video-frame__play`) and local overrides (`.bolt-proto__controls
    [data-slot='button']`, `.solution__controls button:disabled`) still win.
  - It cuts the other way by accident. A default a shadcn component has to
    override must sit in a layer, which is why `.icon`'s 1em lives in
    `@layer components`. Unlayered, it pinned every button and badge glyph at
    1em.
  - Check for this whenever a utility "doesn't apply".
- **`*Variants()` output must be conflict-free.** `.astro` callers use
  `buttonVariants()`/`badgeVariants()` directly, without `cn()`, so
  tailwind-merge never resolves two utilities that set the same property;
  stylesheet order would. Keep each property in exactly one place per
  variant/size pair. That's why `button.tsx` puts border colour in the
  variants and the icon sizes' radius in `compoundVariants`.
- **Storybook loads Tailwind too.** `.storybook/main.ts` registers
  `@tailwindcss/vite` and the `@` alias (Astro reads both from its own config
  and tsconfig, which Storybook doesn't), and `preview.tsx` imports
  `tailwind.css` between tokens and components, the same order the pages use.
  Preflight therefore applies in stories as it does on the site.

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
  (`src/components/ui/navigation-menu.tsx`, `button.tsx`), unlike this
  project's usual PascalCase files — that's deliberate, so `npx shadcn
  diff`/`update` still recognizes them as CLI-owned. macOS filenames ignore
  case, so `shadcn add button` overwrote the old `Button.tsx` in place.
  Remove a same-named PascalCase file before adding its shadcn namesake. They're still hand-edited where the
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
  dropdown; the Work link beside it has nowhere to open and stays a plain
  Astro-rendered anchor, untouched by any of this. Its popup is
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

Brand mark on the *left*; **Work** (`/#work`, the homepage's Selected works)
and the **Side projects** dropdown together on the *right* — `space-between`
across a `var(--nav-measure, var(--measure-chrome))` row: 1000px sitewide,
narrowed to `--measure-home` on the homepage, which sets `--nav-measure` on
`<body>` so the brand sits over the name (the footer's default variant reads
the same override). The brand is 40px tall and sits 16px from the top
(`--spacing-xl` of block padding), so the band is 72px (`--nav-height`).
The dropdown is `align="end"` because its trigger is the row's last item.
Resume moved out of the nav into the homepage bio. There is no About link;
nothing in the nav is ever a page of its own, so `SiteNav.astro` carries no
`aria-current` and no URL-reading frontmatter.

- **The nav is the same on every page, homepage included** (only its width
  differs, above).
- **The scrim** ramps in as the page's `data-nav-scrim` element reaches the
  band — the homepage's opening row (`HomeHero.astro`), about's frame. One
  marker per page; the old reel-only `data-nav-scrim-narrow` branch is
  gone.
- **The scrim band paints `var(--nav-band, var(--bg))`.** The homepage sets
  `--nav-band` to its `--home-ground` on `<body>`; everywhere else the band
  is `--bg`.
- **On the homepage the nav sits over the gradient blinds**, which are held
  back to 30% strength behind its 72px band (`NAV_DAMP`, `navClearance` in
  `gradient-blinds.ts`) so its 12px labels stay readable. If the nav's height
  changes, move `navClearance` with it.

- **On phones (below 40rem) Side projects opens a bottom sheet**, not the
  dropdown.
  - `NavMenu.tsx` always renders both the dropdown and a `DrawerTrigger`
    (`.nav-sheet__trigger`, which also wears `.nav-dropdown__trigger` so the
    two look identical). `SiteNav.astro` shows one or the other at 40rem, the
    footer's breakpoint. Server and client markup never disagree because
    there's no media query in React.
  - The sheet (`ui/drawer.tsx`, Base UI Drawer) slides up, follows the
    finger, and closes on a downward swipe, on backdrop tap, or on Escape.
    It carries a swipe handle, no close button, and no visible title — the
    trigger already reads "Side projects" right before the sheet opens, so a
    repeated heading added a row without adding information. `DrawerTitle`
    stays in the tree as `.sr-only`, since Base UI's Drawer uses it to give
    the sheet an accessible name.
  - Its content is one ≥48px row per project: `.type-nav-link` label, arrow
    icon, and an sr-only "(opens in new tab)". Rows dip to 60% opacity on
    press, with no tap flash and `touch-action: manipulation`.
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
nav now caps at `--measure-chrome` rather than `--measure-content` — see Site
nav — and the homepage caps at `--measure-home`; see Homepage). The two are the
same geometry; a bare `max-width: var(--measure-content)` with padding inside it
is **not**, and that is the trap. It was equivalent while the pages were
content-box, but Tailwind's preflight (`src/styles/tailwind.css`) makes
everything border-box, so the padding now eats a gutter off each side — the
homepage's card grid silently drifted 60px right of the nav and the footer's own
rule before this was caught. `Footer.astro`'s `.site-footer__inner` comment
carries the measurements.

## Homepage

`index.astro` is one column, from Figma's wireframe `20302:1154`: the name
and tagline, a four-paragraph bio, then Selected works. The wireframe is
Inter on white; it was taken as layout and content only and set in the
token system. The page scrolls like any other. (The 3D work ring, its
scroll-triggered intro, `home-reel.ts`, `work-ring.ts`, `decrypted-text.ts`
and `work-spotlight.ts` were removed with this redesign.)

- **The column** is `--measure-home` (37.5rem, 600px: the wireframe's 453px
  at 12px copy, scaled to the 16px body), gutter outside the cap. `.home`
  clears the nav with `--nav-height` + `--spacing-7xl` and spaces its three
  blocks `--spacing-5xl` apart (the Paper frame's 40px), with Selected works
  a further `--spacing-4xl` down (72px in all). The nav row and the footer narrow to the same
  column through `--nav-measure`.
- **The opening row** (`HomeHero.astro`, `<header data-nav-scrim>`): the
  name (`h1.type-heading`) and role (`.type-meta`, `--text-body` — muted
  grey measured 3.0:1 over the bands) on the left; the tagline
  (`.type-subtitle`, right-aligned, dropped `--spacing-4xl`) on the right:
  "Ships ▢▢▢▢▢▢▢ / *thoughtful* products / that drive results". Stacks
  below 40rem.
  - "thoughtful" is DM Serif Display 400 italic.
  - **The squares** are the last seven days of GitHub contributions for
    `Imdni8`, fetched live in the browser by `commit-strip.ts` from
    `github-contributions-api.jogruber.de` (GitHub's own calendar has no
    CORS). Server-rendered empty (outlined); each fills to its
    `--commit-1…4` level, 40ms apart. On failure or a 6s timeout they stay
    empty — an empty strip claims nothing. The strip is a link to GitHub
    whose sr-only text carries the total. Hover (fine pointers) or keyboard
    focus shows it in a CSS tooltip, "N contributions in last 7 days"
    (`.commit-strip__tip`, aria-hidden since the sr-only text says the
    same). It shows only once `commit-strip.ts` stamps `data-ready`, so a
    failed fetch shows no tooltip either.
- **The bio** (`HomeBio.astro`), four `.type-body` paragraphs, from the
  Paper frame "Portfolio components", 24px (`--spacing-3xl`) apart. The copy
  is one colour, `--text`. Every named thing has a **tile** in front of it —
  a 24px (`--spacing-3xl`) square at `--radius-xxs`, 8px before the word,
  centred on the x-height by `vertical-align: middle` (by the box, so a
  mark's intrinsic SVG height can't shift it), like an app icon beside its
  name. Tile and name plus any punctuation are one nowrap `.mark` run.
  Links carry a quiet `--border` underline, since colour no longer sets
  them apart.
  - **"[6] years"** opens to "[6] years, 6 months and 7 days", counted from
    1 April 2020 (`career.ts`'s `CAREER_START`). Computed at build so no-JS
    reads right, then recomputed in the browser. The number is printed on a
    `.calendar` tile (Google Calendar's app icon): the white tile
    (`--secondary`) with a `--primary` amber binding band, the number in
    `--text-on-secondary` (17.3:1). It leads its word, so the words start at
    "years". The number is 14px (`--size-fine`) and the tile is sized
    from it (`--size-fine / 0.56`, ~25px), the band its top 28%.
    **The number sits on the sentence's baseline** (measured equal to
    "years"' baseline), so the tile hangs round it like a glyph. That
    works because an `inline-block`'s baseline is its last line of text —
    so the tile must never become a clipping box (`overflow: hidden` moves
    the baseline to its bottom edge); the band is a background gradient,
    not a clipped child. `--spacing-xs` is pulled off each block margin so
    the line box sees ~17px of it: lines stay 27.2px apart (measured at
    1440, 375 and 320 wide).
  - **Paragraphs three and four are tiles alone**; each name slides out to
    the right of its tile, so the logo stays put. NID and the companies are
    `<button data-toggle>`s. The profile links (LinkedIn, GitHub, résumé)
    open on hover or keyboard focus only, because a tap just follows the
    link, and their underline is on the revealed name. The 8px gap belongs
    to `.reveal__name`, an inner span: padding on the clipped
    `.reveal__inner` would keep its width at 0fr.
  - All the toggles work the same way. A mouse opens them by hover (CSS,
    gated to fine pointers) and its click does nothing; a tap or Enter
    toggles `data-open`; leaving with the mouse closes. The width animates
    with `grid-template-columns: 0fr ↔ 1fr` (nothing measured), text
    arriving with the site's 4px blur. Screen readers always get the whole
    name from an sr-only copy, with the commas and "and" the visual drops;
    the moving parts are `aria-hidden`. Reduced motion: no width animation,
    a 120ms fade.
  - Astro trims whitespace at a line break before a component, so every
    word that runs into an inline element ends in an explicit `{' '}`.
  - **Marks** are the real files in `src/assets/homepage/`. Agent Studio
    is its gradient mark, bare. NID and Philips' shield carry their own
    white ground and fill a white tile. Medable (its square mark, the
    viewBox narrowed to 0 0 22 22) and J&J sit white on their brand grounds,
    `--brand-medable` and `--brand-jnj`: decoration only, like the footer
    mascot. The single-colour files are recoloured from white to
    `currentColor` at build.
  - Links: versioning and audit logs go to their case studies; LinkedIn,
    GitHub (the footer's SVGs) and the résumé are off-site.
- **Selected works** (`section#work`) opens with a divider: the heading
  "Selected work" in `.type-label` (`--text-body`), centred on a `--border`
  hairline drawn by `::before`/`::after` (so the heading's name is the
  label alone), 48px (`--spacing-6xl`) above the first card. Then the
  stacked `WorkCard` list, `priority` on the first card. `WorkCard`'s
  `sizes` is a hand-resolved mirror of `--measure-home`; move them
  together.
- **The entrance** is CSS: the opening row rises and fades, the bio and the
  work rise only (80ms apart) — the bio's copy and the first cover are the
  LCP candidates, and opacity 0 would delay them.
- **`WorkCard`** has no panel: a rounded cover (`--radius-md`, the Paper
  frame's 500×316, anchored to the top), with the role chips centred on its
  top edge, 16px in from the left, and under it the title and one facts row,
  8px apart, flush with the cover.
  - The chips are the `light` badge variant (`--secondary` fill,
    `--text-on-secondary`, 17.3:1), white over the Paper frame's dark chips.
    The AI chip keeps its ring and is filled the same white (`.badge-ai`
    paints `--secondary`), so the row reads as one set.
  - They are out of flow (`position: absolute` against `.card`, whose top is
    the cover's top) but first in the DOM, so the link's accessible name
    still reads them with the title ahead of the cover's alt text.
  - The facts row is industry and year (with their icons), 40px apart, set in
    `.type-label` (12px sans medium, `--text-body`). `.type-card-meta` is
    still the fine rung and now belongs to the homepage role line alone.
  - The card has no width of its own; the column sets it.
  - Cards lift 2px on hover (gated to mouse and trackpad) and press to
    `scale: 0.98` on `:active` for every input.
- **The footer** is a plain `<Footer />` after `<main>`.
- **The ground is `--home-ground`** (`#070709`, the Figma frame's), and
  `.home-ground` (fixed) holds the gradient blinds, held to
  `--blinds-host-opacity` (0.4) because the copy now sits inside the bands.
  See Gradient blinds.

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
  - Measured: ~5.1:1 on the homepage's `#070709` ground and 4.9:1 on a case study's
    `--bg`, both clear of AA for 12px text. Don't take it lower.
  - The about page's water field can brighten the ground past that. The page
    is parked, so re-check it when re-linking.

- **`position: relative` on `.site-footer` is load-bearing, not decorative.**
  On `index.astro` (`.home-ground`, the gradient blinds) and `about.astro`
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
  ends (`.site-footer__meta`, border-box pinned). The footer is 115px tall.
- **Width**: the default (`chrome`) variant caps at
  `var(--nav-measure, var(--measure-chrome))`, tracking the nav row —
  `--measure-home` on the homepage, 1000px elsewhere.
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
  of work it was, rendered as icon `Badge` chips at the top of the card's text
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
  gradient ring (`.badge-ai`, see Components). Writing AI as a `roles` entry
  instead gets you a chip that reads "AI" wearing the Figma mark and no ring;
  `philips-ultrasound-gig.mdx` did exactly that until it was converted.
- **Page content — only needed once a page actually builds:** `subtitle` (the
  standfirst; optional — the hero skips the line and meta tags fall back to
  the title), `facts` (max 4, the row under the title), `chapters` (the
  chapter rail — each `id` must match a `<Chapter id="…">` wrapper in the
  body), `heroShot` (a single full-bleed opener still), `actions` (hero
  CTAs).

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
relative path (`../../assets/work/<slug>/…`). `thumbnail` and `heroShot` are
independent images, not the same field reused — a `coming-soon` entry has
only a thumbnail, no `heroShot`.

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
  - **A `static` slide plays itself once the first time it scrolls into
    view, then falls back to a play button.** Stacked slides sit outside
    `[data-carousel-track]`, so `updateActive()` never sees them.
    `SlideVideo` renders a `.slide-video__play` button (the same
    `buttonVariants({ size: 'icon-lg' })` as `Video.astro`) as a *sibling* of the
    zoom trigger — a button inside a button is invalid — and
    `static-slide-video.ts` plays the clip, `loop` off, the first time an
    `IntersectionObserver` reports it visible (tracked per video in an
    `autoplayed` `WeakSet` so scrolling away and back doesn't replay it), and
    on every later press of the button. The button hides while the clip
    plays and reappears on pause or end, so a press always means "play
    again." Reduced motion skips the autoplay — the poster stands until the
    reader presses play, same as a carousel clip under reduced motion — and
    pauses on scroll-away or when the lightbox opens either way. Carousel
    slides hide that button and keep looping.
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
homepage used to run it too; it now runs gradient blinds, below) — one WebGL pass drawing a domain-warped fBm fluid, a grid that
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

## Gradient blinds

`src/components/ui/gradient-blinds.ts` is the homepage background: bands of
light across the top half of the screen, from Figma's `20205:22325`. It's a
port of React Bits' `GradientBlinds`, written in raw WebGL (one triangle, one
fragment shader, like `water-field.ts`) rather than taking on `ogl` or React.
`GradientBlinds.astro` mounts it on `astro:page-load` and tears down the
previous one; `GradientBlinds.tsx` and `src/stories/GradientBlinds.stories.tsx`
are the tuning surface. The tuned values are in the `BLINDS` constant.

- **Straight bands, top half only.** The original's angle and warp are gone.
  A vertical mask fades the bands out by `maskEnd` (0.9) of the height,
  each blind at its own jittered point, so the tails are ragged. The fade
  is squared, so the beams read as ending well before `maskEnd`: at 0.9
  they run behind the headline and die out around 74% of the height, just
  above the first card.
- **Colours** are `--blinds-1…7`, read from tokens.css at run time and
  sampled from `scratch/bg_color_inspo.jpg`. They're decoration only, the
  palette's second sanctioned exception.
- **The blend is the recipe.** `.gradient-blinds` (components.css) is
  `mix-blend-mode: hard-light` onto `--home-ground`. Above 0.5 a channel
  screens (light), below it multiplies (dark), and 0.5 is neutral.
  - The mask therefore fades to **0.5, not 0**. At 0 it would multiply the
    lower page to pure black.
- **No grain.** The original's noise was tried and removed. With nothing
  animated, the page only draws on mount, on resize, and while the
  spotlight is catching up.
- **The spotlight** is the original's: bright inside its radius, negative
  past it, so bands far from it sink to black. It follows a fine pointer
  with a 0.15s lag anywhere down to `TRACK_END` (74% of the height, just
  above the first card), its height scaled onto `[0, SPOT_Y_MAX]` (0.25) so
  it stays in the bands' bright upper part. Followed one to one, a pointer
  on the headline put it under the mask, where the negative falloff darkened
  every band. Below `TRACK_END` it stays where it was left. It rests at the
  top centre until a pointer arrives, and always under reduced motion.
- **Two opacities, two elements.** The canvas fades in to
  `--blinds-opacity` (0.8) once the host is `ready`. The host is held at
  `--blinds-host-opacity` (0.4, index.astro), because the name, tagline and
  bio all sit inside the bands. Without WebGL or JS there is no canvas and
  the ground stands.
- **Contrast is measured**, with Playwright. Hide the text, move the pointer
  over a 9×7 grid, screenshot, and take the 99th percentile of 6px-averaged
  cells under each text box, at 1728/1440/1024 wide. These numbers were
  taken with grain on and the spotlight free to reach 75% of the height;
  both changes since only lower the peaks, so they're upper bounds.
  - Single-column homepage, host at 0.4, worst case over the 9×7 sweep at
    1728/1440/1024: name ≥7.0:1, role ≥5.9:1 (the tight one — 12px mono;
    it was 3.0:1 in `--text-muted`, hence `--text-body`), tagline ≥8.0:1,
    bio copy ≥4.79:1 when it was `--text-muted` — it is `--text` now, so
    that is a floor, but don't lift the host past 0.4 — Selected works ≥9.3:1, nav links ≥6.5:1.
  - The nav was 1.7:1 when the spotlight sat behind it at full strength,
    so the bands are also held to 30% (`NAV_DAMP`) over the nav's 72px band.
  - Re-measure if `maskEnd`, the spotlight, `NAV_DAMP`,
    `--blinds-host-opacity` or any `--blinds-*` stop changes (hide the
    bio's tiles too, or they become the sampled peak), or if text
    near the top of the page changes colour.

The old background, **liquid metal** (`liquid-metal.ts`, Paper's
`LiquidMetal` shader, soft-lit onto `--liquid-metal-ground`), stays in the
library and its Storybook story, but no page renders it.

## Case-study ground

In dark theme a case study's `--bg` is `--home-ground` (`#070709`), not
`--gray-900`, so the reading pages share the homepage's black.
`CaseStudyLayout.astro` overrides `--bg` itself on `body`, under the same
dark-only conditions tokens.css uses, rather than just painting the
background. Everything that reads `--bg` follows: `ReadInDetail`'s curtain
wash fades to the ground it sits on, the nav scrim matches, and so do
`bg-background` badges and buttons in the content. `--bg-sunken` (`#090b0c`)
is still a shade lighter than the new ground, not darker, but the difference
is two or three levels per channel and doesn't read. Light theme and every
other page keep the global `--bg`.

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
  prop (`index.astro` passes it to the first card, the one cover near the
  first screen), and `CaseStudyHero`'s `heroShot` sets it directly.
- **`FontPreload.astro` is global chrome, like `Footer` and `Analytics`.**
  There is no shared root layout, so it is rendered in `index.astro`,
  `about.astro` and `CaseStudyLayout.astro` independently — a fourth top-level
  page needs it wired in there too, or that page's headline paints in a
  fallback serif and reflows. It preloads only the two `latin` faces that set
  visible text at the top of the page; the file explains why more would be
  worse. Every page, homepage included, preloads the same two (the
  homepage's old `home` variant went with its headline fonts).
  `<ClientRouter />` and `<Analytics />` sit *last* in each `<head>`
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
  `@fontsource-variable/dm-sans`, `@fontsource/dm-mono`. tokens.css imports
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
vanished (chapter rail, lightbox, etc. all disappear) rather than like a
build error. Fix: stop the dev server, `rm -rf
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
