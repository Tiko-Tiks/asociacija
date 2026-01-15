import { notFound } from 'next/navigation'
import { getPublishedMeeting } from '@/app/actions/published-meetings'
import { getUserOrgs } from '@/app/actions/organizations'
import { MeetingViewForMembers } from '@/components/meetings/meeting-view-for-members'

/**
 * Published Meeting View Page for Members
 * 
 * URL: /dashboard/[slug]/meetings/[id]
 * Shows published meeting with agenda, documents, and voting options
 */
async function MeetingViewContent({
  slug,
  meetingId,
}: {
  slug: string
  meetingId: string
}) {
  // Fetch all orgs user belongs to
  const orgs = await getUserOrgs()
  
  // Find org by slug
  const selectedOrg = orgs.find((org) => org.slug === slug)
  
  if (!selectedOrg) {
    notFound()
  }

  // Get meeting with agenda and attachments
  const meetingData = await getPublishedMeeting(meetingId)

  if (!meetingData || meetingData.meeting?.org_id !== selectedOrg.id) {
    notFound()
  }

  return (
    <MeetingViewForMembers
      meeting={meetingData.meeting}
      agendaItems={meetingData.agendaItems}
      attachments={meetingData.attachments}
      orgSlug={selectedOrg.slug}
    />
  )
}

export default async function MeetingViewPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }> | { slug: string; id: string }
}) {
  const resolvedParams = 'then' in params ? await params : params
  const normalizedSlug = decodeURIComponent(resolvedParams.slug).trim()

  return <MeetingViewContent slug={normalizedSlug} meetingId={resolvedParams.id} />
}

