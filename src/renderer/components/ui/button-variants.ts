import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg border text-sm font-medium transition-all duration-150 ease-hyper focus-visible:outline-none focus-visible:shadow-focus disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "hm-accent-gradient border-white/[0.08] text-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_8px_18px_rgb(47_35_120/0.22)] hover:brightness-110",
        secondary:
          "border-white/[0.1] bg-foreground/[0.06] text-foreground hover:border-white/[0.16] hover:bg-foreground/[0.09]",
        ghost:
          "border-transparent bg-transparent text-muted hover:border-white/[0.1] hover:bg-foreground/[0.06] hover:text-foreground"
      },
      size: {
        sm: "h-8 px-3",
        md: "h-9 px-3.5",
        lg: "h-10 px-4 text-[15px]"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "md"
    }
  }
);
