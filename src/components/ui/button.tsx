import * as React from "react"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "success"
  size?: "default" | "sm" | "lg" | "icon"
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", ...props }, ref) => {
    const variants = {
      default: "btn btn-primary",
      destructive: "btn btn-danger",
      outline: "btn btn-outline",
      secondary: "btn btn-secondary",
      ghost: "btn btn-ghost",
      success: "btn btn-success",
      link: "text-primary underline-offset-4 hover:underline",
    }

    const sizes = {
      default: "",
      sm: "h-9 px-3 text-xs",
      lg: "h-11 px-8 text-base",
      icon: "h-10 w-10 p-0 flex items-center justify-center",
    }

    const base = "inline-flex items-center justify-center whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"
