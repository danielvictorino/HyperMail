import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-white/[0.1] bg-foreground/[0.045] px-2.5 py-1 text-[11px] font-medium text-muted",
        className
      )}
      {...props}
    />
  );
}
