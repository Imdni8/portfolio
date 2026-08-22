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
/** A numbered callout pinned to a hero shot. `x`/`y` are percentages of the
 *  frame, not of the source image — the two differ whenever a shot's aspect
 *  ratio does not match the frame and `object-fit: cover` crops it. Shared by
 *  beforeNotes/afterNotes below so the two can't drift into different shapes. */
const noteSchema = z.object({
	x: z.number().min(0).max(100),
	y: z.number().min(0).max(100),
	text: z.string(),
});

const work = defineCollection({
	loader: glob({ pattern: '**/*.mdx', base: './src/content/work' }),
	schema: ({ image }) =>
		z
			.object({
				title: z.string(),

				/** Homepage card metadata — the fields the grid needs, independent
				 *  of whether a page has been written yet. Required even for a
				 *  `coming-soon` entry, since the card still has to render. Together
				 *  they're the whole card meta line: "industry · technology · year". */
				industry: z.string(),
				technology: z.string(),
				year: z.number().int(),
				thumbnail: z.object({ src: image(), alt: z.string() }),

				/** What kind of work this was — shown as icon chips overlapping the
				 *  card's cover. Optional and empty by default; always hidden on a
				 *  `coming-soon` card, since claiming a role in work nobody can see
				 *  yet doesn't make sense — the cover's own "Coming soon" scrim
				 *  carries that message instead. */
				roles: z.array(z.enum(['redesign', 'contributed-code'])).max(2).default([]),

				/** Explicit sort key for the homepage grid. Convention: leave gaps
				 *  of 10 (10, 20, 30…) so a new card can be inserted between two
				 *  existing ones without renumbering the rest. */
				order: z.number(),

				/** `published` builds the page and lists it on the homepage.
				 *  `coming-soon` lists the card (unclickable) with no page built —
				 *  everything below `order` is unused and can be omitted.
				 *  `unlisted` builds the page but keeps it off the homepage. */
				status: z.enum(['published', 'coming-soon', 'unlisted']).default('published'),

				/** The standfirst under the title. One sentence, states the
				 *  outcome. Required once a page actually builds (`published` or
				 *  `unlisted`) — optional for `coming-soon`. */
				subtitle: z.string().optional(),

				/** Hero rail: label/value pairs. Rendered right-aligned on desktop,
				 *  as a divided strip under the subtitle on mobile. */
				facts: z
					.array(z.object({ label: z.string(), value: z.string() }))
					.max(4)
					.default([]),

				/** Chapter nav. `id` must match a Section's `chapter` prop. Omit the
				 *  whole field and the rail is not rendered. */
				chapters: z.array(z.object({ id: z.string(), label: z.string() })).default([]),

				/** Full-bleed before/after opener. Omit to skip it. Separate from
				 *  `thumbnail` above — this is for the in-page opener, not the card. */
				hero: z
					.object({
						before: image(),
						after: image(),
						beforeAlt: z.string(),
						afterAlt: z.string(),

						/** Drag-handle labels. Default to "Before"/"After" — set these
						 *  when the pair being compared wants its own vocabulary
						 *  (e.g. "Draft"/"Published"). */
						beforeLabel: z.string().optional(),
						afterLabel: z.string().optional(),

						/** Numbered callouts, revealed as the drag commits to a side. */
						beforeNotes: z.array(noteSchema).default([]),
						afterNotes: z.array(noteSchema).default([]),
					})
					.optional(),

				/** Hero actions. `video` scrolls to the outcome film, `read` to the body. */
				actions: z
					.object({
						primary: z.object({ label: z.string(), href: z.string() }).optional(),
						secondary: z.object({ label: z.string(), href: z.string() }).optional(),
					})
					.default({}),
			})
			.refine((data) => data.status === 'coming-soon' || Boolean(data.subtitle), {
				message: 'subtitle is required once a page is built (status is "published" or "unlisted")',
				path: ['subtitle'],
			}),
});

export const collections = { work };
