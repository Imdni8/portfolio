import { defineCollection } from 'astro:content';
import { z } from 'zod';
import { glob } from 'astro/loaders';

/**
 * Frontmatter carries metadata only — the things the layout needs before it
 * knows anything about the story: what to put in the hero, what the chapter
 * rail should list, whether to show the page at all.
 *
 * How the piece is actually built lives in the body. A schema that tried to
 * describe structure would have to grow a field every time a case study
 * wanted a shape it hadn't seen before.
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
		z.object({
			title: z.string(),
			/** The standfirst under the title. One sentence, states the outcome. */
			dek: z.string(),

			/** Hero rail: label/value pairs. Rendered right-aligned on desktop,
			 *  as a divided strip under the dek on mobile. */
			facts: z
				.array(z.object({ label: z.string(), value: z.string() }))
				.max(4)
				.default([]),

			/** Chapter nav. `id` must match a Section's `chapter` prop. Omit the
			 *  whole field and the rail is not rendered. */
			chapters: z.array(z.object({ id: z.string(), label: z.string() })).default([]),

			/** Full-bleed before/after opener. Omit to skip it. */
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

			/** Builds the page but keeps it off the index. */
			unlisted: z.boolean().default(false),
		}),
});

export const collections = { work };
