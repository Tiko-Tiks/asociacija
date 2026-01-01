import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getUserOrgs, getMembershipRole } from '@/app/actions/organizations'
import { getCommandCenterData } from '@/app/actions/command-center'
import { getMemberDashboardData } from '@/app/actions/member-dashboard'
import { getMemberRequirements } from '@/app/actions/member-requirements'
import { getSystemNews } from '@/app/actions/system-news'
import { checkCanPublish } from '@/app/domain/guards/canPublish'
import { checkOrgActive } from '@/app/domain/guards/orgActivation'
import { CommandCenterContent } from '@/components/command-center/command-center-content'
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton'
import { MemberDashboard } from '@/components/member/member-dashboard'
import { MEMBERSHIP_ROLE } from '@/app/domain/constants'

/**
 * Dashboard Page - Slug-based routing (B1.1)
 * 
 * Command Center Layout - 3-column read-only dashboard
 * 
 * Design Philosophy: Command Center
 * - Clean, organized, monitoring-focused
 * - 3-column layout: Monitoring | Activity Feed | AI Placeholder
 * - Read-only in this step (B1.1)
 * 
 * URL: /dashboard/[slug]
 * Middleware Protection: Verify user belongs to the org defined by [slug]
 * 
 * Rules:
 * - Extract slug from URL params
 * - Verify user has ACTIVE membership in org with matching slug
 * - If not -> 404 or Access Denied
 * - Load dashboard content for that org
 */
async function DashboardPageContent({ slug }: { slug: string }) {
  // Fetch all orgs user belongs to
  let orgs: Array<{ id: string; name: string; slug: string; membership_id: string }> = []
  try {
    orgs = await getUserOrgs()
  } catch (error) {
    // If getUserOrgs fails, log and show 404
    console.error('Error fetching user orgs:', error)
    notFound()
  }
  
  // Find org by slug (must match exactly)
  const selectedOrg = orgs.find((org) => org.slug === slug)
  
  // If org not found or user doesn't belong to it -> 404
  // This implements middleware protection: verify user belongs to org
  if (!selectedOrg) {
    notFound()
  }

  // Check user role to determine which dashboard to show
  let userRole: string
  try {
    userRole = await getMembershipRole(selectedOrg.membership_id)
  } catch (error) {
    console.error('Error fetching user role:', error)
    notFound()
  }

  // If user is not OWNER, show Member Dashboard
  if (userRole !== MEMBERSHIP_ROLE.OWNER) {
    let memberDashboardData
    let requirements
    try {
      [memberDashboardData, requirements] = await Promise.all([
        getMemberDashboardData(selectedOrg.id),
        getMemberRequirements(selectedOrg.id, selectedOrg.slug),
      ])
    } catch (error) {
      console.error('Error loading member dashboard data:', error)
      notFound()
    }

    return (
      <MemberDashboard
        data={memberDashboardData}
        orgId={selectedOrg.id}
        orgSlug={selectedOrg.slug}
        requirements={requirements}
      />
    )
  }

  // CRITICAL: If user is OWNER and org is NOT fully ACTIVE (ACTIVE + active_ruleset), redirect to onboarding
  // This ensures orgs that are ACTIVE but missing ruleset/governance config complete onboarding
  try {
    const isOrgActive = await checkOrgActive(selectedOrg.id)
    if (!isOrgActive) {
      console.log('DASHBOARD_REDIRECT: Org not fully active, redirecting to onboarding', {
        orgId: selectedOrg.id,
        orgSlug: selectedOrg.slug,
      })
      redirect('/onboarding')
    }
  } catch (error: any) {
    // If checkOrgActive fails with unexpected error, log and redirect to onboarding for safety
    console.error('DASHBOARD_REDIRECT_ERROR: Failed to check org active status', {
      orgId: selectedOrg.id,
      error: error?.message || error,
      errorCode: error?.code,
    })
    // Redirect to onboarding as fail-safe - better to require onboarding than allow access
    redirect('/onboarding')
  }

  // Load Command Center data for OWNER (Chairman Dashboard)
  // All data fetched in parallel via getCommandCenterData
  // Also fetch system news from Branduolys org
  let commandCenterData
  let canPublish = false
  let systemNews = []
  try {
    [commandCenterData, canPublish, systemNews] = await Promise.all([
      getCommandCenterData(selectedOrg.membership_id),
      checkCanPublish(selectedOrg.id),
      getSystemNews(), // Fetch system news in parallel
    ])
  } catch (error) {
    // If command center data fetch fails, log and show 404
    console.error('Error loading command center data:', error)
    notFound()
  }

  return (
    <CommandCenterContent
      data={commandCenterData}
      orgId={selectedOrg.id}
      orgSlug={selectedOrg.slug}
      canPublish={canPublish}
      systemNews={systemNews}
    />
  )
}

export default async function DashboardSlugPage({
  params,
}: {
  params: { slug: string }
}) {
  // Normalize slug (decode URL encoding, trim whitespace)
  const normalizedSlug = decodeURIComponent(params.slug).trim()

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardPageContent slug={normalizedSlug} />
    </Suspense>
  )
}
