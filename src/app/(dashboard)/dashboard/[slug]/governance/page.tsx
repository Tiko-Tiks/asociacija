import { notFound, redirect } from 'next/navigation'
import { listMeetings, getActiveRuleset } from '@/app/actions/governance'
import { getUserOrgs, getMembershipRole } from '@/app/actions/organizations'
import { GovernanceDashboardClient } from '@/components/governance/governance-dashboard-client'
import { isPilotMode } from '@/lib/pilot-mode'

/**
 * Governance Page - Slug-based routing
 * 
 * URL: /dashboard/[slug]/governance
 * Security: Verifies user belongs to the org defined by [slug]
 */
async function GovernanceDashboardContent({ slug }: { slug: string }) {
  // Fetch all orgs user belongs to
  const orgs = await getUserOrgs()
  
  // Find org by slug (must match exactly)
  const selectedOrg = orgs.find((org) => org.slug === slug)
  
  // If org not found or user doesn't belong to it -> 404
  if (!selectedOrg) {
    notFound()
  }

  // Check user role - only OWNER can access governance
  let userRole: Awaited<ReturnType<typeof getMembershipRole>> = 'MEMBER'
  try {
    userRole = await getMembershipRole(selectedOrg.membership_id)
  } catch (error) {
    console.error('Error getting user role:', error)
    notFound()
  }

  // Block MEMBER access - redirect to dashboard
  if (userRole !== 'OWNER') {
    redirect(`/dashboard/${slug}`)
  }

  // Load governance data
  let meetings: Awaited<ReturnType<typeof listMeetings>> = []
  let ruleset: Awaited<ReturnType<typeof getActiveRuleset>> = null
  try {
    [meetings, ruleset] = await Promise.all([
      listMeetings(selectedOrg.membership_id),
      getActiveRuleset(selectedOrg.membership_id),
    ])
  } catch (error) {
    console.error('Error loading governance data:', error)
    meetings = []
    ruleset = null
  }

  const pilotMode = isPilotMode(selectedOrg.slug)
  
  return (
    <GovernanceDashboardClient
      meetings={meetings}
      ruleset={ruleset}
      membershipId={selectedOrg.membership_id}
      orgSlug={selectedOrg.slug}
      userRole={userRole}
      pilotMode={pilotMode}
    />
  )
}

export default async function GovernancePage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string }
}) {
  const resolvedParams = 'then' in params ? await params : params
  const normalizedSlug = decodeURIComponent(resolvedParams.slug).trim()

  return <GovernanceDashboardContent slug={normalizedSlug} />
}

