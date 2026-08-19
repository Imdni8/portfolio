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
