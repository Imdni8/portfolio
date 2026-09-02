/**
 * The copy column's type, shared by every text block in the case-study cut —
 * StorySection's prose and StoryBlock's. It lives here rather than in either
 * component because the string is long enough that a second copy would drift
 * on the first edit, and the two columns have to set identical type or the
 * 30-second cut and the long form stop reading as one document.
 *
 * Tailwind utilities against Tailwind's stock palette, deliberately not
 * tokens.css — the scoped exception documented under "the 30-second cut" in
 * CLAUDE.md's case-studies section. The rungs are: Inter 16/24 in
 * neutral-200 (#e5e5e5, the nearest stock step to the spec's #EAEAEA) for
 * running copy, Inter medium 24/32 in white for the blockquote claim.
 *
 * Tailwind scans .ts files in src/, so the candidates here are picked up the
 * same as if they were written inline in the template.
 */

/**
 * Blockquote, strong and list treatment for a column of MDX-authored copy.
 *
 * Two things to know before editing:
 *
 * - The blockquote rules use `>` rather than a descendant combinator, so a
 *   blockquote nested inside a component in the column (a NoteBox, say) keeps
 *   its own type instead of being promoted to the 24/32 claim rung.
 * - Lists step with `[&_li+li]:mt-2`, not `space-y-*`. `space-y` compiles to a
 *   `& > :not(:last-child)` selector, and nesting that inside an arbitrary
 *   variant like `[&_ol]:` produces a descendant chain that does not match the
 *   list items — an adjacent-sibling margin is what actually works here.
 */
export const storyProse = [
	"space-y-6 font-['Inter_Variable'] text-base leading-6 text-neutral-200",
	'[&>blockquote]:border-l-2 [&>blockquote]:border-white [&>blockquote]:pl-6',
	'[&>blockquote]:text-2xl [&>blockquote]:leading-8 [&>blockquote]:font-medium [&>blockquote]:text-white',
	'[&>blockquote>p]:m-0',
	'[&_ol]:list-decimal [&_ul]:list-disc [&_ol]:pl-6 [&_ul]:pl-6',
	'[&_li+li]:mt-2 [&_li]:marker:text-neutral-400',
	'[&_strong]:font-semibold [&_strong]:text-white',
].join(' ');
