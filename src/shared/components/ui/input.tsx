import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/shared/lib/utils"

function Input({
  className,
  size = "default",
  type,
  ...props
}: Omit<React.ComponentProps<"input">, "size"> & {
  size?: "xs" | "sm" | "default" | "lg" | "xl"
}) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "w-full min-w-0 rounded-lg border border-input bg-background px-2.5 py-1 transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        size === "default" && "h-10 text-base md:text-sm",
        size === "sm" && "h-8 text-sm",
        size === "xs" && "h-7 text-xs",
        size === "lg" && "h-12 text-base",
        size === "xl" && "h-14 text-lg",
        className
      )}
      {...props}
    />
  )
}

export { Input }
