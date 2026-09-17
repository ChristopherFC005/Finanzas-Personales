import { SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "focus-ring h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";
