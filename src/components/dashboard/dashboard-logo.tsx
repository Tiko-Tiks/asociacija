"use client"

import Link from "next/link"
import { Building2 } from "lucide-react"

/**
 * Dashboard Logo Component
 * 
 * Displays logo with link to home page.
 * 
 * Navigation Logic:
 * - Clicking logo navigates to `/` (landing page)
 * - Landing page state machine will handle routing:
 *   - If authenticated with active membership -> redirects to dashboard
 *   - If guest -> shows public landing page
 *   - If authenticated but no membership -> shows onboarding state
 */
export function DashboardLogo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
      aria-label="Grįžti į pagrindinį puslapį"
    >
      <Building2 className="h-6 w-6 text-slate-700 flex-shrink-0" />
      <div className="hidden sm:block">
        <div className="text-sm font-bold text-slate-900 leading-tight">
          Bendruomenių
        </div>
        <div className="text-xs text-slate-600 leading-tight">
          Branduolys
        </div>
      </div>
    </Link>
  )
}

