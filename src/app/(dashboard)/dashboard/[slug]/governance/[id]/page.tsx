import { notFound, redirect } from 'next/navigation'
import { getMeeting } from '@/app/actions/meetings'
import { getUserOrgs, getMembershipRole } from '@/app/actions/organizations'
import { checkBoardPosition } from '@/app/actions/check-board-position'
import { MeetingView } from '@/components/meetings/meeting-view'
import { MEMBERSHIP_ROLE } from '@/app/domain/constants'

/**
 * Meeting Details Page - Slug-based routing
 * 
 * URL: /dashboard/[slug]/governance/[id]
 * Security: Verifies user belongs to the org defined by [slug]
 */
async function MeetingDetailsContent({
  slug,
  meetingId,
}: {
  slug: string
  meetingId: string
}) {
  // Fetch all orgs user belongs to
  const orgs = await getUserOrgs()
  
  // Find org by slug (must match exactly)
  const selectedOrg = orgs.find((org) => org.slug === slug)
  
  // If org not found or user doesn't belong to it -> 404
  if (!selectedOrg) {
    notFound()
  }

  const [meeting, userRole, isBoard] = await Promise.all([
    getMeeting(meetingId),
    getMembershipRole(selectedOrg.membership_id),
    checkBoardPosition(selectedOrg.id),
  ])

  if (!meeting) {
    notFound()
  }

  const isOwner = userRole === MEMBERSHIP_ROLE.OWNER

  return (
    <div className="container mx-auto px-4 py-6">
      <MeetingView
        meeting={meeting}
        orgId={selectedOrg.id}
        orgSlug={selectedOrg.slug}
        isOwner={isOwner}
        isBoard={isBoard}
        membershipId={selectedOrg.membership_id}
      />
    </div>
  )
}

export default async function MeetingDetailsPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }> | { slug: string; id: string }
}) {
  const resolvedParams = 'then' in params ? await params : params
  const normalizedSlug = decodeURIComponent(resolvedParams.slug).trim()

  return <MeetingDetailsContent slug={normalizedSlug} meetingId={resolvedParams.id} />
}

