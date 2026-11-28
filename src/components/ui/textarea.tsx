import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[96px] w-full rounded-lg border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-sm text-[#0F172A] shadow-[0_1px_2px_rgba(15,23,42,0.03)] placeholder:text-[#94A3B8] transition-all duration-150 hover:border-[#94A3B8] focus-visible:border-[#3F72AF] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#3F72AF]/15 disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:opacity-60",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
