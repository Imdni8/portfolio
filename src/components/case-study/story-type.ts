/**
 * The copy column's type, shared by every text block in the case-study cut —
 * StorySection's prose and StoryBlock's. It lives here rather than in either
 * component because the string is long enough that a second copy would drift
 * on the first edit, and the two columns have to set identical type or the
 * 30-second cut and the long form stop reading as one document.
 *
 * Tailwind utilities, but against tokens.css rather than Tailwind's stock
 * palette: every colour below goes through the `@theme inline` bridge in
 * src/styles/tailwind.css, so `text-foreground` resolves to --text and flips
 * with the theme. The stock steps this used to carry (neutral-200, white,
 * neutral-800) are dark-only literals and rendered the whole cut at ~1.1:1 on
 * the light ground. Same rungs, same sizes — Inter 16/24 for running copy,
 * Inter medium 24/32 for the blockquote claim — sourced correctly.
 *
 * The family goes through `font-[family-name:var(--font-sans)]`, not
 * `font-['Inter_Variable']`: the latter compiles to a single-family
 * declaration and throws away the ui-sans-serif/system-ui fallbacks
 * tokens.css defines, so a blocked or still-loading webfont drops the whole
 * column to Times. See tailwind.css's closing comment.
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
	'space-y-6 font-[family-name:var(--font-sans)] text-base leading-6 text-body',
	// border-foreground, not border-border: this bar is an accent set against
	// the copy, not a structural edge. --border is --gray-700 on the dark
	// ground, which would render it as a hairline.
	'[&>blockquote]:border-l-2 [&>blockquote]:border-foreground [&>blockquote]:pl-6',
	'[&>blockquote]:text-2xl [&>blockquote]:leading-8 [&>blockquote]:font-medium [&>blockquote]:text-foreground',
	'[&>blockquote>p]:m-0',
	'[&_ol]:list-decimal [&_ul]:list-disc [&_ol]:pl-6 [&_ul]:pl-6',
	'[&_li+li]:mt-2 [&_li]:marker:text-muted-foreground',
	'[&_strong]:font-semibold [&_strong]:text-foreground',
].join(' ');

/**
 * The heading rung shared by StorySection, Solution and StoryChapter (30/40
 * Playfair semibold), and by StoryBlock/SlideText one step down (18/24). Kept
 * beside the prose string for the same reason that one exists: four files set
 * this type, and four copies drift.
 */
export const storyHeading = 'font-[family-name:var(--font-display)] font-semibold text-foreground';
