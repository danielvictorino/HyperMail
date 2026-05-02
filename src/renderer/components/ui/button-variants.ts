import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg border text-sm font-medium transition-all duration-150 ease-hyper focus-visible:outline-none focus-visible:shadow-focus disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "border-accent/[0.65] bg-accent text-background shadow-[inset_0_1px_0_rgb(255_255_255/0.22)] hover:brightness-110",
        secondary:
          "border-border/[0.45] bg-surface-muted/[0.48] text-foreground hover:border-border/70 hover:bg-surface-muted/70",
        ghost:
          "border-transparent bg-transparent text-muted hover:border-border/[0.45] hover:bg-surface-muted/[0.45] hover:text-foreground"
      },
      size: {
        sm: "h-9 px-3.5",
        md: "h-11 px-4.5",
        lg: "h-12 px-5 text-[15px]"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "md"
    }
  }
);
