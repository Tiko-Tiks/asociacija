import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getUserOrgs, getMembershipRole } from '@/app/actions/organizations'
import { getCommandCenterData } from '@/app/actions/command-center'
import { getMemberDashboardData } from '@/app/actions/member-dashboard'
import { getMemberRequirements } from '@/app/actions/member-requirements'
import { getActivityFeed } from '@/app/actions/activity-feed'
import { getSystemNews } from '@/app/actions/system-news'
import { getPublishedMeetings } from '@/app/actions/published-meetings'
import { getPendingVotesCount } from '@/app/actions/voting'
import { checkCanPublish } from '@/app/domain/guards/canPublish'
import { checkOrgActive } from '@/app/domain/guards/orgActivation'
import { CommandCenterContent } from '@/components/command-center/command-center-content'
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton'
import { MemberDashboard } from '@/components/member/member-dashboard'
import { PublishedMeetingCard } from '@/components/meetings/published-meeting-card'
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
  let orgs: Array<{ id: string; name: string; slug: string; membership_id: string; status?: string; metadata?: any }> = []
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

  // PRE_ORG BLOCKING: Check if organization is PRE_ORG (V2 onboarding)
  // NOTE: metadata column does NOT exist in orgs table (schema frozen v19.0)
  // For V2 pre-onboarding, only status is available from getUserOrgs
  // If status is ONBOARDING, redirect to pre-onboarding page
  const isOnboarding = selectedOrg.status === 'ONBOARDING'
  
  if (isOnboarding) {
    // Log audit entry for blocked access
    try {
      const { logAudit } = await import('@/app/utils/audit')
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const adminSupabase = createAdminClient()
      const { getCurrentUser } = await import('@/app/actions/auth')
      const user = await getCurrentUser()
      
      await logAudit(adminSupabase, {
        orgId: selectedOrg.id,
        userId: user?.id || null,
        action: 'PRE_ORG_ACCESS_BLOCKED',
        targetTable: 'orgs',
        targetId: selectedOrg.id,
        metadata: {
          fact: {
            entrypoint: 'dashboard',
            org_slug: slug,
            org_status: selectedOrg.status,
            is_onboarding: true,
          },
        },
      })
    } catch (auditError) {
      console.error('AUDIT INCIDENT: Failed to log PRE_ORG_ACCESS_BLOCKED:', auditError)
    }
    
    // Redirect to pre-onboarding page (only allowed route for ONBOARDING status)
    redirect(`/pre-onboarding/${slug}`)
  }
  
  // PRE_ORG BLOCKING: Also check if org is not ACTIVE (hard filter)
  if (selectedOrg.status !== 'ACTIVE') {
    // Log audit entry for blocked access
    try {
      const { logAudit } = await import('@/app/utils/audit')
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const adminSupabase = createAdminClient()
      const { getCurrentUser } = await import('@/app/actions/auth')
      const user = await getCurrentUser()
      
      await logAudit(adminSupabase, {
        orgId: selectedOrg.id,
        userId: user?.id || null,
        action: 'PRE_ORG_ACCESS_BLOCKED',
        targetTable: 'orgs',
        targetId: selectedOrg.id,
        metadata: {
          fact: {
            entrypoint: 'dashboard',
            org_slug: slug,
            org_status: selectedOrg.status,
            is_pre_org: false,
          },
        },
      })
    } catch (auditError) {
      console.error('AUDIT INCIDENT: Failed to log PRE_ORG_ACCESS_BLOCKED:', auditError)
    }
    
    // Block dashboard access for non-ACTIVE orgs
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

  // Get published meetings for both OWNER and MEMBER
  let publishedMeetings: Awaited<ReturnType<typeof getPublishedMeetings>> = []
  try {
    publishedMeetings = await getPublishedMeetings(selectedOrg.id)
  } catch (error) {
    console.error('Error loading published meetings:', error)
    // Don't fail if meetings can't be loaded
  }

  // Get the most recent published meeting (if any)
  const latestMeeting = publishedMeetings.length > 0 ? publishedMeetings[0] : null
  
  // Check if user has pending votes for the latest meeting
  let pendingVotesCount = 0
  if (latestMeeting) {
    try {
      pendingVotesCount = await getPendingVotesCount(latestMeeting.meeting.id)
    } catch (error) {
      console.error('Error checking pending votes:', error)
    }
  }

  // If user is not OWNER, show Member Dashboard
  if (userRole !== MEMBERSHIP_ROLE.OWNER) {
    let memberDashboardData
    let requirements
    let activityItems
    try {
      [memberDashboardData, requirements, activityItems] = await Promise.all([
        getMemberDashboardData(selectedOrg.id),
        getMemberRequirements(selectedOrg.id, selectedOrg.slug),
        getActivityFeed(selectedOrg.id, selectedOrg.slug),
      ])
    } catch (error) {
      console.error('Error loading member dashboard data:', error)
      notFound()
    }

    return (
      <>
        {/* Published Meeting Section */}
        {latestMeeting && (
          <div className="p-6 pb-0">
            <PublishedMeetingCard
              meeting={latestMeeting.meeting}
              agendaItems={latestMeeting.agendaItems}
              orgSlug={selectedOrg.slug}
              isAuthenticated={true}
              pendingVotes={pendingVotesCount}
            />
          </div>
        )}
        <MemberDashboard
          data={memberDashboardData}
          orgId={selectedOrg.id}
          orgSlug={selectedOrg.slug}
          requirements={requirements}
          activityItems={activityItems}
        />
      </>
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
    <>
      {/* Published Meeting Section */}
      {latestMeeting && (
        <div className="p-6 pb-0">
          <PublishedMeetingCard
            meeting={latestMeeting.meeting}
            agendaItems={latestMeeting.agendaItems}
            orgSlug={selectedOrg.slug}
            isAuthenticated={true}
            pendingVotes={pendingVotesCount}
          />
        </div>
      )}
      <CommandCenterContent
        data={commandCenterData}
        orgId={selectedOrg.id}
        orgSlug={selectedOrg.slug}
        canPublish={canPublish}
        systemNews={systemNews}
      />
    </>
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
