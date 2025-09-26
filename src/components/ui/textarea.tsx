"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-[120px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white shadow-inner placeholder:text-white/40 focus:border-[#ffb100] focus:outline-none focus:ring-2 focus:ring-[#ffb100]/70",
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";
