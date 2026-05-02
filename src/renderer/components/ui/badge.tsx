import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border border-[rgb(var(--hm-linear-border))] bg-[rgb(var(--hm-linear-control))] px-2 py-0.5 text-[11px] font-medium text-muted",
        className
      )}
      {...props}
    />
  );
}
