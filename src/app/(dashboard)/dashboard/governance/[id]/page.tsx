import { redirect } from 'next/navigation'
import { getMeeting } from '@/app/actions/governance'
import { getUserOrgs } from '@/app/actions/organizations'

/**
 * Legacy Meeting Details Page - Redirects to slug-based route
 * 
 * This route is deprecated - all dashboard access should use /dashboard/[slug]/governance/[id] format
 */
export default async function MeetingDetailsPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams?: { orgId?: string }
}) {
  const orgs = await getUserOrgs()
  const selectedOrg = searchParams?.orgId 
    ? orgs.find((org) => org.id === searchParams.orgId)
    : (orgs.length > 0 ? orgs[0] : null)
  
  if (selectedOrg) {
    // Try to get meeting to verify it exists
    const meeting = await getMeeting(selectedOrg.membership_id, params.id)
    if (meeting) {
      redirect(`/dashboard/${selectedOrg.slug}/governance/${params.id}`)
    }
  }
  
  // Fallback: try to find org by checking all orgs
  for (const org of orgs) {
    const meeting = await getMeeting(org.membership_id, params.id)
    if (meeting) {
      redirect(`/dashboard/${org.slug}/governance/${params.id}`)
    }
  }
  
  redirect('/dashboard')
}
