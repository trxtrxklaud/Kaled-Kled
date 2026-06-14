import * as React from "react"

interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

export const Select: React.FC<SelectProps> = ({ value, onValueChange, children }) => {
  const [internalValue, setInternalValue] = React.useState(value || "")
  const currentValue = value !== undefined ? value : internalValue

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value
    if (value === undefined) setInternalValue(newValue)
    onValueChange?.(newValue)
  }

  return (
    <select value={currentValue} onChange={handleChange} className="w-full">
      {children}
    </select>
  )
}

interface SelectTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export const SelectTrigger = React.forwardRef<HTMLDivElement, SelectTriggerProps>(
  ({ className = "", children, ...props }, ref) => (
    <div ref={ref} className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ${className}`} {...props}>
      {children}
    </div>
  )
)
SelectTrigger.displayName = "SelectTrigger"

interface SelectValueProps {
  placeholder?: string
}

export const SelectValue: React.FC<SelectValueProps> = ({ placeholder }) => (
  <span className="text-muted-foreground">{placeholder}</span>
)

interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className = "", children, ...props }, ref) => (
    <div ref={ref} className={`relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md ${className}`} {...props}>
      {children}
    </div>
  )
)
SelectContent.displayName = "SelectContent"

interface SelectItemProps extends React.OptionHTMLAttributes<HTMLOptionElement> {}

export const SelectItem = React.forwardRef<HTMLOptionElement, SelectItemProps>(
  ({ className = "", children, ...props }, ref) => (
    <option ref={ref} className={`relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground ${className}`} {...props}>
      {children}
    </option>
  )
)
SelectItem.displayName = "SelectItem"
