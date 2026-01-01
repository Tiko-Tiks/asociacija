"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface RadioGroupContextValue {
  name: string
  value?: string
  onValueChange?: (value: string) => void
}

const RadioGroupContext = React.createContext<RadioGroupContextValue | undefined>(undefined)

interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  onValueChange?: (value: string) => void
  name?: string
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value, onValueChange, name, children, ...props }, ref) => {
    // Generate a unique name if not provided
    const groupName = React.useMemo(
      () => name || `radio-group-${Math.random().toString(36).substring(7)}`,
      [name]
    )
    
    const contextValue = React.useMemo<RadioGroupContextValue>(
      () => ({
        name: groupName,
        value,
        onValueChange,
      }),
      [groupName, value, onValueChange]
    )
    
    return (
      <RadioGroupContext.Provider value={contextValue}>
        <div
          ref={ref}
          className={cn("grid gap-2", className)}
          role="radiogroup"
          {...props}
        >
          {children}
        </div>
      </RadioGroupContext.Provider>
    )
  }
)
RadioGroup.displayName = "RadioGroup"

interface RadioGroupItemProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string
}

const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value, id, ...props }, ref) => {
    const context = React.useContext(RadioGroupContext)
    
    if (!context) {
      throw new Error("RadioGroupItem must be used within a RadioGroup")
    }
    
    const { name, value: selectedValue, onValueChange } = context
    const inputId = id || `radio-${name}-${value}`
    const checked = selectedValue === value
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
        onValueChange?.(value)
      }
    }
    
    return (
      <input
        ref={ref}
        type="radio"
        id={inputId}
        name={name} // CRITICAL: name attribute groups radio buttons together
        value={value}
        checked={checked}
        onChange={handleChange}
        className={cn(
          "aspect-square h-4 w-4 rounded-full border border-slate-300 text-slate-900 ring-offset-white focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:border-slate-50 dark:ring-offset-slate-950 dark:focus-visible:ring-slate-300",
          className
        )}
        {...props}
      />
    )
  }
)
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }

