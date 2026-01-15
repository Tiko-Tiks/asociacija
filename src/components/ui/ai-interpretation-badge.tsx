// Dizainas pagal asociacija.net gaires v2026-01 – minimalistinis, audit-safe, institutional
// AI interpretacijų badge komponentas - aiškiai atskiria AI duomenis nuo faktinių

"use client"

import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface AIIntepretationBadgeProps {
  className?: string
  variant?: "default" | "compact"
}

/**
 * AI Interpretation Badge
 * 
 * Visada rodomas su AI interpretacijomis, kad būtų aiškus atskyrimas
 * nuo faktinių duomenų. Neturi teisinės galios.
 * 
 * WCAG 2.2+ compliant: amber-500/amber-600 kontrastas, screen reader friendly
 */
export function AIIntepretationBadge({ 
  className,
  variant = "default"
}: AIIntepretationBadgeProps) {
  if (variant === "compact") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200",
          className
        )}
        role="status"
        aria-label="AI interpretacija – neturi teisinės galios"
      >
        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
        <span>AI</span>
      </span>
    )
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 px-3 py-1.5 text-sm font-medium text-amber-800 dark:text-amber-200",
        className
      )}
      role="status"
      aria-label="AI interpretacija – neturi teisinės galios"
    >
      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
      <span>AI interpretacija – neturi teisinės galios</span>
    </div>
  )
}

/**
 * AI Interpretation Wrapper
 * 
 * Wrapper komponentas, kuris automatiškai prideda badge prie AI turinio
 */
interface AIIntepretationWrapperProps {
  children: React.ReactNode
  className?: string
  showBadge?: boolean
}

export function AIIntepretationWrapper({ 
  children, 
  className,
  showBadge = true 
}: AIIntepretationWrapperProps) {
  return (
    <div className={cn("relative", className)}>
      {showBadge && (
        <div className="mb-3">
          <AIIntepretationBadge />
        </div>
      )}
      <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10 p-4">
        {children}
      </div>
    </div>
  )
}

