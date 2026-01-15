// Dizainas pagal asociacija.net gaires v2026-01 – minimalistinis, audit-safe, institutional
// Status badge komponentai - aiškiai rodo būsenas su tinkamomis spalvomis

"use client"

import { CheckCircle2, XCircle, Clock, FileEdit, Eye, EyeOff, Lock, Globe } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Resolution Status Badge
 * 
 * Status badge su tinkamomis spalvomis:
 * - draft → gray
 * - proposed → blue
 * - approved → green
 * - rejected → red
 */
interface ResolutionStatusBadgeProps {
  status: "DRAFT" | "PROPOSED" | "APPROVED" | "REJECTED"
  className?: string
}

export function ResolutionStatusBadge({ status, className }: ResolutionStatusBadgeProps) {
  const variants = {
    DRAFT: {
      label: "Juodraštis",
      icon: FileEdit,
      className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    },
    PROPOSED: {
      label: "Pasiūlytas",
      icon: Clock,
      className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200",
    },
    APPROVED: {
      label: "Patvirtintas",
      icon: CheckCircle2,
      className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
    },
    REJECTED: {
      label: "Atmestas",
      icon: XCircle,
      className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
    },
  }

  const variant = variants[status]
  const Icon = variant.icon

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium",
        variant.className,
        className
      )}
      role="status"
      aria-label={`Statusas: ${variant.label}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{variant.label}</span>
    </span>
  )
}

/**
 * Visibility Badge
 * 
 * Rodo matomumo lygį:
 * - PUBLIC → globe icon
 * - MEMBERS → group icon
 * - INTERNAL → lock icon
 */
interface VisibilityBadgeProps {
  visibility: "PUBLIC" | "MEMBERS" | "INTERNAL"
  className?: string
}

export function VisibilityBadge({ visibility, className }: VisibilityBadgeProps) {
  const variants = {
    PUBLIC: {
      label: "Viešas",
      icon: Globe,
      className: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
    },
    MEMBERS: {
      label: "Nariams",
      icon: EyeOff,
      className: "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    },
    INTERNAL: {
      label: "Vidaus",
      icon: Lock,
      className: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
    },
  }

  const variant = variants[visibility]
  const Icon = variant.icon

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
        variant.className,
        className
      )}
      role="status"
      aria-label={`Matomumas: ${variant.label}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{variant.label}</span>
    </span>
  )
}

/**
 * Role Badge
 * 
 * Rodo vartotojo rolę (OWNER / MEMBER)
 */
interface RoleBadgeProps {
  role: "OWNER" | "MEMBER"
  className?: string
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const variants = {
    OWNER: {
      label: "Savininkas",
      className: "bg-primary text-primary-foreground",
    },
    MEMBER: {
      label: "Narys",
      className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    },
  }

  const variant = variants[role]

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variant.className,
        className
      )}
      role="status"
      aria-label={`Rolė: ${variant.label}`}
    >
      {variant.label}
    </span>
  )
}

