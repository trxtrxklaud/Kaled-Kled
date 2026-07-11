import * as React from "react"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = "", ...props }, ref) => (
    <div
      ref={ref}
      className={`card ${className}`}
      {...props}
    />
  )
)
Card.displayName = "Card"

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className = "", ...props }, ref) => (
    <div
      ref={ref}
      className={`flex flex-col space-y-1.5 mb-4 ${className}`}
      {...props}
    />
  )
)
CardHeader.displayName = "CardHeader"

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export const CardTitle = React.forwardRef<HTMLParagraphElement, CardTitleProps>(
  ({ className = "", ...props }, ref) => (
    <h3
      ref={ref}
      className={`text-xl font-bold leading-none tracking-tight ${className}`}
      {...props}
    />
  )
)
CardTitle.displayName = "CardTitle"

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className = "", ...props }, ref) => (
    <p
      ref={ref}
      className={`text-sm text-text-secondary ${className}`}
      {...props}
    />
  )
)
CardDescription.displayName = "CardDescription"

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className = "", ...props }, ref) => (
    <div ref={ref} className={`${className}`} {...props} />
  )
)
CardContent.displayName = "CardContent"

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className = "", ...props }, ref) => (
    <div
      ref={ref}
      className={`flex items-center mt-4 pt-4 border-t border-border ${className}`}
      {...props}
    />
  )
)
CardFooter.displayName = "CardFooter"
