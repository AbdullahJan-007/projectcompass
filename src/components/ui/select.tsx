import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className={cn("relative w-full", className)}>
        <select
          ref={ref}
          className="block h-10 w-full appearance-none truncate rounded-[8px] border border-border-strong bg-bg-surface pl-3 pr-9 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
          strokeWidth={1.75}
        />
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
