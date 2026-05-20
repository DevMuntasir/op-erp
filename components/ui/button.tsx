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
  const frontByVariant = {
    default: "bg-black text-white rounded-lg font-bold transform hover:-translate-y-1 transition duration-400",
    outline: "bg-white text-zinc-900 border border-zinc-300 hover:bg-zinc-50",
    secondary: "bg-zinc-700 text-white hover:bg-zinc-600",
    ghost: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
    destructive: "bg-rose-600 text-white hover:bg-rose-700",
    link: "bg-transparent text-brand underline-offset-4 hover:underline",
  } as const

  const currentVariant = variant ?? "default"

  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      <span
        className={cn(
          "relative flex items-center justify-center rounded-md",
          "px-8 py-2 text-sm font-semibold",
          frontByVariant[currentVariant],
          "transition-all duration-200 ease-out",
          "group-hover/button:-translate-y-0.5 group-active/button:translate-y-0 group-active/button:scale-[0.98]",
          size === "xs" && "px-3 py-1 text-xs",
          size === "sm" && "px-4 py-2 text-sm",
          size === "default" && "px-6 py-2 text-sm",
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
