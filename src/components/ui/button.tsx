import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-center text-sm font-semibold leading-snug transition-all duration-150 ease-out active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3F72AF]/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-[#16375F] to-[#112D4E] text-white hover:from-[#112D4E] hover:to-[#0A1D36] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_1px_3px_rgba(17,45,78,0.22)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_12px_rgba(17,45,78,0.24)]",
        secondary:
          "bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0] hover:bg-[#E2E8F0]/80 hover:border-[#CBD5E1]",
        outline:
          "border border-[#CBD5E1] bg-white text-[#112D4E] shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:bg-[#F8FAFC] hover:border-[#3F72AF]/60",
        ghost:
          "text-[#475569] hover:bg-[#F1F5F9] hover:text-[#112D4E]",
        destructive:
          "bg-gradient-to-b from-[#C62828] to-[#BA1A1A] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_1px_2px_rgba(186,26,26,0.2)] hover:brightness-95",
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
