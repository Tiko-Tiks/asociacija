// Dizainas pagal asociacija.net gaires v2026-01 – minimalistinis, audit-safe, institutional

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  FileText,
  Vote,
  FolderKanban,
  Menu,
  Clock,
  Shield,
  Gavel,
  FileSearch,
  Calendar,
  Lightbulb,
  Settings,
  LogOut,
  Brain,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { OrgSwitcher } from "@/components/dashboard/org-switcher"
import { Separator } from "@/components/ui/separator"
import { Logo } from "@/components/ui/logo"

// Pagrindinė navigacija pagal gaires
const navigation = [
  {
    name: "Pagrindinis",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Idėjos",
    href: "/dashboard/ideas",
    icon: Lightbulb,
  },
  {
    name: "Nutarimai",
    href: "/dashboard/resolutions",
    icon: Gavel,
  },
  {
    name: "Renginiai",
    href: "/dashboard/governance",
    icon: Calendar,
  },
  {
    name: "Nariai",
    href: "/dashboard/members",
    icon: Users,
  },
  {
    name: "Projektai",
    href: "/dashboard/projects",
    icon: FolderKanban,
  },
  {
    name: "Biudžetas",
    href: "/dashboard/invoices",
    icon: FileText,
  },
  {
    name: "Audit Log",
    href: "/dashboard/history",
    icon: FileSearch,
  },
  {
    name: "AI Pagalba",
    href: "/dashboard/ai-help",
    icon: Brain,
  },
]

interface SidebarProps {
  className?: string
  orgs?: Array<{ id: string; name: string; slug: string; membership_id: string; logo_url?: string | null }>
  selectedOrgId?: string
  isAdmin?: boolean
  organizationName?: string
  orgLogoUrl?: string | null
}

export function Sidebar({ 
  className, 
  orgs = [], 
  selectedOrgId, 
  isAdmin = false,
  organizationName,
  orgLogoUrl,
}: SidebarProps) {
  const pathname = usePathname()

  // Extract slug from URL path (e.g., /dashboard/demo-org/members -> demo-org)
  // This supports slug-based routing: /dashboard/[slug]
  const pathSlug = pathname.match(/\/dashboard\/([^\/]+)/)?.[1]
  
  // Find current org by slug from path or by selectedOrgId
  const currentOrg = pathSlug 
    ? orgs.find((org) => org.slug === pathSlug)
    : (selectedOrgId ? orgs.find((org) => org.id === selectedOrgId) : null) || (orgs.length > 0 ? orgs[0] : null)

  // Helper to build slug-based navigation links
  // CRITICAL: All links must use /dashboard/[slug]/path format
  const getHrefWithSlug = (href: string) => {
    if (!currentOrg) return href
    
    // If href is just "/dashboard", use current org's slug
    if (href === '/dashboard') {
      return `/dashboard/${currentOrg.slug}`
    }
    
    // If href starts with "/dashboard/", replace with slug-based path
    if (href.startsWith('/dashboard/')) {
      // Remove /dashboard prefix and get the sub-path
      const subPath = href.replace('/dashboard', '')
      // Build slug-based path: /dashboard/[slug]/sub-path
      return `/dashboard/${currentOrg.slug}${subPath}`
    }
    
    // For other paths, return as-is (shouldn't happen for dashboard navigation)
    return href
  }

  const displayOrgName = organizationName || currentOrg?.name || "Organizacija"
  const displayLogoUrl = orgLogoUrl || currentOrg?.logo_url

  return (
    <div
      className={cn(
        "flex h-full w-64 flex-col border-r bg-white dark:bg-gray-900",
        className
      )}
    >
      {/* Logo + Organizacijos pavadinimas */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <Logo 
            variant="icon" 
            size="sm" 
            orgLogoUrl={displayLogoUrl}
            orgName={displayOrgName}
            showText={false}
          />
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {displayOrgName}
            </h2>
          </div>
        </div>
      </div>

      {/* Org Switcher (jei yra daugiau nei viena organizacija) */}
      {orgs.length > 1 && (
        <>
          <div className="px-3 pt-3 pb-2">
            <OrgSwitcher orgs={orgs} selectedOrgId={selectedOrgId} />
          </div>
          <Separator className="my-2" />
        </>
      )}
      
      {/* Navigacija */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navigation.map((item) => {
          const targetHref = getHrefWithSlug(item.href)
          const isActive = pathname === targetHref || pathname?.startsWith(targetHref + '/')
          return (
            <Link
              key={item.name}
              href={targetHref}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                "hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                isActive
                  ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
                  : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              <span>{item.name}</span>
            </Link>
          )
        })}

        {/* Admin Link - visible only if isAdmin is true */}
        {isAdmin && (
          <>
            <div className="my-2 border-t border-gray-200 dark:border-gray-800" />
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                "hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                pathname === "/admin"
                  ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
                  : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
              )}
            >
              <Shield className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              <span>Administratorius</span>
            </Link>
          </>
        )}
      </nav>

      {/* Apačioje: Nustatymai, Atsijungti */}
      <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-800 space-y-1">
        <Link
          href={currentOrg ? `/dashboard/${currentOrg.slug}/settings` : '/dashboard/settings'}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
            "hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            pathname?.includes('/settings')
              ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
              : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
          )}
        >
          <Settings className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
          <span>Nustatymai</span>
        </Link>
      </div>
    </div>
  )
}

export function MobileSidebar({
  orgs = [],
  selectedOrgId,
  isAdmin = false,
  organizationName,
  orgLogoUrl,
}: {
  orgs?: Array<{ id: string; name: string; slug: string; membership_id: string; logo_url?: string | null }>
  selectedOrgId?: string
  isAdmin?: boolean
  organizationName?: string
  orgLogoUrl?: string | null
}) {
  const pathname = usePathname()

  // Extract slug from URL path (e.g., /dashboard/demo-org/members -> demo-org)
  const pathSlug = pathname.match(/\/dashboard\/([^\/]+)/)?.[1]
  
  // Find current org by slug from path or by selectedOrgId
  const currentOrg = pathSlug 
    ? orgs.find((org) => org.slug === pathSlug)
    : (selectedOrgId ? orgs.find((org) => org.id === selectedOrgId) : null) || (orgs.length > 0 ? orgs[0] : null)

  // Helper to build slug-based navigation links
  const getHrefWithSlug = (href: string) => {
    if (!currentOrg) return href
    
    if (href === '/dashboard') {
      return `/dashboard/${currentOrg.slug}`
    }
    
    if (href.startsWith('/dashboard/')) {
      const subPath = href.replace('/dashboard', '')
      return `/dashboard/${currentOrg.slug}${subPath}`
    }
    
    return href
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <div className="flex h-full w-full flex-col border-r bg-white dark:bg-gray-900">
          {/* Logo + Organizacijos pavadinimas */}
          <div className="px-4 pt-4 pb-3 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <Logo 
                variant="icon" 
                size="sm" 
                orgLogoUrl={orgLogoUrl || orgs.find(o => o.id === selectedOrgId)?.logo_url}
                orgName={organizationName || orgs.find(o => o.id === selectedOrgId)?.name}
                showText={false}
              />
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {organizationName || orgs.find(o => o.id === selectedOrgId)?.name || "Organizacija"}
                </h2>
              </div>
            </div>
          </div>

          {/* Org Switcher (jei yra daugiau nei viena organizacija) */}
          {orgs.length > 1 && (
            <>
              <div className="px-3 pt-3 pb-2">
                <OrgSwitcher orgs={orgs} selectedOrgId={selectedOrgId} />
              </div>
              <Separator className="my-2" />
            </>
          )}
          
          {/* Navigacija */}
          <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
            {navigation.map((item) => {
              const targetHref = getHrefWithSlug(item.href)
              const isActive = pathname === targetHref || pathname?.startsWith(targetHref + '/')
              return (
                <Link
                  key={item.name}
                  href={targetHref}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    "hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    isActive
                      ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
                      : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                  <span>{item.name}</span>
                </Link>
              )
            })}

            {/* Admin Link - visible only if isAdmin is true */}
            {isAdmin && (
              <>
                <div className="my-2 border-t border-gray-200 dark:border-gray-800" />
                <Link
                  href="/admin"
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    "hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    pathname === "/admin"
                      ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
                      : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                  )}
                >
                  <Shield className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                  <span>Administratorius</span>
                </Link>
              </>
            )}
          </nav>

          {/* Apačioje: Nustatymai */}
          <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-800">
            <Link
              href={orgs.find(o => o.id === selectedOrgId) ? `/dashboard/${orgs.find(o => o.id === selectedOrgId)?.slug}/settings` : '/dashboard/settings'}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                "hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                pathname?.includes('/settings')
                  ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
                  : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
              )}
            >
              <Settings className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              <span>Nustatymai</span>
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

