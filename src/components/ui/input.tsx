import * as React from "react"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={`${className}`}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"
