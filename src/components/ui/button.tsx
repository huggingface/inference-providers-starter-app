"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const baseStyles =
  "inline-flex items-center justify-center rounded-full text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 h-10 px-4";

const variants = {
  default:
    "bg-[#ffb100] text-[#1c1c1c] hover:bg-[#ff9d00] focus-visible:ring-[#ffb100]",
  subtle:
    "bg-[#1c1c1c] text-white hover:bg-[#2a2a2a] focus-visible:ring-[#ffb100]",
  ghost:
    "bg-transparent text-white hover:bg-white/10 focus-visible:ring-[#ffb100]",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], className)}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
