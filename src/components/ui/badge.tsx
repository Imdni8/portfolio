// Vendored from shadcn's base-nova registry (`npx shadcn add badge`) and
// retuned onto tokens.css. It replaces the hand-built Tag. Re-check these
// edits against upstream on `shadcn diff badge`:
//   - `cn` comes from @/lib/utils, not the standalone `cn` package the CLI
//     installs (uninstalled again).
//   - The variants are Tag's, not shadcn's: `default`, `coming-soon` and
//     `ai`. shadcn's set (a primary-filled chip, destructive, link…) has no
//     use here, and the palette has no destructive token.
//   - Type is the 10px tag rung in DM Mono: uppercase, tracked open. No
//     `.type-*` class carries that rung, so it's set from the tokens directly.
//   - No focus or hover styles. A badge labels its container; it is never the
//     thing you act on, so it's never focusable or interactive.
//   - Icons are the project's `.icon` spans, not bare SVGs. They're pinned
//     at 12px (--size-micro): at the tag's own 10px, a 2px Lucide stroke
//     starts closing up its counters.
//
// From an .astro file, use `badgeVariants()` on a plain <span data-slot="badge">
// instead of rendering <Badge>. Same classes, and no React on the server path.
//
// The text stays --text rather than --text-muted, unlike the other mono
// labels. A work card that isn't lit sits at --card-dimmed-opacity
// (WorkCard.astro), and --text-muted under that lands near 3.4:1 on the
// dark ground.
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center gap-(--spacing-xs) rounded-(--radius-sm) border py-(--spacing-xs) ps-(--spacing-xs) pe-(--spacing-sm) font-(family-name:--font-mono) text-(length:--size-tag) leading-(--lh-tag) font-(--weight-regular) tracking-(--track-tag) whitespace-nowrap uppercase [&_.icon]:size-(--size-micro)",
  {
    variants: {
      variant: {
        // Opaque fill and its own edge: a badge sits on a card's text panel
        // or a cover image, never the bare page, and has to stay legible over
        // whatever is behind it.
        default: "border-border bg-background text-foreground",
        // Bound to the primitives, not the semantic layer, so it's identical
        // in both themes: it's drawn for a cover image, and the image is its
        // ground, not the page. gray-900 on amber-50 is 15.86:1. (The old Tag
        // took --text-on-primary, which flips to gray-50 on light and left
        // the label at about 1:1.) It's the only badge with an hourglass, so
        // the state survives greyscale.
        "coming-soon":
          "border-(--amber-200) bg-(--amber-50) text-(--gray-900)",
        // The rotating spectrum ring. Its border, padding and background are
        // `.badge-ai` in components.css; that section explains why it's plain
        // CSS. No `bg-background` here: `.badge-ai`'s own background-image
        // already paints the padding-box opaque with --bg, unlayered, so a
        // second declaration of the same colour here would only be a second
        // place for it to go stale against the first. The label keeps the
        // default badge's contrast: --text on --bg.
        ai: "badge-ai text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
