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

Built so far: `Button` (primary / secondary / ghost), `Tabs`, `Note`.

Two conventions worth keeping:

- **Never let state rest on colour alone.** The active tab changes weight
  (500 → 700) as well as hue, so it survives greyscale and colour blindness.
- **Disabled drops to an outline**, not a dimmed fill — a greyed-out solid
  reads as a loading state.

`--secondary` is the one place `#ffffff` appears. The no-pure-white rule governs
*content* colour; this is a control surface, so white is written as a literal in
the semantic layer rather than added to the grey ramp, where it would invite use
as a text or page colour. It is also deliberately not redefined per theme — the
button is white on both grounds. On light that leaves the label doing the
identifying: the fill is 1.11:1 against `bg` and the `gray-200` border 1.12:1.
Raising `--secondary-border` to `--gray-500` would carry the edge at 4.14:1 if
that is ever wanted.

The rest of `src/` (the case-study component kit, the agent-versioning MDX) is
**prior work to disregard** unless the user points at it. Don't treat it as the
pattern to follow or extend.

## Stack

- **Astro 7** — static output, no adapter, no server.
- **React 19** islands via `@astrojs/react` — hydrated components only where
  interaction is needed; everything else is `.astro` and ships zero JS.
- **MDX** via `@astrojs/mdx` — long-form content in `src/content/`, typed by a
  content collection schema in `src/content.config.ts`.
- **Plain CSS** — custom properties in `src/styles/`. No Tailwind, no CSS-in-JS.
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
