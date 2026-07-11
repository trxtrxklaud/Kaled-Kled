import * as React from "react"

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className = "", variant = "default", ...props }, ref) => {
    const variants = {
      default: "badge-info",
      secondary: "badge-warning",
      destructive: "badge-danger",
      outline: "border border-border",
      success: "badge-success",
      warning: "badge-warning",
      info: "badge-info"
    }

    return (
      <div
        ref={ref}
        className={`badge ${variants[variant]} ${className}`}
        {...props}
      />
    )
  }
)
Badge.displayName = "Badge"
