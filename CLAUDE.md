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
  with the "Side projects" links and the site's own `.glass` material.
  `SiteNav.astro` renders it as a `client:load` island for just that one
  dropdown; the Work/About links beside it have nowhere to open and stay
  plain Astro-rendered anchors, untouched by any of this.
- **`gsap` was removed** as part of this migration — it was only ever used by
  the nav dropdown's hand-rolled hover/open GSAP logic (`nav-dropdown.ts`,
  now deleted), which Base UI's own open/close and focus handling replaced.

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
