import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center overflow-visible border-none bg-transparent p-0 text-sm font-medium whitespace-nowrap outline-none transition-all select-none focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "",
        outline: "",
        secondary: "",
        ghost: "",
        destructive: "",
        link: "",
      },
      size: {
        default: "min-w-[120px]",
        xs: "min-w-[80px]",
        sm: "min-w-[100px]",
        lg: "min-w-[140px]",
        icon: "size-8",
        "icon-xs": "size-6",
        "icon-sm": "size-7",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  children,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {/* Shadow */}
      <span
        className={cn(
          "absolute inset-0 rounded-lg bg-black/60 blur-[2px] will-change-transform translate-y-[2px] transition-transform duration-[600ms]",
          "[transition-timing-function:cubic-bezier(0.3,0.7,0.4,1)]",
          "group-hover/button:translate-y-[4px]",
          "group-active/button:translate-y-[1px]"
        )}
      />

      {/* Edge */}
      <span
        className={cn(
          "absolute inset-0 rounded-lg",
          "bg-[linear-gradient(to_right,hsl(0_0%_8%)_0%,hsl(0_0%_14%)_8%,hsl(0_0%_8%)_92%,hsl(0_0%_4%)_100%)]"
        )}
      />

      {/* Front */}
      <span
        className={cn(
          "relative flex items-center justify-center rounded-lg",
          "bg-black px-8 py-4",
          "font-semibold uppercase tracking-[1.5px] text-white",
          "transform -translate-y-1",
          "transition-transform duration-[600ms]",
          "[transition-timing-function:cubic-bezier(0.3,0.7,0.4,1)]",
          "group-hover/button:-translate-y-[6px]",
          "group-active/button:-translate-y-[2px]",
          "group-hover/button:brightness-110",
          size === "xs" && "px-3 py-1 text-xs",
          size === "sm" && "px-4 py-2 text-sm",
          size === "default" && "px-6 py-3 text-base",
          size === "lg" && "px-8 py-4 text-lg",
          size?.includes("icon") && "p-0 size-full"
        )}
      >
        {children}
      </span>
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
