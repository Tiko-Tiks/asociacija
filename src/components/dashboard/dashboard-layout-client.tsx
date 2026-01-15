"use client"

import { Header } from "@/components/dashboard/header"
import { ComplianceBanner } from "@/components/governance/compliance-banner"
import { useSearchParams, usePathname } from "next/navigation"
import { ReactNode, Suspense } from "react"
import { isPlatformAdmin } from "@/app/actions/admin"

interface DashboardLayoutClientProps {
  children: ReactNode
  orgs: Array<{ id: string; name: string; slug: string; membership_id: string; role?: string; logo_url?: string | null }>
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

  // Check if current path is onboarding - don't show sidebar/header
  const isOnboarding = pathname.includes('/onboarding')
  
  // Check if current path is member dashboard (just /dashboard/[slug] without sub-paths)
  // Member dashboard doesn't have sidebar, org switcher, or branduolys logo
  const isMemberDashboard = pathname.match(/^\/dashboard\/[^\/]+$/) !== null && 
                            !pathname.includes('/members') && 
                            !pathname.includes('/settings') &&
                            !pathname.includes('/resolutions') &&
                            !pathname.includes('/projects') &&
                            !pathname.includes('/invoices') &&
                            !pathname.includes('/events') &&
                            !isOnboarding

  // Check if we're in a module page (not the main dashboard)
  // Module pages: /dashboard/[slug]/members, /dashboard/[slug]/resolutions, etc.
  const isModulePage = pathname.match(/^\/dashboard\/[^\/]+\/(members|resolutions|projects|ideas|governance|voting|invoices|history|settings)/) !== null

  // For onboarding, render children without any layout (full screen)
  if (isOnboarding) {
    return <>{children}</>
  }

  // For members, don't show sidebar and org switcher
  if (isMember || isMemberDashboard) {
    return (
      <div className="flex h-screen flex-col bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-900">
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
          orgLogoUrl={selectedOrg?.logo_url || null}
        />
        {/* Main Content - Full width for members - Optimized */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-900">
          <div className="h-full">
            {/* Members should not see compliance banner */}
            {children}
          </div>
        </main>
      </div>
    )
  }

  // For module pages, hide sidebar and show back button
  if (isModulePage) {
    return (
      <div className="flex h-screen flex-col bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-900">
        <Header
          organizationName={selectedOrg?.name || "Organization"}
          userName={undefined}
          userEmail={userEmail}
          activeOrgSlug={selectedOrg?.slug}
          orgs={orgs}
          selectedOrgId={selectedOrg?.id}
          isAdmin={isAdmin}
          isMember={false}
          orgLogoUrl={selectedOrg?.logo_url || null}
        />
        {/* Main Content - Full width for modules - Optimized */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-900">
          <div className="h-full">
            {selectedOrg && (
              <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <ComplianceBanner 
                  orgId={selectedOrg.id} 
                  orgSlug={selectedOrg.slug}
                  userRole={orgs.find(o => o.id === selectedOrg.id)?.role}
                />
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    )
  }

  // For main dashboard, no sidebar - full width
  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-900">
      <Header
        organizationName={selectedOrg?.name || "Organization"}
        userName={undefined}
        userEmail={userEmail}
        activeOrgSlug={selectedOrg?.slug}
        orgs={orgs}
        selectedOrgId={selectedOrg?.id}
        isAdmin={isAdmin}
        isMember={false}
        orgLogoUrl={selectedOrg?.logo_url || null}
      />
      {/* Main Content - Full width - Optimized */}
      <main className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-900">
        <div className="h-full">
          {selectedOrg && (
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <ComplianceBanner 
                orgId={selectedOrg.id} 
                orgSlug={selectedOrg.slug}
                userRole={orgs.find(o => o.id === selectedOrg.id)?.role}
              />
            </div>
          )}
          {children}
        </div>
      </main>
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-900">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-500"></div>
          </div>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Kraunama...</p>
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

