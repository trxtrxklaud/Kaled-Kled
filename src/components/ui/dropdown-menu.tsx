import * as React from "react"

interface DropdownMenuProps {
  children: React.ReactNode
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ children }) => {
  const [open, setOpen] = React.useState(false)
  return (
    <div className="relative">
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          if (child.type === DropdownMenuTrigger) {
            // @ts-ignore - ref compatibility for asChild pattern
            return React.cloneElement(child as React.ReactElement<any>, { onClick: () => setOpen(!open) })
          }
          if (child.type === DropdownMenuContent) {
            // @ts-ignore - ref compatibility for asChild pattern
            return open ? React.cloneElement(child as React.ReactElement<any>, { onClose: () => setOpen(false) }) : null
          }
        }
        return child
      })}
    </div>
  )
}

interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

export const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, DropdownMenuTriggerProps>(
  ({ asChild, children, ...props }, ref) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as any, {
        ...props,
        ref,
        onClick: props.onClick,
      } as any)
    }
    return <button ref={ref} {...props}>{children}</button>
  }
)
DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "end"
  onClose?: () => void
}

export const DropdownMenuContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ className = "", align = "end", onClose, children, ...props }, ref) => (
    <div
      ref={ref}
      className={`absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md ${align === 'end' ? 'right-0' : 'left-0'} mt-2 ${className}`}
      {...props}
      onClick={onClose}
    >
      {children}
    </div>
  )
)
DropdownMenuContent.displayName = "DropdownMenuContent"

interface DropdownMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
  onSelect?: () => void
}

export const DropdownMenuItem = React.forwardRef<HTMLDivElement, DropdownMenuItemProps>(
  ({ className = "", onSelect, onClick, children, ...props }, ref) => (
    <div
      ref={ref}
      className={`relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${className}`}
      onClick={(e) => {
        onSelect?.()
        onClick?.(e)
      }}
      {...props}
    >
      {children}
    </div>
  )
)
DropdownMenuItem.displayName = "DropdownMenuItem"
