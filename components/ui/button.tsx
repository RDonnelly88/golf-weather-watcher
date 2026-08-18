import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "focus-ring inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-foreground hover:brightness-110",
        destructive:
          "bg-destructive text-destructive-foreground hover:brightness-110",
        outline:
          "border border-border bg-surface hover:border-border-strong hover:bg-surface-2",
        secondary:
          "bg-secondary text-secondary-foreground hover:brightness-105",
        ghost: "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
        link: "text-accent underline-offset-4 hover:underline",
      },
      // Heights match the inputs and selects, so a button beside the date
      // picker lines up with it. Set here and never at a use site.
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        // A bare <button> inside a <form> submits it, which is almost never
        // what a control inside a form is for. Anything that really submits
        // says so.
        type={asChild ? type : (type ?? "button")}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
