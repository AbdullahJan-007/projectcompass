import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[6px] text-center text-sm font-medium leading-snug transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-brand-primary text-bg-surface hover:bg-brand-primary-hover shadow-[0_1px_2px_rgba(15,23,42,0.08)]",
        secondary:
          "bg-bg-subtle text-text-primary border border-border-default hover:bg-border-default/60",
        outline:
          "border border-border-strong bg-bg-surface text-text-primary hover:bg-bg-subtle",
        ghost:
          "text-text-secondary hover:bg-bg-subtle hover:text-text-primary",
        destructive:
          "bg-status-error text-bg-surface hover:opacity-90",
      },
      size: {
        default: "min-h-10 px-4 py-2",
        sm: "min-h-8 px-3 py-1.5 text-xs",
        lg: "min-h-11 px-6 py-2.5 text-base",
        icon: "h-9 w-9 shrink-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
