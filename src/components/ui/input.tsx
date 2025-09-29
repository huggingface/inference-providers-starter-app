"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "h-7 w-full border-none bg-transparent px-0 text-[13px] text-white placeholder:text-white/35 focus:outline-none focus:ring-0",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
