import * as React from "react"
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils"
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-sm hover:shadow-md hover:scale-105",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-purple-500/30 hover:shadow-purple-500/50",
        secondary:
          "border-white/30 glass-card text-foreground hover:bg-white/80 dark:hover:bg-white/15",
        destructive:
          "border-transparent bg-gradient-to-r from-red-500 to-red-600 text-white shadow-red-500/30 hover:shadow-red-500/50",
        outline: "border-2 border-current text-foreground hover:bg-foreground/5",
        success:
          "border-transparent bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-green-500/30 hover:shadow-green-500/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)
function Badge({
  className,
  variant,
  ...props
}) {
  return (<div className={cn(badgeVariants({ variant }), className)} {...props} />);
}
export { Badge, badgeVariants }