import * as React from "react"

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  onValueChange?: (value: string) => void
  defaultValue?: string
}

export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className = "", value, onValueChange, defaultValue, children, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue || value || "")
    const currentValue = value !== undefined ? value : internalValue

    const handleValueChange = (newValue: string) => {
      if (value === undefined) setInternalValue(newValue)
      onValueChange?.(newValue)
    }

    return (
      <div ref={ref} className={`${className}`} {...props}>
        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            if (typeof child.type === 'string') {
              return child;
            }
            return React.cloneElement(child as React.ReactElement<any>, { 
              currentValue, 
              onValueChange: handleValueChange 
            })
          }
          return child
        })}
      </div>
    )
  }
)
Tabs.displayName = "Tabs"

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  currentValue?: string
  onValueChange?: (value: string) => void
}

export const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className = "", currentValue, onValueChange, children, ...props }, ref) => (
    <div
      ref={ref}
      className={`inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground ${className}`}
      {...props}
    >
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          if (typeof child.type === 'string') {
            return child;
          }
          return React.cloneElement(child as React.ReactElement<any>, { currentValue, onValueChange })
        }
        return child
      })}
    </div>
  )
)
TabsList.displayName = "TabsList"

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
  currentValue?: string
  onValueChange?: (value: string) => void
}

export const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className = "", value, currentValue, onValueChange, ...props }, ref) => {
    const isActive = currentValue === value
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${isActive ? "bg-background text-foreground shadow-sm" : ""} ${className}`}
        onClick={() => onValueChange?.(value)}
        {...props}
      />
    )
  }
)
TabsTrigger.displayName = "TabsTrigger"

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  currentValue?: string
}

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className = "", value, currentValue, onValueChange, ...props }: any, ref) => {
    if (currentValue !== value) return null
    return (
      <div
        ref={ref}
        className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}
        {...props}
      />
    )
  }
)
TabsContent.displayName = "TabsContent"
