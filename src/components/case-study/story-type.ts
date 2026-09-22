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
 * the light ground.
 *
 * Sizes and leadings reach tokens.css directly, as arbitrary values
 * (`text-[length:var(--size-body)]`), rather than through Tailwind's stock
 * steps. The cut was first specced on its own fixed rungs
 * (30/40, 24/32, 18/24, 16/24); reading the type scale instead means it moves
 * when the scale does — body copy at --size-body/--lh-body, the blockquote
 * claim at the subtitle rung, the same one Section's pull-quote uses.
 *
 * The family goes through `font-[family-name:var(--font-sans)]`, not
 * `font-['DM_Sans_Variable']`: the latter compiles to a single-family
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
 *   its own type instead of being promoted to the claim rung.
 * - Lists step with `[&_li+li]:mt-2`, not `space-y-*`. `space-y` compiles to a
 *   `& > :not(:last-child)` selector, and nesting that inside an arbitrary
 *   variant like `[&_ol]:` produces a descendant chain that does not match the
 *   list items — an adjacent-sibling margin is what actually works here.
 * - `<strong>` reads at `--weight-semibold` (600), not `font-medium` (500):
 *   inline emphasis has to read as heavier than the surrounding body copy at
 *   a glance, and 500 sits too close to DM Sans's own 400 body weight to do
 *   that. It's the one place this project reaches for that token — see
 *   tokens.css's type-primitives comment.
 */
export const storyProse = [
	'space-y-6 font-[family-name:var(--font-sans)] text-[length:var(--size-body)] leading-[var(--lh-body)] text-body',
	// border-foreground, not border-border: this bar is an accent set against
	// the copy, not a structural edge. --border is --gray-700 on the dark
	// ground, which would render it as a hairline.
	'[&>blockquote]:border-l-2 [&>blockquote]:border-foreground [&>blockquote]:pl-6',
	'[&>blockquote]:text-[length:var(--size-subtitle)] [&>blockquote]:leading-[var(--lh-subtitle)] [&>blockquote]:font-medium [&>blockquote]:text-foreground',
	'[&>blockquote>p]:m-0',
	'[&_ol]:list-decimal [&_ul]:list-disc [&_ol]:pl-6 [&_ul]:pl-6',
	'[&_li+li]:mt-2 [&_li]:marker:text-muted-foreground',
	'[&_strong]:font-(--weight-semibold) [&_strong]:text-foreground',
].join(' ');

/**
 * The serif shared by StorySection, Solution and StoryChapter (on the heading
 * rung) and by StoryBlock/SlideText (one step down, on the subtitle rung) —
 * family, weight, tracking and colour; sizes stay at the call site. Regular
 * weight, because DM Serif Display is drawn at 400 alone and anything heavier
 * would be a synthesised bold. Kept beside the prose string for the same
 * reason that one exists: five files set this type, and five copies drift.
 */
export const storyHeading =
	'font-[family-name:var(--font-display)] font-normal tracking-[var(--track-tight)] text-foreground';

