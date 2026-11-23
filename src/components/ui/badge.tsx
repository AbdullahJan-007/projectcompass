import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-0.5 text-[12px] leading-[1.2] font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-brand-tint text-brand-primary-hover border border-brand-primary/20",
        neutral: "bg-bg-subtle text-text-secondary border border-border-default",
        amber: "bg-accent-amber-tint text-status-warning-text border border-accent-amber/20",
        success:
          "bg-status-success-tint text-status-success-text border border-status-success/20",
        warning:
          "bg-status-warning-tint text-status-warning-text border border-status-warning/20",
        error: "bg-status-error-tint text-status-error-text border border-status-error/20",
        info: "bg-status-info-tint text-status-info-text border border-status-info/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
