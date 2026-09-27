import { defineCollection } from 'astro:content';
import { z } from 'zod';
import { glob } from 'astro/loaders';

/**
 * Frontmatter carries metadata only — the things the layout needs before it
 * knows anything about the story: what to put in the hero, what the chapter
 * rail should list, what `status` the entry is in.
 *
 * How the piece is actually built lives in the body. A schema that tried to
 * describe structure would have to grow a field every time a case study
 * wanted a shape it hadn't seen before.
 *
 * One file is the whole case study: this frontmatter plus the MDX body is
 * everything both the homepage card and the case-study page read from. See
 * "Case studies" in CLAUDE.md for the authoring workflow, or run
 * `/new-case-study` to scaffold one.
 */
const work = defineCollection({
	loader: glob({ pattern: '**/*.mdx', base: './src/content/work' }),
	schema: ({ image }) =>
		z
			.object({
				title: z.string(),

				/** Homepage card metadata — the fields the list needs, independent
				 *  of whether a page has been written yet. Required even for a
				 *  `coming-soon` entry, since the card still has to render. The card
				 *  shows `industry` and `year` as its two meta rows; `technology` is
				 *  still recorded but no longer rendered anywhere. */
				industry: z.string(),
				technology: z.string(),
				year: z.number().int(),
				thumbnail: z.object({ src: image(), alt: z.string() }),

				/** What kind of work this was — shown as icon chips at the top of
				 *  the card's text panel, on every status including `coming-soon`.
				 *  `kind` picks the icon (`design-type` → the
				 *  Figma mark, `code` → the angle-bracket icon); `label` is free
				 *  text, so a new design-type value (e.g. "Design concepts") is a
				 *  content-only edit — nothing in the schema or WorkCard.astro has
				 *  to change for it. A `design-type` entry is mandatory (enforced
				 *  below); `code` is optional. */
				roles: z
					.array(
						z.object({
							kind: z.enum(['design-type', 'code']),
							label: z.string(),
						}),
					)
					.max(2)
					.default([]),

				/** Whether this project shipped a notable AI feature — rendered as
				 *  a fixed "AI" tag chip in the same row as `roles`, always the first
				 *  (leftmost) chip when present. Kept separate from `roles` above
				 *  rather than added as a third `kind`: this tag's label is fixed
				 *  ("AI"), not freeform, and it isn't subject to the
				 *  `roles.max(2)` cap. */
				aiFeature: z.boolean().default(false),

				/** Explicit sort key for the homepage grid. Convention: leave gaps
				 *  of 10 (10, 20, 30…) so a new card can be inserted between two
				 *  existing ones without renumbering the rest. */
				order: z.number(),

				/** `published` builds the page and lists it on the homepage.
				 *  `coming-soon` lists the card (unclickable) with no page built —
				 *  everything below `order` is unused and can be omitted, `roles`
				 *  excepted (still required — see above).
				 *  `unlisted` builds the page but keeps it off the homepage.
				 *  `external` lists the card linking straight to `externalUrl`
				 *  instead of a local page — no page is built, same as
				 *  `coming-soon`, but the card is clickable, since this is real,
				 *  viewable work rather than something nobody can look at yet. */
				status: z.enum(['published', 'coming-soon', 'unlisted', 'external']).default('published'),

				/** Where an `external` card sends the visitor. Required only for
				 *  that status — every other status ignores it. */
				externalUrl: z.url().optional(),

				/** The standfirst under the title. One sentence, states the
				 *  outcome. Optional — a case study whose hero speaks for itself
				 *  (e.g. one built around a chapter nav rather than a lede) can
				 *  omit it and CaseStudyHero simply skips the line. */
				subtitle: z.string().optional(),

				/** Hero rail: label/value pairs. Rendered right-aligned on desktop,
				 *  as a divided strip under the subtitle on mobile. */
				facts: z
					.array(z.object({ label: z.string(), value: z.string() }))
					.max(4)
					.default([]),

				/** Chapter nav: a sticky rail linking to top-level sections of the
				 *  body, active entry tracked by scroll position. Each `id` must
				 *  match a `<Chapter id="...">` wrapper in the MDX body (see
				 *  Chapter.astro). Omit or leave empty to skip the rail entirely —
				 *  most case studies have no use for it. */
				chapters: z
					.array(z.object({ id: z.string(), label: z.string() }))
					.default([]),

				/** Full-bleed opener shot. Omit to skip it. Separate from
				 *  `thumbnail` above — this is for the in-page opener, not the card. */
				heroShot: z.object({ src: image(), alt: z.string() }).optional(),

				/** Hero actions. `video` scrolls to the outcome film, `read` to the body. */
				actions: z
					.object({
						primary: z.object({ label: z.string(), href: z.string() }).optional(),
						secondary: z.object({ label: z.string(), href: z.string() }).optional(),
					})
					.default({}),
			})
			.refine((data) => data.status !== 'external' || Boolean(data.externalUrl), {
				message: 'externalUrl is required when status is "external"',
				path: ['externalUrl'],
			})
			.refine((data) => data.roles.some((role) => role.kind === 'design-type'), {
				message: 'roles must include a "design-type" entry',
				path: ['roles'],
			}),
});

export const collections = { work };
