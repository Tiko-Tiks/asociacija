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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { OrgSwitcher } from "@/components/dashboard/org-switcher"
import { Separator } from "@/components/ui/separator"

const navigation = [
  {
    name: "Apžvalga",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Nariai",
    href: "/dashboard/members",
    icon: Users,
  },
  {
    name: "Finansai",
    href: "/dashboard/invoices",
    icon: FileText,
  },
  {
    name: "Idėjos",
    href: "/dashboard/ideas",
    icon: Lightbulb,
  },
  {
    name: "Projektai",
    href: "/dashboard/projects",
    icon: FolderKanban,
  },
  {
    name: "Susirinkimai",
    href: "/dashboard/governance",
    icon: Calendar,
  },
  {
    name: "Nutarimai",
    href: "/dashboard/resolutions",
    icon: Gavel,
  },
  {
    name: "Istorija",
    href: "/dashboard/history",
    icon: Clock,
  },
  {
    name: "Audito žurnalas",
    href: "/dashboard/settings/audit",
    icon: FileSearch,
  },
]

interface SidebarProps {
  className?: string
  orgs?: Array<{ id: string; name: string; slug: string; membership_id: string }>
  selectedOrgId?: string
  isAdmin?: boolean
}

export function Sidebar({ className, orgs = [], selectedOrgId, isAdmin = false }: SidebarProps) {
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

  return (
    <div
      className={cn(
        "flex h-full w-64 flex-col border-r bg-slate-50",
        className
      )}
    >
      {/* Org Switcher */}
      {orgs.length > 0 && (
        <div className="px-3 pt-4 pb-2">
          <OrgSwitcher orgs={orgs} selectedOrgId={selectedOrgId} />
        </div>
      )}
      {orgs.length > 0 && <Separator className="my-2" />}
      
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={getHrefWithSlug(item.href)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                "hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isActive
                  ? "bg-slate-200 text-slate-900"
                  : "text-slate-700 hover:text-slate-900"
              )}
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              <span>{item.name}</span>
            </Link>
          )
        })}

        {/* Admin Link - visible only if isAdmin is true */}
        {isAdmin && (
          <>
            <div className="my-2 border-t border-slate-200" />
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                "hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                pathname === "/admin"
                  ? "bg-slate-200 text-slate-900"
                  : "text-slate-700 hover:text-slate-900"
              )}
            >
              <Shield className="h-5 w-5" aria-hidden="true" />
              <span>Administratorius</span>
            </Link>
          </>
        )}
      </nav>
    </div>
  )
}

export function MobileSidebar({
  orgs = [],
  selectedOrgId,
  isAdmin = false,
}: {
  orgs?: Array<{ id: string; name: string; slug: string; membership_id: string }>
  selectedOrgId?: string
  isAdmin?: boolean
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
        <div className="flex h-full w-full flex-col border-r bg-slate-50">
          {/* Org Switcher */}
          {orgs.length > 0 && (
            <div className="px-3 pt-4 pb-2">
              <OrgSwitcher orgs={orgs} selectedOrgId={selectedOrgId} />
            </div>
          )}
          {orgs.length > 0 && <Separator className="my-2" />}
          
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
              return (
                <Link
                  key={item.name}
                  href={getHrefWithSlug(item.href)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    "hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    isActive
                      ? "bg-slate-200 text-slate-900"
                      : "text-slate-700 hover:text-slate-900"
                  )}
                >
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                  <span>{item.name}</span>
                </Link>
              )
            })}

            {/* Admin Link - visible only if isAdmin is true */}
            {isAdmin && (
              <>
                <div className="my-2 border-t border-slate-200" />
                <Link
                  href="/admin"
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    "hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    pathname === "/admin"
                      ? "bg-slate-200 text-slate-900"
                      : "text-slate-700 hover:text-slate-900"
                  )}
                >
                  <Shield className="h-5 w-5" aria-hidden="true" />
                  <span>Administratorius</span>
                </Link>
              </>
            )}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  )
}

