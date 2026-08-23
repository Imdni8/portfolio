# New Case Study

Scaffold a new case study: one MDX file in `src/content/work/` plus its asset
folder in `src/assets/work/`, following the schema in `src/content.config.ts`.
The "Case studies" section of this repo's `CLAUDE.md` is the field reference
this command is built from — re-read it first if it's been a while, in case
the schema has moved on since this command was written.

## Usage

```
/new-case-study <slug> "<Title>"
```

- `slug`: kebab-case, becomes the filename (`src/content/work/<slug>.mdx`)
  and the `/work/<slug>` URL
- `Title`: the case study's title, quoted if it has spaces

Both are optional — ask for them conversationally if omitted.

## Steps

1. **Ask whether this is a `coming-soon` stub or a case study being published
   now.** A stub only needs card metadata; a full entry needs the page-content
   fields and a body too.

2. **Gather the card metadata** — required either way:
   - `industry`, `technology` (one primary tool/stack label), `year` — these
     three render together, in that order, as the card's meta line, e.g.
     "Clinical trials · Figma · 2026"
   - `order`: read the other files in `src/content/work/` to find the current
     highest value and continue the sequence in steps of 10 (or slot a value
     between two existing entries if the user wants a specific position)
   - `roles` (max 2, each `{ kind: 'design-type' | 'code', label }`): what
     kind of work this was, not what it's about. Ask for the `design-type`
     label — it's mandatory on every entry regardless of status (e.g.
     "Redesign", "Design concepts", "New feature" — free text, not a fixed
     list). Then ask if a `code` role applies too (optional; e.g.
     "Contributed code"). Shown as icon chips overlapping the cover on every
     status, including `coming-soon`.

3. **Thumbnail.** Ask if a real cover image already exists for this case
   study. Create `src/assets/work/<slug>/` either way. If no real image
   exists yet, tell the user you'll add a placeholder (do not fabricate a
   convincing-looking screenshot) and generate a simple solid-fill PNG at
   `src/assets/work/<slug>/00-thumbnail-placeholder.png` — a neutral fill
   close to `--gray-700` (`#394447`) reads as an intentional placeholder
   rather than a broken image. Reference whichever file exists as `thumbnail`
   in the frontmatter, with a real `alt`.

4. **If `coming-soon`:** write `title`, `industry`, `technology`, `year`,
   `thumbnail`, `order`, `roles` (the mandatory `design-type` entry from step
   2), `status: coming-soon`. No body, no other fields — that's the whole
   file. Stop here.

5. **If publishing now**, additionally gather:
   - `subtitle` — one sentence, states the outcome
   - `facts` (optional, max 4 label/value pairs)
   - `chapters` (optional, `id`/`label` pairs — each `id` must match a
     `Section`'s `chapter` prop used in the body)
   - `hero` (optional full-bleed before/after opener — if the user wants one,
     you'll need before/after images, alts, and optionally numbered
     `beforeNotes`/`afterNotes` with `x`/`y` as percentages of the frame)
   - `actions` (optional hero CTAs)

   Scaffold the MDX body from `src/components/case-study/*` (`Section`,
   `Figure`, `FigureRow`, `NoteBox`, `VideoFigure`, `Reflection`, `Term`),
   using `src/content/work/agent-versioning.mdx` as the reference shape: one
   `<Section chapter="...">` per chapter entry, each with an `eyebrow`,
   `heading`, and a `slot="visual"` `<Figure>`/`<FigureRow>`/`<VideoFigure>`,
   closing with a top-level `<Reflection>`.

6. **Run `npm run check`** and resolve anything it flags — most commonly a
   missing required field, given `subtitle` is conditionally required by the
   schema's refine (needed whenever `status` isn't `coming-soon`).

7. **If this was a `coming-soon` stub**, remind the user: once the real case
   study is written, flip `status` to `published` (or delete the line — it's
   the default), fill in the page-content fields, and write the body.

Nothing needs to change in `src/pages/index.astro` or
`src/pages/work/[...slug].astro` — both derive from the collection
automatically.
