import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border/[0.45] bg-surface-muted/[0.45] px-2.5 py-1 text-[11px] font-medium uppercase text-muted",
        className
      )}
      {...props}
    />
  );
}
