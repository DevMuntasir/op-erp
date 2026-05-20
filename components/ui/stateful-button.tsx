import * as React from "react"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

type StatefulButtonState = "idle" | "loading" | "success" | "error"

interface StatefulButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  state?: StatefulButtonState
  idleText: string
  loadingText?: string
  successText?: string
  errorText?: string
  idleIcon?: React.ReactNode
  loadingIcon?: React.ReactNode
  successIcon?: React.ReactNode
  errorIcon?: React.ReactNode
}

export function StatefulButton({
  className,
  state = "idle",
  idleText,
  loadingText = "Processing...",
  successText = "Done",
  errorText = "Try again",
  idleIcon,
  loadingIcon,
  successIcon,
  errorIcon,
  disabled,
  ...props
}: StatefulButtonProps) {
  const text =
    state === "loading"
      ? loadingText
      : state === "success"
      ? successText
      : state === "error"
      ? errorText
      : idleText
  const icon =
    state === "loading"
      ? loadingIcon ?? <Loader2 className="size-4 animate-spin" />
      : state === "success"
      ? successIcon ?? "✓"
      : state === "error"
      ? errorIcon ?? "!"
      : idleIcon

  return (
    <button
      className={cn(
        "group relative inline-flex h-12 w-full items-center justify-center overflow-hidden rounded-xl",
        "bg-primary text-primary-foreground shadow-sm transition-all duration-300",
        "hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
      disabled={disabled || state === "loading"}
      {...props}
    >
      <span
        className={cn(
          "absolute inset-0 bg-primary-foreground/10 transition-transform duration-500",
          state === "loading" ? "translate-x-0" : "-translate-x-full group-hover:translate-x-0"
        )}
      />
      <span className="relative z-10 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest">
        {icon}
        {text}
      </span>
    </button>
  )
}
