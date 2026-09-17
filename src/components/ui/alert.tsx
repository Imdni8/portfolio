// Vendored from shadcn's base-nova registry (`npx shadcn add alert`) and
// retuned onto tokens.css. It replaces the hand-built Note. Re-check these
// edits against upstream on `shadcn diff alert`:
//   - `cn` comes from @/lib/utils, not the standalone `cn` package the CLI
//     installs (uninstalled again).
//   - The default role is `note`, not `alert`. `alert` is an assertive live
//     region, for something that just went wrong. Every use here is a static
//     aside to the main flow, which is what `note` means. Pass
//     `role="alert"` for a real one.
//   - One variant, the Note's surface: flat --primary-subtle behind a
//     --primary-text edge. shadcn's `destructive` has no token here. The
//     fill is flat, not the amber gradient in the Figma frame: a fill that
//     runs from near-black to amber-500 has no text colour that survives both
//     ends (light text is 14.42:1 at the top and 2.07:1 at the bottom).
//   - Capped at 34rem, the Note's measure (right for a tooltip), and not
//     `w-full`: a fixed or inset caller sizes it from its own edges.
//   - Title and description take `.type-overline` and `.type-annotation`,
//     which the type scale names for exactly these uses ("eyebrows and note
//     titles", "note/tooltip copy"), instead of shadcn's text-sm. The title
//     is amber from .type-overline; the description is --text-body, since
//     note copy is meant to be read, not skimmed like a caption.
//   - No leading-icon layout (`has-[>svg]:grid-cols-…`) and no link styling.
//     The Note never had either; add them back against `.icon` if one's
//     wanted.
//   - AlertAction is placed on the spacing scale, and the title makes room
//     for it only when one is present, so a long title never runs under it.
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const alertVariants = cva(
  "group/alert relative grid max-w-[34rem] gap-(--spacing-xs) rounded-(--radius-md) border px-(--spacing-xl) py-(--spacing-lg) text-left",
  {
    variants: {
      variant: {
        default: "border-(--primary-text) bg-(--primary-subtle) text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="note"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "type-overline group-has-data-[slot=alert-action]/alert:pe-(--spacing-3xl)",
        className
      )}
      {...props}
    />
  )
}

// A div, not a p: callers hand it block-level content, so the copy can arrive
// as paragraphs. They take the type style from here, and the gap spaces them.
// case-study/NoteBox.astro's `.note-box__body` hand-copies this treatment
// (zero JS from .astro means it can't render this component) — re-check it
// too whenever this class list changes.
function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "type-annotation grid gap-(--spacing-md) text-body [&_p]:m-0",
        className
      )}
      {...props}
    />
  )
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn(
        "absolute top-(--spacing-md) right-(--spacing-md) flex",
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, AlertAction }
