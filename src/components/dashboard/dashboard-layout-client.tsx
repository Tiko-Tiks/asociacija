"use client"

import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { ComplianceBanner } from "@/components/governance/compliance-banner"
import { useSearchParams, usePathname } from "next/navigation"
import { ReactNode, Suspense } from "react"
import { isPlatformAdmin } from "@/app/actions/admin"

interface DashboardLayoutClientProps {
  children: ReactNode
  orgs: Array<{ id: string; name: string; slug: string; membership_id: string }>
  userEmail?: string
  isAdmin?: boolean
  userRole?: string
  isMember?: boolean
}

function DashboardLayoutContent({
  children,
  orgs,
  userEmail,
  isAdmin = false,
  userRole,
  isMember = false,
}: DashboardLayoutClientProps) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  
  // Extract slug from URL path (e.g., /dashboard/demo-org -> demo-org)
  // This supports slug-based routing: /dashboard/[slug]
  const pathSlug = pathname.match(/\/dashboard\/([^\/]+)/)?.[1]
  const urlOrgId = searchParams.get("orgId")

  // Determine selected org: slug from path > orgId from query > first org
  let selectedOrg = orgs.length > 0 ? orgs[0] : null
  if (pathSlug) {
    // Find org by slug from URL path (primary method)
    selectedOrg = orgs.find((org) => org.slug === pathSlug) || selectedOrg
  } else if (urlOrgId) {
    // Fallback to orgId from query params (backward compatibility)
    selectedOrg = orgs.find((org) => org.id === urlOrgId) || selectedOrg
  }

  // Check if current path is member dashboard (just /dashboard/[slug] without sub-paths)
  // Member dashboard doesn't have sidebar, org switcher, or branduolys logo
  const isMemberDashboard = pathname.match(/^\/dashboard\/[^\/]+$/) !== null && 
                            !pathname.includes('/members') && 
                            !pathname.includes('/settings') &&
                            !pathname.includes('/resolutions') &&
                            !pathname.includes('/projects') &&
                            !pathname.includes('/invoices') &&
                            !pathname.includes('/events')

  // For members, don't show sidebar and org switcher
  if (isMember || isMemberDashboard) {
    return (
      <div className="flex h-screen flex-col bg-gradient-to-b from-slate-50 to-white">
        <Header
          organizationName={selectedOrg?.name || "Organization"}
          userName={undefined}
          userEmail={userEmail}
          activeOrgSlug={selectedOrg?.slug}
          orgs={[]}
          selectedOrgId={selectedOrg?.id}
          isAdmin={false}
          isMember={true}
          orgSlug={selectedOrg?.slug}
        />
        {/* Main Content - Full width for members */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-white">
          <div className="h-full">
            {selectedOrg && (
              <div className="container mx-auto px-4 py-4">
                <ComplianceBanner orgId={selectedOrg.id} orgSlug={selectedOrg.slug} />
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-slate-50 to-white">
      <Header
        organizationName={selectedOrg?.name || "Organization"}
        userName={undefined}
        userEmail={userEmail}
        activeOrgSlug={selectedOrg?.slug}
        orgs={orgs}
        selectedOrgId={selectedOrg?.id}
        isAdmin={isAdmin}
        isMember={false}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar - Hidden on mobile */}
        <aside className="hidden lg:block">
          <Sidebar orgs={orgs} selectedOrgId={selectedOrg?.id} isAdmin={isAdmin} />
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-white">
          <div className="h-full">
            {selectedOrg && (
              <div className="container mx-auto px-4 py-4">
                <ComplianceBanner orgId={selectedOrg.id} orgSlug={selectedOrg.slug} />
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export function DashboardLayoutClient({
  children,
  orgs,
  userEmail,
  isAdmin,
  userRole,
  isMember = false,
}: DashboardLayoutClientProps) {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
          </div>
          <p className="text-lg font-medium text-slate-700">Kraunama...</p>
        </div>
      </div>
    }>
      <DashboardLayoutContent 
        orgs={orgs} 
        userEmail={userEmail} 
        isAdmin={isAdmin}
        userRole={userRole}
        isMember={isMember}
      >
        {children}
      </DashboardLayoutContent>
    </Suspense>
  )
}

