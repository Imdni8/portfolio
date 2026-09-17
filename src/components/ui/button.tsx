// Vendored from shadcn's base-nova registry (`npx shadcn add button`) and
// retuned onto tokens.css. It replaces the hand-built Button and IconButton:
// one component, with `size="icon*"` standing in for IconButton. Re-check
// these edits against upstream on `shadcn diff button`:
//   - `cn` comes from @/lib/utils, not the standalone `cn` package the CLI
//     installs (uninstalled again).
//   - Every variant and size is rewritten against the semantic layer. The
//     registry's values (h-8, text-sm, rounded-lg, hover:bg-primary/80) are
//     Tailwind's stock scale, not this system's. The old components' look is
//     kept exactly:
//       Button primary / secondary / tertiary → default / secondary / ghost
//       IconButton primary / secondary / tertiary → default / outline / ghost
//       IconButton sm / md / lg → icon-sm (24px) / icon (40) / icon-lg (48)
//     IconButton's secondary is `outline`, not `secondary`. It sits on media
//     or a lightbox, so it reads against --bg rather than the near-white
//     --secondary fill. It has no visible edge; see the variant.
//     `ghost` differs by size, as tertiary always did: a text button keeps a
//     --border-strong edge; an icon button has no edge and a 4px radius,
//     since it sits inline in flowing content.
//   - `destructive` and `link` are gone (the palette has no destructive
//     token, and a link is an <a>), and so are the text sizes xs/sm/lg and
//     `icon-xs`. The system has one text-button size.
//   - Disabled drops to an outline (--text-disabled on a --border edge), not
//     shadcn's opacity-50. A greyed-out solid reads as a loading state. It
//     also keeps the pointer (cursor: not-allowed) rather than dropping it.
//   - Focus is a 2px --focus-ring outline 2px out, not shadcn's border swap
//     and ring. Swapping a border reflows the label by a pixel, which reads
//     as a jitter when tabbing along a row.
//   - No `active:translate-y-px` press nudge; primary darkens on press.
//   - Typography: the button rung (sans 500, --size-ui / --lh-ui), the same
//     values `.type-ui-label` carries.
//   - Icons are the project's `.icon` spans (Icon.tsx / Icon.astro), not bare
//     SVGs, so the `[&_svg]` sizing rules became `[&_.icon]`. That override
//     only works because `.icon`'s 1em default sits in `@layer components`
//     (components.css). An unlayered rule beats every utility.
//   - No `select-none`: the registry's base classes carry it, but this
//     component also renders the site's plain-text CTA links (a resume link,
//     a hero button), and the old `.btn` never blocked selecting their label.
//   - The colour/border transition eases on `--ease-out`, not the registry's
//     bare `ease`, and every `hover:` utility is paired with the project's
//     `hover-fine:` variant (tailwind.css) so it only answers to a pointer
//     that can really hover, both per tokens.css's Motion section.
//   - The ghost/icon-size hover fill is `.btn-ghost-icon-hover` in
//     components.css, not a `hover:bg-[color-mix(...)]` utility: Tailwind
//     adds an *unguarded* pre-`@supports` fallback for any arbitrary value
//     containing `color-mix()`, and here that fallback resolves to a fully
//     opaque `--primary-text` — a louder hover than intended for the
//     handful of browsers without `color-mix` support. Plain CSS just drops
//     the declaration there, same as the old `.icon-btn--tertiary:hover`.
//   - `className` is resolved against Base UI's own button state before
//     merging with the variant classes, not handed to `cn()` as-is: Base UI
//     types `className` as `string | ((state) => string)` (see
//     ButtonPrimitive.State), and `cn`/`clsx` silently drop a function value,
//     so a caller passing the function form previously lost its classes with
//     no error.
//   - Every icon size still defaults to `variant="default"` (filled), not a
//     quiet one: the two current callers that omit `variant` on an icon size
//     (Video.astro, SlideVideo.astro's play buttons) want exactly that,
//     matching the old `.icon-btn--primary` those buttons wore. Unlike the
//     old IconButton, there's no separate quiet default here — every other
//     call site sets `variant` explicitly regardless, so a future icon
//     button should too rather than relying on this one.
//
// From an .astro file, use `buttonVariants()` on a plain <a> or <button>
// instead of rendering <Button>. It's the same classes and ships no
// JavaScript. That path skips `cn`, so no two classes below may set the same
// property for one variant/size pair: tailwind-merge isn't there to pick a
// winner, and stylesheet order would. That is why border colour and the
// icon sizes' radius live in the variants and compounds, never in the base.
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const ICON_SIZES = ["icon-sm", "icon", "icon-lg"] as const

const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center border font-(family-name:--font-sans) text-(length:--size-ui) leading-(--lh-ui) font-(--weight-medium) whitespace-nowrap no-underline transition-[background-color,color,border-color] duration-120 ease-(--ease-out) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:border-border disabled:bg-transparent disabled:text-(--text-disabled) aria-disabled:cursor-not-allowed aria-disabled:border-border aria-disabled:bg-transparent aria-disabled:text-(--text-disabled) motion-reduce:transition-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover-fine:hover:bg-(--primary-hover) active:bg-(--primary-active)",
        // White on both grounds. On light, the fill is 1.11:1 against the page
        // and the border 1.12:1, so the label is what identifies it there.
        // --secondary in tokens.css explains the white.
        secondary:
          "border-(--secondary-border) bg-secondary text-secondary-foreground hover-fine:hover:bg-(--secondary-hover)",
        // The neutral, page-ground button. For icon sizes, which is its only
        // use so far, it has no visible edge. The old IconButton declared a
        // --border-strong one, but a later rule cancelled it, so it always
        // shipped borderless. Solution.astro's disabled override is written
        // around that.
        outline:
          "border-transparent bg-background text-foreground hover-fine:hover:bg-card",
        // Edge, radius and hover depend on size; see compoundVariants.
        ghost: "bg-transparent text-(--primary-text)",
      },
      size: {
        default:
          "gap-(--spacing-md) rounded-(--radius-md) px-(--spacing-xl) py-(--spacing-lg) [&_.icon]:size-[1.125em]",
        "icon-sm": "size-(--spacing-3xl) [&_.icon]:size-[0.875rem]",
        // Glyph interpolated between icon-sm (24px box / 14px glyph) and
        // icon-lg (48 / 26), so it grows with the box.
        icon: "size-(--spacing-5xl) [&_.icon]:size-[1.375rem]",
        "icon-lg": "size-(--spacing-6xl) [&_.icon]:size-[1.625rem]",
      },
    },
    compoundVariants: [
      // Icon buttons that float over media are circles.
      {
        variant: ["default", "secondary", "outline"],
        size: [...ICON_SIZES],
        class: "rounded-(--radius-full)",
      },
      {
        variant: "ghost",
        size: "default",
        class:
          "border-(--border-strong) hover-fine:hover:border-(--primary-text) hover-fine:hover:bg-(--primary-subtle)",
      },
      {
        variant: "ghost",
        size: [...ICON_SIZES],
        // The hover fill itself is `.btn-ghost-icon-hover` in components.css,
        // not a utility — see the header comment.
        class:
          "btn-ghost-icon-hover rounded-(--radius-xs) border-transparent hover-fine:hover:text-foreground",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      // A function, not `cn(buttonVariants({ ..., className }))`: className
      // can itself be a function of the button's state (Base UI's own
      // render-prop convention), and resolving it here — the same way Base
      // UI's own internals would — is what lets both forms reach `cn`
      // as a plain string instead of one silently vanishing into it.
      className={(state: ButtonPrimitive.State) =>
        cn(
          buttonVariants({ variant, size }),
          typeof className === "function" ? className(state) : className
        )
      }
      {...props}
    />
  )
}

export { Button, buttonVariants }
