import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Frontmatter carries only what the index page and the page chrome need. The
 * shape of the story itself lives in the MDX body, so no two case studies have
 * to be built the same way.
 */
const note = z.object({ x: z.number(), y: z.number(), text: z.string() });

const work = defineCollection({
	loader: glob({ base: './src/content/work', pattern: '**/*.mdx' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			dek: z.string(),
			/** meta description + card blurb; falls back to the dek */
			summary: z.string().optional(),
			company: z.string().optional(),
			year: z.number().optional(),
			/** lower sorts first on the home page */
			order: z.number().default(50),
			draft: z.boolean().default(false),
			/** builds a page, but keeps it off the home page — for layout variations */
			unlisted: z.boolean().default(false),

			/** hero side facts — label/value pairs, so each study can list its own */
			meta: z.array(z.object({ label: z.string(), value: z.string() })).default([]),

			actions: z
				.array(
					z.object({
						label: z.string(),
						href: z.string(),
						variant: z.enum(['primary', 'secondary']).default('secondary'),
						icon: z.enum(['play', 'down']).optional(),
					}),
				)
				.default([]),

			/** steps in the sticky rail; omit for a study that reads straight through */
			sections: z.array(z.object({ id: z.string(), label: z.string() })).default([]),

			/** where the opener sits: above the lede, or below it (the default) */
			heroLayout: z.enum(['lede-first', 'showcase-first']).default('lede-first'),

			/** optional drag-to-compare opener */
			hero: z
				.object({
					before: image(),
					after: image(),
					beforeAlt: z.string(),
					afterAlt: z.string(),
					beforeLabel: z.string().default('Before'),
					afterLabel: z.string().default('After'),
					/** numbered callouts, revealed once the drag commits to that end.
					    x/y place the pin as a percentage of the frame. */
					beforeNotes: z.array(note).default([]),
					afterNotes: z.array(note).default([]),
				})
				.optional(),

			card: image().optional(),
		}),
});

export const collections = { work };
