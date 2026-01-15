import { notFound, redirect } from 'next/navigation'
import { getMeeting } from '@/app/actions/meetings'
import { getUserOrgs, getMembershipRole } from '@/app/actions/organizations'
import { checkBoardPosition } from '@/app/actions/check-board-position'
import { EditMeetingForm } from '@/components/meetings/edit-meeting-form'
import { MEMBERSHIP_ROLE } from '@/app/domain/constants'

/**
 * Edit Meeting Page - Slug-based routing
 * 
 * URL: /dashboard/[slug]/governance/[id]/edit
 * Security: Verifies user belongs to the org defined by [slug] and can edit (OWNER/BOARD)
 */
async function EditMeetingContent({
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

  // Only DRAFT meetings can be edited
  if (meeting.status !== 'DRAFT') {
    redirect(`/dashboard/${slug}/governance/${meetingId}`)
  }

  const isOwner = userRole === MEMBERSHIP_ROLE.OWNER
  const canEdit = isOwner || isBoard

  if (!canEdit) {
    redirect(`/dashboard/${slug}/governance/${meetingId}`)
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <EditMeetingForm
        meeting={meeting}
        orgId={selectedOrg.id}
        orgSlug={selectedOrg.slug}
      />
    </div>
  )
}

export default async function EditMeetingPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }> | { slug: string; id: string }
}) {
  const resolvedParams = 'then' in params ? await params : params
  const normalizedSlug = decodeURIComponent(resolvedParams.slug).trim()

  return <EditMeetingContent slug={normalizedSlug} meetingId={resolvedParams.id} />
}

