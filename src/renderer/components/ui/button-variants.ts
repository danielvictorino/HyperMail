import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center rounded border text-sm font-medium transition-all duration-150 ease-hyper focus-visible:outline-none focus-visible:shadow-focus disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "border-accent/45 bg-accent text-foreground shadow-[0_1px_0.5px_rgb(0_0_0/0.15)] hover:bg-accent/90",
        secondary:
          "border-[rgb(var(--hm-linear-border))] bg-[rgb(var(--hm-linear-control))] text-foreground shadow-[0_1px_0.5px_rgb(0_0_0/0.15)] hover:bg-[rgb(var(--hm-linear-surface))]",
        ghost:
          "border-transparent bg-transparent text-muted hover:border-[rgb(var(--hm-linear-border))] hover:bg-[rgb(133_134_152/0.12)] hover:text-foreground"
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-9 px-3.5 text-[13px]",
        lg: "h-10 px-4 text-[14px]"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "md"
    }
  }
);
