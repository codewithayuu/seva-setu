import * as React from "react"
import { cn } from "@/lib/utils"
const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-lg glass-input px-4 py-3 text-base shadow-sm transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm hover:shadow-md resize-none",
        className
      )}
      ref={ref}
      {...props} />
  );
})
Textarea.displayName = "Textarea"
export { Textarea }