import * as React from "react";
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-[6px] bg-bg-subtle border border-border-default/60", className)}
      {...props}
    />
  );
}

export { Skeleton };
