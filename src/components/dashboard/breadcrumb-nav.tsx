"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Breadcrumb Navigation Component
 * 
 * Shows navigation path:
 * - Home (/) -> Dashboard -> Current Page
 * 
 * Helps users understand where they are and navigate back.
 */
export function BreadcrumbNav() {
  const pathname = usePathname()

  // Only show breadcrumb on sub-pages (not on dashboard home)
  if (pathname === '/dashboard' || pathname.match(/^\/dashboard\/[^\/]+$/)) {
    return null
  }

  // Parse pathname to create breadcrumb items
  const pathSegments = pathname.split('/').filter(Boolean)
  const breadcrumbs = [
    { label: 'Pagrindinis', href: '/', icon: Home },
    ...pathSegments.map((segment, index) => {
      const href = '/' + pathSegments.slice(0, index + 1).join('/')
      const label = segment
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      return { label, href }
    }),
  ]

  // Map route names to Lithuanian
  const routeLabels: Record<string, string> = {
    dashboard: 'Apžvalga',
    members: 'Nariai',
    invoices: 'Finansai',
    governance: 'Sprendimai',
    projects: 'Projektai',
    history: 'Istorija',
    admin: 'Administratorius',
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-600">
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1
        const Icon = 'icon' in crumb ? crumb.icon : null
        const label = routeLabels[crumb.label.toLowerCase()] || crumb.label

        if (isLast) {
          return (
            <span key={crumb.href} className="font-medium text-slate-900">
              {Icon && <Icon className="inline h-4 w-4 mr-1" />}
              {label}
            </span>
          )
        }

        return (
          <div key={crumb.href} className="flex items-center gap-2">
            <Link
              href={crumb.href}
              className="hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
            >
              {Icon && <Icon className="inline h-4 w-4 mr-1" />}
              {label}
            </Link>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </div>
        )
      })}
    </nav>
  )
}

