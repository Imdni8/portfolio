# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Tousif Rahaman's personal portfolio site — case studies of design work.
Deployed at `https://tousifrahaman.com` (set as `site` in `astro.config.mjs`).

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
- **Type** — Playfair Display for voice, Inter for information, IBM Plex Mono for
  eyebrows. Ten styles, exposed as `.type-*` classes. The families meet at one
  size (30/38) and do different jobs there — `.type-heading` states a finding,
  `.type-reflection` is the author speaking.
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
reads the semantic layer, `coming-soon` is bound to the amber ramp instead
since it rides on a cover image, not the page ground).

**Glass** (`.glass` in `components.css`) is a material, not a component — the
backdrop-filter pane the nav and work cards are both cut from, so they read as
one surface split across the page. Anything wearing it needs `<GlassDefs />`
rendered once on the page (it defines the SVG refraction filter `.glass`
references) and something painted behind it to bend.

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
  (500 → 700) as well as hue, so it survives greyscale and colour blindness.
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
  `SiteNav.astro` renders it as a `client:load` island for just that one
  dropdown; the Work/About links beside it have nowhere to open and stay
  plain Astro-rendered anchors, untouched by any of this.
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

## Footer

`src/components/footer/Footer.astro` is global chrome, not a `ui/` design-system
component — zero-JS `.astro`, styled in its own scoped `<style>` block, same
pattern as `SiteNav.astro`. There is no shared root layout (`index.astro`,
`about.astro` and `CaseStudyLayout.astro` each own their own `<!doctype html>`
shell — see Stack), so it's imported and rendered just before `</body>` in all
three places independently; adding a fourth top-level page means wiring it in
there too.

Assets live in `src/assets/footer/`, imported via Vite's `?raw` suffix and
rendered with `set:html` — the same pattern the homepage uses for its client
logos, not through `src/components/ui/icons.ts` (that registry is scoped to
Lucide UI glyphs plus one vendored exception, not one-off brand marks).
`Instagram.svg`/`Github.svg`/`Linkedin.svg` were edited to `stroke="currentColor"`
(originally a hardcoded `#1E1E1E`, invisible against the dark ground) so they
can be styled — muted (`--text-muted`) at rest, full (`--text`) on hover/focus,
same resting→hover contrast as `.nav__link`. The mascot mark is deliberately
multi-colour and stays untouched.

The brand mark beside the name is the one asset the footer does *not* own — it
imports `src/assets/nav/logo.svg`, the same file `SiteNav.astro` renders, so
the mark at the bottom of the page cannot drift from the one at the top. Its
`fill` is `currentColor`, coloured with `--brand-mark` in both places (not
`--primary-text` — it is the logo). It is sized by height with `width: auto`,
since the glyph is 21×40 and not square. It replaced an India flag, whose
`India-circle.svg` is deleted.

It is an `<a href="/">`, not a span — the mark goes home from both ends of
the page, matching `.nav__brand`. That makes it interactive, so it takes an
`aria-label` (never `aria-hidden`, which would strip the accessible name off
a focusable element) and a `:focus-visible` ring. Its hover is `opacity`, not
a colour swap: `.site-footer__social` can go muted → full because it starts
on the semantic layer, but this one starts on the amber ramp and has nowhere
to move without leaving it.

Structure, top to bottom: the mascot mark, a full-width rule, then a row —
brand mark + name (left) · tagline (centre) · social links (right).

- **`position: relative` on `.site-footer` is load-bearing, not decorative.**
  On `index.astro`/`about.astro` the fixed `.site-field` water-field
  background (`position: fixed`, `z-index: auto`) paints *after* static
  in-flow content per the CSS stacking spec, regardless of DOM order — so
  without this the footer lays out correctly but is invisible, hidden under
  that layer. Same fix `.hero-intro`/`.work` already use for the same reason.
- **`margin-block-start: 75px` is a literal, not a token** — deliberate, per
  spec; it doesn't land on `--spacing-7xl` (64px) or `--spacing-8xl` (80px).
- **The mascot mark** is sized with `aspect-ratio: 123 / 96` (the source
  viewBox) rather than a fixed width, so the rest and hover poses can share
  one box at identical scale. `transform: translate(132px, 12px)` on
  `.site-footer__brand` does two independent things — worth knowing if either
  needs retuning:
  - **Y (12px)** drops the torso rectangle's own bottom edge (y=78 of the
    96-tall viewBox) onto the rule, so the mark reads as standing on it with
    its legs dangling past the line — not the whole viewBox's empty bottom
    margin floating above it.
  - **X (132px)** shifts the mark right so it sits above the word "together"
    in the tagline below, instead of centred on the row. It's a fixed pixel
    value tuned against the tagline's measured position at the design's
    reference desktop width (`--measure-page`, 1470px); it will drift
    slightly at narrower-than-full-bleed desktop widths, before the row
    collapses to a stacked column at the 40rem breakpoint, where the
    alignment intent no longer applies anyway.
- **Hover animation**: `Tousif&clawd-hover.svg` (arms and legs raised) sits
  absolutely-positioned directly on top of the resting `Tousif&clawd.svg`,
  both sharing the same 123×96 viewBox so they line up without any extra
  maths. `:hover` on the `.site-footer__brand` wrapper cross-fades between
  them via `opacity` + `transition: 250ms ease-in-out` — pure CSS, so both
  mouseenter and mouseleave animate for free with no JS. Guarded by
  `prefers-reduced-motion`, same as `.site-footer__social`'s hover transition.
- **The tagline** ("Designed *solo* · Developed *together*") reuses
  `.type-meta` with a local `color: var(--primary-text)` override — the
  shared style itself carries no colour, since its other use (`WorkCard`
  meta) sits on a card, not the page ground. The italic on "solo"/"together"
  needs the real IBM Plex Mono italic face, which is why `tokens.css` now
  also imports `500.css` and `500-italic.css` for that family (previously
  only `700.css` was loaded) — this incidentally also fixed `.type-meta`'s
  pre-existing sitewide use, which was silently falling back to the system
  monospace font before.

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
  `industry`, `technology` (one primary tool/stack label), `year` — these
  three render together, in that order, as the card's meta line, e.g.
  "Clinical trials · Figma · 2026". `thumbnail` (`{ src, alt }`, the card's
  cover image), `order` (sort key — leave gaps of 10, e.g. 10/20/30, so a new
  card can be inserted without renumbering the rest). `roles` is metadata too
  — max 2 entries, each `{ kind: 'design-type' | 'code', label }` — what kind
  of work it was, rendered as icon `Tag` chips overlapping the cover, on every
  status including `coming-soon` (over its "Coming soon" scrim). `kind` picks
  the icon (`design-type` → Figma mark, `code` → angle brackets); `label` is
  free text, so a new design-type value (e.g. "Design concepts") is a
  content-only edit. Every entry needs a `design-type` role (enforced by the
  schema, on every status); `code` is optional.
- **Page content — only needed once a page actually builds:** `subtitle` (the
  standfirst; required unless `status` is `coming-soon`), `facts` (max 4, the
  hero's right rail), `chapters` (chapter nav — each `id` must match a
  `Section`'s `chapter` prop), `hero` (the full-bleed before/after opener —
  genuinely optional; omit it to skip the compare), `actions` (hero CTAs).

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
`Term`). This kit — along with `CaseStudyLayout`/`CaseStudyHero` and
`agent-versioning.mdx` — is current and documented here, not prior work to
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
`storyHeading` (family, weight and colour for the two heading rungs). Sizes
stay at the call site, since they differ by rung.

Its type is four rungs, and none of them is a `.type-*` class — the cut was
specced independently of the design system's scale, and the nearest Tailwind
step is what each one landed on:

| Role | Spec | Tailwind |
| --- | --- | --- |
| Section/chapter heading (`StorySection`, `Solution`, `StoryChapter`) | Playfair semibold 30/40 | `text-3xl leading-10` + `storyHeading` |
| Blockquote highlight | Inter medium 24/32 | `text-2xl leading-8 font-medium text-foreground` |
| Slide/block title (`SlideText`, `StoryBlock`) | Playfair semibold 18/24 | `text-lg leading-6` + `storyHeading` |
| Running copy | Inter regular 16/24, `#EAEAEA` | `text-base leading-6 text-body` |

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
`font-['Inter_Variable']`: the quoted form compiles to a single-family
declaration and throws away the fallback stack, dropping the whole column to
Times whenever the webfont is slow or blocked.

Every one of those sizes and leadings *is* expressible in tokens, which is
worth knowing before anyone concludes the cut needs new ones: `--lh-subtitle`
(1.333) yields 40px against `--size-heading`, 32px against `--size-subtitle`
and 24px against `--size-body`, and 16/24 is `--size-ui`/`--lh-ui` exactly.
The one real difference is that the token sizes clamp and Tailwind's don't, so
the token version is fluid below ~937px where Tailwind's is fixed. `#EAEAEA`
is within a shade of `--text-body` (`gray-200`, `#e3e7e8`). What tokens.css
genuinely lacks is a *named* `.type-*` style for Inter-regular-16/24 —
`.type-ui-label` and `.type-nav-link` sit on that size at semibold and medium.

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
- **`StorySeam` is the rule between the cut and the curtain.** Both case
  studies used to carry a hand-written copy of it, colour literal and all.
  Its `py-20` stacks with the preceding section's own and with
  `.read-more`'s padding — ~288px before the CTA, which is the shipped
  spacing; change it once, there.
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
  `--measure-page`.** Hero, sections, carousel and the read-more seam all
  read it; the footer stays at `--measure-page`, so the story reads as a
  column inside the page rather than as the page itself. `CaseStudyHero`'s
  `compareSizes` is a hand-resolved mirror of that formula (`sizes` cannot
  see custom properties) — if the measure moves, move that string too.

**A closing tag (`</Section>` etc.) must be flush left — never indented.**
If a `<Section>`'s content ends with a numbered/bulleted list, an indented
closing tag (even by a few spaces) reads to CommonMark as a continuation of
the last list item rather than JSX, so the element never closes. The MDX→JS
compiler then cascades into invalid output, and the failure that surfaces —
a `RolldownError` with a garbled destructure line concatenating attribute
names and values into one giant identifier — points nowhere near the real
line. If a case study throws `RolldownError` after an edit, check for
indented closing tags right after a list before looking anywhere else.

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
- **Fonts** — self-hosted via `@fontsource*` packages (Inter Variable, Playfair
  Display Variable, IBM Plex Mono). Likely to change with the new type scale.
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

**Never run `npm run build` (or a bare `astro build`/`astro check`) while
`npm run dev` is also running against this working tree.** A build
re-optimizes Vite's on-disk dependency cache (`node_modules/.vite`), which
desyncs from the running dev server's in-memory module graph. Symptom: every
React island throws `TypeError: _jsxDEV is not a function` on hydration —
the page still server-renders fine, so it looks like content silently
vanished (before/after compare, chapter rail, lightbox, etc. all disappear)
rather than like a build error. Fix: stop the dev server, `rm -rf
node_modules/.vite`, restart `npm run dev`. If a build is genuinely needed
mid-session, stop the dev server first and restart it after.

**Beware browser dark-mode extensions when reviewing colour.** Dark Reader and
similar rewrite every background with `!important`, including inline styles, so
a story can look wrong while the tokens are correct. If a colour looks off,
check the *computed* value of the custom property before assuming a bug — the
extension leaves `--darkreader-*` properties on the element as a giveaway.

## Repo notes

- Git is initialised but has **no commits yet** — nothing is tracked.
- `agent versioning/`, `audit/`, `bolt/` and `design_system/` hold design source
  (PDFs, Figma exports, standalone HTML). They are gitignored and excluded from
  `tsconfig.json` — they are reference material, never built.
- `README.md` is gitignored. It documents the prior case-study kit in detail;
  read it for background on what exists, not as a spec for what to build.
- `public/media/` is for video, served as-is and never bundled. Images that
  should be optimised at build time go in `src/assets/`.
