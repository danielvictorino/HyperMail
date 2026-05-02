import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg border text-sm font-medium transition-all duration-150 ease-hyper focus-visible:outline-none focus-visible:shadow-focus disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "border-accent/60 bg-accent text-slate-950 hover:brightness-110",
        secondary: "border-white/10 bg-white/5 text-foreground hover:bg-white/10",
        ghost:
          "border-transparent bg-transparent text-muted hover:border-white/10 hover:bg-white/5 hover:text-foreground"
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
